// 문의수(U사장님/GA4) — 타입 · 계약 · 집계 · 픽스처.
// 정본 = 신규 스프레드시트 '고방 지표 원장'의 '문의수' 탭(GAS+구글시트). admin은 프록시로 읽기/쓰기.
//   - 지표는 주차별 1행. week_start가 고유키(upsert 기준).
//     ⚠️ **week_start = 그 주 일요일**(주 경계 일~토, 프로젝트 전역 규칙 — 정본 헬퍼 lib/period.ts).
//     2026-07-28에 월요일 시작에서 전면 교체했다(원장 186주 재백필). 새 주간 집계도 period.ts를 쓸 것.
//   - 총합·문의율·조회율·오차율은 저장 안 함(파생 계산).
//   - GA4 이벤트(inquiry/branch_view)는 ga4.ts가 WeeklyInquiry-호환으로 반환(조회 전용).

export type WeeklyInquiry = {
  weekStart: string; // 주 시작(일요일) ISO 'YYYY-MM-DD' (고유키)
  usajangInquiries: number;
  usajangViews: number;
  ujunggaeInquiries: number;
  ujunggaeViews: number;
  productPurchases: number;
  memo?: string;
};

// 시트 헤더(3곳 계약 = admin lib/inquiries.ts ↔ GAS inquiry.Code.gs, 순서 동일 필수).
export const INQUIRY_HEADERS = [
  'week_start',
  'usajang_inquiries',
  'usajang_views',
  'ujunggae_inquiries',
  'ujunggae_views',
  'product_purchases',
  'memo',
] as const;

function toNum(v: unknown): number {
  return Number(String(v ?? '').replace(/[,\s₩]/g, '')) || 0;
}

// ── 시트(GAS) 계약: 파싱 / 직렬화 ────────────────
// GAS doGet이 반환하는 헤더 키 객체 배열 → WeeklyInquiry[]. week_start 없는 행 제외.
export function parseInquiries(rows: unknown[]): WeeklyInquiry[] {
  const out: WeeklyInquiry[] = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const weekStart = String(o.week_start ?? '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) continue;
    const memo = String(o.memo ?? '').trim();
    out.push({
      weekStart,
      usajangInquiries: toNum(o.usajang_inquiries),
      usajangViews: toNum(o.usajang_views),
      ujunggaeInquiries: toNum(o.ujunggae_inquiries),
      ujunggaeViews: toNum(o.ujunggae_views),
      productPurchases: toNum(o.product_purchases),
      memo: memo || undefined,
    });
  }
  return out.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// WeeklyInquiry → GAS upsert로 보낼 행 객체(INQUIRY_HEADERS 키, 문자열화).
export function serializeInquiry(w: WeeklyInquiry): Record<string, string> {
  return {
    week_start: w.weekStart,
    usajang_inquiries: String(w.usajangInquiries),
    usajang_views: String(w.usajangViews),
    ujunggae_inquiries: String(w.ujunggaeInquiries),
    ujunggae_views: String(w.ujunggaeViews),
    product_purchases: String(w.productPurchases),
    memo: w.memo ?? '',
  };
}

// ── 입력 검증 · 저장행 빌드 (raw 화면 → GAS 쓰기) ────────────────
export type InquiryInput = {
  weekStart?: string;
  usajangInquiries?: number | string;
  usajangViews?: number | string;
  ujunggaeInquiries?: number | string;
  ujunggaeViews?: number | string;
  productPurchases?: number | string;
  memo?: string;
};

/**
 * 일별 원장 입력(날짜 키) — 주 원장과 필드가 같고 키만 `date`, `branchTotal`이 하나 더 있다.
 *
 * 왜 따로 필요했나(2026-09-07): 일별 탭이 **월 숫자의 정본**인데 어드민에 고칠 화면이 없어,
 * 주 원장만 보정하면 주간 화면과 월간 화면이 서로 다른 말을 했다(8/30 주 77 vs 92). 시트를 직접
 * 열지 않고도 고칠 수 있어야 그 괴리가 안 생긴다.
 */
export type DailyInput = {
  date?: string;
  usajangInquiries?: number | string;
  usajangViews?: number | string;
  ujunggaeInquiries?: number | string;
  ujunggaeViews?: number | string;
  productPurchases?: number | string;
  /** 파트너 지점수 스냅샷 — 누적값이라 사람이 고칠 값이 아니다. 화면은 읽기만 하고 저장 때 되돌려 보낸다. */
  branchTotal?: number | string;
  memo?: string;
};

export function validateDaily(input: DailyInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date ?? '').trim())) {
    errors.push('날짜(date)를 YYYY-MM-DD 형식으로 입력하세요.');
  }
  const fields: [keyof DailyInput, string][] = [
    ['usajangInquiries', 'U사장님 문의수'],
    ['usajangViews', 'U사장님 조회수'],
    ['ujunggaeInquiries', 'U중개사 문의수'],
    ['ujunggaeViews', 'U중개사 조회수'],
    ['productPurchases', '판매 건수'],
    ['branchTotal', '지점수'],
  ];
  for (const [key, label] of fields) {
    const raw = String(input[key] ?? '').trim();
    if (raw !== '' && (!/^\d+$/.test(raw) || Number(raw) < 0)) {
      errors.push(`${label}는 0 이상의 정수이거나 공란이어야 합니다.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function buildUpsertDaily(input: DailyInput): Record<string, string> {
  return serializeDaily({
    date: String(input.date ?? '').trim().slice(0, 10),
    usajangInquiries: toNum(input.usajangInquiries),
    usajangViews: toNum(input.usajangViews),
    ujunggaeInquiries: toNum(input.ujunggaeInquiries),
    ujunggaeViews: toNum(input.ujunggaeViews),
    productPurchases: toNum(input.productPurchases),
    branchTotal: toNum(input.branchTotal),
    memo: String(input.memo ?? '').trim() || undefined,
  });
}

export function validateInquiry(input: InquiryInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.weekStart ?? '').trim())) {
    errors.push('주 시작일(week_start)을 YYYY-MM-DD 형식으로 입력하세요.');
  }
  const fields: [keyof InquiryInput, string][] = [
    ['usajangInquiries', 'U사장님 문의수'],
    ['usajangViews', 'U사장님 조회수'],
    ['ujunggaeInquiries', 'U중개사 문의수'],
    ['ujunggaeViews', 'U중개사 조회수'],
    ['productPurchases', '상품구매수'],
  ];
  for (const [key, label] of fields) {
    const raw = String(input[key] ?? '').trim();
    if (raw !== '' && (!/^\d+$/.test(raw) || Number(raw) < 0)) {
      errors.push(`${label}는 0 이상의 정수이거나 공란이어야 합니다.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function buildUpsertInquiry(input: InquiryInput): Record<string, string> {
  const w: WeeklyInquiry = {
    weekStart: String(input.weekStart ?? '').trim().slice(0, 10),
    usajangInquiries: toNum(input.usajangInquiries),
    usajangViews: toNum(input.usajangViews),
    ujunggaeInquiries: toNum(input.ujunggaeInquiries),
    ujunggaeViews: toNum(input.ujunggaeViews),
    productPurchases: toNum(input.productPurchases),
    memo: String(input.memo ?? '').trim() || undefined,
  };
  return serializeInquiry(w);
}

// ── 집계 헬퍼 ────────────────
// 한 주의 총 문의수/조회수 (usajang + ujunggae).
export function weekTotalInquiries(w: WeeklyInquiry): number {
  return w.usajangInquiries + w.ujunggaeInquiries;
}
export function weekTotalViews(w: WeeklyInquiry): number {
  return w.usajangViews + w.ujunggaeViews;
}

export type InquiryTotals = {
  inquiries: number; // 총 문의수(usajang + ujunggae)
  views: number; // 총 조회수(usajang + ujunggae)
  productPurchases: number;
};

// 여러 주 합산.
export function sumInquiries(weeks: WeeklyInquiry[]): InquiryTotals {
  return weeks.reduce<InquiryTotals>(
    (acc, w) => ({
      inquiries: acc.inquiries + weekTotalInquiries(w),
      views: acc.views + weekTotalViews(w),
      productPurchases: acc.productPurchases + w.productPurchases,
    }),
    { inquiries: 0, views: 0, productPurchases: 0 },
  );
}

// ── 주간 → 월 롤업 ────────────────
export type MonthlyInquiry = {
  month: string; // 'YYYY-MM'
  usajangInquiries: number;
  usajangViews: number;
  ujunggaeInquiries: number;
  ujunggaeViews: number;
  productPurchases: number;
};

// ── 일별 원장 (2026-07-28 신설) ────────────────
// 왜: 주 단위 1행으로는 월 숫자를 못 맞춘다. 주가 월 경계를 걸치면 쪼갤 수 없어 '7월'이
// 「7월에 시작한 주들의 합」이 됐다 — 7월 판매 건수 실측 387건이 295건으로 표시된 사고
// (7/1~4는 6/28 주에 귀속, 7/26~28은 미완결 주라 미저장). u-ceo가 일별로 주니 일별로 저장하고
// 주·월·임의 기간 집계는 **읽을 때** 만든다. 주 원장('문의수' 탭)은 롤백 안전판으로 남긴다.
export const DAILY_HEADERS = [
  'date',
  'usajang_inquiries',
  'usajang_views',
  'ujunggae_inquiries',
  'ujunggae_views',
  'product_purchases',
  'branch_total',
  'memo',
] as const;

export type DailyInquiry = {
  date: string; // 'YYYY-MM-DD'
  usajangInquiries: number;
  usajangViews: number;
  ujunggaeInquiries: number;
  ujunggaeViews: number;
  productPurchases: number;
  branchTotal: number; // 파트너 지점수 스냅샷 — 누적값이라 합산 금지(그 구간 마지막 값만 의미 있음)
  memo?: string;
};

export function parseDaily(rows: unknown[]): DailyInquiry[] {
  return rows
    .map<DailyInquiry | null>((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const date = String(o.date ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      return {
        date,
        usajangInquiries: toNum(o.usajang_inquiries),
        usajangViews: toNum(o.usajang_views),
        ujunggaeInquiries: toNum(o.ujunggae_inquiries),
        ujunggaeViews: toNum(o.ujunggae_views),
        productPurchases: toNum(o.product_purchases),
        branchTotal: toNum(o.branch_total),
        memo: String(o.memo ?? '').trim() || undefined,
      };
    })
    .filter((d): d is DailyInquiry => !!d)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function serializeDaily(d: DailyInquiry): Record<string, string> {
  return {
    date: d.date,
    usajang_inquiries: String(d.usajangInquiries),
    usajang_views: String(d.usajangViews),
    ujunggae_inquiries: String(d.ujunggaeInquiries),
    ujunggae_views: String(d.ujunggaeViews),
    product_purchases: String(d.productPurchases),
    branch_total: String(d.branchTotal),
    memo: d.memo ?? '',
  };
}

export const dayTotalInquiries = (d: DailyInquiry): number => d.usajangInquiries + d.ujunggaeInquiries;
export const dayTotalViews = (d: DailyInquiry): number => d.usajangViews + d.ujunggaeViews;

// 날짜 구간 필터 — 주 단위와 달리 **경계가 정확하다**(걸치는 주를 통째 넣거나 빼지 않는다).
export function dailyInRange(daily: DailyInquiry[], from: string, to: string): DailyInquiry[] {
  return daily.filter((d) => (!from || d.date >= from) && (!to || d.date <= to));
}

export function sumDaily(daily: DailyInquiry[]): InquiryTotals {
  return daily.reduce<InquiryTotals>(
    (acc, d) => ({
      inquiries: acc.inquiries + dayTotalInquiries(d),
      views: acc.views + dayTotalViews(d),
      productPurchases: acc.productPurchases + d.productPurchases,
    }),
    { inquiries: 0, views: 0, productPurchases: 0 },
  );
}

// 일별 → 월. 이게 '7월'의 정답이다(주 귀속이 아니라 날짜의 월로 센다).
export function rollupDailyMonthly(daily: DailyInquiry[]): MonthlyInquiry[] {
  const map = new Map<string, MonthlyInquiry>();
  for (const d of daily) {
    const month = d.date.slice(0, 7);
    const cur =
      map.get(month) ??
      { month, usajangInquiries: 0, usajangViews: 0, ujunggaeInquiries: 0, ujunggaeViews: 0, productPurchases: 0 };
    cur.usajangInquiries += d.usajangInquiries;
    cur.usajangViews += d.usajangViews;
    cur.ujunggaeInquiries += d.ujunggaeInquiries;
    cur.ujunggaeViews += d.ujunggaeViews;
    cur.productPurchases += d.productPurchases;
    map.set(month, cur);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// 일별 → 주(일~토). 주 원장과 같은 모양(WeeklyInquiry)으로 내보내 기존 차트·표를 그대로 쓴다.
// ⚠️ 기간 끝의 반쪽 주도 포함한다 — 화면이 '진행 중'을 알아야 할 땐 dayCount로 가른다.
export type DailyWeek = WeeklyInquiry & { days: number };
export function bucketDailyWeekly(daily: DailyInquiry[], weekStartOf: (iso: string) => string): DailyWeek[] {
  const map = new Map<string, DailyWeek>();
  for (const d of daily) {
    const weekStart = weekStartOf(d.date);
    const cur =
      map.get(weekStart) ??
      {
        weekStart,
        usajangInquiries: 0,
        usajangViews: 0,
        ujunggaeInquiries: 0,
        ujunggaeViews: 0,
        productPurchases: 0,
        days: 0,
      };
    cur.usajangInquiries += d.usajangInquiries;
    cur.usajangViews += d.usajangViews;
    cur.ujunggaeInquiries += d.ujunggaeInquiries;
    cur.ujunggaeViews += d.ujunggaeViews;
    cur.productPurchases += d.productPurchases;
    cur.days += 1;
    map.set(weekStart, cur);
  }
  return [...map.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ── 화면 공용 집계 진입점 ────────────────
// 화면마다 "일별 있으면 일별, 없으면 주" 분기를 복붙하면 규칙이 갈린다 → 여기 한 벌만 쓴다.
// weekStartOf는 period.ts의 weekStartSunday를 넘긴다(lib 간 순환 import를 피하려 주입받는다).
export type MetricSlice = {
  source: 'daily' | 'weekly';
  totals: InquiryTotals; // 기간 합계 — daily면 날짜 경계가 정확하다
  daily: DailyInquiry[]; // 기간 내 일별 행(폴백이면 빈 배열) — 일 버킷 차트의 원본
  weeks: DailyWeek[]; // 주 버킷(일~토) — 반쪽 주 포함
  fullWeeks: DailyWeek[]; // 7일이 온전히 든 주만 — **추이 차트는 이걸 쓴다**
  monthly: MonthlyInquiry[];
  days: number; // 실제 커버 일수 = 값 모드(일·주·월평균)의 분모
};

// 차트용 = 온전한 주만. 기간 양끝에 걸친 반쪽 주를 그리면 그래프 끝이 항상 급락으로 보여
// "지표가 떨어졌다"는 오독을 만든다(metrics.ts의 cleanWeeklyWau와 같은 규칙).
// ⚠️ 합계·평균은 반쪽 주까지 포함한 totals·days를 쓴다 — 차트에서 뺐다고 실적에서 빼면 안 된다.
const fullOnly = (weeks: DailyWeek[]) => weeks.filter((w) => w.days >= 7);

/**
 * 주 단위 **수기보정 오버레이** — 7일이 다 든 주는 주 원장('문의수' 탭) 값이 일별 합을 이긴다.
 *
 * 🚨 왜(2026-09-07 지적 "판매건수 77인데 왜 리포트에서는 92라고 뜸?" → "77이 맞다"): 주 원장은
 * 사람이 고치는 곳(U사장님 › 지표 › 주간 원장)인데 그 보정이 일별 탭엔 안 써져서, 일별을 읽는
 * 리포트만 옛 값을 계속 보여줬다. 보정한 값이 화면에 안 나오면 보정 기능이 없는 것과 같다.
 *
 * 규칙을 쪼갠 이유:
 *  · **주 버킷·주 단위 합계**는 주 원장이 이긴다 — 사람이 고친 값이 정본이다.
 *  · **월 롤업·일 버킷은 그대로 일별**이다 — 주 값을 날짜로 쪼갤 방법이 없어서, 여기에까지
 *    주 원장을 얹으면 월 경계 사고(7월 판매 건수 387→295)가 되돌아온다.
 * 그래서 주 원장 보정은 주 단위 화면에만 반영된다 — 월 숫자는 일별 원장(④ 표)에서 고친다.
 *
 * ⚠️ 7일이 덜 든 주(기간 양끝에 걸친 반쪽 주)는 건드리지 않는다 — 주 원장 값은 7일치라
 * 반쪽 구간에 통째로 얹으면 그 기간 합계가 부풀어 오른다.
 */
export function overlayWeeklyLedger(
  weeks: DailyWeek[],
  weekly: WeeklyInquiry[],
  dailyTotals: InquiryTotals,
): { weeks: DailyWeek[]; totals: InquiryTotals } {
  const byWeek = new Map(weekly.map((w) => [w.weekStart, w]));
  let totals = { ...dailyTotals };
  const out = weeks.map((w) => {
    const m = byWeek.get(w.weekStart);
    if (!m || w.days < 7) return w;
    totals = {
      inquiries: totals.inquiries - weekTotalInquiries(w) + weekTotalInquiries(m),
      views: totals.views - weekTotalViews(w) + weekTotalViews(m),
      productPurchases: totals.productPurchases - w.productPurchases + m.productPurchases,
    };
    return { ...m, days: w.days };
  });
  return { weeks: out, totals };
}

export function sliceMetrics(
  daily: DailyInquiry[],
  weekly: WeeklyInquiry[],
  from: string,
  to: string,
  weekStartOf: (iso: string) => string,
): MetricSlice {
  if (daily.length) {
    const inRange = dailyInRange(daily, from, to);
    const { weeks, totals } = overlayWeeklyLedger(
      bucketDailyWeekly(inRange, weekStartOf),
      weekly,
      sumDaily(inRange),
    );
    return {
      source: 'daily',
      totals,
      daily: inRange,
      weeks,
      fullWeeks: fullOnly(weeks),
      monthly: rollupDailyMonthly(inRange),
      days: inRange.length,
    };
  }
  // 폴백 — 일별 원장이 아직 없을 때(구 GAS 배포·픽스처). 주 시작일 소속으로 통째 넣거나 뺀다.
  const inRange = weeksInRange(weekly, from, to);
  const weeks = inRange.map((w) => ({ ...w, days: 7 }));
  return {
    source: 'weekly',
    totals: sumInquiries(inRange),
    daily: [],
    weeks,
    fullWeeks: weeks,
    monthly: rollupMonthly(inRange),
    days: inRange.length * 7,
  };
}

// 월 롤업의 총 문의·조회 — 주 단위의 weekTotal*과 같은 규칙(U사장님 + U중개사).
// ⚠️ 화면에서 `usajang*`만 집어 쓰면 U중개사가 통째로 빠진다(2026-07-28 대시보드 2곳에서 발생).
export function monthTotalInquiries(m: MonthlyInquiry): number {
  return m.usajangInquiries + m.ujunggaeInquiries;
}
export function monthTotalViews(m: MonthlyInquiry): number {
  return m.usajangViews + m.ujunggaeViews;
}

// 주 데이터를 week_start의 월(YYYY-MM)로 묶어 합산. 오름차순 정렬.
export function rollupMonthly(weeks: WeeklyInquiry[]): MonthlyInquiry[] {
  const map = new Map<string, MonthlyInquiry>();
  for (const w of weeks) {
    const month = w.weekStart.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const cur =
      map.get(month) ??
      { month, usajangInquiries: 0, usajangViews: 0, ujunggaeInquiries: 0, ujunggaeViews: 0, productPurchases: 0 };
    cur.usajangInquiries += w.usajangInquiries;
    cur.usajangViews += w.usajangViews;
    cur.ujunggaeInquiries += w.ujunggaeInquiries;
    cur.ujunggaeViews += w.ujunggaeViews;
    cur.productPurchases += w.productPurchases;
    map.set(month, cur);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// 기간(ISO 날짜 [from..to], '' = 무제한) 안의 주만. 판정 기준 = week_start(월요일)이 구간에 들어가는지
// — 주 단위 원장이라 '걸치는 주'를 쪼갤 방법이 없어, 시작일 소속으로 통째 넣거나 뺀다.
// 대시보드 기간 필터가 이걸 통과한 주만 스코어·차트에 쓴다.
export function weeksInRange(weeks: WeeklyInquiry[], from: string, to: string): WeeklyInquiry[] {
  return weeks.filter((w) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.weekStart)) return false;
    if (from && w.weekStart < from) return false;
    if (to && w.weekStart > to) return false;
    return true;
  });
}

// ── 파생 비율 (0분모 방어) ────────────────
// 문의율 = 문의수 / MAU.
export function inquiryRate(inquiries: number, mau: number): number {
  return mau > 0 ? inquiries / mau : 0;
}
// 조회율 = 조회수 / MAU.
export function viewRate(views: number, mau: number): number {
  return mau > 0 ? views / mau : 0;
}
// 문의율(= 고방 유저 전환율) = 지점 문의수 / 지점 조회수. 조회 0이면 0.
// ⚠️ 상품구매수(광고상품 구매)를 분자로 쓰면 안 된다 — 문의·조회는 '고방 유저가 지점을 보고 문의하는'
//    같은 퍼널이고, 상품구매는 '지점(파트너)이 광고를 사는' 별개 퍼널이다.
export function viewToInquiryRate(inquiries: number, views: number): number {
  return views > 0 ? inquiries / views : 0;
}

// ── 차트 버킷 (일 / 주 / 월) ────────────────
// **값 모드(일평균·주평균·월평균·합계)가 차트 버킷까지 정한다**(2026-07-28 지적 "주평균 월평균
// 필터 바꿔도 차트는 안 바뀌는데?"). 그전엔 값 모드가 KPI 분모만 갈아 KPI와 차트가 다른 단위를
// 말했다. 이제 한 점 = 그 버킷의 합계이고, 카드의 평균값 = 차트 점들의 평균이라 둘이 맞물린다.
//   · 일평균 → 일 버킷 · 주평균/합계 → 주 버킷(기본) · 월평균 → 월 버킷
// ⚠️ **온전히 안 든 버킷은 그리지 않는다** — 반쪽 주·반쪽 달이 양끝에 들어가면 그래프가 항상
//    급락으로 보인다(fullWeeks·cleanWeeklyWau와 같은 규칙). 하루는 그 자체로 완결이라 일 버킷은 전부.
export type BucketUnit = 'day' | 'week' | 'month';

export type MetricBucket = {
  key: string; // 정렬·식별 원본값 ('2026-07-19' | '2026-07')
  label: string; // 축 글자 ('7/19' | '26-07')
  usajangInquiries: number;
  usajangViews: number;
  ujunggaeInquiries: number;
  ujunggaeViews: number;
  productPurchases: number;
  days: number; // 그 버킷이 실제로 덮은 일수
};

const daysInMonth = (month: string): number => {
  const [y, m] = month.split('-').map(Number);
  return y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 0;
};

export function bucketMetrics(slice: MetricSlice, unit: BucketUnit): MetricBucket[] {
  if (unit === 'day') {
    return slice.daily.map((d) => ({
      key: d.date,
      label: weekLabel(d.date),
      usajangInquiries: d.usajangInquiries,
      usajangViews: d.usajangViews,
      ujunggaeInquiries: d.ujunggaeInquiries,
      ujunggaeViews: d.ujunggaeViews,
      productPurchases: d.productPurchases,
      days: 1,
    }));
  }
  if (unit === 'week') {
    return slice.fullWeeks.map((w) => ({
      key: w.weekStart,
      label: weekLabel(w.weekStart),
      usajangInquiries: w.usajangInquiries,
      usajangViews: w.usajangViews,
      ujunggaeInquiries: w.ujunggaeInquiries,
      ujunggaeViews: w.ujunggaeViews,
      productPurchases: w.productPurchases,
      days: w.days,
    }));
  }
  // 월 — 커버 일수는 일별 원장에서 센다. 주 폴백일 땐 셀 수가 없어(주 귀속 롤업) 완결 판정을 건너뛴다.
  const covered = new Map<string, number>();
  for (const d of slice.daily) {
    const m = d.date.slice(0, 7);
    covered.set(m, (covered.get(m) ?? 0) + 1);
  }
  return slice.monthly
    .map((m) => ({
      key: m.month,
      label: m.month.slice(2), // '2026-07' → '26-07'
      usajangInquiries: m.usajangInquiries,
      usajangViews: m.usajangViews,
      ujunggaeInquiries: m.ujunggaeInquiries,
      ujunggaeViews: m.ujunggaeViews,
      productPurchases: m.productPurchases,
      days: covered.get(m.month) ?? daysInMonth(m.month),
    }))
    .filter((b) => b.days >= daysInMonth(b.key));
}

// ── 추세선 (최소제곱 직선) ────────────────
// 점이 25개쯤 되면 오르내림에 눈이 묻혀 "결국 오르는 중인가"를 못 읽는다 → 계열마다 회귀 직선을
// 점선으로 겹친다. null(그 구간에 계열이 없음)은 피팅에서 빼고 **그 자리도 null로 남긴다** —
// 없는 데이터 위에 추세선만 뻗으면 데이터가 있는 것처럼 보인다. 유효값 2개 미만이면 전부 null.
//
// 🚨 **관측값이 전부 0 이상인 계열은 추세값도 0에서 멈춘다**(2026-09-04 지적 "이거 -25,000 뭐임?").
// 유입·문의 같은 카운트 계열이 급락하면 회귀 직선이 뒤쪽에서 음수로 내려가는데, Recharts는 그
// 계산선까지 담으려고 Y축을 -25,000까지 늘린다 → 실제 데이터가 위쪽 절반으로 눌리고, 있을 수 없는
// 음수 눈금이 축에 생긴다. 원계열에 음수가 하나라도 있으면(순증·증감 차트) 그대로 둔다 — 그런
// 계열에선 음수가 사실이다.
export function linearTrend(values: (number | null)[]): (number | null)[] {
  const pts: [number, number][] = [];
  values.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) pts.push([i, v]);
  });
  if (pts.length < 2) return values.map(() => null);
  const n = pts.length;
  const sx = pts.reduce((s, [x]) => s + x, 0);
  const sy = pts.reduce((s, [, y]) => s + y, 0);
  const sxy = pts.reduce((s, [x, y]) => s + x * y, 0);
  const sxx = pts.reduce((s, [x]) => s + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return values.map(() => null);
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const nonNegative = pts.every(([, y]) => y >= 0);
  return values.map((v, i) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    const fit = intercept + slope * i;
    return nonNegative ? Math.max(0, fit) : fit;
  });
}

// ── 채널 구분 추이 (U사장님 / U중개사) ────────────────
// 통합(weekTotal*) 추이만 있으면 "어느 채널이 움직였나"를 못 본다 — U중개사는 별개 서비스
// (u-agent.kr)이고 규모·문의율이 U사장님과 딴판이라 합쳐 놓으면 큰 쪽 흐름만 보인다.
// ⚠️ U중개사 문의가 없던 구간(서비스 개시 이전)은 0이 아니라 **null**로 끊는다 — 0을 그리면
// 차트 왼쪽이 급락으로 보여 "수집 누락"으로 읽힌다(표에서 '—'로 구분하는 것과 같은 이유).
// 조회는 전 구간 집계되므로 끊지 않는다.
export type ChannelTrendRow = {
  key: string; // week_start
  label: string; // 축 글자 'M/D'
  usajangViews: number;
  ujunggaeViews: number;
  usajangInquiries: number;
  ujunggaeInquiries: number | null;
  usajangRate: number; // 문의/조회
  ujunggaeRate: number | null;
};

// 주 시작일 → 축 라벨('2026-06-07' → '6/7').
export function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-');
  return m && d ? `${Number(m)}/${Number(d)}` : weekStart;
}

// 입력은 **버킷**이다(일/주/월 어느 단위든 같은 코드로 그린다 — 화면이 단위별 분기를 갖지 않게).
export function channelTrendRows(buckets: MetricBucket[], ujunggaeInquiryStart = ''): ChannelTrendRow[] {
  return buckets.map((w) => {
    const before = !!ujunggaeInquiryStart && w.key < ujunggaeInquiryStart;
    return {
      key: w.key,
      label: w.label,
      usajangViews: w.usajangViews,
      ujunggaeViews: w.ujunggaeViews,
      usajangInquiries: w.usajangInquiries,
      ujunggaeInquiries: before ? null : w.ujunggaeInquiries,
      usajangRate: viewToInquiryRate(w.usajangInquiries, w.usajangViews),
      ujunggaeRate: before ? null : viewToInquiryRate(w.ujunggaeInquiries, w.ujunggaeViews),
    };
  });
}

/**
 * 채널 하나의 퍼널 점(조회·문의·문의율) — 채널마다 `FunnelCombo` 1개를 그린다.
 *
 * ⚠️ 지표로 차트를 가르지 않고 **채널로** 가른다(2026-07-30 요청). 조회수 차트 하나에 두 채널을
 * 얹으면 U중개사(조회 2천)가 U사장님(1~2만) 옆에서 바닥에 눌려 보이지 않았다 — 한 축을 유지해
 * 격차를 보여주는 것보다, 각 서비스의 퍼널(조회→문의→문의율)을 자기 스케일로 읽는 게 목적이다.
 * 개시 이전 버킷은 **행에서 제외**한다(0으로 그리면 차트 왼쪽이 급락으로 보인다).
 */
export function channelFunnelRows(
  buckets: MetricBucket[],
  channel: 'usajang' | 'ujunggae',
  startKey = '',
): { key: string; label: string; views: number; inquiries: number; rate: number }[] {
  return buckets
    .filter((b) => !(channel === 'ujunggae' && startKey && b.key < startKey))
    .map((b) => {
      const views = channel === 'usajang' ? b.usajangViews : b.ujunggaeViews;
      const inquiries = channel === 'usajang' ? b.usajangInquiries : b.ujunggaeInquiries;
      return { key: b.key, label: b.label, views, inquiries, rate: viewToInquiryRate(inquiries, views) };
    });
}

// 오차율 = (GA4 − U사장님) / U사장님. usajang 0이면 0.
export function errorRate(usajang: number, ga4: number): number {
  return usajang !== 0 ? (ga4 - usajang) / usajang : 0;
}

// ── 결정론 픽스처(시트 미연결 시 샘플 모드) ────────────────
// 최근 8주(주 월요일). U사장님 문의 ~300, 조회 ~8000, 상품구매 ~20. U중개사는 소규모.
export const INQUIRY_FIXTURE: WeeklyInquiry[] = [
  { weekStart: '2026-06-01', usajangInquiries: 288, usajangViews: 7620, ujunggaeInquiries: 104, ujunggaeViews: 2810, productPurchases: 17 },
  { weekStart: '2026-06-08', usajangInquiries: 305, usajangViews: 8140, ujunggaeInquiries: 118, ujunggaeViews: 3020, productPurchases: 21 },
  { weekStart: '2026-06-15', usajangInquiries: 297, usajangViews: 7880, ujunggaeInquiries: 111, ujunggaeViews: 2960, productPurchases: 19 },
  { weekStart: '2026-06-22', usajangInquiries: 321, usajangViews: 8450, ujunggaeInquiries: 126, ujunggaeViews: 3210, productPurchases: 23 },
  { weekStart: '2026-06-29', usajangInquiries: 312, usajangViews: 8210, ujunggaeInquiries: 120, ujunggaeViews: 3080, productPurchases: 22, memo: '분양 광고 유입 증가' },
  { weekStart: '2026-07-06', usajangInquiries: 334, usajangViews: 8760, ujunggaeInquiries: 133, ujunggaeViews: 3340, productPurchases: 25 },
  { weekStart: '2026-07-13', usajangInquiries: 318, usajangViews: 8390, ujunggaeInquiries: 122, ujunggaeViews: 3110, productPurchases: 20 },
  { weekStart: '2026-07-20', usajangInquiries: 342, usajangViews: 8980, ujunggaeInquiries: 139, ujunggaeViews: 3420, productPurchases: 27 },
];

/** U중개사 문의가 처음 발생한 주 — 그 이전은 수집 누락이 아니라 채널 미존재. 주간 흐름·리포트가 같은 판정을 쓴다. */
export function ujunggaeInquiryStartOf(weeks: WeeklyInquiry[]): string {
  const hit = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).find((w) => w.ujunggaeInquiries > 0);
  return hit?.weekStart ?? '';
}
