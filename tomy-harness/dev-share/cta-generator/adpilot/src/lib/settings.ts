import { Channel, CHANNEL_META } from "./types";

// 채널마다 "전환당 비용"의 정의가 다르다. 사용자가 설정에서 채널별로 선택.
//  - cpi: 소진 ÷ 설치수 (설치 측정 가능 채널)
//  - cpc: 소진 ÷ 클릭수 (CPC 전용 채널 / 클릭 기준 비교)
//  - cpa: 소진 ÷ 인앱전환수 (in-app conversion 측정 채널)
export type ConversionMetric = "cpi" | "cpc" | "cpa";

export const METRIC_LABEL: Record<ConversionMetric, string> = {
  cpi: "설치당 비용",
  cpc: "클릭당 비용",
  cpa: "인앱 전환당 비용",
};

export const METRIC_DESC: Record<ConversionMetric, string> = {
  cpi: "소진 ÷ 설치수",
  cpc: "소진 ÷ 클릭수",
  cpa: "소진 ÷ 인앱전환수",
};

export interface ChannelSetting {
  // 이 채널의 "핵심 전환당 비용"으로 사용할 지표
  metric: ConversionMetric;
  // 비교 가중치 (1.0 = 가중치 영향 없음). 가중 전환비용 = 전환비용 × weight
  weight: number;
}

export type ChannelSettings = Record<Channel, ChannelSetting>;

export const DEFAULT_SETTINGS: ChannelSettings = {
  google: { metric: "cpi", weight: 1.0 },
  meta: { metric: "cpi", weight: 1.0 },
  apple: { metric: "cpi", weight: 1.0 },
  naver: { metric: "cpc", weight: 1.0 },
  kakao: { metric: "cpa", weight: 1.0 },
};

// CPC 전용 채널(MMP 없음·설치/전환 미측정)은 cpc만 선택 가능
export function availableMetrics(ch: Channel): ConversionMetric[] {
  return CHANNEL_META[ch].cpcOnly ? ["cpc"] : ["cpi", "cpc", "cpa"];
}

export const SETTINGS_STORAGE_KEY = "adpilot.channelSettings.v1";
export const WEIGHT_TOGGLE_KEY = "adpilot.weightApplied.v1";
