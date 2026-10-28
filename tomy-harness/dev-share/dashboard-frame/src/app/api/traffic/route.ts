import { NextResponse } from 'next/server';
import { cached, invalidate } from '@/lib/server-cache';
import { gasFetch, gasWriteSignal, gasMessage } from '@/lib/gas-fetch';

// 트래픽 원장(GA4 스냅샷·광고비·채널목표) 읽기 프록시.
//
// 저장 위치 = **지표 원장 시트의 탭들**이고 GAS도 지표 원장과 같은 스크립트다(2026-07-29 통합).
// 파일을 가르지 않은 이유 = 셀 한도가 문제되지 않고(5년 100만 셀 미만), 드라이브가 지저분해지며,
// 새 스크립트마다 브라우저 권한 승인이 또 필요하다. 그래서 env도 `INQUIRY_*` 한 벌만 쓴다.
// ⚠️ 다만 **범위 조회가 계약**이다 — 일별 소스/매체는 연 만 단위 행이라 전량 반환을 허용하면
//    응답이 터진다(gas/inquiry.Code.gs §트래픽 참조). from/to 없으면 서버가 기본 범위를 넣는다.
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 300_000;
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const gasUrl = () => process.env.INQUIRY_GAS_URL?.trim() || '';
const msg = gasMessage;

// 기본 범위 = 최근 400일(어제까지). YoY 비교에 최소 13개월이 필요해 365일보다 넉넉히 잡는다.
function rangeFromReq(req: Request) {
  const q = new URL(req.url).searchParams;
  const to = q.get('to') || iso(new Date(Date.now() - DAY));
  const from = q.get('from') || iso(new Date(new Date(`${to}T00:00:00Z`).getTime() - 400 * DAY));
  const tabs = (q.get('tabs') || '').trim();
  return { from, to, tabs };
}

export async function GET(req: Request) {
  const { from, to, tabs } = rangeFromReq(req);
  const fresh = new URL(req.url).searchParams.get('fresh') === '1';
  const url = gasUrl();
  if (!url) {
    // 시트 미연결 → 빈 원장(화면은 GA4 API 직접 조회로 폴백한다).
    return NextResponse.json({ ok: true, source: 'unset', from, to, tabs: {} });
  }
  try {
    const payload = await cached(`traffic:${from}:${to}:${tabs}`, CACHE_TTL_MS, fresh, async () => {
      const qs = new URLSearchParams({ from, to, ...(tabs ? { tabs } : {}) });
      const res = await gasFetch(`${url}?${qs}`);
      if (!res.ok) throw new Error(`트래픽 GAS 응답 오류: HTTP ${res.status}`);
      const data = await res.json();
      return { source: 'gas', tabs: (data?.tabs ?? {}) as Record<string, unknown[]> };
    });
    return NextResponse.json({ ok: true, from, to, ...payload });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'traffic_read_failed', message: msg(err) },
      { status: 502 },
    );
  }
}

// 쓰기 = 수기 입력 전용 탭만. GA4 스냅샷 탭은 수집 라우트(/api/traffic/collect)만 쓴다
// — 화면에서 스냅샷을 손으로 고칠 수 있게 열어두면 원장이 정본이라는 규칙이 무너진다.
//
// `월_legacy`가 쓰기 가능한 이유(2026-07-30 추가): 지점수·파트너 신규·앱 설치·검색량은 **자동수집
// 경로가 없다** — 1시트 백필이 끝난 2026-06 이후로 영구히 멈춰 있었다. 월간 흐름 화면의 수기 입력이
// 이 탭에 쓴다. ⚠️ GAS `trafficBatch_`는 행을 **교체**하므로 클라이언트가 `mergeLegacyRow`로
// 기존 행 전체를 실어 보낸다(패치만 보내면 그 달 MAU·매출이 빈칸이 된다).
//
// `채널_매핑`이 쓰기 가능한 이유(2026-08-04 추가): GA4 스냅샷과 달라 **원장이 아니라 운영자가 손으로
// 관리하는 룩업 테이블**이다(gas/inquiry.Code.gs 주석 "운영자가 손으로 관리 — 새 소스/매체가 생기면
// 한 줄 추가하면 화면에 반영된다"). GAS `trafficBatch_`는 이 탭도 이미 지원했고(TRAFFIC_TABS에
// keyCols:['source_medium']로 정의돼 있음) 막힌 건 이 allowlist뿐이었다 — 채널_매핑에 Owned Media
// 행이 통째로 0개라 마케팅 월간흐름의 Owned 차트가 항상 비었던 실제 사고(2026-08-04) 이후 열었다.
// `월_채널_legacy`(2026-08-05): 1시트 채널 히스토리(22-12~25-06). GA4 적재 전 구간이라 자동수집
// 경로가 없다 — `월_legacy`와 같은 성격의 수기/백필 탭이다.
// `주_앱_스토어`(2026-10-16): 앱 다운로드·스토어 활성·평점 주간 취합. 스토어 콘솔 값이라 자동수집 경로가 없다.
const WRITABLE_TABS = ['광고비', '목표_채널', '월_legacy', '채널_매핑', '월_채널_legacy', '월_채널_규모', '주_앱_스토어'];

export async function POST(req: Request) {
  const url = gasUrl();
  const token = process.env.INQUIRY_WRITE_TOKEN?.trim() || '';
  if (!url || !token) {
    return NextResponse.json(
      { ok: false, error: 'server_misconfigured', message: 'INQUIRY_GAS_URL / INQUIRY_WRITE_TOKEN 미설정' },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const tab = String(body.tab ?? '');
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!WRITABLE_TABS.includes(tab)) {
    return NextResponse.json(
      { ok: false, error: 'tab_not_writable', message: `수기 입력 가능한 탭: ${WRITABLE_TABS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!rows || !rows.length) {
    return NextResponse.json({ ok: false, error: 'rows_required' }, { status: 400 });
  }

  try {
    const res = await gasFetch(url, () => ({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'traffic', token, op: 'batch', tab, rows }),
      redirect: 'follow',
      signal: gasWriteSignal(),
    }));
    const data = await res.json().catch(() => ({ ok: false, error: 'gas_bad_response' }));
    if (data?.ok) invalidate('traffic'); // 쓰기 성공 → 다음 읽기는 최신 시트
    return NextResponse.json(data, { status: data?.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'gas_request_failed', message: msg(err) }, { status: 502 });
  }
}
