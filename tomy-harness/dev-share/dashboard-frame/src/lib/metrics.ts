// 고방 핵심지표 — GA4 실연동(weekly-performance와 동일 정의).
// 지표: 활성사용자·신규·재방문·세션 + 재방문율(파생). 재방문은 newVsReturning으로 정확 조회.
// 차원: 스트림(web/android/ios) × 유입 source/medium(raw) × 일자.
// 기간 선택 시 직전 동일길이 기간(previous)을 함께 조회해 증감 비교.
// 실소스=GA4 Data API(src/lib/ga4.ts). 미설정/실패 시 픽스처 폴백.

import { shiftDays, weekStartSunday } from './period';

export type Platform = 'web' | 'android' | 'ios';
export type MetricName = 'activeUsers' | 'newUsers' | 'returningUsers' | 'sessions';

// 지표 원본 1행(일자 × 스트림 × 채널 × 지표). GA4도 이 형태로 정규화해 담는다.
// returningUsers 행은 채널 없이 스트림만 부여(newVsReturning 쿼리 출처).
export type MetricRecord = {
  date: string; // 'YYYY-MM-DD'
  metric: MetricName;
  value: number;
  platform?: Platform; // 스트림(web/android/ios)
  channel?: string; // 유입 source/medium raw (예: 'google / organic')
};

export const PLATFORMS: Platform[] = ['web', 'android', 'ios'];

export const PLATFORM_LABEL: Record<Platform, string> = {
  web: '웹',
  android: '안드로이드',
  ios: 'iOS',
};
export const METRIC_LABEL: Record<MetricName, string> = {
  activeUsers: '활성 사용자',
  newUsers: '신규 사용자',
  returningUsers: '재방문 사용자',
  sessions: '세션',
};

// GA4 스트림명 → 계약 platform.
export const STREAM_TO_PLATFORM: Record<string, Platform> = {
  'Gobang - WEB': 'web',
  'Gobang - WEB_Android_Native': 'android',
  'Gobang - WEB_IOS_Native': 'ios',
};

export type MetricFilters = {
  from?: string;
  to?: string;
  platform?: Platform | '';
  channel?: string; // raw source/medium 완전일치
};

// 필터: 지정된 차원만 좁힌다. 해당 차원이 없는 행(스트림/채널 미부여)은 그 필터를 통과.
export function applyMetricFilters(recs: MetricRecord[], f: MetricFilters): MetricRecord[] {
  return recs.filter(
    (r) =>
      (!f.from || r.date >= f.from) &&
      (!f.to || r.date <= f.to) &&
      (!f.platform || !r.platform || r.platform === f.platform) &&
      (!f.channel || !r.channel || r.channel === f.channel),
  );
}

const sumMetric = (recs: MetricRecord[], m: MetricName) =>
  recs.reduce((s, r) => (r.metric === m ? s + r.value : s), 0);

export type MetricTotals = {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
  returnRate: number; // 재방문/활성 (정확), 재방문 없으면 (활성-신규)/활성 근사
};

export function aggregateMetrics(recs: MetricRecord[]): MetricTotals {
  const activeUsers = sumMetric(recs, 'activeUsers');
  const newUsers = sumMetric(recs, 'newUsers');
  const returningUsers = sumMetric(recs, 'returningUsers');
  const ret = returningUsers > 0 ? returningUsers : Math.max(0, activeUsers - newUsers);
  return {
    activeUsers,
    newUsers,
    returningUsers,
    sessions: sumMetric(recs, 'sessions'),
    returnRate: activeUsers > 0 ? Math.min(1, ret / activeUsers) : 0,
  };
}

// 이전기간 대비 증감률. prev 0이면 cur>0일 때 +100%, 아니면 0.
export const deltaPct = (cur: number, prev: number): number =>
  prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0;

export const distinctDateCount = (recs: MetricRecord[]) => new Set(recs.map((r) => r.date)).size;

export const uniqueDates = (recs: MetricRecord[]) => [...new Set(recs.map((r) => r.date))].sort();

// 데이터에 존재하는 채널(raw) 목록 — 세션 많은 순.
export function channelsInData(recs: MetricRecord[]): string[] {
  const map = new Map<string, number>();
  for (const r of recs) {
    if (!r.channel) continue;
    map.set(r.channel, (map.get(r.channel) ?? 0) + (r.metric === 'sessions' ? r.value : 0));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

// 세션 상위 N개 채널(raw).
export const topChannels = (recs: MetricRecord[], n: number): string[] =>
  channelsInData(recs).slice(0, n);

// ── 추이(일/주 버킷) ────────────────────────────────────────────────
export type Bucket = 'day' | 'week';
export type SeriesPoint = { key: string; value: number };

const bucketKey = (iso: string, bucket: Bucket) => (bucket === 'week' ? weekStartSunday(iso) : iso);

export function seriesByDate(
  recs: MetricRecord[],
  metric: MetricName,
  bucket: Bucket = 'day',
): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const r of recs) {
    if (r.metric !== metric) continue;
    const key = bucketKey(r.date, bucket);
    map.set(key, (map.get(key) ?? 0) + r.value);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => ({ key, value }));
}

// 멀티라인 추이(스트림별): [{ key, web, android, ios }]
export type PlatformSeriesPoint = { key: string } & Partial<Record<Platform, number>>;

export function seriesByPlatform(
  recs: MetricRecord[],
  metric: MetricName,
  bucket: Bucket = 'day',
): PlatformSeriesPoint[] {
  const map = new Map<string, Record<Platform, number>>();
  for (const r of recs) {
    if (r.metric !== metric || !r.platform) continue;
    const key = bucketKey(r.date, bucket);
    const e = map.get(key) ?? { web: 0, android: 0, ios: 0 };
    e[r.platform] += r.value;
    map.set(key, e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => ({ key, ...v }));
}

// 멀티라인 추이(채널별): [{ key, [channel]: value }]. 지정 채널·지표만.
export type ChannelSeriesPoint = { key: string } & Record<string, number | string>;

export function multiSeriesByChannel(
  recs: MetricRecord[],
  channels: string[],
  metric: MetricName = 'sessions',
  bucket: Bucket = 'day',
): ChannelSeriesPoint[] {
  const set = new Set(channels);
  const map = new Map<string, Record<string, number>>();
  for (const r of recs) {
    if (r.metric !== metric || !r.channel || !set.has(r.channel)) continue;
    const key = bucketKey(r.date, bucket);
    const e = map.get(key) ?? Object.fromEntries(channels.map((c) => [c, 0]));
    e[r.channel] = (e[r.channel] ?? 0) + r.value;
    map.set(key, e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => ({ key, ...v }));
}

// ── 구성 도넛 ──────────────────────────────────────────────────────
export type Slice = { key: string; label: string; value: number };

// 채널 구성(지표) — 상위 N + 기타.
export function compositionByChannel(recs: MetricRecord[], metric: MetricName = 'sessions', topN = 7): Slice[] {
  const map = new Map<string, number>();
  for (const r of recs) {
    if (r.metric !== metric || !r.channel) continue;
    map.set(r.channel, (map.get(r.channel) ?? 0) + r.value);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, topN);
  const restSum = sorted.slice(topN).reduce((s, [, v]) => s + v, 0);
  const out: Slice[] = head.filter(([, v]) => v > 0).map(([key, value]) => ({ key, label: key, value }));
  if (restSum > 0) out.push({ key: '__rest__', label: '기타', value: restSum });
  return out;
}

// 스트림 구성 — 선택 지표의 스트림별 점유.
export function compositionByPlatform(recs: MetricRecord[], metric: MetricName): Slice[] {
  return PLATFORMS.map((p) => ({
    key: p,
    label: PLATFORM_LABEL[p],
    value: recs.reduce((s, r) => (r.metric === metric && r.platform === p ? s + r.value : s), 0),
  })).filter((x) => x.value > 0);
}

// ── 채널/플랫폼별 지표 테이블 ────────────────────────────────────────
export type GroupDim = 'channel' | 'platform';
export type TableRow = {
  key: string;
  label: string;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
  returnRate: number;
};

export function tableBy(recs: MetricRecord[], dim: GroupDim): TableRow[] {
  const acc = new Map<string, { activeUsers: number; newUsers: number; returningUsers: number; sessions: number }>();
  for (const r of recs) {
    const k = dim === 'channel' ? r.channel : r.platform;
    if (!k) continue;
    const e = acc.get(k) ?? { activeUsers: 0, newUsers: 0, returningUsers: 0, sessions: 0 };
    if (r.metric === 'activeUsers') e.activeUsers += r.value;
    else if (r.metric === 'newUsers') e.newUsers += r.value;
    else if (r.metric === 'returningUsers') e.returningUsers += r.value;
    else if (r.metric === 'sessions') e.sessions += r.value;
    acc.set(k, e);
  }
  return [...acc.entries()]
    .map(([key, v]) => {
      const ret = v.returningUsers > 0 ? v.returningUsers : Math.max(0, v.activeUsers - v.newUsers);
      return {
        key,
        label: dim === 'platform' ? PLATFORM_LABEL[key as Platform] : key,
        ...v,
        returnRate: v.activeUsers > 0 ? Math.min(1, ret / v.activeUsers) : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

// ── 픽스처(결정론적 — SSR/CSR 일관 + 테스트 안정) ───────────────────────
const FIXTURE_ANCHOR = '2026-07-19';
const FIXTURE_DAYS = 84; // 이전기간(직전 42일) 비교까지 픽스처로 가능하게 넉넉히

function isoBack(anchor: string, n: number): string {
  const d = new Date(anchor + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const PW: Record<Platform, number> = { web: 0.6, android: 0.26, ios: 0.14 };
const FIXTURE_CHANNELS: { channel: string; w: number }[] = [
  { channel: '(direct) / (none)', w: 0.3 },
  { channel: 'google / organic', w: 0.24 },
  { channel: 'naver / organic', w: 0.18 },
  { channel: 'l.instagram.com / referral', w: 0.1 },
  { channel: 'naver / cpc', w: 0.08 },
  { channel: 'youtube.com / referral', w: 0.06 },
  { channel: 'blog.naver.com / referral', w: 0.04 },
];
const BASE: Record<MetricName, number> = {
  activeUsers: 900,
  newUsers: 560,
  returningUsers: 340,
  sessions: 1400,
};

function buildFixture(): MetricRecord[] {
  const out: MetricRecord[] = [];
  for (let i = FIXTURE_DAYS - 1; i >= 0; i--) {
    const date = isoBack(FIXTURE_ANCHOR, i);
    const dow = new Date(date + 'T00:00:00Z').getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const trend = 1 + (FIXTURE_DAYS - 1 - i) * 0.002;
    for (const platform of PLATFORMS) {
      // returningUsers: 채널 없이 스트림만(실제 newVsReturning 쿼리 형태)
      const rv = Math.round(BASE.returningUsers * PW[platform] * weekend * trend);
      if (rv > 0) out.push({ date, metric: 'returningUsers', value: rv, platform });
      // active/new/sessions: 스트림 × 채널
      for (const metric of ['activeUsers', 'newUsers', 'sessions'] as MetricName[]) {
        for (const { channel, w } of FIXTURE_CHANNELS) {
          const v = Math.round(BASE[metric] * PW[platform] * w * weekend * trend);
          if (v <= 0) continue;
          out.push({ date, metric, value: v, platform, channel });
        }
      }
    }
  }
  return out;
}

export const METRICS_FIXTURE: MetricRecord[] = buildFixture();

// ── 요일별(일~토) ────────────────────────────────────────────────────
// 주 경계가 일~토라 요일 축도 일요일부터 — 주별 버킷과 시작 요일이 다르면 같은 화면에서 서로 안 맞는다.
const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6]; // 일→토
export function seriesByWeekday(recs: MetricRecord[], metric: MetricName): SeriesPoint[] {
  const sums = new Array(7).fill(0);
  for (const r of recs) {
    if (r.metric !== metric) continue;
    sums[new Date(r.date + 'T00:00:00Z').getUTCDay()] += r.value;
  }
  return WEEKDAY_ORDER.map((i) => ({ key: WEEKDAY_LABEL[i], value: sums[i] }));
}

// ── 기기별(deviceCategory) — GA4 별도 쿼리 결과(current 기준) ──────────
export type DeviceSlice = { key: string; label: string; value: number };
export const DEVICE_LABEL: Record<string, string> = {
  mobile: '모바일',
  desktop: 'PC',
  tablet: '태블릿',
};
export const METRICS_FIXTURE_DEVICES: DeviceSlice[] = [
  { key: 'mobile', label: '모바일', value: 6200 },
  { key: 'desktop', label: 'PC', value: 2100 },
  { key: 'tablet', label: '태블릿', value: 240 },
];

// 이전기간 픽스처: 앵커 이전 42일(현재 42일의 직전)로 잘라 previous 폴백에 사용.
export const METRICS_FIXTURE_CURRENT = METRICS_FIXTURE.filter((r) => r.date > isoBack(FIXTURE_ANCHOR, 42));
export const METRICS_FIXTURE_PREVIOUS = METRICS_FIXTURE.filter((r) => r.date <= isoBack(FIXTURE_ANCHOR, 42));

// ── 월별 MAU 픽스처(통합대시보드 안B 폴백, 결정론) ────────────────
// MAU는 일별 합산이 아닌 '월 순 활성사용자'.
export type MonthlyMau = { month: string; mau: number };
export const MONTHLY_MAU_FIXTURE: MonthlyMau[] = [
  { month: '2026-02', mau: 38200 },
  { month: '2026-03', mau: 40100 },
  { month: '2026-04', mau: 41800 },
  { month: '2026-05', mau: 44300 },
  { month: '2026-06', mau: 43800 },
  { month: '2026-07', mau: 46200 },
];

// ── 스트림별 월 MAU ──────────────────────────────────────
// ⚠️ 스트림 MAU의 합은 총 MAU와 다르다 — 웹·앱을 함께 쓴 사용자가 스트림마다 1명씩 세진다.
// 그래서 누적(스택) 표현은 금지고 선 비교만 유효하다. 총 MAU도 별도 조회로 받는다.
export type MonthlyMauStream = { month: string; platform: Platform; mau: number };

// 차트 1행 = 한 달, 스트림이 컬럼. 값 없는 스트림은 0으로 채워 선이 끊기지 않게 한다.
export type MauStreamPoint = { key: string; label: string } & Record<Platform, number>;

export function streamMauSeries(rows: MonthlyMauStream[]): MauStreamPoint[] {
  const byMonth = new Map<string, MauStreamPoint>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}$/.test(r.month ?? '')) continue;
    let p = byMonth.get(r.month);
    if (!p) {
      p = { key: r.month, label: `${Number(r.month.slice(5, 7))}월`, web: 0, android: 0, ios: 0 };
      byMonth.set(r.month, p);
    }
    p[r.platform] += r.mau;
  }
  return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// ── 주별 WAU(주 순 활성사용자) ──────────────────────────────
// MAU와 같은 유니크 지표라 일별 합산이 아니라 GA4 yearWeek 차원으로 직접 조회한다(주 경계 일~토).
// 월 MAU는 점이 6개뿐이라 최근 흐름이 안 보인다 → 같은 카드에서 주 단위로 갈아끼울 수 있게 둔다.
export type WeeklyWau = { weekStart: string; wau: number };
export type WeeklyWauStream = { weekStart: string; platform: Platform; wau: number };

// GA4 yearWeek 조회 결과 정리 — 두 가지를 버린다.
//  ① 기간에 온전히 안 들어간 가장자리 주: 반쪽만 집계돼 그래프 양끝이 항상 급락으로 보인다.
//  ② 같은 주가 두 번 온 경우(연말·연초 202553/202601 분할): 유니크라 합칠 수 없다 → 통째 제외.
const weekEndSunStart = (weekStart: string) => shiftDays(weekStart, 6);

function cleanWeeks<T extends { weekStart: string }>(
  rows: T[],
  from: string,
  to: string,
  keyOf: (r: T) => string,
): T[] {
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(keyOf(r), (seen.get(keyOf(r)) ?? 0) + 1);
  return rows
    .filter((r) => seen.get(keyOf(r)) === 1)
    .filter((r) => (!from || r.weekStart >= from) && (!to || weekEndSunStart(r.weekStart) <= to))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export const cleanWeeklyWau = (rows: WeeklyWau[], from: string, to: string) =>
  cleanWeeks(rows, from, to, (r) => r.weekStart);

export const cleanWeeklyWauStream = (rows: WeeklyWauStream[], from: string, to: string) =>
  cleanWeeks(rows, from, to, (r) => `${r.weekStart}|${r.platform}`);

// 차트 1행 = 한 주, 스트림이 컬럼. MAU판(streamMauSeries)과 같은 규칙 — 스택 금지, 선 비교만.
export function streamWauSeries(rows: WeeklyWauStream[]): MauStreamPoint[] {
  const byWeek = new Map<string, MauStreamPoint>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.weekStart ?? '')) continue;
    let p = byWeek.get(r.weekStart);
    if (!p) {
      p = { key: r.weekStart, label: weekLabel(r.weekStart), web: 0, android: 0, ios: 0 };
      byWeek.set(r.weekStart, p);
    }
    p[r.platform] += r.wau;
  }
  return [...byWeek.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// 주 라벨 = 시작일(일요일) '7.19'.
export const weekLabel = (weekStart: string) =>
  `${Number(weekStart.slice(5, 7))}.${Number(weekStart.slice(8, 10))}`;

// ── 채널(소스/매체)별 순 활성 사용자 ────────────────────────────────
// 🚨 스트림별과 **같은 성격**이다: 총계를 쪼갠 게 아니라 별도 조회다(유니크 지표라 채널 합 ≠ 총계 —
// 한 사람이 두 채널로 들어오면 양쪽에 세어진다). 그래서 총계 차트와 같은 축에 겹치거나 쌓지 않는다.
// ⚠️ 일별 레코드를 주·월로 접어 만들 수 없다(같은 사람이 여러 날 오면 중복) → GA4 yearWeek/yearMonth
//    × sessionSourceMedium 조회가 정본(lib/ga4.ts).
export type WeeklyWauChannel = { weekStart: string; channel: string; wau: number };
export type MonthlyMauChannel = { month: string; channel: string; mau: number };

// 주 정리 규칙은 스트림판과 같다(반쪽 주·같은 주 중복 제거) — 판정 키만 채널이다.
export const cleanWeeklyWauChannel = (rows: WeeklyWauChannel[], from: string, to: string) =>
  cleanWeeks(rows, from, to, (r) => `${r.weekStart}|${r.channel}`);

/**
 * 추이 차트에 그리는 채널 수(2026-09-14 6 → 10). 소스/매체 표가 펼쳐 두는 행 수(10)와 같아
 * "표 위쪽 10줄이 어떻게 움직였나"를 차트에서 그대로 따라갈 수 있다. 그 밖 롱테일은 표 담당.
 */
export const CHANNEL_TREND_TOP = 10;

/** 차트 1행 = 한 버킷, 채널이 컬럼. 채널 목록은 데이터가 정하므로 컬럼을 고정할 수 없다. */
export type ChannelTrendPoint = { key: string; label: string } & Record<string, number | string>;

/**
 * 창 전체 합이 큰 상위 N 채널. GA4 소스/매체는 referral 롱테일이 수백 개라 전부 그리면 선이 뭉친다.
 * ⚠️ 여기서 쓰는 '합'은 **순위용**이다 — 화면에 값으로 내지 않는다(유니크 지표는 기간끼리 못 더한다).
 */
export function topChannelsOf(rows: { channel: string; value: number }[], n = 6): string[] {
  const total = new Map<string, number>();
  for (const r of rows) {
    if (!r.channel) continue;
    total.set(r.channel, (total.get(r.channel) ?? 0) + r.value);
  }
  return [...total.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([channel]) => channel);
}

// 버킷 하나에 그 채널 행이 없으면 0으로 채운다(스트림판과 같은 규칙 — 컬럼이 비면 선이 끊긴다).
// 버킷 자체가 없는 구간(수집 전)은 행을 만들지 않으므로 0 바닥이 생기지 않는다.
function channelPoints(
  rows: { bucket: string; channel: string; value: number }[],
  channels: string[],
  labelOf: (bucket: string) => string,
): ChannelTrendPoint[] {
  const keep = new Set(channels);
  const byBucket = new Map<string, ChannelTrendPoint>();
  for (const r of rows) {
    if (!keep.has(r.channel)) continue;
    let p = byBucket.get(r.bucket);
    if (!p) {
      p = { key: r.bucket, label: labelOf(r.bucket), ...Object.fromEntries(channels.map((c) => [c, 0])) };
      byBucket.set(r.bucket, p);
    }
    p[r.channel] = (Number(p[r.channel]) || 0) + r.value;
  }
  return [...byBucket.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function channelWauSeries(rows: WeeklyWauChannel[], channels: string[]): ChannelTrendPoint[] {
  return channelPoints(
    rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.weekStart ?? '')).map((r) => ({ bucket: r.weekStart, channel: r.channel, value: r.wau })),
    channels,
    weekLabel,
  );
}

export function channelMauSeries(rows: MonthlyMauChannel[], channels: string[]): ChannelTrendPoint[] {
  return channelPoints(
    rows.filter((r) => /^\d{4}-\d{2}$/.test(r.month ?? '')).map((r) => ({ bucket: r.month, channel: r.channel, value: r.mau })),
    channels,
    (ym) => `${Number(ym.slice(5, 7))}월`,
  );
}

// 픽스처: 총 MAU에 스트림 비중을 얹는다(합 105% — 중복 유저를 일부러 남겨 '합≠총계'를 형태로 보여준다).
export const MONTHLY_MAU_STREAM_FIXTURE: MonthlyMauStream[] = MONTHLY_MAU_FIXTURE.flatMap(({ month, mau }) => [
  { month, platform: 'web' as Platform, mau: Math.round(mau * 0.62) },
  { month, platform: 'android' as Platform, mau: Math.round(mau * 0.3) },
  { month, platform: 'ios' as Platform, mau: Math.round(mau * 0.13) },
]);
