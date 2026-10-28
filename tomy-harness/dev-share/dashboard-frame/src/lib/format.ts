export const fmtInt = (n: number) => n.toLocaleString('ko-KR');
export const fmtPct = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;
// 평균값: 100 미만이면 소수 1자리(작은 값 정보 보존), 이상이면 정수+천단위.
export const fmtAvg = (n: number) =>
  n >= 100 ? Math.round(n).toLocaleString('ko-KR') : n.toFixed(1);
// 원 → "만원" 표기. 0/음수/미집계는 '—'. (매출·OKR 대시보드 공용)
// ⚠️ 소수 첫째자리까지 낸다(2026-08-06 사용자 지정 "17만X 16.5만 okay") — 정수로 반올림하면 165,000원이
// "17만"으로 뭉개져 건별 원장(원 단위)과 대조할 때 안 맞는 것처럼 보인다. `monthly-grid.tsx`의 `fmtBy`가
// 매출에 이미 쓰던 표기(`minimumFractionDigits:1, maximumFractionDigits:1`)를 전 화면 공용 fmtMan에도 맞췄다.
export const fmtMan = (n: number) =>
  n <= 0 ? '—' : `${(n / 10000).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}만`;
// 건수 표기(콤마 정수). 0/음수/미집계는 '—'. (서브지표 목표 — MAU 등, 원 단위 아님)
export const fmtCount = (n: number) => (n <= 0 ? '—' : Math.round(n).toLocaleString('ko-KR'));

/** '2026-08-14' → '26-08-14'(연도 두 자리). 표 안에서 날짜 열이 이름·숫자 열의 폭을 먹지 않게 줄인다
 * — 이 어드민이 월 라벨을 `26-07`로 쓰는 것과 같은 계보(2026-08-14 사용자 지정). 값이 없거나 모양이
 * 다르면 원문을 그대로 돌려준다(날짜가 아닌 문자열을 잘라 내면 무슨 값인지 알 수 없어진다). */
export const fmtYmdShort = (ymd: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.slice(2) : ymd;

// ── 증감 표기 정본 ───────────────────────────────────────────────────────────
// 🚨 **증감은 비율과 절대값을 항상 함께 낸다**(2026-08-03 사용자 확정, 반복 지적).
//    '▲ 30.5%'만으로는 3명이 는 건지 3만명이 는 건지 알 수 없어 판단 재료가 못 된다.
//    표기 순서는 **비율 먼저, 절대값 괄호**(`▲ 2.34% (+4,902)`) — 이미 쓰이던 DeltaBadge 형식에
//    맞춰 전 화면을 통일했다. 화면마다 순서가 다르면 같은 뜻인데 매번 다시 읽어야 한다.

export type DeltaParts = {
  /** 증감률. prev가 없거나 0이면 null(배율 무한대·비교 불가). */
  ratio: number | null;
  /** 절대 증감(cur - prev). 비교 대상 자체가 없으면 null. */
  diff: number | null;
};

/** 두 값의 증감 — 비교 대상이 없으면(null/undefined) 둘 다 null로 두어 '—'로 쓰이게 한다. */
export function deltaOf(cur: number | null | undefined, prev: number | null | undefined): DeltaParts {
  if (cur == null || prev == null) return { ratio: null, diff: null };
  const diff = cur - prev;
  return { diff, ratio: prev !== 0 ? diff / prev : null };
}

/** 절대 증감의 부호 접두 — 0은 부호 없이. (−는 하이픈이 아니라 U+2212, 폭이 +와 같아 표가 안 흔들린다) */
export const signOf = (diff: number) => (diff > 0 ? '+' : diff < 0 ? '−' : '');

/** 방향 화살표. 0(보합)은 '—'. */
export const arrowOf = (diff: number | null) =>
  diff == null || diff === 0 ? '—' : diff > 0 ? '▲' : '▼';

/** 증감 텍스트 색조 — 증가=success / 감소=rose / 보합·무데이터=중립. */
export const deltaTone = (diff: number | null) =>
  diff == null || diff === 0 ? 'text-ink-mute' : diff > 0 ? 'text-success' : 'text-rose-600';
