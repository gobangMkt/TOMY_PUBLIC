// 툴팁 본문 구조화 — 문단/리스트 판별 정본(2026-08-31 신설).
//
// 🚨 **왜 있나**: 디자인팀장 정본(`에이전트/service-master/context/domains/uxui/reference_uxui_baseline.md`
// §툴팁·팝오버, 2026-08-28 즉시 승격)이 "항목이 2개 이상이면 **점 마커 + 굵은 라벨 + 콜론** 리스트"를
// 하한으로 못 박았다. 그런데 이 어드민의 hint 문자열은 이미 수백 개이고, 대부분 **`· 라벨 = 설명`**
// 꼴로 여러 항목을 한 문단에 담고 있다(줄바꿈만 있고 시각 마커가 없다 = 정본이 지적한 바로 그 상태).
//
// 문자열을 전부 `items` 배열로 옮기는 건 수백 곳 수정이라 이 파서로 **기존 관례를 그대로 구조로
// 승격**한다 — `·`로 시작하는 줄은 리스트 항목이 되고, `라벨 = 설명` / `라벨: 설명`이면 라벨이 굵어진다.
// 새로 쓰는 문구는 `InfoTip`의 `items` prop을 쓰는 쪽이 낫다(파싱에 기대지 않는다).
//
// ⛔ **여기서 문장을 고치지 않는다** — 자르기·요약·말바꿈 없이 **보이는 구조만** 바꾼다. 툴팁은 산식·
//    출처를 담는 자리라 한 글자만 달라져도 검산이 어긋난다.
// ⚠️ `—`(em dash)를 라벨 구분자로 인식하지 않는다. 정본이 금지한 표기라 **구조로 승격시키면 그 관례를
//    고착시킨다** — 본문에 남아 있어도 그냥 설명 문장의 일부로 흘려보내고, 새 문구에서는 쓰지 않는다.

export type TipBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: { label?: string; text: string }[] };

/** 줄 앞의 리스트 마커(`·`, `•`, `- `). 마커는 결과에서 떼어낸다(점은 렌더러가 그린다). */
const BULLET = /^\s*[·•]\s*|^\s*-\s+/;

/**
 * `라벨 = 설명` 또는 `라벨: 설명`에서 라벨을 뗀다.
 * ⚠️ 라벨이 너무 길면(30자 초과) 그건 라벨이 아니라 그냥 등호가 든 문장이다 — 굵게 만들지 않는다
 *    (예: '한 방문이 매물을 여러 건 볼 수 있어 조회 = 세션이 아니다' 같은 서술문).
 * ⚠️ 콜론은 **뒤에 공백이 있을 때만** 구분자로 본다 — 'https://…'의 콜론을 라벨로 오인하면 안 된다.
 */
const LABEL_MAX = 30;
export function splitLabel(line: string): { label?: string; text: string } {
  const eq = line.indexOf(' = ');
  if (eq > 0 && eq <= LABEL_MAX) return { label: line.slice(0, eq).trim(), text: line.slice(eq + 3).trim() };
  const colon = line.search(/:\s/);
  if (colon > 0 && colon <= LABEL_MAX) return { label: line.slice(0, colon).trim(), text: line.slice(colon + 1).trim() };
  return { text: line };
}

/**
 * 툴팁 본문 → 문단·리스트 블록. 연속한 불릿 줄은 **한 리스트로 묶는다**(줄마다 `<ul>`을 열면 간격이
 * 들쭉날쭉해진다). 빈 줄은 단락 경계이므로 문단 블록 안에 그대로 남긴다(`whitespace-pre-line`이 살린다).
 */
export function parseTipBlocks(text: string): TipBlock[] {
  const blocks: TipBlock[] = [];
  let para: string[] = [];
  let list: { label?: string; text: string }[] = [];
  const flushPara = () => {
    const joined = para.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (joined) blocks.push({ kind: 'text', text: joined });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: 'list', items: list });
    list = [];
  };
  for (const raw of text.split('\n')) {
    if (BULLET.test(raw)) {
      flushPara();
      const body = raw.replace(BULLET, '').trim();
      if (body) list.push(splitLabel(body));
      continue;
    }
    flushList();
    para.push(raw);
  }
  flushList();
  flushPara();
  return blocks;
}
