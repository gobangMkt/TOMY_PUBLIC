// [BQ] ad_banner_daily 시트 파싱·정규화·집계.
// 원본 헤더(10열): event_date | ad_banner_id | ad_banner_service_area |
//                ad_banner_position | ad_banner_type | views | clicks | plays | ctr | ad_campaign_name
// 이벤트 ad_banner_view/click/play 를 GA4에서 일 단위로 GROUP BY 집계한 마트.
// ad_campaign_name은 2026-09-11 GTM 신규 파라미터 — 기존 BQ 테이블에 열 삽입이 안 돼(끝에만 추가 가능)
// 맨 끝(10번째)에 붙는다. GTM dataLayer 순서(campaign_name이 id보다 앞)와 마트 열 순서는 무관하다.

export type AdBannerRow = {
  eventDate: string; // ISO yyyy-mm-dd
  bannerId: string; // ad_banner_id (배너/광고주 식별)
  serviceArea: string; // ad_banner_service_area (노출 영역: youth 등)
  placement: string; // ad_banner_position (노출 위치: main_top 등)
  bannerType: string; // ad_banner_type (형태: banner_image/infeed_image/infeed_video/expandable_image)
  views: number;
  clicks: number;
  plays: number; // 영상/익스펜더블 재생 수
  ctr: number; // 행 단위 ctr(원본). 집계 CTR은 totals에서 가중계산
  campaignName: string; // ad_campaign_name (캠페인 식별, 2026-09-11 신규 열)
};

export type AdBannerTotals = {
  views: number;
  clicks: number;
  plays: number;
  ctr: number; // sum(clicks)/sum(views)
};

// 비교/추이 지표.
export type Metric = 'views' | 'clicks' | 'plays' | 'ctr';

// 집계 기준 차원. 대시보드 비교 차트가 이 축으로 전환한다.
export type Dimension = 'placement' | 'bannerType' | 'serviceArea' | 'bannerId' | 'campaignName';

export const DIMENSIONS: Record<Dimension, { label: string; of: (r: AdBannerRow) => string }> = {
  campaignName: { label: '캠페인', of: (r) => r.campaignName },
  serviceArea: { label: '영역', of: (r) => r.serviceArea },
  placement: { label: '노출면', of: (r) => r.placement },
  bannerType: { label: '형태', of: (r) => r.bannerType },
  bannerId: { label: '배너', of: (r) => r.bannerId },
};

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// GTM 버그 보정: ad_banner_play 이벤트의 service_area가 position값(community_list)으로
// 오태깅돼 영역(3열)에 섞여 들어온다. 이 서비스 영역은 youth 단일이므로 원래 값(youth)으로
// 되돌린다. position은 건드리지 않는다. (개발팀 GTM 수정 완료 시 이 맵을 비우면 됨)
const SERVICE_AREA_FIX: Record<string, string> = { community_list: 'youth' };
export function fixServiceArea(area: string): string {
  return SERVICE_AREA_FIX[area] ?? area;
}

// "2026. 7. 4" | "2026-07-04" | "2026/7/4" → "2026-07-04"
export function normalizeDate(raw: string): string {
  const s = String(raw ?? '').trim();
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return s;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// values = 시트 전체 2차원 배열(첫 행은 헤더). 헤더 유무 자동 판별.
// 열 위치 고정: 0 date · 1 id · 2 area · 3 position · 4 type · 5 views · 6 clicks · 7 plays · 8 ctr · 9 campaignName
export function parseSheetValues(values: string[][]): AdBannerRow[] {
  if (!Array.isArray(values) || values.length === 0) return [];
  const first = values[0] ?? [];
  const looksHeader = /event_date|date/i.test(String(first[0] ?? ''));
  const body = looksHeader ? values.slice(1) : values;

  const rows: AdBannerRow[] = [];
  for (const r of body) {
    if (!r || r.length === 0) continue;
    if (String(r[0] ?? '').trim() === '') continue; // 빈 행 스킵
    const views = toNumber(r[5]);
    const clicks = toNumber(r[6]);
    rows.push({
      eventDate: normalizeDate(String(r[0])),
      bannerId: String(r[1] ?? '').trim(),
      serviceArea: fixServiceArea(String(r[2] ?? '').trim()),
      placement: String(r[3] ?? '').trim(),
      bannerType: String(r[4] ?? '').trim(),
      views,
      clicks,
      plays: toNumber(r[7]),
      // 원본 ctr이 있으면 쓰되, 없으면 파생
      ctr:
        r[8] != null && String(r[8]).trim() !== '' ? toNumber(r[8]) : views > 0 ? clicks / views : 0,
      // 신규 열(2026-09-11 이전 데이터는 빈값) — 없으면 빈 문자열
      campaignName: String(r[9] ?? '').trim(),
    });
  }
  return rows;
}

export function aggregate(rows: AdBannerRow[]): AdBannerTotals {
  const views = rows.reduce((s, r) => s + r.views, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const plays = rows.reduce((s, r) => s + r.plays, 0);
  return { views, clicks, plays, ctr: views > 0 ? clicks / views : 0 };
}

// 데이터가 실제 존재하는 고유 날짜 수(평균의 분모). 빈 날은 세지 않음.
export function distinctDays(rows: AdBannerRow[]): number {
  return new Set(rows.map((r) => r.eventDate)).size;
}

export type MetricAvg = { views: number; clicks: number; plays: number };
export type AdBannerAverages = {
  days: number;
  perDay: MetricAvg;
  perWeek: MetricAvg; // = perDay × 7
};

// 일평균·주평균. 분모 = 데이터 있는 날 수. 주평균 = 일평균 × 7.
// CTR은 비율이라 평균 대상에서 제외(집계 CTR이 이미 가중평균).
export function averages(rows: AdBannerRow[]): AdBannerAverages {
  const days = distinctDays(rows);
  const t = aggregate(rows);
  const per = (v: number) => (days > 0 ? v / days : 0);
  const perDay: MetricAvg = { views: per(t.views), clicks: per(t.clicks), plays: per(t.plays) };
  const perWeek: MetricAvg = {
    views: perDay.views * 7,
    clicks: perDay.clicks * 7,
    plays: perDay.plays * 7,
  };
  return { days, perDay, perWeek };
}

// 값 보기 모드: 합계 / 일평균 / 주평균. 대시보드·원본 공통(설정은 localStorage 유지).
export type ViewMode = 'total' | 'daily' | 'weekly';

// 모드별 지표값(노출·클릭·재생). CTR은 비율이라 모드 무관(항상 가중 CTR).
export function metricByMode(
  mode: ViewMode,
  key: keyof MetricAvg,
  totals: AdBannerTotals,
  avg: AdBannerAverages,
): number {
  if (mode === 'daily') return avg.perDay[key];
  if (mode === 'weekly') return avg.perWeek[key];
  return totals[key];
}

export type GroupRow = { key: string; views: number; clicks: number; plays: number; ctr: number };

// 노출이 이만큼도 안 되는 구간의 CTR은 비율로서 뜻이 없다 — 실측 사고: `youth_main_top_0004`가
// 노출 1·클릭 7(=700%)이라 배너별 비교 차트의 우축이 -300~900%로 늘어나, 나머지 13개 배너의
// 클릭률 선이 0 근처에 눌려 통째로 안 읽혔다(2026-08-11 사용자 확정: "노출 적은 배너는 CTR 제외").
export const CTR_MIN_VIEWS = 100;

// 차트용 CTR. 표본이 얇으면 **null**(0이 아니다 — 0으로 두면 "클릭이 없었다"는 거짓이 되고,
// 선이 바닥까지 내려와 실제 부진 구간과 구분되지 않는다). 조회·클릭 막대와 표·KPI는 손대지 않는다.
export function chartCtr(row: { views: number; ctr: number }): number | null {
  return row.views >= CTR_MIN_VIEWS ? row.ctr : null;
}

// 위 규칙으로 CTR을 비운 차트 데이터 + 몇 개를 뺐는지(화면이 그 사실을 스스로 말하게).
export function withChartCtr(rows: GroupRow[]): {
  rows: (Omit<GroupRow, 'ctr'> & { ctr: number | null })[];
  thinCount: number;
} {
  const out = rows.map((r) => ({ ...r, ctr: chartCtr(r) }));
  return { rows: out, thinCount: out.filter((r) => r.ctr === null).length };
}

function groupBy(rows: AdBannerRow[], keyOf: (r: AdBannerRow) => string): GroupRow[] {
  const map = new Map<string, { views: number; clicks: number; plays: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    const cur = map.get(k) ?? { views: 0, clicks: 0, plays: 0 };
    cur.views += r.views;
    cur.clicks += r.clicks;
    cur.plays += r.plays;
    map.set(k, cur);
  }
  return [...map.entries()].map(([key, v]) => ({
    key,
    views: v.views,
    clicks: v.clicks,
    plays: v.plays,
    ctr: v.views > 0 ? v.clicks / v.views : 0,
  }));
}

// 날짜별 집계 (날짜 오름차순) — 추이 차트용. CTR은 날짜 단위 가중.
export function groupByDate(rows: AdBannerRow[]): GroupRow[] {
  return groupBy(rows, (r) => r.eventDate).sort((a, b) => a.key.localeCompare(b.key));
}

// 임의 차원별 집계 (노출 내림차순) — 비교 차트용.
export function groupByDimension(rows: AdBannerRow[], dim: Dimension): GroupRow[] {
  return groupBy(rows, DIMENSIONS[dim].of).sort((a, b) => b.views - a.views);
}

export type AdBannerFilters = {
  from?: string; // ISO yyyy-mm-dd 포함
  to?: string; // ISO yyyy-mm-dd 포함
  bannerIds?: string[]; // 빈/undefined = 전체(다중선택)
  serviceAreas?: string[]; // 빈/undefined = 전체(다중선택)
  placements?: string[];
  bannerTypes?: string[];
  campaignNames?: string[];
};

function inSel(sel: string[] | undefined, v: string): boolean {
  return !sel || sel.length === 0 || sel.includes(v);
}

export function applyFilters(rows: AdBannerRow[], f: AdBannerFilters): AdBannerRow[] {
  return rows.filter((r) => {
    if (f.from && r.eventDate < f.from) return false;
    if (f.to && r.eventDate > f.to) return false;
    if (!inSel(f.bannerIds, r.bannerId)) return false;
    if (!inSel(f.serviceAreas, r.serviceArea)) return false;
    if (!inSel(f.placements, r.placement)) return false;
    if (!inSel(f.bannerTypes, r.bannerType)) return false;
    if (!inSel(f.campaignNames, r.campaignName)) return false;
    return true;
  });
}

export const uniqueSorted = (xs: string[]): string[] => [...new Set(xs)].sort();

// 다중선택 필터 축(5개). 값은 AdBannerFilters의 배열 필드 이름과 같다.
export type FacetKey =
  | 'bannerIds'
  | 'serviceAreas'
  | 'placements'
  | 'bannerTypes'
  | 'campaignNames';

const FACET_OF: Record<FacetKey, (r: AdBannerRow) => string> = {
  bannerIds: (r) => r.bannerId,
  serviceAreas: (r) => r.serviceArea,
  placements: (r) => r.placement,
  bannerTypes: (r) => r.bannerType,
  campaignNames: (r) => r.campaignName,
};

// 축마다 "지금 골라도 데이터가 남는" 값들. 나머지 필터(기간 포함)를 적용한 뒤 그 축의 값을 모은다.
// ⚠️ 자기 축은 계산에서 뺀다 — 자기 선택으로 자기 옵션을 좁히면 고른 값 하나만 남아
// 다른 값으로 갈아탈 수 없다(해제밖에 못 한다). 화면은 이 목록에 없는 옵션을 비활성으로 그린다.
// 예: 영역=youth면 home에만 있는 노출면(main_middle…)·배너가 선택 불가로 표시된다.
export function availableFacets(
  rows: AdBannerRow[],
  f: AdBannerFilters,
): Record<FacetKey, string[]> {
  const out = {} as Record<FacetKey, string[]>;
  for (const key of Object.keys(FACET_OF) as FacetKey[]) {
    const scoped = applyFilters(rows, { ...f, [key]: undefined });
    out[key] = uniqueSorted(scoped.map(FACET_OF[key]));
  }
  return out;
}

// maxDate 기준 "최근 days일" 범위(양끝 포함). 예: maxDate=2026-07-07, days=7 → 07-01~07-07.
export function presetRange(maxDate: string, days: number): { from: string; to: string } {
  if (!maxDate || days <= 0) return { from: '', to: '' };
  const d = new Date(`${maxDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { from: '', to: '' };
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return { from: d.toISOString().slice(0, 10), to: maxDate };
}

// from~to 바로 앞의 동일 길이 기간(양끝 포함). 대시보드 KPI 증감 비교용.
// 둘 중 하나라도 비면 비교 불가(null).
export function previousRange(from: string, to: string): { from: string; to: string } | null {
  if (!from || !to) return null;
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t < f) return null;
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const prevTo = new Date(f.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

// 차원 비교용 집계.
// - selected 비었으면 해당 차원 전체 값 각각(노출 내림차순).
// - selected 있으면 그 값들만.
// - merge=true & 2개 이상 대상일 때 하나로 합산(key = "A + B").
export function compareByDimension(
  rows: AdBannerRow[],
  dim: Dimension,
  selected: string[],
  merge: boolean,
): GroupRow[] {
  const of = DIMENSIONS[dim].of;
  const sel = [...new Set(selected.filter(Boolean))];
  const scoped = sel.length ? rows.filter((r) => sel.includes(of(r))) : rows;
  const names = [...new Set(scoped.map(of))];
  if (merge && names.length >= 2) {
    const views = scoped.reduce((s, r) => s + r.views, 0);
    const clicks = scoped.reduce((s, r) => s + r.clicks, 0);
    const plays = scoped.reduce((s, r) => s + r.plays, 0);
    return [{ key: names.join(' + '), views, clicks, plays, ctr: views > 0 ? clicks / views : 0 }];
  }
  return groupByDimension(scoped, dim);
}
