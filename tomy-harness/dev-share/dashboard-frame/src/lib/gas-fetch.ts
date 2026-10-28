// GAS 호출 공용 게이트 — **줄 세우기 + 타임아웃**. 2026-09-14 사고 대응(같은 날 3차 수정).
//
// ── 왜 타임아웃이 있는가(1차, 09-13 밤 사고) ───────────────────────────────
// 구글 앱스스크립트 웹앱은 **배포 인스턴스가 통째로 무효화**되는 일이 있다(분양·광고리드 배포가
// 동시에 404가 됐고 코드·매니페스트·권한은 전부 정상, 재배포로만 복구됨). 이때 구글은 404를 즉시
// 주지 않고 리다이렉트 체인을 태우다 20~27초 만에 답한다 — 상한이 없으면 무한정 붙잡는다.
//
// ── 왜 넉넉한가(2·4차) ────────────────────────────────────────────────────
// 읽기를 8초로 조였다가 **살아 있는 GAS를 잘랐다**. 분양 GAS 실측(콜드): events 14.5s ·
// channels 10.9s · report 8.9s · clarity 2.7s. 시트가 쌓이며 느려진 것이라 앞으로도 안 줄어든다.
// 30초로 올린 뒤에도 같은 종류로 한 번 더 터졌다(아래 3차).
//
// 🚨 그래서 **상한을 짧게 잡을 이유가 없다.** 타임아웃이 실제로 막아주는 건 "응답이 영영 안 오는"
// 경우 하나뿐인데, **죽은 배포는 타임아웃이 아니라 404로 끝난다**(구글이 리다이렉트 체인을 태우다
// 20~27초 만에 답한다 → `res.ok === false`). 즉 짧은 상한이 자르는 건 죽은 다리가 아니라
// **정상인데 느린 요청**이고, 그게 오늘 두 번 화면을 비운 원인이다.
// 상한은 무한 대기를 막는 최후의 빗장으로만 두고 넉넉히 잡는다 — 느려서 실패하는 것보다
// 오래 걸려도 뜨는 쪽이 낫다(운영자 혼자 보는 온디맨드 어드민이고, 캐시가 한 번 차면 그 뒤론 즉시다).
// ⚠️ 생사 판별은 시간이 아니라 HTTP 상태가 맡는다. 감시용 `HEALTH_TIMEOUT_MS`(30초)는 목적이
//    달라 별개다 — 거긴 죽은 배포의 404를 받아낼 만큼만 기다리면 되고, 길면 감시가 둔해진다.
export const GAS_READ_TIMEOUT_MS = 120_000;
export const GAS_WRITE_TIMEOUT_MS = 120_000;

export const gasReadInit = (): RequestInit => ({
  cache: 'no-store',
  redirect: 'follow',
  signal: AbortSignal.timeout(GAS_READ_TIMEOUT_MS),
});

export const gasWriteSignal = () => AbortSignal.timeout(GAS_WRITE_TIMEOUT_MS);

// ── 엔드포인트별 직렬 큐 ────────────────────────────────────────────────────
// 키 = 배포 경로 + 쿼리(`pathname?search`). **서로 다른 기능은 각자 병렬**이다 — 같은 분양 GAS라도
// 매물(?없음)·채널(?channels=1)·이벤트(?events=1)·클래리티(?clarity=1)는 같은 배포 URL을 공유할 뿐
// 서로 무관한 기능이라, 하나가 밀린다고 나머지까지 줄 세울 이유가 없다.
// 2026-09-14 사고(동시 호출 타임아웃)의 실제 원인은 **한 화면이 여러 기능을 한꺼번에 부른 것**이었고
// 그건 화면 쪽 탭별 lazy 로딩으로 이미 막았다(§clarity-detail-view.tsx). 큐를 배포 경로 하나로만
// 묶은 첫 수정은 그보다 넓어서, 서로 다른 화면·다른 사용자가 쓰는 무관한 기능끼리도 줄을 서게
// 만들어 체감 속도를 크게 떨어뜨렸다(2026-09-15). 그래서 쿼리까지 포함해 "같은 요청"만 줄을 선다.
// globalThis에 두는 건 dev HMR에서 모듈이 리로드돼도 줄이 끊기지 않게 하기 위함(server-cache와 같은 이유).
declare global {
  // eslint-disable-next-line no-var
  var __gasQueues: Map<string, Promise<unknown>> | undefined;
}
const queues = (globalThis.__gasQueues ??= new Map<string, Promise<unknown>>());

function queueKey(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url; // URL로 못 읽으면 문자열 자체를 키로 — 최소한 같은 요청끼리는 줄을 선다
  }
}

/**
 * GAS 한 번 호출. 같은 배포로 가는 다른 호출이 끝날 때까지 기다렸다가 보낸다.
 *
 * `init`을 **함수로** 받는다 — `AbortSignal.timeout()`은 만들어진 순간부터 카운트되므로, 미리 만들어
 * 두면 큐에서 기다린 시간이 타임아웃에 포함돼 원래 고치려던 문제가 그대로 재현된다.
 * 앞 요청이 실패해도 줄은 계속 흐른다(`catch`로 흘려보낸다).
 *
 * 🚨 **본문까지 다 읽고 나서** 줄을 넘긴다. `fetch`는 응답 **헤더**를 받는 순간 해소되는데, GAS
 * 입장에서 그 요청은 본문을 다 보내야 끝난다 — 헤더에서 줄을 넘기면 호출부의 `res.json()`이 큐
 * 밖에서 돌아 요청이 여전히 겹친다(실측: 5개 동시에서 마지막 하나가 타임아웃 30초를 통째로 쓰고
 * 실패했다). 그래서 여기서 `arrayBuffer()`로 본문을 끝까지 받아낸 뒤, 같은 내용을 담은 Response를
 * 새로 만들어 돌려준다 — 호출부는 `res.ok`·`res.json()`을 그대로 쓴다(본문은 최대 수십 KB라
 * 통째로 들고 있어도 문제없다).
 */
export async function gasFetch(url: string, init: () => RequestInit = gasReadInit): Promise<Response> {
  const key = queueKey(url);
  const prev = queues.get(key) ?? Promise.resolve();
  const send = async (): Promise<Response> => {
    const res = await fetch(url, init());
    const body = await res.arrayBuffer(); // ← 여기까지가 GAS에게 '끝난' 요청이다
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
  const mine = prev.then(send, send);
  queues.set(
    key,
    mine.then(
      () => undefined,
      () => undefined,
    ),
  );
  return mine;
}

// 타임아웃은 DOMException(TimeoutError)로 올라와 영문 메시지가 화면에 그대로 노출된다.
// 운영자가 "서버가 느린 것"과 "다리가 끊긴 것"을 구분할 수 있게 한국어로 갈아끼운다.
// 단정하지 않는다 — 타임아웃만으로는 배포가 죽었는지 집계가 느린 것뿐인지 알 수 없다.
export function gasMessage(e: unknown): string {
  if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
    return `응답 지연: ${GAS_READ_TIMEOUT_MS / 1000}초 안에 못 받음(구글 GAS 과부하 또는 배포 확인 필요)`;
  }
  return e instanceof Error ? e.message : String(e);
}
