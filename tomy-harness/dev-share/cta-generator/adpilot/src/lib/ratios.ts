// 집계 행(채널·엔티티·소재)의 비율 필드를 만드는 단 하나의 자리.
//
// 왜 이 파일이 생겼나 (2026-08-10 실측 사고의 잔여 지점):
//   `reliability.ts`가 모수 게이트를 만들고 `efficiency.ts`(대시보드 추이·전환당 비용)는 그걸 통과했지만,
//   집계층 `data.ts`(aggregateByChannel·aggregateByEntity·getCreativeMetrics)와 `mock.ts`는 여전히
//   `분모 > 0`만 검사해서 cpi·cpc·ctr을 냈고, 심지어 소재 지표는 측정 불가를 **0으로 채웠다**.
//   비율을 만드는 곳이 파일마다 흩어져 있으면 게이트도 파일마다 빠진다 — 그래서 조립을 여기 모았다.
//
// 규칙
//   - 새 산식을 여기서 짜지 않는다. 임계·게이트 판단은 전부 `reliability.ts`가 한다.
//   - 실데이터(`data.ts`)와 샘플(`mock.ts`)이 같은 함수를 쓴다. 안 그러면 "샘플에서는 숫자가 보이는데
//     실데이터에서는 —"처럼 게이트가 데이터 소스마다 달라진다.

import {
  Ratio,
  gatedRatio,
  costPerConversionGated,
  DENOM_WORD,
  MIN_DENOM_PERIOD,
} from "./reliability";

/**
 * 노출 모수 하한(기간 누적).
 *
 * CTR의 분모는 노출이라 `reliability.ts`의 전환·설치·클릭 임계(ConversionMetric)에 자리가 없다.
 * 1,000노출 미만에서 CTR을 내면 클릭 1건이 0.1%p를 흔들어, 지표가 아니라 노이즈가 된다
 * (클릭 임계 100건의 통상 CTR 1~3% 구간을 노출로 환산한 값과 같은 자리수).
 */
export const MIN_IMPRESSIONS_PERIOD = 1000;

/** 비율을 내는 데 필요한 최소 필드 — ChannelAgg·EntityAgg·일자 버킷이 모두 이 shape을 만족한다. */
export interface RatioSource {
  spend: number;
  installs: number;
  clicks: number;
  impressions: number;
  conversions: number;
  hasInstalls: boolean;
  hasConversions: boolean;
}

/** 집계 행 하나의 비율 4종. 값이 없으면 **왜 없는지**가 항상 남는다(미계측 vs 모수 부족). */
export interface AggRatios {
  /** 설치당 비용 */
  cpi: Ratio;
  /** 클릭당 비용 */
  cpc: Ratio;
  /** 클릭률(%) */
  ctr: Ratio;
  /** 클릭→전환 전환율(%) */
  cvr: Ratio;
}

export function aggRatios(src: RatioSource): AggRatios {
  return {
    cpi: costPerConversionGated(src, "cpi", "period"),
    cpc: costPerConversionGated(src, "cpc", "period"),
    // 노출은 전 채널이 항상 주므로 "미계측"을 구분할 필드가 없다 — 0이면 집행이 없었던 것으로 읽는다.
    ctr: gatedRatio(src.clicks * 100, src.impressions, {
      hasDenom: true,
      min: MIN_IMPRESSIONS_PERIOD,
      denomWord: "노출",
    }),
    // 전환율의 분모는 클릭이라 클릭 임계를 그대로 쓴다(CPC와 같은 모수 위에서 읽는 지표다).
    cvr: gatedRatio(src.conversions * 100, src.clicks, {
      hasDenom: src.hasConversions,
      min: MIN_DENOM_PERIOD.cpc,
      denomWord: DENOM_WORD.cpc,
    }),
  };
}

/** 소재 한 건의 비율. 소재는 전환(cpa)을 주는 채널이 없어 설치·노출 두 축만 본다. */
export interface CreativeRatios {
  cpi: Ratio;
  ctr: Ratio;
  /** 클릭당 비용 — `aggRatios`가 같은 모수 게이트로 이미 계산한다(2026-08-24 노출) */
  cpc: Ratio;
}

export function creativeRatios(src: {
  spend: number;
  installs: number;
  clicks: number;
  impressions: number;
  hasInstalls: boolean;
}): CreativeRatios {
  const r = aggRatios({ ...src, conversions: 0, hasConversions: false });
  return { cpi: r.cpi, ctr: r.ctr, cpc: r.cpc };
}

/** 표시용 반올림 — 원 단위 비용은 정수, 퍼센트는 소수 2자리. 값이 없으면 null을 유지한다. */
export const roundKrw = (r: Ratio): number | null => (r.value == null ? null : Math.round(r.value));
export const roundPct = (r: Ratio): number | null =>
  r.value == null ? null : Number(r.value.toFixed(2));

/**
 * 비율 기준 정렬 비교자 — **게이트에 막힌 행은 정렬 방향과 무관하게 항상 뒤로 보낸다.**
 *
 * 이게 없으면 표가 거짓말을 한다: null을 0으로 취급하면 오름차순 효율 1위가 "모수 1건" 행이 되고,
 * `Infinity`로 취급하면 내림차순 1위가 같은 행이 된다. 값이 없는 행은 순위에 오를 자격이 없다.
 */
export function compareRatioValues(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: "asc" | "desc" = "asc"
): number {
  const av = a ?? null;
  const bv = b ?? null;
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return (av - bv) * (dir === "asc" ? 1 : -1);
}
