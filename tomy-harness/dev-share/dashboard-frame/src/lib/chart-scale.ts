// 차트 축 스케일 헬퍼 — 스케일이 수백~수천 배 벌어진 계열을 한 캔버스에 겹칠 때 쓴다.
//
// 왜: 조회 30만 / 문의 1만 / 구매 100, 또는 매출 9천만 / 구매수 300 / 객단가 27만처럼 자릿수가
// 다른 계열을 같은 축에 두면 작은 계열이 바닥에 붙어 사라진다. Recharts는 같은 orientation의
// Y축을 2개 그리면 같은 자리에 겹쳐 렌더하므로 실선 3축도 불가 → 각 계열을 **높이 층**에 앉히고
// 축은 최대 2개만 노출한다(나머지는 hide 축 + 툴팁·라벨로 값 제공).
//
// 쓰는 곳: components/metrics/weekly-trend-combo.tsx(조회·문의·구매),
//         components/charts/combo-charts.tsx의 FunnelCombo·RevenueCombo(조회·문의·문의율 /
//         매출·판매·객단가) — 통합 대시보드·리포트·U사장님 매출 화면이 공유한다.
//         (구 uboss-dashboard.tsx는 2026-08-03 통합 대시보드로 흡수되며 삭제됨.)

// 보기 좋은 자리로 반올림(1234 → 1200, 308354 → 308000). 눈금 라벨용.
export function roundNice(v: number): number {
  if (!Number.isFinite(v) || v === 0) return 0;
  const step = Math.pow(10, Math.max(0, String(Math.round(Math.abs(v))).length - 3));
  return Math.round(v / step) * step;
}

export type AxisLayer = { domain: [number, number]; ticks: number[] };

// 데이터 범위를 [lo, hi] 높이 비율 띠에 앉히는 domain + 그 범위만 찍는 눈금 3개.
// 0부터 그리지 않으므로 작은 변동도 살아난다 — 대신 0 기준 비교가 필요한 계열(막대)에는 쓰지 말 것.
export function layerDomain(values: number[], lo: number, hi: number): AxisLayer {
  const vals = values.filter((v) => Number.isFinite(v));
  if (!vals.length) return { domain: [0, 1], ticks: [0, 1] };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.max(1, max * 0.1);
  const total = span / (hi - lo);
  const domainMin = min - lo * total;
  const ticks = [...new Set([roundNice(min), roundNice((min + max) / 2), roundNice(max)])].filter(
    (t) => t >= domainMin,
  );
  return { domain: [domainMin, domainMin + total], ticks };
}

// 0 기준을 지켜야 하는 계열(막대)용 — max가 화면 높이의 topRatio 지점에 오도록 상한만 늘린다.
// 막대는 길이로 크기를 비교하므로 baseline을 자르면 거짓이 된다.
export function baselineDomain(values: number[], topRatio: number): AxisLayer {
  const vals = values.filter((v) => Number.isFinite(v) && v > 0);
  const max = vals.length ? Math.max(...vals) : 0;
  const top = Math.max(1, Math.ceil(max / topRatio));
  const ticks = [0, ...new Set([roundNice(max / 2), roundNice(max)])].filter((t) => t <= top);
  return { domain: [0, top], ticks };
}

/**
 * 선형 축 + **데이터 범위**(0 기준 포기) — 값이 크고 변동폭이 좁은 단일 계열용.
 *
 * 🚨 왜 로그가 아닌가(2026-08-03 지적 "지점수는 로카리듬이 너무 과함"): 로그 축의 이점은 **여러
 * 자릿수를 한 축에 담을 때**(100 vs 100,000)다. 지점수 5,712~5,860처럼 한 자릿수 범위 안에서
 * 흔들리는 계열에 로그를 걸면 눈금 간격이 불균등해져 **작은 변동이 실제보다 크게 굴곡져 보인다**
 * (같은 2% 변동이 축 어디에 있느냐에 따라 다른 높이로 그려진다). 선형을 유지한 채 domain만
 * 데이터 범위로 좁히면 변동은 그대로 보이면서 '같은 간격 = 같은 차이'가 지켜진다.
 *
 * `pad` = 위아래 여백(범위 대비 비율) — 선이 축선에 붙지 않게 한다.
 */
export function tightDomain(values: number[], pad = 0.18): AxisLayer {
  const vals = values.filter((v) => Number.isFinite(v));
  if (!vals.length) return { domain: [0, 1], ticks: [0, 1] };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const lo = min - span * pad;
  const hi = max + span * pad;
  const ticks = [...new Set([roundNice(min), roundNice((min + max) / 2), roundNice(max)])].filter(
    (t) => t >= lo && t <= hi,
  );
  return { domain: [lo, hi], ticks };
}
