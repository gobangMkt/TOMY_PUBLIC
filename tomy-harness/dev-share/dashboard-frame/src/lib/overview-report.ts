// 통합리포트 코어 — 고방 + U사장님을 한 리포트에 담는다(2026-07-28 재편).
//
// 구 lib/report.ts와 무엇이 다른가:
//   · 구조: 대상(통합·고방·U사장님)을 셀렉터로 골라 3~4개 계열 카드만 뽑던 형태였다 → 사업을 고르는
//     게 아니라 **한 리포트 안에 고방 구역·U사장님 구역**을 두고 각 구역에 차트 + 전기간 비교표를 싣는다.
//   · 주 경계: 구 report.ts는 ISO 주(월~일)에 '월 목표 ÷ 그 달 ISO 주 수'였다. 이 리포트는 **일~토**와
//     `targetForRange`(월 목표 일할 배분)를 쓴다 — 통합 대시보드·지표 원장·GA4 yearWeek가 모두 일~토라
//     리포트만 월~일이면 같은 '26-30W'가 다른 7일을 가리키고 대시보드와 숫자가 어긋난다.
//
// 계산은 전부 여기(순수 함수)에 두고 화면은 표시만 한다 — 대시보드와 같은 헬퍼(sumTxnsInRange·
// targetForRange·sliceMetrics·viewToInquiryRate)를 쓰므로 두 화면의 같은 라벨은 같은 숫자를 낸다.

import {
  sumTxnsInRange,
  targetForRange,
  seriesRevenue,
  itemsFromTargets,
  type RevenueTxn,
  type MonthlyTarget,
  type TargetHistoryEntry,
} from './revenue';
import { deltaOf } from './format';
import {
  sliceMetrics,
  viewToInquiryRate,
  weekTotalViews,
  weekTotalInquiries,
  monthTotalViews,
  monthTotalInquiries,
  type WeeklyInquiry,
  type DailyInquiry,
} from './inquiries';
import { weekStartSunday, shiftDays, lastFullWeek, lastMonthFull, prevYearRange, type DateRange } from './period';
import { weekLabel, type MonthlyMau, type WeeklyWau } from './metrics';
import type { SourceMediumTotal } from './ga4';

export type ReportUnit = 'week' | 'month';

// 표시 형식 — 화면·인사이트 프롬프트가 같은 단위 정보를 쓴다(만원/건/%/1인당 횟수).
export type LineFormat = 'won' | 'count' | 'rate' | 'per';

// 비교표 한 줄.
// · target이 null이면 달성률을 내지 않는다(목표 미설정 — 0%로 찍으면 '미달'로 읽힌다).
// · yoy가 null이면 **전년 구간에 데이터가 없다**는 뜻이다(0이 아니다). 매출 원장은 2026-01부터,
//   GA4 무료 보존은 14개월이라 전년 값이 아예 없는 지표가 있다 — 0으로 두면 '-100%'라는 거짓이 된다.
export type MetricLine = {
  key: string;
  label: string;
  format: LineFormat;
  cur: number;
  prev: number;
  target: number | null;
  yoy: number | null;
  hint?: string;
};

// GA4 기간 총계(유니크 지표) — 서버가 기간마다 따로 조회한 값. 여기서 날짜를 쪼개 합산하지 말 것.
export type TrafficTotals = {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessions: number;
};

export type TrafficInput = {
  totals: TrafficTotals | null;
  prevTotals: TrafficTotals | null;
  /** 전년 구간이 GA4 보존 밖이면 null. */
  yoyTotals: TrafficTotals | null;
  sourceMedium: SourceMediumTotal[];
  prevSourceMedium: SourceMediumTotal[];
};

// 소스/매체 한 줄 — 표는 상위 N행만 펼치고 접지만(표시 전용), 정렬·합계는 접기 전 전체로 낸다.
export type TrafficRow = {
  key: string;
  label: string;
  active: number;
  new: number;
  sessions: number;
  /** 전기간에 그 소스가 없었으면 null(신규 유입) — 0으로 두면 '-100%'로 읽힌다. */
  prevActive: number | null;
};

/**
 * 소스/매체 한 줄의 전기간 대비 — **절대 증감이 먼저이고 비율은 보조**다(2026-08-03 요청).
 * 비율만 있으면 "▲ 40%"가 4명 늘어난 건지 4만명 늘어난 건지 알 수 없어 판단이 안 된다.
 *  - prev == null  → 전기간에 없던 소스(신규 유입). diff·ratio 둘 다 null.
 *  - prev === 0    → 0에서 늘어난 것이라 배율이 무한대다. diff는 내되 ratio는 null.
 */
export function trafficDelta(
  active: number,
  prevActive: number | null,
): { diff: number | null; ratio: number | null } {
  // active·prevActive는 항상 0 이상(사용자 수)이라 deltaOf의 `prev !== 0` 판정이
  // 여기서 쓰던 `prevActive > 0`과 결과가 같다 — 계산은 lib/format.ts deltaOf 한 벌로.
  return deltaOf(active, prevActive);
}

/** 소스/매체 표 정본 — 활성 사용자 내림차순. 전기간에 없던 소스는 prevActive=null(신규). */
export function sourceMediumRows(cur: SourceMediumTotal[], prev: SourceMediumTotal[]): TrafficRow[] {
  const prevMap = new Map(prev.map((r) => [r.sourceMedium, r.active]));
  return [...cur]
    .map((r) => ({
      key: r.sourceMedium,
      label: r.sourceMedium,
      active: r.active,
      new: r.new,
      sessions: r.sessions,
      prevActive: prevMap.has(r.sourceMedium) ? (prevMap.get(r.sourceMedium) ?? 0) : null,
    }))
    .sort((a, b) => b.active - a.active);
}

export type BmRow = { itemId: string; name: string; group: string; revenue: number; count: number; aov: number };

/**
 * BM별 매출·건수·객단가 — 고방 항목만, 그 기간에 매출이 있는 항목만 내림차순.
 * 리포트와 주간 흐름이 **같은 계산**을 쓴다(2026-08-04 공용화 — 화면마다 다시 짜면 갈라진다).
 * ⚠️ 건수는 **매출이 발생한** 거래 수다(원장의 수기 '수량'은 U사장님 항목이 항상 0이라 쓸 수 없다).
 *    주간 매출 입력의 [매출 없음] 확정이 남기는 `amount:0` 행은 `sumTxnsInRange`가 세지 않는다
 *    (2026-08-10 — 안 그러면 0원 마감한 항목까지 이 목록에 '판매'로 뜬다).
 */
export function bmRowsInRange(
  targets: MonthlyTarget[],
  txns: RevenueTxn[],
  from: string,
  to: string,
): BmRow[] {
  return itemsFromTargets(targets)
    .filter((it) => it.track === 'revenue' && it.group !== 'U사장님')
    .map((it) => {
      const s = sumTxnsInRange(txns, from, to, new Set([it.id]));
      return {
        itemId: it.id,
        name: it.name,
        group: it.group,
        revenue: s.revenue,
        count: s.count,
        aov: s.count > 0 ? s.revenue / s.count : 0,
      };
    })
    .filter((r) => r.revenue > 0 || r.count > 0)
    .sort((a, b) => b.revenue - a.revenue);
}
export type TrendPoint = { key: string; label: string; value: number };
/**
 * 매출 + 트래픽 한 차트용 점(2026-08-04 신설).
 * 🚨 **x축은 창(최근 6개월) 전체 버킷이다 — 매출이 있는 버킷이 아니다.** 그전엔 화면이
 * `revenue`(매출 원장에 행이 있는 버킷만) 위에 트래픽을 붙여 그렸는데, 고방 매출은 몇 주에만
 * 있어서 26주 창이 **6점으로 쪼그라들었다**(실측 5.24·6.21·6.28·7.5·7.12·7.26 — 카드 꼬리표는
 * '최근 6개월'인데 차트는 6주였다). 없는 값은 **null**(0으로 채우면 '그 주 0원'이라고 주장하게 된다).
 */
export type RevenueTrafficPoint = { key: string; label: string; revenue: number | null; users: number | null };
export type FunnelPointData = { label: string; views: number; inquiries: number; rate: number };
export type RevenuePointData = { label: string; revenue: number; purchases: number; aov: number };
export type PerUserPoint = { key: string; label: string; viewsPerUser: number; inquiriesPerUser: number };

export type OverviewReportInput = {
  /** 추이 차트의 버킷 + (users 오버라이드가 없을 때) 활성사용자 라벨. */
  unit: ReportUnit;
  /** 선택 기간(포함). 임의 기간을 넣을 수 있다 — 주/월에 갇히지 않는다. */
  from: string;
  to: string;
  /** 목표를 붙일 달 — 주간이면 '그 주 토요일이 속한 달'(유니크 지표는 일할로 쪼갤 수 없다). */
  month: string;
  /** 추이 차트가 덮는 기간(대시보드와 같은 최근 6개월). */
  chartFrom: string;
  txns: RevenueTxn[];
  targets: MonthlyTarget[];
  /** 목표 개정 이력 — 이미 지난 기간의 목표 분모를 그때 값으로 고정한다(targetForRange 참고). 생략 시 라이브 목표. */
  targetHistory?: TargetHistoryEntry[];
  daily: DailyInquiry[];
  weeks: WeeklyInquiry[];
  weeklyWau: WeeklyWau[];
  monthlyMau: MonthlyMau[];
  /** 비교 기간 오버라이드. 생략하면 prevRangeOf(unit,…)(주간 7일 전 / 월간 지난달). */
  prev?: DateRange;
  prevLabel?: string;
  /** 전년동기 오버라이드. 생략하면 prevYearRange(364일 이동, 달 전체면 전년 같은 달). */
  yoyRange?: DateRange;
  /** GA4 기간 총계. 있으면 활성사용자·세션·신규·재방문율 줄이 이 값으로 만들어진다(임의 기간 지원). */
  traffic?: TrafficInput;
  /** 활성사용자 라벨 오버라이드('WAU'·'MAU'·'활성 사용자' 등). 생략하면 unit이 정한다. */
  userLabel?: string;
  /** 테스트 결정론용 — 미완결 주/달을 자를 기준일. 생략하면 오늘(KST). */
  today?: string;
};

export type ScopeSection = {
  label: string;
  lines: MetricLine[];
};

export type OverviewReport = {
  unit: ReportUnit;
  range: { from: string; to: string };
  prevRange: { from: string; to: string };
  prevLabel: string;
  /** 전년동기 구간. 지표별로 데이터가 있는지 여부는 line.yoy === null로 판단한다. */
  yoyRange: { from: string; to: string };
  month: string;
  userLabel: string;
  gobang: ScopeSection & {
    traffic: TrendPoint[];
    revenue: TrendPoint[];
    /** 매출 막대 + 트래픽 선을 한 차트에 그리는 계열. 창 전체 버킷을 덮는다(위 타입 주석 참조). */
    revenueTraffic: RevenueTrafficPoint[];
    bmRows: BmRow[];
    perUser: PerUserPoint[];
    /** 소스/매체별 트래픽(선택 기간). GA4 미연결이면 빈 배열. */
    trafficRows: TrafficRow[];
    /** 지난 기간엔 있었는데 이번엔 사라진 채널(표에는 없다 — 인사이트 분석용). */
    trafficDropped: { sourceMedium: string; prevActive: number }[];
  };
  uboss: ScopeSection & {
    funnel: FunnelPointData[];
    revenue: RevenuePointData[];
  };
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const monthLabelOf = (ym: string) => `${Number(ym.slice(5, 7))}월`;

/**
 * 추이 창(최근 6개월)의 **버킷 전체**를 세운다 — 데이터가 있는 버킷이 아니라 시간축 그 자체다.
 * 데이터 있는 키만 모아 축을 만들면 값이 드문 계열(고방 매출)이 축을 정해 창이 쪼그라든다.
 * 주는 일요일 시작(`weekStartSunday`), 월은 'YYYY-MM'. 양끝 포함.
 */
export function windowBuckets(from: string, toKey: string, unit: ReportUnit): string[] {
  const out: string[] = [];
  if (unit === 'month') {
    let y = Number(from.slice(0, 4));
    let m = Number(from.slice(5, 7));
    for (let i = 0; i < 240; i++) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (key > toKey) break;
      out.push(key);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }
  // 창 시작이 주 중간이면 그 주는 반쪽이라 넣지 않는다(trafficTrend의 `weekStart >= chartFrom`과 같은 규칙).
  let w = weekStartSunday(from);
  if (w < from) w = shiftDays(w, 7);
  for (let i = 0; i < 600 && w <= toKey; i++) {
    out.push(w);
    w = shiftDays(w, 7);
  }
  return out;
}

// 서브지표(비매출) 목표 — `track:'metric'` 행 중 이름에 키워드가 든 것.
// overview-dashboard·overview-okr·weekly-report와 같은 컨벤션(하드코딩 금지).
// 현재 매트릭스에 metric 행이 0개라 WAU·문의 목표는 0 → 달성률 '—'. 행이 들어오면 자동 점등된다.
function metricTarget(targets: MonthlyTarget[], needle: string, month: string): number {
  return targets
    .filter((t) => t.track === 'metric' && t.month === month && t.name.toUpperCase().includes(needle))
    .reduce((s, t) => s + t.target, 0);
}

// 줄 만들기 — 목표·전년·툴팁은 옵션으로 받는다(위치 인자로 늘리면 호출부에서 null이 줄줄이 늘어선다).
const line = (
  key: string,
  label: string,
  format: LineFormat,
  cur: number,
  prev: number,
  opt: { target?: number | null; yoy?: number | null; hint?: string } = {},
): MetricLine => ({
  key,
  label,
  format,
  cur,
  prev,
  target: opt.target && opt.target > 0 ? opt.target : null,
  yoy: opt.yoy ?? null,
  hint: opt.hint,
});

// 달성률 — 목표가 없으면 null(0%로 찍으면 '미달'로 읽힌다).
export const lineRate = (l: MetricLine): number | null => (l.target && l.target > 0 ? l.cur / l.target : null);
// 전기간 대비 증감률 — 이전이 0이면 비율을 낼 수 없다(null, 화면은 '—').
export const lineDelta = (l: MetricLine): number | null => (l.prev > 0 ? (l.cur - l.prev) / l.prev : null);
// 전년동기 대비 증감률 — yoy가 null(전년 데이터 없음)이거나 0이면 null.
export const lineYoy = (l: MetricLine): number | null =>
  l.yoy != null && l.yoy > 0 ? (l.cur - l.yoy) / l.yoy : null;

// 선택 기간 → 직전 기간. 주간은 7일 전 같은 주, 월간은 그 달의 지난 달.
export function prevRangeOf(unit: ReportUnit, from: string, to: string): { from: string; to: string } {
  if (unit === 'week') return { from: shiftDays(from, -7), to: shiftDays(to, -7) };
  return lastMonthFull(from);
}

/** 매출 항목의 사업 구분 허용목록 — 리포트와 주간 흐름이 같은 판정을 쓴다(화면에서 필터를 짜지 말 것). */
export function revenueScopeIds(targets: MonthlyTarget[]): { gobangIds: Set<string>; ubossIds: Set<string> } {
  const items = itemsFromTargets(targets).filter((it) => it.track === 'revenue');
  return {
    gobangIds: new Set(items.filter((it) => it.group !== 'U사장님').map((it) => it.id)),
    ubossIds: new Set(items.filter((it) => it.group === 'U사장님').map((it) => it.id)),
  };
}

export type TrendSeriesInput = {
  unit: ReportUnit;
  chartFrom: string;
  txns: RevenueTxn[];
  gobangIds: Set<string>;
  ubossIds: Set<string>;
  daily: DailyInquiry[];
  weeks: WeeklyInquiry[];
  weeklyWau: WeeklyWau[];
  monthlyMau: MonthlyMau[];
  today?: string;
};

export type TrendSeries = {
  trafficTrend: TrendPoint[];
  gobangRevenue: TrendPoint[];
  revenueTraffic: RevenueTrafficPoint[];
  funnel: FunnelPointData[];
  ubossRevenue: RevenuePointData[];
  perUser: PerUserPoint[];
};

/**
 * 추이 차트 6계열의 **유일한 계산 정본**. 통합리포트(`buildOverviewReport`)와 주간 흐름 화면이 둘 다
 * 이 함수를 부른다 — 그전엔 주간 흐름이 같은 계열을 화면에서 따로 만들며 "리포트와 같은 규칙"이라고
 * 주석만 달았고, 빈 주 처리(perUser·퍼널)가 이미 갈라져 있었다(2026-10-19 싱크 점검).
 * 화면에서 이 계열을 다시 짜지 말 것.
 */
export function buildTrendSeries(input: TrendSeriesInput): TrendSeries {
  const { unit, chartFrom, txns, gobangIds, ubossIds, daily, weeks, weeklyWau, monthlyMau } = input;
  // ── 추이(최근 6개월) ─────────────────────────
  // ⚠️ 집계가 덜 끝난 주·달은 그리지 않는다 — 반쪽 기간이 마지막 점이면 그래프가 항상 급락으로 보이고
  //    그 점이 하루하루 자라 어제와 오늘의 리포트가 달라진다. 대시보드와 같은 규칙(lastFullWeek/lastMonthFull).
  const lastW = lastFullWeek(input.today);
  const lastM = lastMonthFull(input.today);
  const windowTo = unit === 'week' ? lastW.to : lastM.to;
  const lastKey = unit === 'week' ? lastW.from : lastM.from.slice(0, 7);
  const bucket = unit === 'week' ? 'week' : 'month';
  const full = sliceMetrics(daily, weeks, chartFrom, windowTo, weekStartSunday);
  const inWindow = (t: RevenueTxn) => {
    const d = (t.date ?? '').slice(0, 10);
    return d >= chartFrom && d <= windowTo;
  };

  const trafficTrend =
    unit === 'week'
      ? weeklyWau
          .filter((w) => w.weekStart >= chartFrom && w.weekStart <= lastKey)
          .map((w) => ({ key: w.weekStart, label: weekLabel(w.weekStart), value: w.wau }))
      : [...monthlyMau]
          .filter((m) => m.month >= chartFrom.slice(0, 7) && m.month <= lastKey)
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((m) => ({ key: m.month, label: monthLabelOf(m.month), value: m.mau }));

  const gobangRevenue = seriesRevenue(txns.filter((t) => gobangIds.has(t.itemId) && inWindow(t)), bucket).map((p) => ({
    key: p.key,
    label: unit === 'week' ? weekLabel(p.key) : monthLabelOf(p.key),
    value: p.revenue,
  }));

  // 매출 + 트래픽 한 차트 — **축은 창 전체**(windowBuckets). 매출은 원장에 행이 있는 버킷만 값이 있고
  // 나머지는 null이다(0으로 채우면 '그 주 0원'이라는 주장이 된다 — 미입력과 0원은 다른 상태다).
  const revBy = new Map(gobangRevenue.map((p) => [p.key, p.value]));
  const wauBy = new Map(trafficTrend.map((p) => [p.key, p.value]));
  const revenueTraffic: RevenueTrafficPoint[] = windowBuckets(chartFrom, lastKey, unit).map((key) => ({
    key,
    label: unit === 'week' ? weekLabel(key) : monthLabelOf(key),
    revenue: revBy.has(key) ? revBy.get(key)! : null,
    users: wauBy.has(key) ? wauBy.get(key)! : null,
  }));

  const funnel: FunnelPointData[] =
    unit === 'week'
      ? [...full.fullWeeks]
          .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
          .map((w) => ({
            label: weekLabel(w.weekStart),
            views: weekTotalViews(w),
            inquiries: weekTotalInquiries(w),
            rate: viewToInquiryRate(weekTotalInquiries(w), weekTotalViews(w)),
          }))
      : full.monthly.map((m) => ({
          label: monthLabelOf(m.month),
          views: monthTotalViews(m),
          inquiries: monthTotalInquiries(m),
          rate: viewToInquiryRate(monthTotalInquiries(m), monthTotalViews(m)),
        }));

  // 판매 건수 버킷 — 지표 원장 키(주=일요일 / 월='YYYY-MM')에 매출을 붙인다.
  const purByKey = new Map<string, number>();
  if (unit === 'week') for (const w of full.fullWeeks) purByKey.set(w.weekStart, w.productPurchases);
  else for (const m of full.monthly) purByKey.set(m.month, m.productPurchases);

  // x축은 **매출이 있는 버킷만** — 판매 원장은 2023년부터인데 U사장님 매출은 2026년부터라
  // 합집합이면 왼쪽 2/3이 빈 막대 + 0에 붙은 객단가 선이 된다.
  const ubossRevenue: RevenuePointData[] = seriesRevenue(
    txns.filter((t) => ubossIds.has(t.itemId) && inWindow(t)),
    bucket,
  ).map((p) => {
    const purchases = purByKey.get(p.key) ?? 0;
    return {
      label: unit === 'week' ? weekLabel(p.key) : monthLabelOf(p.key),
      revenue: p.revenue,
      purchases,
      aov: ratio(p.revenue, purchases),
    };
  });

  // 활성사용자당 조회·문의 추이 — 분모(WAU/MAU)가 있는 버킷만. 0으로 나눈 점을 찍으면
  // 그 구간이 0으로 급락한 것처럼 보인다(GA4가 365일까지만 주므로 옛 주는 분모가 없다).
  const viewsByKey = new Map<string, { views: number; inquiries: number }>();
  if (unit === 'week') {
    for (const w of full.fullWeeks) viewsByKey.set(w.weekStart, { views: weekTotalViews(w), inquiries: weekTotalInquiries(w) });
  } else {
    for (const m of full.monthly) viewsByKey.set(m.month, { views: monthTotalViews(m), inquiries: monthTotalInquiries(m) });
  }
  const perUser: PerUserPoint[] = trafficTrend
    .filter((p) => p.value > 0 && viewsByKey.has(p.key))
    .map((p) => {
      const v = viewsByKey.get(p.key)!;
      return {
        key: p.key,
        label: p.label,
        viewsPerUser: ratio(v.views, p.value),
        inquiriesPerUser: ratio(v.inquiries, p.value),
      };
    });

  return { trafficTrend, gobangRevenue, revenueTraffic, funnel, ubossRevenue, perUser };
}

export function buildOverviewReport(input: OverviewReportInput): OverviewReport {
  const { unit, from, to, month, chartFrom, txns, targets, daily, weeks, weeklyWau, monthlyMau, traffic } = input;
  const targetHistory = input.targetHistory ?? [];
  const prev = input.prev ?? prevRangeOf(unit, from, to);
  const yoyRange = input.yoyRange ?? prevYearRange({ from, to });
  const userLabel = input.userLabel ?? (unit === 'week' ? 'WAU' : 'MAU');

  // 스코프 허용목록 — 매치 실패 시 포함되는 블록리스트 방식 금지(fail-open 버그, revenue.ts 참조).
  const { gobangIds, ubossIds } = revenueScopeIds(targets);

  // ── 기간 실적 ─────────────────────────────
  const gRev = sumTxnsInRange(txns, from, to, gobangIds);
  const gRevPrev = sumTxnsInRange(txns, prev.from, prev.to, gobangIds);
  const uRev = sumTxnsInRange(txns, from, to, ubossIds);
  const uRevPrev = sumTxnsInRange(txns, prev.from, prev.to, ubossIds);

  // 매출 전년동기 — 원장이 2026-01부터라 전년 값이 **아예 없다**. 하드코딩하지 않고 원장 첫 거래일로
  // 판정한다: 전년 구간의 시작이 원장 시작보다 앞이면 그 구간은 0이 아니라 '없음'이다(yoy=null).
  // ⚠️ 부분만 걸쳐도 null로 둔다 — 반쪽 구간과 비교하면 항상 큰 폭 증가로 보인다.
  const txnStart = txns.reduce((min, t) => {
    const d = (t.date ?? '').slice(0, 10);
    return d && (!min || d < min) ? d : min;
  }, '');
  const revenueYoyOk = Boolean(txnStart) && yoyRange.from >= txnStart;
  const yoyRev = revenueYoyOk ? sumTxnsInRange(txns, yoyRange.from, yoyRange.to, gobangIds) : null;
  const yoyURev = revenueYoyOk ? sumTxnsInRange(txns, yoyRange.from, yoyRange.to, ubossIds) : null;

  // 활성사용자 — GA4 기간 총계(traffic)가 있으면 그 값이 정본이다(임의 기간 지원).
  // 없으면 주/월 셀렉터 전제로 WAU·MAU 표에서 찾는다.
  const users =
    traffic?.totals?.activeUsers ??
    (unit === 'week'
      ? (weeklyWau.find((w) => w.weekStart === from)?.wau ?? 0)
      : (monthlyMau.find((m) => m.month === month)?.mau ?? 0));
  const prevUsers =
    traffic?.prevTotals?.activeUsers ??
    (unit === 'week'
      ? (weeklyWau.find((w) => w.weekStart === prev.from)?.wau ?? 0)
      : (monthlyMau.find((m) => m.month === prev.from.slice(0, 7))?.mau ?? 0));
  const yoyUsers = traffic ? (traffic.yoyTotals?.activeUsers ?? null) : null;

  // 조회·문의는 **항상 U사장님 + U중개사 합**(2026-07-28 확정). 집계는 sliceMetrics 한 곳에 위임 —
  // 일별 원장이 있으면 날짜 경계가 정확하고, 없으면 주 원장으로 자동 폴백한다.
  const cur = sliceMetrics(daily, weeks, from, to, weekStartSunday);
  const pre = sliceMetrics(daily, weeks, prev.from, prev.to, weekStartSunday);
  // 전년동기 — 원장(2023-01~) 밖이면 days=0이 와서 전 지표가 null이 된다(0이 아니라 '없음').
  const yoy = sliceMetrics(daily, weeks, yoyRange.from, yoyRange.to, weekStartSunday);
  const yoyHas = yoy.days > 0;
  const yv = (n: number) => (yoyHas ? n : null);

  const gobangLines: MetricLine[] = [
    line('users', `활성사용자 (${userLabel})`, 'count', users, prevUsers, {
      target: metricTarget(targets, userLabel, month),
      yoy: yoyUsers,
      hint: `GA4 그 기간의 순 활성사용자(${userLabel}). 유니크 지표라 일별 합산과 다르다. 전년 구간이 GA4 무료 보존(14개월) 밖이면 전년 비교가 '데이터 없음'으로 뜬다.`,
    }),
    line('revenue', '매출', 'won', gRev.revenue, gRevPrev.revenue, {
      target: targetForRange(targets, 'gobang', from, to, targetHistory),
      yoy: yoyRev ? yoyRev.revenue : null,
      hint: '매출 원장의 그 기간 거래 합계(U사장님 그룹 제외). 목표는 월 목표를 이 기간으로 일할 배분한 값. 원장이 2026-01부터라 전년 비교는 불가.',
    }),
    line('count', '매출 건수', 'count', gRev.count, gRevPrev.count, {
      yoy: yoyRev ? yoyRev.count : null,
      hint: '매출이 실제로 발생한 거래 수(0원 마감 확인 행은 제외). 정본 = 매출 원장.',
    }),
    line('aov', '건당 매출', 'won', ratio(gRev.revenue, gRev.count), ratio(gRevPrev.revenue, gRevPrev.count), {
      yoy: yoyRev ? ratio(yoyRev.revenue, yoyRev.count) : null,
    }),
    line('viewsPerUser', '활성사용자당 조회수', 'per', ratio(cur.totals.views, users), ratio(pre.totals.views, prevUsers), {
      yoy: yoyHas && yoyUsers ? ratio(yoy.totals.views, yoyUsers) : null,
      hint: '지점 조회수 ÷ 활성사용자. 유저가 지점을 보는 고방 유저 퍼널이다. ⚠️ 비율(%)이 아니라 1인당 횟수.',
    }),
    line(
      'inquiriesPerUser',
      '활성사용자당 문의수',
      'per',
      ratio(cur.totals.inquiries, users),
      ratio(pre.totals.inquiries, prevUsers),
      {
        yoy: yoyHas && yoyUsers ? ratio(yoy.totals.inquiries, yoyUsers) : null,
        hint: '지점 문의수 ÷ 활성사용자. ⚠️ 비율(%)이 아니라 1인당 횟수.',
      },
    ),
  ];

  // 트래픽 3줄 — GA4 기간 총계가 있을 때만 붙인다(구 트래픽리포트의 스코어카드를 흡수, 2026-07-30).
  // 이 줄들이 비교표에 들어가면 인사이트 프롬프트에도 자동으로 실린다(payload가 lines를 그대로 쓴다).
  if (traffic?.totals) {
    const t = traffic.totals;
    const p = traffic.prevTotals;
    const y = traffic.yoyTotals;
    const retRate = (x: TrafficTotals) => (x.activeUsers > 0 ? Math.min(1, x.returningUsers / x.activeUsers) : 0);
    gobangLines.push(
      line('newUsers', '새 사용자', 'count', t.newUsers, p?.newUsers ?? 0, {
        yoy: y ? y.newUsers : null,
        hint: 'GA4 newUsers = 그 기간에 처음 방문한 사용자.',
      }),
      line('sessions', '세션', 'count', t.sessions, p?.sessions ?? 0, {
        yoy: y ? y.sessions : null,
        hint: 'GA4 sessions = 방문 횟수(사용자 수가 아니다).',
      }),
      line('returnRate', '재방문율', 'rate', retRate(t), p ? retRate(p) : 0, {
        yoy: y ? retRate(y) : null,
        hint: '재방문자수 ÷ 활성 사용자. 재방문자는 활성−신규로 유도한 값이다.',
      }),
    );
  }

  const ubossLines: MetricLine[] = [
    line('views', '통합 조회수', 'count', cur.totals.views, pre.totals.views, {
      yoy: yv(yoy.totals.views),
      hint: 'U사장님 + U중개사 지점 조회수 합(문의 원장 · u-ceo 자동수집).',
    }),
    line('inquiries', '통합 문의수', 'count', cur.totals.inquiries, pre.totals.inquiries, {
      target: metricTarget(targets, '문의', month),
      yoy: yv(yoy.totals.inquiries),
      hint: 'U사장님 + U중개사 지점 문의수 합.',
    }),
    line(
      'rate',
      '문의율',
      'rate',
      viewToInquiryRate(cur.totals.inquiries, cur.totals.views),
      viewToInquiryRate(pre.totals.inquiries, pre.totals.views),
      {
        yoy: yv(viewToInquiryRate(yoy.totals.inquiries, yoy.totals.views)),
        hint: '문의 ÷ 조회. 이 프로젝트의 문의율은 이 하나만 가리킨다(분모는 조회, MAU 아님).',
      },
    ),
    line('revenue', '매출', 'won', uRev.revenue, uRevPrev.revenue, {
      target: targetForRange(targets, 'uboss', from, to, targetHistory),
      yoy: yoyURev ? yoyURev.revenue : null,
      hint: '매출 원장 U사장님 그룹(애드). 목표 분모도 애드 단독 — U중개사·케어프로는 수집 경로가 없어 제외. 원장이 2026-01부터라 전년 비교는 불가.',
    }),
    line('purchases', '판매 건수', 'count', cur.totals.productPurchases, pre.totals.productPurchases, {
      yoy: yv(yoy.totals.productPurchases),
      hint: '지점(파트너)이 광고상품을 산 건수 = 우리가 판 건수(u-ceo ADS_COUNT).',
    }),
    line(
      'aov',
      '객단가',
      'won',
      ratio(uRev.revenue, cur.totals.productPurchases),
      ratio(uRevPrev.revenue, pre.totals.productPurchases),
      {
        // 분자(매출)가 전년에 없으므로 객단가도 전년 비교 불가 — 분모만 있는 값으로 계산하면 0이 된다.
        yoy: yoyURev ? ratio(yoyURev.revenue, yoy.totals.productPurchases) : null,
        hint: '매출 ÷ 판매 건수. 분자·분모가 같은 기간이다.',
      },
    ),
  ];

  const {
    trafficTrend,
    gobangRevenue,
    revenueTraffic,
    funnel,
    ubossRevenue,
    perUser,
  } = buildTrendSeries({ unit, chartFrom, txns, gobangIds, ubossIds, daily, weeks, weeklyWau, monthlyMau, today: input.today });

  // BM별 매출·건수·객단가 — 계산 정본은 bmRowsInRange(주간 흐름과 공용, 2026-08-04).
  const bmRows: BmRow[] = bmRowsInRange(targets, txns, from, to);

  return {
    unit,
    range: { from, to },
    prevRange: prev,
    prevLabel: input.prevLabel ?? (unit === 'week' ? '전주' : '전월'),
    yoyRange,
    month,
    userLabel,
    gobang: {
      label: '고방',
      lines: gobangLines,
      traffic: trafficTrend,
      revenue: gobangRevenue,
      revenueTraffic,
      bmRows,
      perUser,
      trafficRows: traffic ? sourceMediumRows(traffic.sourceMedium, traffic.prevSourceMedium) : [],
      trafficDropped: traffic ? droppedSourceMediums(traffic.sourceMedium, traffic.prevSourceMedium) : [],
    },
    uboss: { label: 'U사장님', lines: ubossLines, funnel, revenue: ubossRevenue },
  };
}

// ── 인사이트 프롬프트용 요약 ────────────────────
// LLM에는 화면이 이미 계산한 값만 넘긴다 — 서버가 GA4·시트를 다시 부르면 리포트 숫자와 분석 문장이
// 갈라질 수 있다. 표에 없는 수치가 분석에 등장하는 게 가장 나쁜 실패다.
/**
 * 지난 기간엔 있었는데 이번 기간엔 사라진 소스/매체 — `sourceMediumRows`는 현재 기간 행만 내므로
 * (표에 0짜리 행을 만들지 않으려는 의도) 그 채널은 표에서 통째로 빠진다. 분석에는 "지난주 상위였던
 * X가 사라졌다"가 신호라서 인사이트용으로만 따로 뽑는다.
 */
export function droppedSourceMediums(
  cur: SourceMediumTotal[],
  prev: SourceMediumTotal[],
  limit = 5,
): { sourceMedium: string; prevActive: number }[] {
  const curSet = new Set(cur.map((r) => r.sourceMedium));
  return [...prev]
    .filter((r) => !curSet.has(r.sourceMedium) && r.active > 0)
    .sort((a, b) => b.active - a.active)
    .slice(0, limit)
    .map((r) => ({ sourceMedium: r.sourceMedium, prevActive: r.active }));
}

export function overviewInsightPayload(r: OverviewReport) {
  // 상위 15개 활성 합계 — 각 채널의 비중(sharePct) 분모.
  const TOP = 15;
  const trafficTotal = r.gobang.trafficRows.slice(0, TOP).reduce((s, t) => s + t.active, 0);
  const pack = (s: ScopeSection) => ({
    label: s.label,
    lines: s.lines.map((l) => ({
      label: l.label,
      format: l.format,
      cur: Math.round(l.cur * 100) / 100,
      prev: Math.round(l.prev * 100) / 100,
      deltaPct: lineDelta(l) == null ? null : Math.round(lineDelta(l)! * 1000) / 10,
      target: l.target,
      ratePct: lineRate(l) == null ? null : Math.round(lineRate(l)! * 1000) / 10,
      // 전년동기 — null이면 '전년 구간에 데이터가 없다'는 뜻이다(프롬프트가 이 경우 언급을 금지한다).
      yoy: l.yoy == null ? null : Math.round(l.yoy * 100) / 100,
      yoyPct: lineYoy(l) == null ? null : Math.round(lineYoy(l)! * 1000) / 10,
    })),
  });
  return {
    unit: r.unit,
    range: r.range,
    prevRange: r.prevRange,
    yoyRange: r.yoyRange,
    gobang: {
      ...pack(r.gobang),
      bm: r.gobang.bmRows.slice(0, 8).map((b) => ({ name: b.name, revenue: b.revenue, count: b.count, aov: Math.round(b.aov) })),
      // 소스/매체는 롱테일이 수백 개다 — 상위 15개만 넘긴다(전부 넣으면 프롬프트가 표보다 커진다).
      //
      // 🚨 2026-08-12 요청 "유입채널 부분 별도섹션으로 하여 좀 더 상세한 분석을 할 것". 지침만
      // 늘리면 모델이 산수를 하거나 지어낸다 → **판단에 쓸 값을 여기서 계산해 넘긴다**:
      // 증감(절대·%)·기간 내 비중·신규 비율. 마케팅 리포트에서 "지시는 세부를 요구하는데 payload가
      // 총합만 보내 지킬 데이터가 없던" 사고와 같은 함정을 피한다(CLAUDE.md 2026-08-07).
      traffic: r.gobang.trafficRows.slice(0, 15).map((t) => ({
        sourceMedium: t.label,
        active: t.active,
        sessions: t.sessions,
        new: t.new,
        prevActive: t.prevActive,
        deltaAbs: t.prevActive == null ? null : t.active - t.prevActive,
        deltaPct: t.prevActive ? Math.round(((t.active - t.prevActive) / t.prevActive) * 1000) / 10 : null,
        // 이번 기간 상위권 안에서의 비중(%) — '큰 채널이 조금 움직인 것'과 '작은 채널이 배로 튄 것'을 가른다.
        sharePct: trafficTotal ? Math.round((t.active / trafficTotal) * 1000) / 10 : null,
        newRatePct: t.active ? Math.round((t.new / t.active) * 1000) / 10 : null,
      })),
      /** 상위권 활성 합계 — 비중의 분모(모델이 다시 더하지 않게 함께 넘긴다). */
      trafficTotal,
      /** 지난 기간엔 있었는데 이번엔 사라진 채널 — 표에는 안 보이지만 분석에는 신호다. */
      trafficDropped: r.gobang.trafficDropped,
    },
    uboss: pack(r.uboss),
  };
}
