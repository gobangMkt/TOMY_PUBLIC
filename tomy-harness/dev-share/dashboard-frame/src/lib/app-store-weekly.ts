// 앱 스토어 주간 취합(2026-10-16 신설): 기토 주간 지표 중 GA4로 못 가져오는 값(다운로드·스토어 활성·
// 평점 이력)을 운영자가 스토어 콘솔에서 보고 넣는 탭(지표 원장 `주_앱_스토어`).
// 🚨 빈 칸은 0이 아니라 '미입력'(null)이다. 지어낸 값·0 채움 금지: 0과 미입력을 섞으면 추세가 거짓이 된다.
// 🚨 스토어 활성은 AOS·iOS 모두 **일별 값의 주간 평균**이다. Play '1일 활성 사용자'를 7일 합하면 같은
//    사람이 날마다 중복으로 잡힌다(기토: 정의 차이보다 OS별·합산 추세가 목적).
import type { MauStreamPoint } from './metrics';
import { shiftDays, weekStartSunday } from './period';

export const STORE_TAB = '주_앱_스토어';

export type StoreField =
  | 'aos_downloads'
  | 'ios_downloads'
  | 'aos_active_avg'
  | 'ios_active_avg'
  | 'aos_rating'
  | 'ios_rating';

/** 일별 값을 주 값으로 접는 법: 다운로드=7일 합, 활성=7일 평균, 평점=그 주 토요일(마지막 날) 값. */
export type StoreAgg = 'sum' | 'avg' | 'last';

// Play는 우리 앱 통계 화면까지 박은 링크(monthly.ts 앱 설치 칸과 같은 계정·앱 ID). 지표 코드는 콘솔 개편에 약해 넣지
// 않고 라벨에 메뉴 경로를 적는다. ASC는 앱 ID를 몰라 분석 첫 화면까지만.
export const PLAY_CONSOLE_URL =
  'https://play.google.com/console/u/0/developers/YOUR_DEV_ID/app/YOUR_APP_ID/statistics';
export const ASC_ANALYTICS_URL = 'https://appstoreconnect.apple.com/analytics';

/** 콘솔 입력은 직전 완결 주가 아니라 그 전 주를 채운다(반영 지연, 2026-10-19 토미). */
export const STORE_INPUT_LAG_WEEKS = 1;
export const storeInputWeek = (lastFull: string) => shiftDays(lastFull, -7 * STORE_INPUT_LAG_WEEKS);

/** 마감 체크리스트용: 입력 대상 주에 아직 비어 있는 스토어 칸 라벨. 비면 그 주 입력 완료. */
export function storePendingLabels(store: Map<string, StoreValues>, week: string): string[] {
  const v = store.get(week);
  return STORE_FIELDS.filter((f) => v?.[f.key] == null).map((f) => f.label);
}

export const STORE_FIELDS: {
  key: StoreField;
  os: 'aos' | 'ios';
  label: string;
  agg: StoreAgg;
  rating?: boolean;
  source: { href: string; label: string };
}[] = [
  { key: 'aos_downloads', os: 'aos', label: 'AOS 신규 설치', agg: 'sum', source: { href: PLAY_CONSOLE_URL, label: 'Play › 새 사용자' } },
  { key: 'ios_downloads', os: 'ios', label: 'iOS 신규 설치', agg: 'sum', source: { href: ASC_ANALYTICS_URL, label: 'ASC › 최초 다운로드' } },
  { key: 'aos_active_avg', os: 'aos', label: 'AOS 1일 활성 사용자(주 평균)', agg: 'avg', source: { href: PLAY_CONSOLE_URL, label: 'Play › DAU' } },
  { key: 'ios_active_avg', os: 'ios', label: 'iOS 활성 상태 기기(주 평균)', agg: 'avg', source: { href: ASC_ANALYTICS_URL, label: 'ASC › 활성 기기' } },
  { key: 'aos_rating', os: 'aos', label: 'AOS 평점', agg: 'last', rating: true, source: { href: PLAY_CONSOLE_URL, label: 'Play › 평점' } },
  { key: 'ios_rating', os: 'ios', label: 'iOS 평점', agg: 'last', rating: true, source: { href: ASC_ANALYTICS_URL, label: 'ASC › 평점' } },
];
export const FIELD_BY_KEY = new Map(STORE_FIELDS.map((f) => [f.key, f]));

/** 시트 탭 헤더 순서(GAS `TRAFFIC_TABS['주_앱_스토어']`와 같아야 한다). */
export const STORE_HEADERS = ['week_start', ...STORE_FIELDS.map((f) => f.key), 'memo', 'updated_at'] as const;

export type StoreValues = Record<StoreField, number | null>;

export const emptyStoreValues = (): StoreValues =>
  Object.fromEntries(STORE_FIELDS.map((f) => [f.key, null])) as StoreValues;

/** 시트 셀 → 숫자. 빈칸·숫자 아님은 null(미입력). 콤마·따옴표·공백 허용. */
export function cellNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/[",\s]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** `주_앱_스토어` 행 → 주 시작일(일요일)별 값. 같은 주가 두 번 있으면 뒤엣것이 이긴다. */
export function parseStoreRows(raw: Record<string, unknown>[]): Map<string, StoreValues> {
  const out = new Map<string, StoreValues>();
  for (const r of raw ?? []) {
    const week = String(r?.week_start ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) continue;
    const v = emptyStoreValues();
    for (const f of STORE_FIELDS) v[f.key] = cellNumber(r[f.key]);
    out.set(week, v);
  }
  return out;
}

/** 주 라벨 `26.4.12`(연도 포함). 원장이 여러 해라 월·일만 쓰면 어느 해인지 모른다. 차트 축·표 행 머리 공용. */
export const weekLabelY = (week: string) =>
  `${week.slice(2, 4)}.${Number(week.slice(5, 7))}.${Number(week.slice(8, 10))}`;

/** 두 OS 합: 한쪽이라도 미입력이면 합도 미입력(반쪽 합을 추세에 섞지 않는다). */
export function osSum(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b;
}

/**
 * 스트림별 주 순사용자 = 원장 `주_WAU_스트림`(14개월 넘은 주 보존) 위에 GA4 실시간 값을 덮는다.
 * 같은 주·스트림은 GA4가 이기되 **0은 버린다**(아직 집계 안 된 주가 적재 실적을 덮으면 급락으로 보인다,
 * use-weekly의 `주_WAU`와 같은 규칙). 전년동주 대비는 이 원장이 있어야 성립한다(GA4 조회는 400일).
 */
export function mergeStreamWeeks(ledger: Record<string, unknown>[], live: MauStreamPoint[]): MauStreamPoint[] {
  const by = new Map<string, MauStreamPoint>();
  const get = (key: string) => {
    let p = by.get(key);
    if (!p) {
      p = { key, label: key, web: 0, android: 0, ios: 0 };
      by.set(key, p);
    }
    return p;
  };
  for (const r of ledger ?? []) {
    const key = String(r?.week_start ?? '').trim();
    const stream = String(r?.stream ?? '').trim();
    const n = cellNumber(r?.active);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || n === null) continue;
    if (stream === 'web' || stream === 'android' || stream === 'ios') get(key)[stream] = n;
  }
  for (const p of live) {
    const t = get(p.key);
    if (p.web > 0) t.web = p.web;
    if (p.android > 0) t.android = p.android;
    if (p.ios > 0) t.ios = p.ios;
  }
  return [...by.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export type AppWeekRow = {
  week: string;
  web: number | null;
  android: number | null;
  ios: number | null;
  appTotal: number | null;
  store: StoreValues;
  downloadsTotal: number | null;
  activeTotal: number | null;
};

export type AppMetricKey =
  | 'web'
  | 'android'
  | 'ios'
  | 'appTotal'
  | StoreField
  | 'downloadsTotal'
  | 'activeTotal';

export function valueOf(r: AppWeekRow | undefined, key: AppMetricKey): number | null {
  if (!r) return null;
  if (key in r.store) return r.store[key as StoreField];
  return r[key as 'web' | 'android' | 'ios' | 'appTotal' | 'downloadsTotal' | 'activeTotal'];
}

/**
 * 완결 주 전체(오래된 → 최신). GA4 값이 있는 주와 스토어 입력이 있는 주를 모두 담는다.
 * 웹은 따로 보여줄 뿐 앱 합에 넣지 않는다(웹+앱 합산 금지: 같은 사람이 양쪽에 세어진다).
 */
export function buildAppWeeks(
  series: MauStreamPoint[],
  store: Map<string, StoreValues>,
  lastFull: string,
): AppWeekRow[] {
  const ga = new Map(series.map((p) => [p.key, p]));
  const weeks = new Set<string>();
  for (const p of series) if (p.web + p.android + p.ios > 0) weeks.add(p.key);
  for (const w of store.keys()) weeks.add(w);
  const pos = (n: number | undefined) => (n && n > 0 ? n : null);
  return [...weeks]
    .filter((w) => w <= lastFull)
    .sort()
    .map((week) => {
      const p = ga.get(week);
      const android = pos(p?.android);
      const ios = pos(p?.ios);
      const s = store.get(week) ?? emptyStoreValues();
      return {
        week,
        web: pos(p?.web),
        android,
        ios,
        appTotal: osSum(android, ios),
        store: s,
        downloadsTotal: osSum(s.aos_downloads, s.ios_downloads),
        activeTotal: osSum(s.aos_active_avg, s.ios_active_avg),
      };
    });
}

/**
 * 입력칸 draft → 시트 행. 빈칸은 빈칸 그대로(0으로 덮지 않는다). GAS가 행을 **교체**하므로 그 주의
 * 다른 칸도 draft에 실려 있어야 한다(부모가 기존 값으로 draft를 채운다).
 */
export function storeRowFromDraft(week: string, draft: Partial<Record<StoreField, string>>, memo = '') {
  const row: Record<string, string> = { week_start: week };
  for (const f of STORE_FIELDS) {
    const raw = (draft[f.key] ?? '').replace(/,/g, '').trim();
    if (raw === '') {
      row[f.key] = '';
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${f.label} 값이 올바르지 않습니다`);
    if (f.rating && n > 5) throw new Error(`${f.label}은 0~5 사이여야 합니다`);
    row[f.key] = String(n);
  }
  row.memo = memo;
  row.updated_at = new Date().toISOString();
  return row;
}

/** 기존 값 → draft(문자열). 일괄 입력이 한 칸만 바꿔도 나머지 칸이 지워지지 않게 쓴다. */
export const draftOf = (v: StoreValues): Partial<Record<StoreField, string>> =>
  Object.fromEntries(STORE_FIELDS.map((f) => [f.key, v[f.key] === null ? '' : String(v[f.key])]));

/**
 * 콘솔 자동수집 값 → 저장할 행. **빈 칸에만** 채운다(사람이 넣은 값·보정값은 덮지 않는다).
 * 바뀐 칸이 없는 주는 행을 만들지 않는다. GAS가 행을 교체하므로 기존 값을 draft에 실어 보낸다.
 */
export function mergeSyncedWeeks(
  store: Map<string, StoreValues>,
  synced: { week: string; values: Partial<Record<StoreField, number>> }[],
): { rows: Record<string, string>[]; cells: number } {
  const rows: Record<string, string>[] = [];
  let cells = 0;
  for (const w of synced) {
    const cur = store.get(w.week) ?? emptyStoreValues();
    const draft = draftOf(cur);
    let n = 0;
    for (const f of STORE_FIELDS) {
      const v = w.values[f.key];
      if (v === undefined || cur[f.key] !== null) continue;
      draft[f.key] = String(v);
      n += 1;
    }
    if (!n) continue;
    cells += n;
    rows.push(storeRowFromDraft(w.week, draft, '콘솔 자동수집'));
  }
  return { rows, cells };
}

// ── 일괄 입력(콘솔 CSV 붙여넣기) ─────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const s = `${y}-${pad(m)}-${pad(d)}`;
  const t = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(t.getTime()) || t.getUTCDate() !== d ? null : s;
};

/**
 * 콘솔 내보내기에서 흔한 날짜 표기 → YYYY-MM-DD. 모르면 null.
 * 2026-10-04 · 2026.10.04 · 2026/10/04 · 20261004 · 2026. 10. 4. · 2026년 10월 4일(Play 콘솔 한글) · 10/4/26(미국식) · Oct 4, 2026 · 4 Oct 2026
 */
export function parseDateCell(raw: string): string | null {
  const s = raw.replace(/"/g, '').trim();
  let m = s.match(/^(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})\.?$/);
  if (m) return isoOf(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
  if (m) return isoOf(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return isoOf(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return isoOf(+m[3], +m[1], +m[2]);
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return isoOf(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return isoOf(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  return null;
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export type PastedTable = {
  /** 값 열 후보(날짜 열 제외). 머리 행이 없으면 `열 2`처럼 번호로 부른다. */
  columns: { index: number; label: string }[];
  dateCol: number;
  rows: { date: string; cells: string[] }[];
  /** 기본 값 열 = 숫자가 가장 많이 들어 있는 열 */
  defaultCol: number;
};

/** 붙여넣은 텍스트(콘솔 CSV·표 복사) → 날짜가 있는 행만 추린 표. 날짜 열은 자동으로 찾는다. */
export function parsePastedTable(text: string): PastedTable | null {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const grid = lines.map(splitLine);
  const width = Math.max(0, ...grid.map((r) => r.length));
  let dateCol = -1;
  let best = 0;
  for (let c = 0; c < width; c++) {
    const n = grid.filter((r) => r[c] !== undefined && parseDateCell(r[c])).length;
    if (n > best) {
      best = n;
      dateCol = c;
    }
  }
  if (dateCol < 0) return null;
  const rows = grid
    .map((cells) => ({ date: parseDateCell(cells[dateCol] ?? '') ?? '', cells }))
    .filter((r) => r.date);
  const firstData = grid.findIndex((r) => parseDateCell(r[dateCol] ?? ''));
  const header = firstData > 0 ? grid[firstData - 1] : null;
  const columns: PastedTable['columns'] = [];
  let defaultCol = -1;
  let most = 0;
  for (let c = 0; c < width; c++) {
    if (c === dateCol) continue;
    const nums = rows.filter((r) => cellNumber(r.cells[c]) !== null).length;
    if (!nums) continue;
    columns.push({ index: c, label: (header?.[c] ?? '').replace(/"/g, '').trim() || `열 ${c + 1}` });
    if (nums > most) {
      most = nums;
      defaultCol = c;
    }
  }
  if (defaultCol < 0) return null;
  return { columns, dateCol, rows, defaultCol };
}

/**
 * 평점은 **누적 평균 열**을 기본으로 고른다. Play 평점 CSV에는 `Daily Average Rating`(그날 들어온 평점만의
 * 평균, 표본이 작아 출렁임)과 `Total Average Rating`(전체 기간 평균)이 함께 있는데, 숫자 개수로 고르면
 * 일일 열이 뽑힐 수 있다(2026-10-17 콘솔 지표 조사). 누적 열이 없으면 표의 기본 열 그대로.
 */
export function ratingDefaultCol(t: PastedTable): number {
  const hit = t.columns.find((c) => /total|lifetime|cumulative|전체|누적/i.test(c.label));
  return hit ? hit.index : t.defaultCol;
}

export type WeeklyFold = { week: string; value: number | null; days: number };

/**
 * 일별 값 → 주(일~토) 값. **7일이 다 있는 주만** 값을 낸다: 반쪽 주를 합·평균하면 그 주가 급락으로
 * 보인다(평점은 토요일 값이 있어야 한다). 모자란 주는 value=null + 일수로 돌려 화면이 '제외'로 보여준다.
 * 같은 날짜가 두 번 오면 뒤엣것이 이긴다. 활성 평균은 정수로 반올림한다.
 */
export function foldDaily(points: { date: string; value: number }[], agg: StoreAgg, lastFull: string): WeeklyFold[] {
  const byDate = new Map<string, number>();
  for (const p of points) byDate.set(p.date, p.value);
  const byWeek = new Map<string, Map<string, number>>();
  for (const [date, v] of byDate) {
    const w = weekStartSunday(date);
    if (w > lastFull) continue;
    if (!byWeek.has(w)) byWeek.set(w, new Map());
    byWeek.get(w)!.set(date, v);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, days]) => {
      let value: number | null = null;
      if (agg === 'last') {
        const sat = days.get(shiftDays(week, 6));
        value = sat === undefined ? null : sat;
      } else if (days.size === 7) {
        const sum = [...days.values()].reduce((s, n) => s + n, 0);
        value = agg === 'sum' ? sum : Math.round(sum / 7);
      }
      return { week, value, days: days.size };
    });
}

/** 이미 주 단위로 정리된 값(주 날짜 + 값)을 붙여 넣을 때. 일요일이 아닌 날짜는 그 주 일요일로 맞춘다. */
export function foldWeekly(points: { date: string; value: number }[], lastFull: string): WeeklyFold[] {
  const by = new Map<string, number>();
  for (const p of points) {
    const w = weekStartSunday(p.date);
    if (w <= lastFull) by.set(w, p.value);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, value]) => ({ week, value, days: 7 }));
}

const csvCell = (v: number | null) => (v === null ? '미입력' : v);

/** 내보내기(CSV): 기토 주간 지표 5종을 한 장에. 미입력은 0이 아니라 '미입력'으로 적는다. */
export function appMetricsCsv(rows: AppWeekRow[]) {
  const headers = [
    '주 시작(일)',
    '주 끝(토)',
    '웹 WAU',
    '안드로이드 앱 WAU',
    'iOS 앱 WAU',
    '앱 WAU 합',
    'AOS 스토어 신규 설치',
    'iOS 스토어 신규 설치',
    '스토어 신규 설치 합',
    'AOS 1일 활성 사용자(주 평균)',
    'iOS 활성 상태 기기(주 평균)',
    '스토어 활성 합',
    'AOS 평점',
    'iOS 평점',
  ];
  const body = rows.map((r) => [
    r.week,
    shiftDays(r.week, 6),
    csvCell(r.web),
    csvCell(r.android),
    csvCell(r.ios),
    csvCell(r.appTotal),
    csvCell(r.store.aos_downloads),
    csvCell(r.store.ios_downloads),
    csvCell(r.downloadsTotal),
    csvCell(r.store.aos_active_avg),
    csvCell(r.store.ios_active_avg),
    csvCell(r.activeTotal),
    csvCell(r.store.aos_rating),
    csvCell(r.store.ios_rating),
  ]);
  return { headers, body };
}

// 평점은 1~5점 척도다. 0부터 그리면(Recharts 기본) 4점대 값이 위쪽에 눌려 추세가 안 보이므로
// 보이는 값 주변으로 좁히되 척도 밖(1 미만·5 초과)으로는 나가지 않는다. 앱 대시보드·통합 두 화면이 같이 쓴다.
export function ratingDomain(values: number[]): [number, number] | undefined {
  if (!values.length) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.1, (max - min) * 0.2);
  const lo = Math.max(1, Math.floor((min - pad) * 10) / 10);
  const hi = Math.min(5, Math.ceil((max + pad) * 10) / 10);
  return hi > lo ? [lo, hi] : undefined;
}
