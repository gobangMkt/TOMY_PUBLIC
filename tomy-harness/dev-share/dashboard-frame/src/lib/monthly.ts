// 월간 흐름 — 22-01부터의 월별 지표 격자 + 전년동월 대비(YoY).
//
// 1시트(`월간성과정리`)가 하던 두 일을 어드민으로 옮긴 것: ①장기 월 시계열 ②전년동월 대비.
// 소스가 3개(트래픽 원장 `월_legacy`/`월_MAU`, 지표 원장 일별, 매출 원장)라 **지표별 우선순위**가
// 이 파일의 본질이다. 아무 데서나 합치면 같은 달이 화면마다 달라진다.
import { shiftYm } from './traffic';
import { monthsIn, quarterKeyOf, monthLastDayISO, type ColSpec } from './revenue';
import type { DailyInquiry } from './inquiries';
import { rollupDailyMonthly } from './inquiries';
import type { RevenueTxn, MonthlyTarget } from './revenue';
import { deltaOf } from './format';

export type MetricKey =
  | 'mau'
  | 'views'
  | 'inquiries'
  | 'revenue'
  | 'purchases'
  | 'branchTotal'
  | 'partnerTotal'
  | 'partnerNew'
  | 'appInstalls'
  | 'searchVolume';

// 분기 열 집계 방식. ⚠️ MAU·조회·문의는 **유니크 또는 기간 종속**이라 3개월 합계가 거짓이 된다
// (MAU 합계는 같은 사람을 세 번 세고, 스냅샷은 합칠 대상이 아니다) → 평균/마지막값으로 접는다.
export type RollUp = 'sum' | 'avg' | 'last';

export const METRIC_META: { key: MetricKey; label: string; unit: string; roll: RollUp }[] = [
  { key: 'mau', label: 'MAU', unit: '명', roll: 'avg' },
  // 🚨 조회·문의는 **평균**이다(2026-08-05 사용자 지정 "지점조회수 = 평균(분기평균/연평균) · 문의수 = 평균").
  //    그전엔 합계라 분기 값이 월 값의 3배·연 값이 12배로 찍혀 바로 위 월 행들과 자릿수가 달랐다 —
  //    월과 같은 눈금이어야 "이 분기 평균이 그 달보다 나은가"를 눈으로 바로 견줄 수 있다.
  //    ⚠️ 합계가 필요하면 월 행을 더하는 게 아니라 그 기간 원장을 보는 게 맞다(합계는 매출만 남았다).
  { key: 'views', label: '지점 조회수', unit: '회', roll: 'avg' },
  { key: 'inquiries', label: '지점 문의수', unit: '건', roll: 'avg' },
  { key: 'revenue', label: '매출', unit: '원', roll: 'sum' },
  // 판매건수 = 일별 원장 `product_purchases` 월 합(지점이 광고를 산 건수). 객단가(매출÷판매건수)의 분모라
  // 매출 옆에 둔다(2026-10-02 요청 "열 넣어"). 자동수집(u-ceo)이라 수기 입력 대상 아님(MANUAL_METRICS 제외).
  { key: 'purchases', label: '판매건수', unit: '건', roll: 'sum' },
  // '지점수' = 전체 등록 지점(1시트 수기, 2026-06까지) / '파트너 수' = u-ceo TOTAL_COUNT(자동, 현재까지)
  { key: 'branchTotal', label: '지점수', unit: '개', roll: 'last' },
  { key: 'partnerTotal', label: '파트너 수', unit: '개', roll: 'last' },
  { key: 'partnerNew', label: '파트너 신규', unit: '명', roll: 'sum' },
  { key: 'appInstalls', label: '앱 설치', unit: '명', roll: 'last' },
  { key: 'searchVolume', label: '검색량', unit: '회', roll: 'avg' },
];

export type LegacyRow = {
  ym: string;
  mau?: string | number;
  usajang_inquiries?: string | number;
  usajang_views?: string | number;
  branch_total?: string | number;
  partner_total?: string | number;
  partner_new?: string | number;
  app_installs?: string | number;
  search_volume?: string | number;
  revenue_total?: string | number;
};

export type MauRow = { ym: string; active?: string | number; source?: string; updated_at?: string };

/**
 * `월_MAU`(GA4 파생 원장)가 **지난달이 끝난 뒤에** 갱신됐는지 판정한다.
 *
 * 🚨 2026-09-01 실제 사고: 이 어드민은 스케줄러가 없는 온디맨드 구조라(§실행 방식), 아무도 GA4 적재를
 * 누르지 않으면 원장이 조용히 낡는다. `월_MAU`의 2026-08 행이 **8/5에 찍힌 반쪽 값(38,935)** 그대로
 * 9월까지 남아 있었다 — 8월이 실제로 끝난 뒤 재수집한 값은 222,311(6·7월과 자연스러운 흐름)이었다.
 * `updated_at`이 그 달 말일보다 이르면(=진행 중일 때 찍힘) 그 뒤로 갱신이 없었다는 뜻이다.
 * 행 자체가 없으면(=한 번도 수집 안 됨) 당연히 stale.
 */
export function mauStaleness(
  mauRows: MauRow[],
  today: string,
): { ym: string; updatedAt: string | null; stale: boolean } {
  const ym = shiftYm(today.slice(0, 7), -1);
  const row = mauRows.find((r) => r.ym === ym);
  if (!row?.updated_at) return { ym, updatedAt: null, stale: true };
  return { ym, updatedAt: row.updated_at, stale: row.updated_at < monthLastDayISO(ym) };
}

export type MonthCell = { value: number | null; source: 'ledger' | 'legacy' | 'ga4' };
export type MonthRow = { ym: string } & Record<MetricKey, MonthCell>;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const cell = (value: number | null, source: MonthCell['source']): MonthCell => ({ value, source });
const EMPTY: MonthCell = { value: null, source: 'legacy' };

/**
 * 월 격자 병합. 지표별 우선순위(왼쪽이 이긴다):
 *  - MAU        : `월_MAU` 탭(GA4 → 없으면 legacy 백필분)
 *  - 조회·문의   : **일별 원장**(정본) → `월_legacy`(2023 이전 구간)
 *  - 매출        : **매출 원장**(건별 합) → `월_legacy`(2026 이전 구간)
 *  - 그 외 축     : `월_legacy` 단독(자동수집 경로가 없다. 지점수만 일별 스냅샷으로 덮는다)
 *
 * ⚠️ 조회·문의는 **U사장님 + U중개사 합**이다(어드민 전역 규칙). 일별 원장에서 두 채널을 더한다.
 * ⚠️ 지점수는 스냅샷이라 합산 금지 → 그 달 **마지막 값**만 쓴다.
 */
export function buildMonthlyMatrix(input: {
  legacy: LegacyRow[];
  mau: MauRow[];
  daily: DailyInquiry[];
  txns: RevenueTxn[];
  /** 오늘(KST) — 넘기면 그 달을 **모든 소스가 비어 있어도** 행에 포함한다(진행 중인 달 표시용).
   *  안 넘기면 옛 동작 그대로(어느 소스에도 없는 달은 행이 안 생긴다). */
  today?: string;
}): MonthRow[] {
  const months = new Set<string>();
  input.legacy.forEach((r) => r.ym && months.add(r.ym));
  input.mau.forEach((r) => r.ym && months.add(r.ym));
  const monthly = rollupDailyMonthly(input.daily);
  monthly.forEach((m) => months.add(m.month));
  input.txns.forEach((t) => t.date && months.add(t.date.slice(0, 7)));
  // 새 달이 시작되면 GA4·원장이 며칠 지나야 데이터를 채운다 — 그 며칠 사이엔 위 소스 어디에도
  // 그 달이 없어 행 자체가 안 생겼다("이번 달 행이 왜 없냐"는 지적 방지, 2026-07-31).
  if (input.today) months.add(input.today.slice(0, 7));

  const legacyBy = new Map(input.legacy.map((r) => [r.ym, r]));
  const mauBy = new Map(input.mau.map((r) => [r.ym, r]));
  const dailyBy = new Map(monthly.map((m) => [m.month, m]));

  // ⚠️ 일별 원장 `branchTotal`(u-ceo TOTAL_COUNT)은 **파트너 수**다 — legacy '지점수'가 아니다.
  // 실측(2026-07-29): 일별 마지막값 891/989/1371/1621/1667 = legacy `partner_total`과 완전 일치,
  // legacy `branch_total`은 4,201~5,839로 전혀 다른 축(전체 등록 지점수)이었다. 처음엔 지점수에
  // 넣어서 2023-01에 5,xxx → 891로 급락하는 가짜 계단이 생겼다.
  const partnerBy = new Map<string, number>();
  [...input.daily]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((d) => {
      if (d.branchTotal > 0) partnerBy.set(d.date.slice(0, 7), d.branchTotal);
    });

  const revBy = new Map<string, number>();
  input.txns.forEach((t) => {
    const m = (t.date || '').slice(0, 7);
    if (!m) return;
    revBy.set(m, (revBy.get(m) ?? 0) + t.amount);
  });

  return [...months]
    .filter((m) => /^\d{4}-\d{2}$/.test(m))
    .sort()
    .map((ym) => {
      const lg = legacyBy.get(ym);
      const dm = dailyBy.get(ym);
      const mauRow = mauBy.get(ym);

      const mau = num(mauRow?.active);
      const views = dm ? dm.usajangViews + dm.ujunggaeViews : num(lg?.usajang_views);
      const inquiries = dm ? dm.usajangInquiries + dm.ujunggaeInquiries : num(lg?.usajang_inquiries);
      const revenue = revBy.has(ym) ? revBy.get(ym)! : num(lg?.revenue_total);
      // 지점수(전체 등록)는 자동수집 경로가 없어 legacy 단독 — 2026-07부터는 값이 없다(`·`).
      const branch = num(lg?.branch_total);
      const partner = partnerBy.has(ym) ? partnerBy.get(ym)! : num(lg?.partner_total);

      const row: MonthRow = {
        ym,
        mau: cell(mau, mauRow?.source === 'legacy-sheet' ? 'legacy' : 'ga4'),
        views: cell(views, dm ? 'ledger' : 'legacy'),
        inquiries: cell(inquiries, dm ? 'ledger' : 'legacy'),
        revenue: cell(revenue, revBy.has(ym) ? 'ledger' : 'legacy'),
        // 판매건수 = 일별 원장 product_purchases 월 합(자동수집). 일별이 없으면 값 없음(legacy엔 열이 없다).
        purchases: cell(dm ? dm.productPurchases : null, dm ? 'ledger' : 'legacy'),
        branchTotal: cell(branch, 'legacy'),
        partnerTotal: cell(partner, partnerBy.has(ym) ? 'ledger' : 'legacy'),
        partnerNew: cell(num(lg?.partner_new), 'legacy'),
        appInstalls: cell(num(lg?.app_installs), 'legacy'),
        searchVolume: cell(num(lg?.search_volume), 'legacy'),
      };
      return row;
    });
}

/** 월 격자표의 행 = 월 / 분기 소계 / **연 소계**(2026-08-05 신설). `ColSpec`(월·분기)의 확장. */
export type RowSpec = ColSpec | { type: 'ysub'; key: string };

/**
 * 월을 **행**으로 세우는 순서(최신이 위) + 분기 소계 행 + 연 소계 행.
 *
 * ⚠️ 열이 아니라 행이다. 22-01부터 54개월을 열로 늘렸더니 최신 달이 오른쪽 끝에 있어
 * "26년 2분기가 어땠나"를 보려면 매번 가로로 끝까지 스크롤해야 했다(2026-07-30 지적).
 * 매출 목표 매트릭스의 격자(월=열)는 목표기간 6개월짜리라 성립하던 것이고, 장기 시계열엔 맞지 않는다.
 * 지표는 9개로 고정이라 열로 세우면 가로 스크롤이 사라진다.
 *
 * 🚨 **소계는 자기 기간의 월들 "아래"다**(2026-08-05 사용자 지정 "분기 및 연간합은 아래에 배치 — 지금은
 * 1분기가 26-03 위인데 26-01 아래 / 26년 총합이 26 3분기 위인데 26 1분기 아래"). 그래서 **내림차순으로
 * 세우면서** 그 기간의 마지막 행(=가장 과거 달) 뒤에 소계를 넣는다 → `26-03·26-02·26-01 → 26 1분기`,
 * 그 해 분기가 다 끝나면 `→ 2026년`. 합계는 위에서 훑어 내려온 값들의 결론이므로 아래에 온다.
 * ⚠️ 연 소계를 `monthColumnSpecs`(revenue.ts)에 넣지 않은 이유 = 그 함수는 **매출·OKR 목표 매트릭스의
 *    열 시퀀스**이기도 해서, 거기 손대면 그 두 표에 연 열이 조용히 생긴다.
 */
export function monthRowSpecs(months: string[]): RowSpec[] {
  const desc = [...months].reverse();
  const out: RowSpec[] = [];
  desc.forEach((m, i) => {
    out.push({ type: 'month', month: m });
    // `next` = 한 칸 더 **과거**인 달. 거기서 기간이 바뀌면 지금 행이 그 기간의 마지막 행이다.
    const next = desc[i + 1];
    if (!next || quarterKeyOf(next) !== quarterKeyOf(m)) out.push({ type: 'qsub', key: quarterKeyOf(m) });
    if (!next || next.slice(0, 4) !== m.slice(0, 4)) out.push({ type: 'ysub', key: m.slice(0, 4) });
  });
  return out;
}

/**
 * 자동수집 경로가 **없는** 축 — `월_legacy` 탭에 손으로 넣는다.
 * MAU는 GA4, 조회·문의는 u-ceo/u-agent, 매출은 매출 원장, 파트너 수는 u-ceo가 채우지만
 * 이 4개는 원천이 사람뿐이라 입력 UI가 없으면 1시트 백필이 끝난 2026-06에서 영구히 멈춘다.
 */
export const MANUAL_METRICS: {
  key: MetricKey;
  col: keyof LegacyRow;
  label: string;
  unit: string;
  /** 이 값을 어디서 보고 오는지 — 입력칸 옆 바로가기(2026-08-03). 없으면 링크를 안 그린다. */
  source?: { href: string; label: string };
}[] = [
  {
    key: 'branchTotal',
    col: 'branch_total',
    label: '지점수',
    unit: '개',
    // 전체 등록 지점수는 u-ceo 관리자에서 확인한다(자동수집 경로 없음 — 그래서 수기 축이다).
    source: { href: 'https://u-ceo.kr', label: 'U사장님 열기' },
  },
  { key: 'partnerNew', col: 'partner_new', label: '파트너 신규', unit: '명' },
  {
    key: 'appInstalls',
    col: 'app_installs',
    label: '앱 설치',
    unit: '명',
    // Play Console 통계(활성 기기·기간 프리셋까지 박힌 링크) — 사용자 지정 2026-08-03.
    source: {
      href: 'https://play.google.com/console/u/3/developers/YOUR_DEV_ID/app/YOUR_APP_ID/statistics?metrics=ACTIVE_DEVICES-ALL-UNIQUE-PER_INTERVAL-DAY&dimension=COUNTRY&dimensionValues=OVERALL&dateRange=2026_7_4-2026_8_2&tab=APP_STATISTICS&ctpMetric=DAU_MAU-ACQUISITION_UNSPECIFIED-COUNT_UNSPECIFIED-CALCULATION_UNSPECIFIED-DAY&ctpDateRange=2026_7_6-2026_8_2&ctpDimension=COUNTRY&ctpDimensionValue=OVERALL&ctpPeersetKey=3%3Af3967385d8c6c32e',
      label: 'Play Console 열기',
    },
  },
  {
    key: 'searchVolume',
    col: 'search_volume',
    label: '검색량',
    unit: '회',
    // 네이버 검색광고 '키워드 도구' — 브랜드 키워드의 **월간 검색수(PC+모바일)** 절대값이 나온다.
    // ⚠️ 데이터랩(트렌드)은 0~100 상대지수라 이 칸에 넣을 수 없다. 자동화 메모는 CLAUDE.md 참조.
    source: { href: 'https://manage.searchad.naver.com/customers', label: '네이버 검색광고 열기' },
  },
];

/**
 * `월_legacy` 한 행 upsert 페이로드. **기존 행 전체를 실어** 패치만 얹는다.
 *
 * ⚠️ GAS `trafficBatch_`는 시트 헤더 전체를 `row[h] ?? ''`로 덮으므로, 바꾸려는 칸만 보내면
 * 그 달 mau·매출·조회·문의가 통째로 빈칸이 된다. 부분 갱신이 아니라 **행 교체**다.
 */
export function mergeLegacyRow(
  legacy: LegacyRow[],
  ym: string,
  patch: Partial<Record<keyof LegacyRow, string>>,
): Record<string, string> {
  const found = legacy.find((r) => r.ym === ym);
  const out: Record<string, string> = {};
  if (found) {
    (Object.keys(found) as (keyof LegacyRow)[]).forEach((k) => {
      const v = found[k];
      if (v !== undefined && v !== null && v !== '') out[k as string] = String(v);
    });
  } else {
    out.source = 'manual';
  }
  out.ym = ym;
  Object.entries(patch).forEach(([k, v]) => {
    out[k] = v ?? '';
  });
  return out;
}

/** 그 달에 아직 안 채워진 수기 입력 축 — 진행 중인 달 배너·표 셀 강조에 쓴다. */
export function missingManualMetrics(row: MonthRow | undefined): typeof MANUAL_METRICS {
  if (!row) return [...MANUAL_METRICS];
  return MANUAL_METRICS.filter((m) => row[m.key].value === null);
}

export type MonthRange = '12m' | '24m' | 'all' | (string & {});

/**
 * 기간 필터. `12m`·`24m`은 **오늘 기준**(현재 달 포함), 4자리는 그 연도, `all`은 전부.
 * ⚠️ 필터는 표·차트가 함께 따른다 — 한쪽만 자르면 같은 화면이 두 기간을 말한다.
 */
export function sliceMonths(months: string[], range: MonthRange, today: string): string[] {
  if (range === 'all') return [...months];
  if (/^\d{4}$/.test(range)) return months.filter((m) => m.slice(0, 4) === range);
  const cur = today.slice(0, 7);
  const back = range === '24m' ? -23 : -11;
  const from = shiftYm(cur, back);
  return months.filter((m) => m >= from && m <= cur);
}

/** 기간 옵션 = 최근 12·24개월 + 데이터에 실제로 있는 연도(최신 먼저) + 전체. */
export function rangeOptionsOf(months: string[]): { value: MonthRange; label: string }[] {
  const years = [...new Set(months.map((m) => m.slice(0, 4)))].sort().reverse();
  return [
    { value: '12m', label: '최근 12개월' },
    { value: '24m', label: '최근 24개월' },
    ...years.map((y) => ({ value: y as MonthRange, label: `${y}년` })),
    { value: 'all', label: '전체' },
  ];
}

/** 전년동월 대비 비율. 전년 값이 없거나 0이면 null(0으로 찍으면 '변화 없음'으로 오독된다). */
export function yoyOf(rows: MonthRow[], ym: string, key: MetricKey): number | null {
  const by = new Map(rows.map((r) => [r.ym, r]));
  const cur = by.get(ym)?.[key]?.value;
  const prev = by.get(shiftYm(ym, -12))?.[key]?.value;
  if (cur === null || cur === undefined || prev === null || prev === undefined || prev === 0) return null;
  return cur / prev - 1;
}

export function momOf(rows: MonthRow[], ym: string, key: MetricKey): number | null {
  const by = new Map(rows.map((r) => [r.ym, r]));
  const cur = by.get(ym)?.[key]?.value;
  const prev = by.get(shiftYm(ym, -1))?.[key]?.value;
  if (cur === null || cur === undefined || prev === null || prev === undefined || prev === 0) return null;
  return cur / prev - 1;
}

/**
 * 전년동월(-12)·전월(-1) 대비 — **비율 + 절대 증감 한 벌**(2026-08-03).
 * 표는 '▲ 30.5%'만으로는 몇 명이 는 건지 알 수 없어 판단이 안 된다(사용자 확정 규칙).
 * ⚠️ 위 `yoyOf`/`momOf`(비율만)는 기존 호출부·테스트가 쓰고 있어 그대로 둔다 — 이 함수가 그 상위집합이다.
 */
export function deltaOfMonth(
  rows: MonthRow[],
  ym: string,
  key: MetricKey,
  monthsBack: -12 | -1,
): { ratio: number | null; diff: number | null } {
  const by = new Map(rows.map((r) => [r.ym, r]));
  const cur = by.get(ym)?.[key]?.value;
  const prev = by.get(shiftYm(ym, monthsBack))?.[key]?.value;
  return deltaOf(cur, prev);
}

/**
 * 기간(분기·연) 집계. `roll`에 따라 합계/평균/마지막값. 값이 하나도 없으면 null.
 * ⚠️ 평균의 분모는 **값이 있는 달 수**다(빈 달을 0으로 세면 평균이 내려간다).
 */
export function rollupPeriod(rows: MonthRow[], periodMonths: string[], key: MetricKey): number | null {
  const meta = METRIC_META.find((m) => m.key === key)!;
  const by = new Map(rows.map((r) => [r.ym, r]));
  const vals = periodMonths
    .map((m) => by.get(m)?.[key]?.value)
    .filter((v): v is number => v !== null && v !== undefined);
  if (!vals.length) return null;
  if (meta.roll === 'sum') return vals.reduce((s, v) => s + v, 0);
  if (meta.roll === 'avg') return vals.reduce((s, v) => s + v, 0) / vals.length;
  return vals[vals.length - 1];
}

/** 하위호환 별칭 — 분기 전용이던 이름(호출부·테스트가 쓴다). 연 집계도 같은 함수다. */
export const rollupQuarter = rollupPeriod;

/**
 * 그 기간에서 **이미 끝난 달**만. 진행 중인 달(과 아직 오지 않은 달)은 버린다 — 전역 규칙이고,
 * 이게 있어야 진행 중인 분기·연도의 값이 '지금까지 모인 것'이 된다.
 * ⚠️ `lastComplete`가 null이면(데이터 없음) 자르지 않는다 — 집계 쪽이 빈 값을 걸러 낸다.
 */
export function monthsSoFar(periodMonths: string[], lastComplete: string | null): string[] {
  if (!lastComplete) return [...periodMonths];
  return periodMonths.filter((m) => m <= lastComplete);
}

/** 진행 중 기간의 꼬리표 — `7월까지`(집계에 든 마지막 달). 빈 목록이면 null. */
export function throughLabel(months: string[]): string | null {
  const last = months[months.length - 1];
  if (!last) return null;
  return `${Number(last.slice(5, 7))}월까지`;
}

export type PeriodDelta = {
  ratio: number | null;
  diff: number | null;
  /** 대비에 실제로 쓴 달(현재 기간 쪽) — 경과분 ∩ 값이 있는 달 */
  months: string[];
  /** `months`와 같은 순번으로 짝지은 **비교 기간 쪽** 달 — 비교 대상 행이 자기 값을 이 달들만으로
   *  다시 계산하면 이 델타와 정확히 같은 산식을 쓴 값이 된다(2026-08-05, §matchRangeLabel 참조). */
  prevMonths: string[];
  /** 아직 안 끝난 기간이라 경과분만으로 견줬다 */
  partial: boolean;
};

/**
 * 기간 대비 — **같은 달 위치끼리** 견준다(2026-08-05 신설).
 *
 * 🚨 왜 위치를 맞추나: 그전엔 미완결 분기의 대비를 아예 내지 않았다(`·`). 26-Q3에 7월 하나뿐인데
 * 작년 3개월과 견주면 매출이 -63.9%로 찍혀서다. 그런데 그건 '진행 중이라 비교 불가'가 아니라
 * **분모를 잘못 잡은 것**이었다 → 현재 기간에서 집계에 든 달과 **같은 순번**의 달만 비교 기간에서
 * 집어 온다(26-Q3 7월 vs 25-Q3 7월 / 2026 1~7월 vs 2025 1~7월). 그래야 "올해가 작년 대비 잘
 * 순항 중인가"에 답할 수 있다(사용자 요청 2026-08-05).
 * ⚠️ 위치는 **지표마다 다시 고른다** — 지점수처럼 특정 달에서 멈춘 축이 있어서, 기간 전체로 고정하면
 *    한쪽만 짧은 채 견주게 된다(그게 위 -63.9%와 같은 종류의 거짓이다).
 * ⚠️ 집계는 `rollupPeriod`에 위임한다 — 지표별 합/평/말 규칙이 분자·분모에 똑같이 걸려야 한다
 *    (MAU를 3개월 합치면 같은 사람을 세 번 센다).
 */
export function deltaOfPeriod(
  rows: MonthRow[],
  periodMonths: string[],
  prevMonths: string[],
  key: MetricKey,
  lastComplete: string | null = null,
): PeriodDelta {
  const by = new Map(rows.map((r) => [r.ym, r]));
  const soFar = monthsSoFar(periodMonths, lastComplete);
  const partial = soFar.length < periodMonths.length;
  const picked = soFar
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => by.get(m)?.[key]?.value != null);
  if (!picked.length) return { ratio: null, diff: null, months: [], prevMonths: [], partial };
  const curMonths = picked.map((p) => p.m);
  const prevPick = picked.map((p) => prevMonths[p.i]).filter((m): m is string => Boolean(m));
  const cur = rollupPeriod(rows, curMonths, key);
  const prev = rollupPeriod(rows, prevPick, key);
  if (cur == null || prev == null) return { ratio: null, diff: null, months: curMonths, prevMonths: prevPick, partial };
  const diff = cur - prev;
  return { diff, ratio: prev !== 0 ? diff / prev : null, months: curMonths, prevMonths: prevPick, partial };
}

/**
 * 매칭된 달 목록을 "N~M월" 문구로 — 비교 대상 행이 왜 전체 기간이 아니라 일부만 보여주는지 라벨이
 * 스스로 말한다(2026-08-05, 지적 "6.92억이고 전년은 11.6억인데 2.3% UP이거든? ... 직관적으로 알게
 * 못함?" — 원인은 델타 계산이 아니라 **화면에 보이는 두 숫자가 서로 다른 개월수**였다: 2026년 행은
 * 경과분(1~7월) 합인데 2025년 행은 12개월 전체 합이라 나란히 놓아도 델타와 안 맞아 보였다).
 * 월이 하나면 `7월만`, 여럿이면 `1~7월만` — 어느 해인지는 안 적는다(월-of-year는 두 해가 같다).
 */
export function matchRangeLabel(months: string[]): string | null {
  if (!months.length) return null;
  const mm = (m: string) => Number(m.slice(5, 7));
  const start = mm(months[0]);
  const end = mm(months[months.length - 1]);
  return start === end ? `${start}월만` : `${start}~${end}월만`;
}

/** 분기 키(`YYYY-QN`) 이동 — `-4`=전년 동분기, `-1`=전분기(Q1이면 전년 Q4로 넘어간다). */
export function shiftQuarter(qKey: string, back: number): string {
  const [y, q] = qKey.split('-Q').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(q)) return qKey;
  const idx = y * 4 + (q - 1) + back;
  return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
}

/**
 * 분기 소계의 전년동분기(-4)·전분기(-1) 대비 — 월 행과 **같은 `{ratio, diff}` 모양**(`Delta`가 그린다).
 * 2026-08-03 사용자 요청("분기도 전년동 분기 대비 표현하고"): 분기 행만 대비 칸이 `·`이라 접었다 펴도
 * 얻는 게 값 하나뿐이었다.
 * `lastComplete`를 넘기면 **진행 중인 분기도 경과분끼리** 견준다(2026-08-05) — 안 넘기면 기간 전체 비교.
 */
export function deltaOfQuarter(
  rows: MonthRow[],
  qKey: string,
  key: MetricKey,
  back: -4 | -1,
  lastComplete: string | null = null,
): PeriodDelta {
  return deltaOfPeriod(
    rows,
    monthsIn('quarter', qKey),
    monthsIn('quarter', shiftQuarter(qKey, back)),
    key,
    lastComplete,
  );
}

/**
 * 연 소계의 **전년 대비**(2026-08-05 사용자 요청 "연 값도 표시 … 현재 년도 평균값 등이 전년도 대비해서
 * 얼마나 잘 순항 중인지 볼 수 있게"). 진행 중인 연도는 경과분(1~n월)과 전년 같은 달들을 견준다.
 * ⚠️ 연 행에는 '전월'에 해당하는 짝이 없어 대비 모드와 무관하게 항상 **전년**이다(화면 툴팁이 그렇게 말한다).
 */
export function deltaOfYear(
  rows: MonthRow[],
  year: string,
  key: MetricKey,
  lastComplete: string | null = null,
): PeriodDelta {
  return deltaOfPeriod(
    rows,
    monthsIn('year', year),
    monthsIn('year', String(Number(year) - 1)),
    key,
    lastComplete,
  );
}

/**
 * legacy → GA4 소스가 바뀌는 첫 달. 그 경계에서 값이 튀는 건 실제 변화가 아니라 **정의 차이**다
 * (legacy 백필분은 31일 창, GA4는 달력 월 — 실측 약 5% 차이). 화면이 구분선을 그리는 데 쓴다.
 */
export function sourceBoundary(rows: MonthRow[], key: MetricKey = 'mau'): string | null {
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1][key];
    const cur = rows[i][key];
    if (prev.source === 'legacy' && cur.source === 'ga4' && cur.value !== null) return rows[i].ym;
  }
  return null;
}

/** 진행 중인 달(=오늘이 속한 달)은 제외한 마지막 완결 달. 반쪽 달을 '이번 달'로 보여주지 않는다. */
export function lastCompleteMonth(rows: MonthRow[], today: string): string | null {
  const cur = today.slice(0, 7);
  const done = rows.map((r) => r.ym).filter((m) => m < cur);
  return done.length ? done[done.length - 1] : null;
}
export { EMPTY as EMPTY_CELL };

// ─────────────────────────────────────────────────────────────────────────────
// 차트용 파생 지표 (2026-08-03 사용자 요청 차트 6종)
//
// 🚨 **파생 산식은 여기 한 곳에만 둔다** — 화면에서 나눗셈을 짜면 같은 이름의 지표가 화면마다 다른
// 분모를 쓰게 된다(이 프로젝트에서 '문의율'이 실제로 그렇게 두 뜻[문의/MAU, 문의/조회]을 갖게 됐다).
// ⚠️ 분모가 0이거나 없으면 **null**이다(Infinity·0 금지 — 0은 '실적 없음'으로, Infinity는 축을 깨뜨린다).
// ⚠️ 표에 열로 넣지 않는다: 9지표 × [값·대비] = 19열인데 파생까지 넣으면 표가 가로로 터진다.
//    파생은 **차트 전용**이고, 판매 건수(purchases)도 이 목적으로만 일별 원장에서 끌어온다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MAU 목표를 월별로 조회하는 맵('YYYY-MM' → 목표값). 컨벤션은 통합 OKR 화면(overview-okr.tsx)과
 * 동일 — 목표 매트릭스의 `track:'metric'` 행 중 `name`에 'MAU'(대소문자 무관)가 포함된 첫 항목을
 * MAU 목표로 본다(하드코딩 없이 매트릭스가 정의하는 값 그대로). 매트릭스에 아직 등록 전이면 빈 맵
 * — 목표 미등록 상태를 조용히 유지한다(0으로 채우지 않는다).
 * ⚠️ **마케팅 월간흐름(marketing-monthly-view.tsx) 전용** — NF 월간흐름(이 파일의 나머지 함수들이
 * 만드는 9지표 화면)은 마케팅 목표·채널 데이터를 섞지 않는다(2026-08-04, 두 화면을 합쳤다가 지적받고
 * 분리 — "원래꺼는 NF 월간흐름이고 이번에 추가한건 마케팅 월간흐름이야, 둘을 구분하라고").
 */
export function mauTargetsByMonth(targets: MonthlyTarget[]): Map<string, number> {
  const out = new Map<string, number>();
  const mauItemId = targets.find((t) => t.track === 'metric' && /mau/i.test(t.name))?.itemId;
  if (!mauItemId) return out;
  for (const t of targets) {
    if (t.itemId === mauItemId && t.target > 0) out.set(t.month, t.target);
  }
  return out;
}

export type MonthlyDerived = {
  ym: string;
  /** 원지표 — 차트 막대·선의 모수 */
  mau: number | null;
  views: number | null;
  inquiries: number | null;
  revenue: number | null;
  branchTotal: number | null;
  partnerTotal: number | null;
  partnerNew: number | null;
  appInstalls: number | null;
  /** 판매 건수 = 일별 원장 `product_purchases` 월 합(지점이 광고를 산 건수) */
  purchases: number | null;
  /** 문의율 = 문의수 / **MAU** — ⚠️ 문의/조회인 `viewToInquiryRate`와 다른 지표다(라벨에 분모를 박는다) */
  inquiryRate: number | null;
  /** 지점당 문의수 = 문의수 / 지점수 */
  inquiriesPerBranch: number | null;
  /** 문의당 조회수 = 조회수 / 문의수(문의 1건이 나오기까지 필요한 조회 수) */
  viewsPerInquiry: number | null;
  /** 앱 설치 전월 대비 증감률(0~1 비율) */
  appInstallsMoM: number | null;
  /** 파트너 비율 = 파트너 수 / 지점수 */
  partnerRatio: number | null;
  /** 객단가 = 매출 / 판매 건수 */
  aov: number | null;
};

const ratio = (a: number | null | undefined, b: number | null | undefined): number | null =>
  a == null || b == null || b === 0 ? null : a / b;

/**
 * 월별 파생 지표. `purchasesByMonth`는 일별 원장에서 만든 월 합('YYYY-MM' → 건수)이고,
 * 없으면 객단가는 전부 null이다(분모가 없으면 단가를 만들 수 없다 — 억지로 매출/문의수를 쓰지 않는다).
 */
export function monthlyDerived(rows: MonthRow[], purchasesByMonth?: Map<string, number>): MonthlyDerived[] {
  return rows.map((r, i) => {
    const prevInstalls = i > 0 ? rows[i - 1].appInstalls.value : null;
    const installs = r.appInstalls.value;
    const purchases = purchasesByMonth?.get(r.ym) ?? null;
    return {
      ym: r.ym,
      mau: r.mau.value,
      views: r.views.value,
      inquiries: r.inquiries.value,
      revenue: r.revenue.value,
      branchTotal: r.branchTotal.value,
      partnerTotal: r.partnerTotal.value,
      partnerNew: r.partnerNew.value,
      appInstalls: installs,
      purchases: purchases && purchases > 0 ? purchases : null,
      inquiryRate: ratio(r.inquiries.value, r.mau.value),
      inquiriesPerBranch: ratio(r.inquiries.value, r.branchTotal.value),
      viewsPerInquiry: ratio(r.views.value, r.inquiries.value),
      // ⚠️ 전월이 없거나 0이면 null — 첫 달을 0% 증감으로 찍으면 '변화 없음'으로 오독된다.
      appInstallsMoM: installs == null || prevInstalls == null || prevInstalls === 0 ? null : installs / prevInstalls - 1,
      partnerRatio: ratio(r.partnerTotal.value, r.branchTotal.value),
      aov: ratio(r.revenue.value, purchases && purchases > 0 ? purchases : null),
    };
  });
}
