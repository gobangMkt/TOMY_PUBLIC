// 지표 신뢰 계약 — 숫자가 거짓이 되는 5가지 경로를 한곳에서 막는다.
//
// 왜 이 파일이 생겼나 (2026-08-10 실측 사고):
//   `/overview` "채널 비교 — 전환당 비용" 차트에서 07-12~07-27 전 구간이 W0 바닥에 붙어
//   완전히 뭉개졌다. 원인은 Meta 08-01 = 소진 74,806원 / 전환 **1건** → CPA ₩74,806.
//   이 한 점이 Y축 최대를 80k로 밀어올려 나머지 전 구간(400~900원)을 시각적으로 소멸시켰다.
//   같은 뿌리에서 KPI "▲+3682.6% vs 직전 7일"도 나왔다(Meta 설치 2건으로 CPI 172,578원을
//   내고 소진 가중평균에 태운 결과 — 재현 검증 완료).
//
//   즉 차트가 뭉개진 게 아니라 **지표가 거짓이었고 차트는 그걸 정직하게 그렸다.**
//   CLAUDE.md 엔진 규칙에는 "판정 전 게이트 2개 — 모수 미달이면 판정 거부"가 이미 있는데,
//   그 게이트가 `verdict.ts`(목표 판정)에만 있고 화면 집계층(`efficiency.ts`·`data.ts`)에는
//   없었다. 비율을 내는 8개 지점이 전부 분모 `> 0`만 검사했다. 이 파일이 그 게이트다.
//
// 막는 것 5가지
//   1) **모수 미달** — 분모 1건으로 낸 비율은 지표가 아니라 노이즈다. null + 이유를 낸다.
//   2) **계측 공백** — 없는 값을 0으로 채우거나 선으로 이으면 없는 사실을 만든다.
//   3) **미도착** — 채널마다 적재가 늦다. "최근 30일"이 채널별로 다른 기간일 수 있다.
//   4) **진행 중인 오늘** — 부분 집계를 완결일처럼 그리면 마지막 점이 항상 급락으로 보인다.
//   5) **축 지배** — 1~4를 다 막아도 진짜 이상치는 남는다. 축이 이상치에 끌려가지 않게 한다.

import { Channel, MetricRow } from "./types";
import { ConversionMetric } from "./settings";

/* ── 1) 모수 게이트 ──────────────────────────────────────────────────── */

/**
 * 비율 지표를 신뢰하기 위한 **일자 단위** 최소 분모.
 *
 * `verdict.ts`의 `min_sample`(목표 판정용, 기간 누적 300~800)과는 스케일이 다르다 —
 * 여기는 "하루치 점 하나를 차트에 찍어도 되는가"를 본다. 전환 10건이면 1건 차이가
 * CPA를 10% 흔들지만, 3건이면 33% 흔든다. 실무에서 일별 CPA를 읽는 최소선이 10이다.
 */
export const MIN_DENOM_DAILY: Record<ConversionMetric, number> = {
  cpa: 10,
  cpi: 10,
  cpc: 30,
};

/**
 * 급변 기준선 7일 중 **모수 게이트(MIN_DENOM_DAILY)를 통과한 날**이 이만큼 있어야 기준선을 믿는다.
 * 채널 구역(groupSignals)과 광고그룹 구역(anomaly.ts cpiSpikeAt)이 같은 규칙을 쓰도록 한 곳에 둔다.
 */
export const MIN_BASELINE_VALUES = 5;

/**
 * 기간 누적 최소 분모. 30일을 합쳐도 전환 10건이면 채널 간 비교가 성립하지 않는다.
 * 일자 게이트보다 높게 잡되, `verdict.ts`의 목표 판정선(300+)보다는 낮다 —
 * 판정이 아니라 비교·표시용이라 요구 강도가 다르다.
 */
export const MIN_DENOM_PERIOD: Record<ConversionMetric, number> = {
  cpa: 30,
  cpi: 30,
  cpc: 100,
};

export const DENOM_WORD: Record<ConversionMetric, string> = {
  cpa: "전환",
  cpi: "설치",
  cpc: "클릭",
};

/** 비율 지표 한 건의 결과. 게이트에 걸리면 값이 없고, **왜 없는지**가 항상 남는다. */
export interface Ratio {
  /** 신뢰 가능한 값. 게이트에 걸리거나 계측이 없으면 null */
  value: number | null;
  /** 값을 못 낸 이유 — 화면이 "—" 옆에 그대로 붙여 쓴다. 값이 있으면 null */
  reason: string | null;
  /** 계측 자체가 없었다(0이 아니라 null) */
  unmeasured: boolean;
  /** 모수 미달로 막혔다 — 값은 계산 가능했지만 신뢰할 수 없다 */
  gated: boolean;
  /** 실제 분모(게이트 판단 근거). 계측 없으면 null */
  denom: number | null;
}

const ok = (value: number, denom: number): Ratio => ({
  value,
  reason: null,
  unmeasured: false,
  gated: false,
  denom,
});

/**
 * 게이트를 통과한 비율만 값으로 낸다.
 *
 * - `hasDenom=false` → 계측 자체가 없다. 0으로 채우지 않는다(엔진 규칙).
 * - 분모가 `min` 미달 → 값을 내지 않는다. "전환 1건" 같은 근거를 남긴다.
 *
 * 반환을 `Ratio`로 통일한 이유: 호출부가 `null`만 받으면 "미계측"과 "모수 부족"을
 * 구분할 수 없어 화면이 둘을 같은 "—"로 뭉갠다. 그 둘은 사용자가 취할 행동이 다르다
 * (전자는 계측을 붙여야 하고, 후자는 더 돌려야 한다).
 */
export function gatedRatio(
  numerator: number,
  denominator: number,
  opts: { hasDenom: boolean; min: number; denomWord: string }
): Ratio {
  const { hasDenom, min, denomWord } = opts;
  if (!hasDenom) {
    return { value: null, reason: `${denomWord} 미계측`, unmeasured: true, gated: false, denom: null };
  }
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { value: null, reason: `${denomWord} 0`, unmeasured: false, gated: false, denom: 0 };
  }
  if (denominator < min) {
    return {
      value: null,
      reason: `${denomWord} ${denominator}건 · 모수 부족`,
      unmeasured: false,
      gated: true,
      denom: denominator,
    };
  }
  const v = numerator / denominator;
  if (!Number.isFinite(v)) {
    return { value: null, reason: "계산 불가", unmeasured: false, gated: false, denom: denominator };
  }
  return ok(v, denominator);
}

/** 채널 지표 shape에서 분모를 꺼낸다 — `ChannelAgg`·일자 버킷·엔티티 집계가 같은 필드를 쓴다. */
export interface DenomSource {
  installs: number;
  clicks: number;
  conversions: number;
  hasInstalls: boolean;
  hasConversions: boolean;
}

export function denomOf(src: DenomSource, metric: ConversionMetric): { denom: number; has: boolean } {
  switch (metric) {
    case "cpi":
      return { denom: src.installs, has: src.hasInstalls };
    case "cpa":
      return { denom: src.conversions, has: src.hasConversions };
    case "cpc":
      return { denom: src.clicks, has: true }; // 클릭은 전 채널이 항상 준다
  }
}

/** 하루치 점 하나(`daily`)와 기간 합산(`period`)은 요구 모수가 다르다. */
export type MetricScope = "daily" | "period";

/** 소진 ÷ 분모를 게이트에 통과시켜 낸다. `scope`가 일자냐 기간이냐로 임계가 갈린다. */
export function costPerConversionGated(
  src: DenomSource & { spend: number },
  metric: ConversionMetric,
  scope: MetricScope = "period"
): Ratio {
  const { denom, has } = denomOf(src, metric);
  const min = (scope === "daily" ? MIN_DENOM_DAILY : MIN_DENOM_PERIOD)[metric];
  return gatedRatio(src.spend, denom, { hasDenom: has, min, denomWord: DENOM_WORD[metric] });
}

/* ── 2·3) 신선도 계약 ────────────────────────────────────────────────── */

/**
 * 채널별 적재 상태. "데이터가 안 들어왔다"는 사실 자체가 신호로 드러나야 한다 —
 * 이전에는 조용히 0을 그려서 사고를 숨겼다(Google·Naver가 3일 비었는데 화면은 침묵).
 */
export type FreshnessStatus = "fresh" | "lagging" | "stale" | "none";

export interface ChannelFreshness {
  channel: Channel;
  /** 이 채널의 마지막 적재일. 행이 없으면 null */
  lastDate: string | null;
  /** 오늘로부터 며칠 전인가. 행이 없으면 null */
  staleDays: number | null;
  status: FreshnessStatus;
}

/** 매체 리포팅은 하루 지연이 정상이다. 그 이상 벌어지면 적재 사고로 본다. */
export const LAG_TOLERANCE_DAYS = 1;
const STALE_THRESHOLD_DAYS = 3;

export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function todayISO(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 달력 기준으로 날짜를 옮긴다 — 비교 창을 "데이터가 있는 날짜"로 세면 창이 밀린다. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function channelFreshness(
  rows: MetricRow[],
  channels: Channel[],
  today: string = todayISO()
): ChannelFreshness[] {
  const last = new Map<Channel, string>();
  for (const r of rows) {
    const cur = last.get(r.channel);
    if (!cur || r.date > cur) last.set(r.channel, r.date);
  }
  return channels.map((channel) => {
    const lastDate = last.get(channel) ?? null;
    if (!lastDate) return { channel, lastDate: null, staleDays: null, status: "none" as const };
    const staleDays = daysBetween(lastDate, today);
    const status: FreshnessStatus =
      staleDays <= LAG_TOLERANCE_DAYS ? "fresh" : staleDays < STALE_THRESHOLD_DAYS ? "lagging" : "stale";
    return { channel, lastDate, staleDays, status };
  });
}

/**
 * 전 채널이 함께 적재된 마지막 날 = **비교를 신뢰할 수 있는 경계**.
 * 이 날 이후 구간은 일부 채널만 있어서, 합계·평균·전기간 비교가 채널 구성이 다른 숫자가 된다.
 */
export function comparableThrough(fresh: ChannelFreshness[]): string | null {
  const dates = fresh.filter((f) => f.lastDate).map((f) => f.lastDate!);
  if (dates.length === 0) return null;
  return dates.reduce((min, d) => (d < min ? d : min));
}

/* ── 4) 진행 중인 오늘 ───────────────────────────────────────────────── */

/**
 * 오늘은 아직 안 끝난 하루다. 완결일과 같은 점으로 그리면 마지막 점이 **항상** 급락한다
 * (실측: Meta 08-09 소진 65,803 → 08-10 9,471. 효율 급락이 아니라 하루가 안 끝난 것).
 */
export const isPartialDay = (date: string, today: string = todayISO()) => date >= today;

/**
 * 기간 선택의 기본 종료일 — 진행 중인 오늘을 기본값에서 뺀다.
 *
 * `maxDate`(적재된 마지막 날짜)가 오늘이면 그날은 아직 집계가 안 끝난 부분값이라
 * 대시보드·통합비교 기본 화면에 섞이면 마지막 날이 늘 급락처럼 보인다(2026-08-19 실측:
 * Google 설치 53건 vs 직전 7일 평균 197건 — 그냥 하루가 반만 지난 것뿐이었다).
 * 사용자가 원하면 기간선택 팝오버의 "오늘" 프리셋이나 달력에서 여전히 오늘을 고를 수 있다 —
 * 여기서 막는 건 **기본값**뿐이다.
 */
export function defaultRangeEnd(minDate: string, maxDate: string, today: string = todayISO()): string {
  if (!maxDate || !isPartialDay(maxDate, today)) return maxDate;
  const yesterday = shiftDate(today, -1);
  // 가진 데이터가 오늘 하루뿐이면(minDate===maxDate===오늘) 뺄 게 없다 — 그대로 오늘을 쓴다.
  return yesterday < minDate ? maxDate : yesterday;
}

/* ── 5) 축 지배 방어 ─────────────────────────────────────────────────── */

export interface AxisDomain {
  /** 축 상한. 이상치를 잘라낸 값일 수 있다 */
  max: number;
  /**
   * 축 하한. **비율 지표에 0을 강제하지 않는다** — CPI가 400~600원인 계열에 0을 깔면
   * 실제 변동폭(200원)이 축 높이의 3분의 1로 눌려 "변화 없음"처럼 보인다.
   */
  min: number;
  /** 상한을 넘겨 잘린 점이 있다 — 차트가 "N개 축 밖" 표식을 붙여야 한다 */
  clamped: boolean;
  /** 잘린 점 개수 */
  outliers: number;
}

/**
 * 이상치가 축을 지배하지 못하게 상한을 잡는다.
 *
 * 모수 게이트(1)를 통과한 값들만 들어오므로 대부분은 여기서 아무 일도 일어나지 않는다.
 * 그래도 두는 이유: 게이트를 통과한 **진짜** 이상치(모수 충분한데 실제로 20배 튄 날)에도
 * 나머지 구간이 읽혀야 한다. 사용자 지시는 "절대 안 일어나게"이므로 안전망을 둔다.
 *
 * 규칙: 중앙값의 `factor`배와 최댓값 중 작은 쪽. 중앙값 기준이라 점이 몇 개든 안정적이다.
 * (P95는 표본이 10개 안팎일 때 최댓값과 같아져서 방어가 안 된다 — 30일 차트가 딱 그 크기다.)
 *
 * 짝수 개일 때는 두 중앙값의 평균이 아니라 **아래쪽**을 쓴다. 점이 2개인 계열에서
 * 평균을 쓰면 중앙값 자체가 이상치에 오염돼(`[500, 90000]` → 45,250) 방어가 풀린다.
 */
export function robustDomain(
  values: (number | null | undefined)[],
  opts: { factor?: number; zeroBased?: boolean } = {}
): AxisDomain {
  const { factor = 4, zeroBased = false } = opts;
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
  if (nums.length === 0) return { max: 0, min: 0, clamped: false, outliers: 0 };
  const sorted = [...nums].sort((a, b) => a - b);
  const trueMax = sorted[sorted.length - 1];
  const trueMin = sorted[0];
  // 하한: 절대량(소진·클릭)은 0에서 시작해야 크기 비교가 되지만, 비율은 0을 깔면 변동이 눌린다.
  const lo = zeroBased ? 0 : Math.max(0, Math.floor(trueMin * 0.9));
  const mid = sorted[Math.floor((sorted.length - 1) / 2)];
  // 중앙값이 0이면(대부분 0인 계열) 자를 근거가 없다 — 원본 최댓값을 쓴다.
  if (mid <= 0) return { max: trueMax, min: lo, clamped: false, outliers: 0 };
  const cap = mid * factor;
  if (trueMax <= cap) return { max: Math.ceil(trueMax * 1.1), min: lo, clamped: false, outliers: 0 };
  const outliers = nums.filter((v) => v > cap).length;
  // 축 상한은 잘린 뒤에도 눈금이 읽히게 살짝 여유를 준다.
  return { max: Math.ceil(cap * 1.05), min: lo, clamped: true, outliers };
}
