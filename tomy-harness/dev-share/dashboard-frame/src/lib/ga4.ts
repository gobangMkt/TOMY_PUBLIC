// GA4 Data API → MetricRecord[] 정규화 (서버 전용).
// 필요 env: GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS(=서비스계정 키 JSON 경로).
// current + previous(직전 동일길이) 2개 dateRange를 함께 조회해 증감 비교를 지원.
// weekly-performance와 동일 property(YOUR_GA4_PROPERTY)·서비스계정을 admin에서도 읽기만 한다.
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import {
  STREAM_TO_PLATFORM,
  DEVICE_LABEL,
  cleanWeeklyWau,
  cleanWeeklyWauChannel,
  cleanWeeklyWauStream,
  topChannelsOf,
  type MetricName,
  type MetricRecord,
  type DeviceSlice,
  type MonthlyMauStream,
  type WeeklyWau,
  type WeeklyWauChannel,
  type WeeklyWauStream,
} from './metrics';
import { weekStartFromYearWeek } from './period';
import type { WeeklyInquiry } from './inquiries';

export type DateRange = { from: string; to: string };
export type Ga4Result = { current: MetricRecord[]; previous: MetricRecord[]; devices: DeviceSlice[] };

const isoDate = (yyyymmdd: string) =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

export function ga4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

// 여러 dateRange 사용 시 각 행 dimensionValues 마지막에 range name('cur'/'prev')이 붙는다.
function pushInto(cur: MetricRecord[], prev: MetricRecord[], range: string, rec: MetricRecord) {
  if (range === 'prev') prev.push(rec);
  else cur.push(rec);
}

export async function fetchGa4Metrics(current: DateRange, previous: DateRange | null): Promise<Ga4Result> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GA4_PROPERTY_ID 미설정');

  const client = new BetaAnalyticsDataClient();
  const property = `properties/${propertyId}`;
  const dateRanges = [
    { startDate: current.from, endDate: current.to, name: 'cur' },
    ...(previous ? [{ startDate: previous.from, endDate: previous.to, name: 'prev' }] : []),
  ];

  const cur: MetricRecord[] = [];
  const prev: MetricRecord[] = [];

  // ① 스트림 × source/medium × 일자 → 활성·신규·세션
  const MAIN_METRICS: MetricName[] = ['activeUsers', 'newUsers', 'sessions'];
  const [main] = await client.runReport({
    property,
    dateRanges,
    dimensions: [{ name: 'date' }, { name: 'streamName' }, { name: 'sessionSourceMedium' }],
    metrics: MAIN_METRICS.map((name) => ({ name })),
    limit: 250000,
  });
  for (const row of main.rows ?? []) {
    const dv = row.dimensionValues ?? [];
    const date = isoDate(dv[0]?.value ?? '');
    const platform = STREAM_TO_PLATFORM[dv[1]?.value ?? ''];
    if (!platform) continue;
    const channel = dv[2]?.value || undefined;
    const range = dv[3]?.value ?? 'cur';
    MAIN_METRICS.forEach((metric, mi) => {
      const value = Number(row.metricValues?.[mi]?.value ?? 0);
      if (value > 0) pushInto(cur, prev, range, { date, metric, value, platform, channel });
    });
  }

  // ② 스트림 × 신규/재방문 × 일자 → 재방문 사용자수(정확)
  const [ret] = await client.runReport({
    property,
    dateRanges,
    dimensions: [{ name: 'date' }, { name: 'streamName' }, { name: 'newVsReturning' }],
    metrics: [{ name: 'activeUsers' }],
    limit: 250000,
  });
  for (const row of ret.rows ?? []) {
    const dv = row.dimensionValues ?? [];
    const date = isoDate(dv[0]?.value ?? '');
    const platform = STREAM_TO_PLATFORM[dv[1]?.value ?? ''];
    if (!platform) continue;
    if ((dv[2]?.value ?? '') !== 'returning') continue; // 재방문만
    const range = dv[3]?.value ?? 'cur';
    const value = Number(row.metricValues?.[0]?.value ?? 0);
    if (value > 0) pushInto(cur, prev, range, { date, metric: 'returningUsers', value, platform });
  }

  // ③ 기기별(deviceCategory) — current 기간만, 도넛용
  const devices: DeviceSlice[] = [];
  try {
    const [dev] = await client.runReport({
      property,
      dateRanges: [{ startDate: current.from, endDate: current.to }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });
    for (const row of dev.rows ?? []) {
      const key = row.dimensionValues?.[0]?.value ?? '';
      const value = Number(row.metricValues?.[0]?.value ?? 0);
      if (key && value > 0) devices.push({ key, label: DEVICE_LABEL[key] ?? key, value });
    }
    devices.sort((a, b) => b.value - a.value);
  } catch {
    // 기기 쿼리 실패는 치명적 아님 — 빈 배열로 진행
  }

  return { current: cur, previous: prev, devices };
}

// ── 문의수/조회수 이벤트(inquiry / branch_view) → 주간(월요일) 집계 ────────────────
// 문의수 화면·지표 대시보드의 GA4 소스. 실데이터를 WeeklyInquiry-호환으로 반환.
//  - inquiry → 문의수, branch_view → 조회수. GA4엔 U사장님/U중개사 구분 없음 → usajang* 에 담고 ujunggae*=0.
//  - 미설정/실패 시 빈 배열(화면은 픽스처 or 수동 데이터로 폴백).
const INQUIRY_EVENTS = ['inquiry', 'branch_view'] as const;

// 'YYYY-MM-DD' → 그 주의 월요일 ISO.
function weekMondayISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export async function fetchGa4Events(range: DateRange): Promise<WeeklyInquiry[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'date' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', inListFilter: { values: [...INQUIRY_EVENTS] } },
      },
      limit: 250000,
    });

    const byWeek = new Map<string, { inquiry: number; view: number }>();
    for (const row of rep.rows ?? []) {
      const dv = row.dimensionValues ?? [];
      const date = isoDate(dv[0]?.value ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const event = dv[1]?.value ?? '';
      const value = Number(row.metricValues?.[0]?.value ?? 0);
      const wk = weekMondayISO(date);
      const cur = byWeek.get(wk) ?? { inquiry: 0, view: 0 };
      if (event === 'inquiry') cur.inquiry += value;
      else if (event === 'branch_view') cur.view += value;
      byWeek.set(wk, cur);
    }

    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStart, v]) => ({
        weekStart,
        usajangInquiries: v.inquiry,
        usajangViews: v.view,
        ujunggaeInquiries: 0,
        ujunggaeViews: 0,
        productPurchases: 0,
      }));
  } catch {
    return [];
  }
}

// ── 기간 단위 총계(순 사용자) ──────────────────────────────────────────
// ⚠️ activeUsers·returningUsers는 유니크(비가산) 지표라, 날짜×스트림×채널로 쪼갠 행을
//    더하면 같은 사람이 여러 번 세어진다(실측 06.29~07.26: 합산 313,889 vs 참값 208,638 = 1.5배).
//    KPI 카드는 반드시 차원 없이 기간 전체로 한 번 조회한 이 값을 써야 한다.
//    (newUsers·sessions는 가산이라 합산해도 맞지만, 일관성·왕복 절약 위해 같이 가져온다.)
export type Ga4Totals = {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
};

export async function fetchGa4Totals(range: DateRange): Promise<Ga4Totals | null> {
  if (!ga4Configured()) return null;
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }],
    });
    const mv = rep.rows?.[0]?.metricValues ?? [];
    const num = (i: number) => Number(mv[i]?.value ?? 0);
    const activeUsers = num(0);
    const newUsers = num(1);
    return {
      activeUsers,
      newUsers,
      sessions: num(2),
      // 재방문자도 유니크라 별도 조회가 정확하나, 왕복을 늘리지 않고 활성-신규로 유도.
      // (GA4 newVsReturning 차원 조회는 활성 총계와 미세하게 안 맞는 경우가 있어 파생이 더 안전)
      returningUsers: Math.max(0, activeUsers - newUsers),
    };
  } catch {
    return null;
  }
}

// ── 기간 단위 소스/매체 (통합리포트·통합 대시보드 트래픽 구역) ──────────
// ⚠️ 일별·월별 표(fetchGa4MonthlySourceMedium)를 합산해 만들 수 없다 — activeUsers가 유니크라
//    날짜를 쪼갠 행을 더하면 같은 사용자를 여러 번 센다. 선택 기간을 **차원 없는 날짜 범위 하나**로
//    주고 sessionSourceMedium만 쪼개 조회해야 그 기간의 순 사용자가 나온다.
export type SourceMediumTotal = {
  sourceMedium: string;
  active: number;
  sessions: number;
  new: number;
};

export async function fetchGa4SourceMedium(range: DateRange): Promise<SourceMediumTotal[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
      limit: 1000,
    });
    const out: SourceMediumTotal[] = [];
    for (const row of rep.rows ?? []) {
      const sourceMedium = row.dimensionValues?.[0]?.value ?? '';
      if (!sourceMedium) continue;
      const mv = row.metricValues ?? [];
      const active = Number(mv[0]?.value ?? 0);
      if (active <= 0) continue;
      out.push({
        sourceMedium,
        active,
        sessions: Number(mv[1]?.value ?? 0),
        new: Number(mv[2]?.value ?? 0),
      });
    }
    return out.sort((a, b) => b.active - a.active);
  } catch {
    return [];
  }
}

// ── 월별 MAU(순 활성사용자) ────────────────────────────────────────────
// ⚠️ 일별 activeUsers를 월 합산하면 같은 사용자가 여러 날 활성일 때 중복 → MAU 아님.
// GA4 yearMonth 차원으로 월 단위 순 활성사용자를 직접 조회해야 정확한 MAU.
export type MonthlyMau = { month: string; mau: number };

export async function fetchGa4MonthlyMau(range: DateRange): Promise<MonthlyMau[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearMonth' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 100000,
    });
    const out: MonthlyMau[] = [];
    for (const row of rep.rows ?? []) {
      const ym = row.dimensionValues?.[0]?.value ?? ''; // 'YYYYMM'
      if (!/^\d{6}$/.test(ym)) continue;
      const mau = Number(row.metricValues?.[0]?.value ?? 0);
      if (mau > 0) out.push({ month: `${ym.slice(0, 4)}-${ym.slice(4, 6)}`, mau });
    }
    return out.sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

// ── 주별 WAU(주 순 활성사용자) ──────────────────────────────────────────
// MAU와 같은 이유로 일별 합산 금지 → GA4 yearWeek 차원으로 주 단위 순 사용자를 직접 조회한다.
// GA4의 주도 일요일 시작이라 이 프로젝트의 주 경계(일~토, lib/period.ts)와 그대로 맞물린다
// (실측 2026 week30 = 7.19~7.25 = 61,930, 대시보드 '지난주 WAU'와 동일).
export async function fetchGa4WeeklyWau(range: DateRange): Promise<WeeklyWau[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearWeek' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 100000,
    });
    const rows: WeeklyWau[] = [];
    for (const row of rep.rows ?? []) {
      const weekStart = weekStartFromYearWeek(row.dimensionValues?.[0]?.value ?? '');
      if (!weekStart) continue;
      rows.push({ weekStart, wau: Number(row.metricValues?.[0]?.value ?? 0) });
    }
    return cleanWeeklyWau(rows, range.from, range.to);
  } catch {
    return [];
  }
}

// 스트림별 주 WAU — 총 WAU와 별개 조회(유니크라 스트림 합 ≠ 총계, 스택 금지).
export async function fetchGa4WeeklyWauByStream(range: DateRange): Promise<WeeklyWauStream[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearWeek' }, { name: 'streamName' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 100000,
    });
    const rows: WeeklyWauStream[] = [];
    for (const row of rep.rows ?? []) {
      const weekStart = weekStartFromYearWeek(row.dimensionValues?.[0]?.value ?? '');
      const platform = STREAM_TO_PLATFORM[row.dimensionValues?.[1]?.value ?? ''];
      if (!weekStart || !platform) continue; // 계약(고방 3스트림) 밖 스트림은 그리지 않는다
      const wau = Number(row.metricValues?.[0]?.value ?? 0);
      if (wau > 0) rows.push({ weekStart, platform, wau });
    }
    return cleanWeeklyWauStream(rows, range.from, range.to);
  } catch {
    return [];
  }
}

// 채널(소스/매체)별 주 WAU — 스트림별과 같은 성격의 **별도 조회**다(유니크라 채널 합 ≠ 총계).
// ⚠️ 일별 소스/매체 레코드를 주로 접어 만들 수 없다(같은 사람이 여러 날 오면 중복 계상) → yearWeek 차원.
// 롱테일(referral 수백 개)을 그대로 내려보내면 응답이 커지고 차트가 뭉치므로 **창 전체 상위 N 채널**만
// 남긴다(순위용 합계는 lib/metrics.ts `topChannelsOf`와 같은 규칙 — 화면엔 값으로 내지 않는다).
// 상한은 화면이 그리는 수(`CHANNEL_TREND_TOP`=10)보다 넉넉히 둔다 — 화면은 자기 창(최근 26주)으로
// 순위를 다시 매기므로 여기서 딱 10개만 주면 창 차이로 밀려난 채널을 못 그린다.
export async function fetchGa4WeeklyWauByChannel(range: DateRange, topN = 15): Promise<WeeklyWauChannel[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearWeek' }, { name: 'sessionSourceMedium' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 100000,
    });
    const rows: WeeklyWauChannel[] = [];
    for (const row of rep.rows ?? []) {
      const weekStart = weekStartFromYearWeek(row.dimensionValues?.[0]?.value ?? '');
      const channel = row.dimensionValues?.[1]?.value ?? '';
      if (!weekStart || !channel) continue;
      const wau = Number(row.metricValues?.[0]?.value ?? 0);
      if (wau > 0) rows.push({ weekStart, channel, wau });
    }
    const cleaned = cleanWeeklyWauChannel(rows, range.from, range.to);
    const keep = new Set(topChannelsOf(cleaned.map((r) => ({ channel: r.channel, value: r.wau })), topN));
    return cleaned.filter((r) => keep.has(r.channel));
  } catch {
    return [];
  }
}

// ── 트래픽 원장 적재용 조회 (2026-07-29) ────────────────────────────────
// GA4 무료 보존이 14개월이라 적재하지 않으면 과거가 사라지고, YoY(24개월)를 만들 수 없다.
// 아래 두 함수는 원장 탭(일_총계 / 월_소스매체)에 그대로 들어갈 모양으로 반환한다.

export type DailyTotal = { date: string; active: number; new: number; sessions: number };

/** 일별 총계(스트림·채널 차원 없이 date만). 카드 정본이라 쪼갠 표와 별개로 저장한다. */
export async function fetchGa4DailyTotals(range: DateRange): Promise<DailyTotal[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }],
      limit: 100000,
    });
    const out: DailyTotal[] = [];
    for (const row of rep.rows ?? []) {
      const raw = row.dimensionValues?.[0]?.value ?? '';
      if (!/^\d{8}$/.test(raw)) continue;
      const mv = row.metricValues ?? [];
      out.push({
        date: isoDate(raw),
        active: Number(mv[0]?.value ?? 0),
        new: Number(mv[1]?.value ?? 0),
        sessions: Number(mv[2]?.value ?? 0),
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export type MonthlySourceMedium = {
  ym: string;
  source_medium: string;
  active: number;
  sessions: number;
  new: number;
};

/**
 * 월별 소스/매체 — 월 단위 유니크라 일별 합산으로 만들 수 없다(별도 조회 필수).
 * 일별 탭은 상위 N개만 남기고 접지만, 월별은 접지 않는다(행 수가 감당되고 롱테일 분석에 쓴다).
 */
export async function fetchGa4MonthlySourceMedium(range: DateRange): Promise<MonthlySourceMedium[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearMonth' }, { name: 'sessionSourceMedium' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
      limit: 100000,
    });
    const out: MonthlySourceMedium[] = [];
    for (const row of rep.rows ?? []) {
      const ym = row.dimensionValues?.[0]?.value ?? '';
      if (!/^\d{6}$/.test(ym)) continue;
      const sourceMedium = row.dimensionValues?.[1]?.value ?? '';
      if (!sourceMedium) continue;
      const mv = row.metricValues ?? [];
      const active = Number(mv[0]?.value ?? 0);
      if (active <= 0) continue;
      out.push({
        ym: `${ym.slice(0, 4)}-${ym.slice(4, 6)}`,
        source_medium: sourceMedium,
        active,
        sessions: Number(mv[1]?.value ?? 0),
        new: Number(mv[2]?.value ?? 0),
      });
    }
    return out.sort((a, b) => a.ym.localeCompare(b.ym) || b.active - a.active);
  } catch {
    return [];
  }
}

// 스트림별 월 MAU — 총 MAU와 별개 조회다. 스트림 차원으로 쪼갠 행을 합쳐 총계를 만들 수 없다
// (유니크 지표라 웹·앱 겸용 사용자가 두 번 세진다 — metrics.ts MonthlyMauStream 주석 참조).
export async function fetchGa4MonthlyMauByStream(range: DateRange): Promise<MonthlyMauStream[]> {
  if (!ga4Configured()) return [];
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const client = new BetaAnalyticsDataClient();
    const [rep] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: range.from, endDate: range.to }],
      dimensions: [{ name: 'yearMonth' }, { name: 'streamName' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 100000,
    });
    const out: MonthlyMauStream[] = [];
    for (const row of rep.rows ?? []) {
      const ym = row.dimensionValues?.[0]?.value ?? ''; // 'YYYYMM'
      if (!/^\d{6}$/.test(ym)) continue;
      const platform = STREAM_TO_PLATFORM[row.dimensionValues?.[1]?.value ?? ''];
      if (!platform) continue; // 계약(고방 3스트림) 밖 스트림은 그리지 않는다
      const mau = Number(row.metricValues?.[0]?.value ?? 0);
      if (mau > 0) out.push({ month: `${ym.slice(0, 4)}-${ym.slice(4, 6)}`, platform, mau });
    }
    return out.sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}
