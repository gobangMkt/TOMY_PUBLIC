import { channelColor } from "./theme";
// 타입만 가져온다(컴파일 시 지워짐) — 런타임 순환 참조를 만들지 않는다.
import type { CreativeRatios } from "./ratios";
import type { NetworkMix } from "./networkMix";

export type Channel = "google" | "meta" | "apple" | "naver" | "kakao";

export const CHANNELS: Channel[] = ["google", "meta", "apple", "naver", "kakao"];

/** cpcOnly 채널(MMP 없음·설치/전환 미측정) 배지 라벨 — 화면마다 다시 쓰지 않는다 */
export const CPC_ONLY_LABEL = "클릭 과금 전용";

/**
 * 집행 층(level) → 사람 언어. `metrics_daily.level`·`entities.level`이 매체 원어를 그대로 담아
 * 화면에 `campaign`/`adset`이 샐 수 있다(크래프트 11번 "개발자 언어 노출 금지").
 * 층을 말해야 하는 자리가 늘어나므로(액션 큐 제외 사유·성과 하이라이트) 어휘로 고정한다.
 */
export const LEVEL_LABEL: Record<string, string> = {
  campaign: "캠페인",
  adset: "광고그룹",
  ad: "광고",
  keyword: "키워드",
};

export const levelLabel = (level: string) => LEVEL_LABEL[level] ?? level;

/** 자격증명 미보유 채널(Apple·Kakao 등) 배지 라벨 — 채널은 목록에 남기되 숫자는 날조하지 않는다 */
export const NOT_CONNECTED_LABEL = "연동안됨";

export const CHANNEL_META: Record<
  Channel,
  { label: string; color: string; cpcOnly: boolean; adManagerUrl: string }
> = {
  google: {
    label: "Google",
    color: channelColor.google,
    cpcOnly: false,
    adManagerUrl: "https://ads.google.com/aw/campaigns",
  },
  meta: {
    label: "Meta",
    color: channelColor.meta,
    cpcOnly: false,
    adManagerUrl: "https://adsmanager.facebook.com/adsmanager",
  },
  apple: {
    label: "Apple Search Ads",
    color: channelColor.apple,
    cpcOnly: false,
    adManagerUrl: "https://app.searchads.apple.com",
  },
  naver: {
    label: "Naver",
    color: channelColor.naver,
    cpcOnly: true,
    adManagerUrl: "https://searchad.naver.com",
  },
  kakao: {
    label: "Kakao Moment",
    color: channelColor.kakao,
    cpcOnly: false,
    adManagerUrl: "https://moment.kakao.com",
  },
};

/**
 * 채널 → write 스위치 env 이름 — 정본(2026-08-21 신설).
 *
 * 같은 5줄이 `api/entities/{budget,pause}/route.ts`·`api/projects/[key]/campaigns/route.ts`·
 * `entities/[channel]/[id]/page.tsx` 4곳에 토씨 하나 안 틀리고 복제돼 있었다(2026-08-21 감사
 * 발견) — 채널이 늘거나 env 이름이 바뀌면 하나를 빠뜨릴 위험이 있고, 그러면 에러 메시지가
 * 안내하는 env 이름이 실제와 달라 write를 켜려는 사람을 잘못된 방향으로 보낸다.
 */
export const WRITE_SWITCH_ENV: Record<Channel, string> = {
  meta: "META_WRITE_ENABLED",
  google: "GOOGLE_ADS_WRITE_ENABLED",
  naver: "NAVER_WRITE_ENABLED",
  apple: "ASA_WRITE_ENABLED",
  kakao: "KAKAO_WRITE_ENABLED",
};

// 채널 일예산 (KRW) — **채널 합산 상한은 불가침**이다(코드가 지킨다: budgetGuard).
// 개별 집행의 일예산은 2026-08-21부터 사람이 Paid 데스크에서 조정한다(캠페인 상세 → 일예산 조정,
// api/entities/budget). 그 조정도 이 상한 안에서만 통과한다 — 채널 총액을 올리는 건 여전히 사람이
// 이 상수를 직접 바꾸는 일이다.
// 0 = 아직 집행하지 않는 채널. 신규 캠페인 생성 시 예산은 생성 요청에서 별도로 받는다.
export const CHANNEL_DAILY_BUDGET: Record<Channel, number> = {
  google: 200000,
  meta: 30000,
  apple: 30000,
  naver: 150000,
  kakao: 0,
};

export interface MetricRow {
  date: string;
  channel: Channel;
  entity_id: string;
  level: string;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  installs: number | null;
  conversions: number | null;
  ctr: number | null;
  cpc: number | null;
  cpi: number | null;
  is_learning: boolean;
  // 웹 축 — GA4에서 UTM으로 조인해 채운다. 매체가 주는 값이 아니므로 어댑터는 비워둔다.
  sessions?: number | null;
  conversions_ga4?: number | null;
  leads?: number | null;
  revenue?: number | null;
  // 검색 노출 맥락(0022) — 못 읽은 날·채널은 null/미지정. 0으로 채우지 않는다.
  /** 평균 노출 순위(Naver). 1이 최상단, 클수록 밀림 */
  avg_rank?: number | null;
  /** 노출 점유율 0~1(Apple). Google 앱 캠페인은 주지 않는다 */
  impression_share?: number | null;
}

/**
 * 구글 입찰 전략 코드 → 화면 어휘. 코드값을 그대로 노출하면(`MAXIMIZE_CONVERSION_VALUE`)
 * 읽는 사람이 매체 콘솔 용어와 대조하지 못한다 — 콘솔이 쓰는 한국어 이름에 맞춘다.
 */
export const BID_STRATEGY_LABEL: Record<string, string> = {
  TARGET_CPA: "타겟 CPA",
  TARGET_ROAS: "타겟 ROAS",
  MAXIMIZE_CONVERSIONS: "전환수 최대화",
  MAXIMIZE_CONVERSION_VALUE: "전환 가치 극대화",
  TARGET_SPEND: "클릭수 최대화",
  TARGET_IMPRESSION_SHARE: "노출 점유율",
  TARGET_CPM: "타겟 CPM",
  TARGET_CPV: "타겟 CPV",
  MANUAL_CPC: "수동 CPC",
  MANUAL_CPV: "수동 CPV",
  MANUAL_CPM: "수동 CPM",
  COMMISSION: "전환당 과금",
  PERCENT_CPC: "비율 CPC",
};

/** 코드값을 모르면 지어내지 않고 원문 그대로 보여준다 — 구글이 새 전략을 추가해도 화면이 거짓말하지 않는다. */
export function bidStrategyLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return BID_STRATEGY_LABEL[code] ?? code;
}

export interface EntityRow {
  id: string;
  channel: Channel;
  level: string;
  parent_id: string | null;
  name: string;
  status: string | null;
  // GA4 조인 키 — 생성 시 utm.ts 규약으로 박는다. 외부에서 만든 캠페인은 null일 수 있다.
  utm_campaign?: string | null;
  project_id?: number | null;
  // 입찰 전략과 설정 타겟. 2026-08-17부터 구글이 예산 제한 상태에서도 설정 타겟을 그대로
  // 적용하므로, 설정값을 실적과 대조하려면 적재가 필요하다. 타겟 없는 전략이면 값은 null.
  bid_strategy?: string | null;
  target_cpa?: number | null;   // 통화 단위(KRW). micros 아님
  target_roas?: number | null;  // 배수(2.5 = 250%)
  /**
   * 입찰가(KRW). **타겟과 다른 값이다** — 타겟은 "이 금액에 맞춰 달라"는 목표고,
   * 입찰가는 "이 금액까지 부른다"는 상한이다. Naver `bidAmt`·Apple `defaultBidAmount`가
   * 여기 들어간다. 둘을 `target_cpa` 한 칸에 섞으면 화면이 상한을 목표라고 말하게 된다.
   */
  bid_amount?: number | null;
  /**
   * 매체가 매긴 캠페인 상태(0020, 현재 Google만). 하락 원인 후보(예산 제한·입찰 제약·학습 중)를 도구가 먼저
   * 띄우려고 싣는다(groupSignals). 조회에 실패했거나 주지 않는 매체면 null — 정상이라는 뜻이 아니다.
   *   primary_status    : ELIGIBLE · LIMITED · LEARNING · MISCONFIGURED · PAUSED …
   *   status_reasons    : BUDGET_CONSTRAINED · BID_STRATEGY_LIMITED … (primary_status의 사유들)
   *   bid_system_status : 입찰 전략 상태 — LEARNING_* · LIMITED_BY_* · MISCONFIGURED_* · ENABLED …
   */
  primary_status?: string | null;
  status_reasons?: string[] | null;
  bid_system_status?: string | null;
}

export interface Anomaly {
  id?: number;
  channel: Channel;
  entity_id: string | null;
  kind: string;
  severity: "info" | "warning" | "critical";
  message: string;
  metric_snapshot?: Record<string, unknown>;
  notified?: boolean;
}

export interface Suggestion {
  id?: number;
  kind: "budget_realloc" | "creative_dev" | "pause" | "scale";
  channel: Channel | null;
  title: string;
  rationale: string;
  payload?: Record<string, unknown>;
  status?: "pending" | "accepted" | "dismissed";
  confidence?: "low" | "medium" | "high";
  created_at?: string;
}

export interface CopyDraft {
  id?: number;
  channel: Channel | null;
  source_creative_id: string | null;
  angle: string;
  headline: string;
  body: string;
  status?: "draft" | "accepted" | "rejected";
  reviewer_note?: string | null;
  created_at?: string;
}

export interface CreativeRow {
  id: string;
  channel: Channel;
  entity_id: string | null;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  /** 영상 광고의 썸네일(Meta). 이미지 광고는 image_url이 곧 화면용이다 */
  thumb_url?: string | null;
  /** Meta 영상 광고의 video_id — 있으면 영상 소재다 */
  video_id?: string | null;
  status: string | null;
}

/**
 * 소재 한 건의 기간 합산 성과.
 *
 * ⚠️ `ctr`·`cpi`는 **모수 게이트를 통과했을 때만** 값이 있다(`lib/ratios.ts`).
 * 예전엔 측정 불가를 0으로 채웠는데, 그러면 CPI ₩0이 "가장 싼 소재"로 순위 1위가 됐다.
 * 0은 "공짜로 설치를 받았다"는 뜻이라 없는 사실이다 — 그래서 null이고, 이유는 `ratios`에 남는다.
 */
export interface CreativeMetric extends CreativeRow {
  impressions: number;
  clicks: number;
  spend: number;
  installs: number;
  /** 설치가 계측된 소재인지 — 설치 0과 설치 미계측을 구분한다(CPC 전용 채널은 소재 설치가 없다) */
  hasInstalls: boolean;
  ctr: number | null;
  cpi: number | null;
  /** 비율을 못 낸 이유(미계측 / 모수 부족) — 화면이 "—" 옆에 그대로 붙여 쓴다 */
  ratios: CreativeRatios;
}

/**
 * 바꿀 수 있는 문구 한 단위(ad_text_units, 0012) — 소재 개선 루프의 수집 단위.
 * Google = 광고의 텍스트 애셋 하나, Naver = 광고 하나(제목+설명 한 쌍). 지표는 window 기간 합계다.
 */
export interface AdTextUnit {
  id: string;
  channel: Channel;
  campaign_id: string;
  adgroup_id: string;
  adgroup_name: string | null;
  ad_id: string;
  asset_id: string | null;
  field: "headline" | "body" | "pair";
  text: string;
  body: string | null;
  perf_label: string | null;
  review_status: string | null;
  status: string | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
  window_since: string;
  window_until: string;
  /** 마지막으로 매체에서 읽은 시각(DB 기본값) — 화면의 "마지막 수집" 표시용. 수집 전 객체엔 없다 */
  seen_at?: string | null;
  /**
   * 지면별 실적(0020, Google만) — 같은 기간 합계를 지면 코드(SEARCH·CONTENT·YOUTUBE…)로 나눈 것.
   * 지면 조회가 실패했거나 지면을 안 주는 매체면 null. 지면 탓을 소재 탓으로 오진하지 않게 쓴다(networkMix.ts).
   */
  network_mix?: NetworkMix | null;
}

/** 바꿀 수 있는 문구 단위(headline·body·pair)만 — 이미지·영상은 교체 대상이 아니다 */
export const TEXT_FIELDS = ["headline", "body", "pair"] as const;

/**
 * 이미지·영상 한 단위(ad_text_units 같은 표, 0013) — 보여주기용이라 교체 경로는 AdTextUnit만 탄다.
 * 문구가 없어 text에는 애셋 이름이 들어간다.
 */
export interface AdMediaUnit extends Omit<AdTextUnit, "field"> {
  field: "image" | "video";
  /** 이미지 원본 또는 영상 시청 링크 */
  media_url: string;
  /** 화면용 썸네일 */
  thumb_url: string;
}

/** 검색광고 키워드 한 개(search_keywords, 0012) — 지표는 window 기간 합계 */
export interface SearchKeyword {
  id: string;
  channel: Channel;
  campaign_id: string;
  adgroup_id: string;
  keyword: string;
  bid: number | null;
  use_group_bid: boolean | null;
  status: string | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  window_since: string;
  window_until: string;
}

/** creative_metrics_daily 적재용 — 소재 일자별 성과. 적응형 매핑이라 없는 값은 null 유지 */
export interface CreativeDailyRow {
  date: string;
  creative_id: string;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  installs: number | null;
  ctr: number | null;
  cpi: number | null;
}
