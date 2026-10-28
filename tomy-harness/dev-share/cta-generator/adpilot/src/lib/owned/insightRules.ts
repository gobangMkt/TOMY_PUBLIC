// Owned 검색 실적 판정 — 정본. 기준의 말은 미디어허브 docs/insight-policy.md, 규칙 위치는 docs/owned-insight-rules.md §2.
//
// 2026-10-28(스펙 2-4)에 미디어허브 services/insight.py의 판정을 그대로 옮겼다. 상수·문구·순서가 같아야 한다 —
// 같은 입력에 같은 결과가 나오는지는 parity.test.ts가 Python이 만든 고정 답안(__fixtures__/parity.json)과 대조한다.
//
// 이 파일은 아무것도 막지 않는다. 색인이 안 됐다고 발행을 세우지 않는다 — 사실을 말하고 결정은 사람이 한다.
// 입력은 Supabase owned_insight_* 표의 행과 일꾼 원장의 발행건 목록이고, 출력 키는 Python 시절 그대로(snake_case)다
// (화면·팀장 프롬프트·내보낸 파일이 같은 모양을 읽는다).

import { daysBetween, isDigits, parseLocalIso, pyComma, pyFixed, pyG, pyPct, pyRound, pySplit } from "./pyfmt";

export const STALE_DAYS = 14;
export const CTR_CURVE: Record<number, number> = { 1: 0.255, 2: 0.108, 3: 0.074, 4: 0.037, 5: 0.019, 6: 0.014, 7: 0.008 };
export const CTR_FLOOR = 0.002;
export const TARGET_POSITION = 3;
export const WINDOW_DAYS = 28;
export const NEAR_RANGE: [number, number] = [8, 20];
export const TOPIC_MIN_IMPRESSIONS = 200;
export const SURGE_RATIO = 2.0;
export const SURGE_MIN_IMPRESSIONS = 300;
export const FIX_MAX_POSITION = 10;
export const FIX_MIN_IMPRESSIONS = 300;
export const FIX_MAX_CTR = 0.02;
export const FIX_CTR_RATIO = 0.5;
export const SPLIT_RANGE: [number, number] = [2, 5];
export const SPLIT_MIN_IMPRESSIONS = 1000;
export const DROP_RATIO = 0.7;
export const DROP_MIN_PREV = 500;
export const CONTENT_PATH = "/contents/";
export const PAIR_TOP = 5;
export const TOKEN_MIN_LEN = 2;
export const TOKEN_TOP = 12;
export const RISE_RATIO = 1.3;
export const FIRST_PAGE = 10;
export const MOVE_MIN_IMPRESSIONS = 100;
export const OVERVIEW_TOP = 10;

// ── 입력 ──────────────────────────────────────────────────────────────────

export interface QueryRow {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
  content_pages: number;
}
export interface PageRow {
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
}
export interface PairRow {
  page: string;
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}
export interface DailyRow {
  day: string;
  impressions: number;
  clicks: number;
  position: number;
}
export interface TotalRow {
  impressions: number;
  clicks: number;
  position: number;
  period_start: string;
  period_end: string;
}
export interface IndexRow {
  publication_id: number;
  url: string;
  coverage_state: string;
  inspect_link: string;
  error: string;
  checked_at: string;
}
/** 일꾼 원장의 gobang.kr 발행 완료 건(permalink가 있는 것). 원장이 일꾼에 있어 일꾼이 내려준다 */
export interface PublishedRow {
  id: number;
  permalink: string;
  published_at: string;
  title: string;
  channel: string;
  run_id: number | null;
}

export interface InsightSnapshot {
  queries: QueryRow[];
  pages: PageRow[];
  pairs: PairRow[];
  daily: DailyRow[];
  total: TotalRow | null;
  titles: Record<string, string>;
  index: IndexRow[];
  published: PublishedRow[];
}

// ── 색인 ──────────────────────────────────────────────────────────────────

export function daysSince(stamp: string, now: Date): number {
  const then = parseLocalIso(stamp);
  if (!then) return -1;
  return Math.max(0, daysBetween(then, now));
}

/** 구글이 준 coverageState → (상태 키, 읽는 말). `not indexed`를 먼저 본다(순서를 뒤집으면 색인 안 된 글이 색인됨으로 읽힌다) */
export function verdictOf(coverageState: string, days = -1): [string, string] {
  const text = (coverageState || "").trim().toLowerCase();
  if (!text) return ["unknown", "미확인"];
  if (text.includes("not indexed") || text.includes("unknown to google")) {
    return days >= STALE_DAYS ? ["stale", "색인 지연"] : ["waiting", "색인 전"];
  }
  if (text.includes("indexed")) return ["indexed", "색인됨"];
  return ["excluded", "색인 제외"];
}

export function todoOf(state: string, days = -1): string {
  if (state === "unknown") return "색인 확인을 누르면 구글에 들어갔는지 확인해요";
  if (state === "waiting") {
    const left = days >= 0 ? Math.max(0, STALE_DAYS - days) : STALE_DAYS;
    return `구글이 넣을 때까지 ${left}일 더 기다려요`;
  }
  if (state === "stale") return "Search Console에서 이 주소를 검사한 뒤 색인을 요청해 주세요";
  if (state === "excluded") return "Search Console에서 제외된 사유를 확인해 주세요";
  return "";
}

// ── 기회 점수 ─────────────────────────────────────────────────────────────

export function expectedCtr(position: number): number {
  const at = Math.max(1, pyRound(position || 0));
  return CTR_CURVE[at] ?? CTR_FLOOR;
}

export function opportunity(impressions: number, clicks: number, atPosition: number): number {
  if (impressions <= 0) return 0;
  const gain = expectedCtr(atPosition) - clicks / impressions;
  return Math.max(0, pyRound(impressions * gain));
}

export function recover(clicks: number, prevClicks: number): number {
  return Math.max(0, prevClicks - clicks);
}

/** 같은 의도로 묶을 검색어 키 — 공백만 지운다 */
export function mergeKey(query: string): string {
  return pySplit(query).join("");
}

export interface MergedQuery {
  query: string;
  queries: string[];
  variants: number;
  impressions: number;
  clicks: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
  content_pages: number;
}

export function mergeQueries(rows: QueryRow[]): MergedQuery[] {
  const groups = new Map<string, QueryRow[]>();
  for (const row of rows) {
    const k = mergeKey(row.query);
    const g = groups.get(k);
    if (g) g.push(row);
    else groups.set(k, [row]);
  }
  const out: MergedQuery[] = [];
  for (const members of groups.values()) {
    let top = members[0];
    for (const m of members) if (m.impressions > top.impressions) top = m;
    const impressions = members.reduce((n, r) => n + r.impressions, 0);
    const clicks = members.reduce((n, r) => n + r.clicks, 0);
    const weight = impressions || 1;
    const position = members.reduce((n, r) => n + r.position * r.impressions, 0) / weight;
    const prevImpressions = members.reduce((n, r) => n + r.prev_impressions, 0);
    out.push({
      query: top.query,
      queries: members.map((r) => r.query),
      variants: members.length,
      impressions,
      clicks,
      position,
      prev_impressions: prevImpressions,
      prev_clicks: members.reduce((n, r) => n + (r.prev_clicks || 0), 0),
      prev_position: prevImpressions
        ? members.reduce((n, r) => n + (r.prev_position || 0) * r.prev_impressions, 0) / prevImpressions
        : 0,
      content_pages: Math.max(...members.map((r) => r.content_pages)),
    });
  }
  return out;
}

// ── 창 · 문턱 ─────────────────────────────────────────────────────────────

/** 창 길이(양끝 포함) */
export function spanDays(start: string, end: string): number {
  if (!start || !end) return WINDOW_DAYS;
  const a = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
  const b = Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10));
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** 문턱 배율 = 저장된 창 길이 ÷ 28일 */
export function scaleOf(total: TotalRow | null): number {
  return spanDays(total?.period_start ?? "", total?.period_end ?? "") / WINDOW_DAYS;
}

function bar(value: number, scale: number): number {
  return Math.max(1, pyRound(value * scale));
}

// ── 글 · 검색어 행 ────────────────────────────────────────────────────────

export interface MergedPage {
  page: string;
  impressions: number;
  clicks: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
}

/** 조각 주소(#s1)를 한 글로 접는다. 직전 기간 값도 같이 접는다 */
export function mergePages(rows: PageRow[]): MergedPage[] {
  const groups = new Map<string, PageRow[]>();
  for (const row of rows) {
    const k = row.page.split("#", 1)[0];
    const g = groups.get(k);
    if (g) g.push(row);
    else groups.set(k, [row]);
  }
  const out: MergedPage[] = [];
  for (const [page, members] of groups) {
    const impressions = members.reduce((n, r) => n + r.impressions, 0);
    const weight = impressions || 1;
    const prevImpressions = members.reduce((n, r) => n + (r.prev_impressions || 0), 0);
    out.push({
      page,
      impressions,
      clicks: members.reduce((n, r) => n + r.clicks, 0),
      position: members.reduce((n, r) => n + r.position * r.impressions, 0) / weight,
      prev_impressions: prevImpressions,
      prev_clicks: members.reduce((n, r) => n + (r.prev_clicks || 0), 0),
      prev_position: prevImpressions
        ? members.reduce((n, r) => n + (r.prev_position || 0) * (r.prev_impressions || 0), 0) / prevImpressions
        : 0,
    });
  }
  return out;
}

/** 검색어 × 글을 한 축으로 모아 노출 큰 것부터. 자르지 않는다 */
export function pairsBy(pairs: PairRow[], key: "query" | "page"): Map<string, PairRow[]> {
  const out = new Map<string, PairRow[]>();
  for (const row of pairs) {
    const k = row[key];
    const g = out.get(k);
    if (g) g.push(row);
    else out.set(k, [row]);
  }
  for (const rows of out.values()) rows.sort((a, b) => b.impressions - a.impressions);
  return out;
}

export interface PairPage {
  page: string;
  impressions: number;
  clicks: number;
  position: number;
}

export function mergePairRows(queries: string[], byQuery: Map<string, PairRow[]>): PairPage[] {
  const merged = new Map<string, PairPage>();
  for (const query of queries) {
    for (const row of byQuery.get(query) ?? []) {
      let cell = merged.get(row.page);
      if (!cell) {
        cell = { page: row.page, impressions: 0, clicks: 0, position: 0 };
        merged.set(row.page, cell);
      }
      const weight = row.impressions;
      const total = cell.impressions + weight;
      cell.position = total ? (cell.position * cell.impressions + row.position * weight) / total : 0;
      cell.impressions = total;
      cell.clicks += row.clicks;
    }
  }
  return [...merged.values()].sort((a, b) => b.impressions - a.impressions);
}

export interface TokenRow {
  token: string;
  impressions: number;
  clicks: number;
  queries: number;
  prev_impressions: number;
  prev_clicks: number;
  ctr: number;
}

/** 검색어를 어절로 쪼개 노출을 모은다. 한 검색어 안의 같은 어절은 한 번만 센다 */
export function tokenRows(queries: QueryRow[]): TokenRow[] {
  const tally = new Map<string, TokenRow>();
  for (const row of queries) {
    for (const token of new Set(pySplit(row.query))) {
      if (token.length < TOKEN_MIN_LEN || isDigits(token)) continue;
      let cell = tally.get(token);
      if (!cell) {
        cell = { token, impressions: 0, clicks: 0, queries: 0, prev_impressions: 0, prev_clicks: 0, ctr: 0 };
        tally.set(token, cell);
      }
      cell.impressions += row.impressions;
      cell.clicks += row.clicks;
      cell.prev_impressions += row.prev_impressions || 0;
      cell.prev_clicks += row.prev_clicks || 0;
      cell.queries += 1;
    }
  }
  const out = [...tally.values()].sort((a, b) => b.impressions - a.impressions).slice(0, TOKEN_TOP);
  for (const cell of out) cell.ctr = cell.impressions ? cell.clicks / cell.impressions : 0;
  return out;
}

export interface KeywordRow extends MergedQuery {
  kind: string;
  kind_label: string;
  reasons: string[];
  pages: PairPage[];
  ctr: number;
  expected_ctr: number;
  opportunity: number;
  opportunity_note: string;
}

export function keywordKind(
  row: { impressions: number; prev_impressions: number; position: number; content_pages: number },
  scale = 1.0
): [string, string, string[]] {
  const { impressions, position } = row;
  const prev = row.prev_impressions;
  const surgeMin = bar(SURGE_MIN_IMPRESSIONS, scale);
  const dropMin = bar(DROP_MIN_PREV, scale);
  const splitMin = bar(SPLIT_MIN_IMPRESSIONS, scale);
  const topicMin = bar(TOPIC_MIN_IMPRESSIONS, scale);
  if (impressions >= surgeMin && impressions >= Math.max(prev, 1) * SURGE_RATIO) {
    return [
      "surge",
      "급상승",
      [
        `직전 28일 노출 ${pyComma(prev)}회에서 이번 28일 ${pyComma(impressions)}회로 늘었어요`,
        `기준: 노출 ${pyComma(surgeMin)}회 이상이면서 직전의 ${pyG(SURGE_RATIO)}배 이상`,
      ],
    ];
  }
  if (prev >= dropMin && impressions <= prev * DROP_RATIO) {
    return [
      "drop",
      "하락",
      [
        `직전 기간 노출 ${pyComma(prev)}회에서 이번 기간 ${pyComma(impressions)}회로 줄었어요`,
        `기준: 직전 노출 ${pyComma(dropMin)}회 이상이면서 이번에 ${pyPct(DROP_RATIO, 0)} 이하`,
      ],
    ];
  }
  // 갈림 문턱은 Python 원본 그대로 SPLIT_MIN_IMPRESSIONS(비례 조정 전)로 판정하고, 문장만 조정값을 말한다
  if (SPLIT_RANGE[0] <= row.content_pages && row.content_pages <= SPLIT_RANGE[1] && impressions >= SPLIT_MIN_IMPRESSIONS) {
    return [
      "split",
      "글이 갈림",
      [
        `이 검색어에 우리 글 ${row.content_pages}개가 따로 걸려 있어요`,
        `기준: 우리 글 ${SPLIT_RANGE[0]}~${SPLIT_RANGE[1]}개이면서 노출 ${pyComma(splitMin)}회 이상`,
        "글이 갈리면 순위가 나뉘어요. 하나로 합치면 그 순위를 한 글이 가져가요",
      ],
    ];
  }
  if (impressions >= topicMin && NEAR_RANGE[0] <= position && position <= NEAR_RANGE[1]) {
    return [
      "near",
      "순위 근접",
      [
        `지금 ${pyFixed(position, 1)}위예요. ${TARGET_POSITION}위까지 올리면 클릭이 붙어요`,
        `기준: 노출 ${pyComma(topicMin)}회 이상이면서 ${NEAR_RANGE[0]}~${NEAR_RANGE[1]}위`,
      ],
    ];
  }
  return ["", "", []];
}

/** 검색어 한 줄씩. 전부 돌려준다(거르는 것은 화면) */
export function keywordRows(snap: Pick<InsightSnapshot, "queries" | "pairs" | "total">): KeywordRow[] {
  const byQuery = pairsBy(snap.pairs, "query");
  const scale = scaleOf(snap.total);
  const out: KeywordRow[] = [];
  for (const row of mergeQueries(snap.queries)) {
    const { impressions, clicks } = row;
    const pages = mergePairRows(row.queries, byQuery);
    row.content_pages = pages.length;
    const [kind, label, reasons] = keywordKind(row, scale);
    const drop = kind === "drop";
    const rec = recover(clicks, row.prev_clicks || 0);
    const opp = opportunity(impressions, clicks, TARGET_POSITION);
    out.push({
      ...row,
      kind,
      kind_label: label,
      reasons,
      pages: pages.slice(0, PAIR_TOP),
      ctr: impressions ? clicks / impressions : 0,
      expected_ctr: expectedCtr(TARGET_POSITION),
      opportunity: drop ? rec : opp,
      opportunity_note: drop
        ? `직전 28일 클릭 ${pyComma(row.prev_clicks || 0)}회로 되돌리면 월 ${pyComma(rec)}회를 되찾아요`
        : `${TARGET_POSITION}위 평균 클릭률 ${pyPct(expectedCtr(TARGET_POSITION), 1)}까지 눌리면 월 ${pyComma(opp)}회 늘어나요`,
    });
  }
  out.sort((a, b) => b.impressions - a.impressions);
  return out;
}

export interface ArticleRow {
  page: string;
  title: string;
  ours: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
  published_at: string;
  days: number;
  kind: string;
  kind_label: string;
  reasons: string[];
  opportunity: number;
  opportunity_note: string;
  inspect_link: string;
  queries: PairRow[];
  /** AdPilot 추가: 원장 발행건 id(우리 글만). 화면이 색인 확인 결과를 잇는 데 쓴다 */
  publication_id?: number | null;
}

export function articleKind(
  impressions: number,
  clicks: number,
  ctr: number,
  position: number,
  prev: number,
  indexState: string,
  days: number,
  prevClicks = 0,
  scale = 1.0
): [string, string, string[], number] {
  if (impressions === 0) {
    if (indexState === "stale") {
      return [
        "stale",
        "색인 지연",
        [
          `발행 ${days}일이 지났는데 구글이 아직 넣지 않았어요`,
          `기준: 발행 후 ${STALE_DAYS}일`,
          "Search Console에서 이 주소를 검사한 뒤 색인을 요청해 주세요",
        ],
        0,
      ];
    }
    if (indexState === "excluded") {
      return ["excluded", "색인 제외", ["구글이 이 글을 넣지 않기로 했어요", "Search Console에서 제외된 사유를 확인해 주세요"], 0];
    }
    if (indexState === "waiting") {
      const left = days >= 0 ? Math.max(0, STALE_DAYS - days) : STALE_DAYS;
      return ["waiting", "색인 전", [`발행 ${days}일째예요. 구글이 넣을 때까지 ${left}일 더 기다려요`], 0];
    }
    if (indexState === "indexed") {
      return [
        "indexed",
        "노출 전",
        ["구글에 들어갔지만 아직 검색결과에 뜬 기록이 없어요", "노출이 생기면 이 줄에 순위와 클릭이 채워져요"],
        0,
      ];
    }
    return ["unknown", "미확인", ["아직 구글에 물어본 적이 없어요. 색인 확인을 누르면 확인해요"], 0];
  }
  const fixMin = bar(FIX_MIN_IMPRESSIONS, scale);
  const dropMin = bar(DROP_MIN_PREV, scale);
  const lowCtr = ctr < FIX_MAX_CTR || ctr < expectedCtr(position) * FIX_CTR_RATIO;
  if (impressions >= fixMin && position <= FIX_MAX_POSITION && lowCtr) {
    return [
      "title",
      "제목 문제",
      [
        `${pyFixed(position, 1)}위로 노출 ${pyComma(impressions)}회인데 클릭이 ${pyComma(clicks)}회(${pyPct(ctr, 1)})뿐이에요`,
        `같은 순위의 우리 사이트 평균은 ${pyPct(expectedCtr(position), 1)}예요`,
        `기준: 노출 ${pyComma(fixMin)}회 이상 · ${FIX_MAX_POSITION}위 안 · 클릭률 ${pyPct(FIX_MAX_CTR, 0)} 미만 또는 같은 순위 평균의 ${pyPct(FIX_CTR_RATIO, 0)} 미만`,
        "검색 의도와 제목이 어긋났을 때 나타나는 모양이에요",
      ],
      opportunity(impressions, clicks, position),
    ];
  }
  if (prev >= dropMin && impressions <= prev * DROP_RATIO) {
    return [
      "drop",
      "하락",
      [
        `직전 기간 노출 ${pyComma(prev)}회에서 이번 기간 ${pyComma(impressions)}회로 줄었어요`,
        `직전 기간 클릭 ${pyComma(prevClicks)}회에서 ${pyComma(clicks)}회로 줄었어요`,
        `기준: 직전 노출 ${pyComma(dropMin)}회 이상이면서 이번에 ${pyPct(DROP_RATIO, 0)} 이하`,
      ],
      recover(clicks, prevClicks),
    ];
  }
  return [
    "indexed",
    "정상",
    [`${pyFixed(position, 1)}위로 노출 ${pyComma(impressions)}회 · 클릭 ${pyComma(clicks)}회(${pyPct(ctr, 1)})예요`],
    opportunity(impressions, clicks, position),
  ];
}

/** 색인을 물어볼 대상 = gobang.kr로 이미 나간 글(원장 발행건 중 gobang_* 채널 + 주소 있음) */
export function publishedPages(published: PublishedRow[]): PublishedRow[] {
  return published.filter((p) => p.channel.startsWith("gobang_") && !!p.permalink);
}

function articleOf(
  page: string,
  row: MergedPage | null,
  pub: PublishedRow | null,
  title: string,
  saved: Map<number, IndexRow>,
  at: Date,
  scale: number
): Omit<ArticleRow, "queries"> {
  const impressions = row?.impressions ?? 0;
  const clicks = row?.clicks ?? 0;
  const position = row?.position ?? 0;
  const prev = row?.prev_impressions ?? 0;
  const ctr = impressions ? clicks / impressions : 0;
  const days = pub ? daysSince(pub.published_at, at) : -1;
  let indexState = "";
  if (pub) indexState = verdictOf(saved.get(pub.id)?.coverage_state ?? "", days)[0];
  const prevClicks = row?.prev_clicks ?? 0;
  const [kind, label, reasons, gain] = articleKind(impressions, clicks, ctr, position, prev, indexState, days, prevClicks, scale);
  let note = "";
  if (gain && kind === "drop") note = `직전 28일 클릭 ${pyComma(prevClicks)}회로 되돌리면 월 ${pyComma(gain)}회를 되찾아요`;
  else if (gain) note = `같은 순위 평균 클릭률 ${pyPct(expectedCtr(position), 1)}까지 눌리면 월 ${pyComma(gain)}회 늘어나요`;
  return {
    page,
    title,
    ours: !!pub,
    impressions,
    clicks,
    ctr,
    position,
    prev_impressions: prev,
    prev_clicks: row?.prev_clicks ?? 0,
    prev_position: row?.prev_position ?? 0,
    published_at: pub ? (pub.published_at || "").slice(0, 10) : "",
    days,
    kind,
    kind_label: label,
    reasons,
    opportunity: gain,
    opportunity_note: note,
    inspect_link: pub ? saved.get(pub.id)?.inspect_link ?? "" : "",
    publication_id: pub ? pub.id : null,
  };
}

const ARTICLE_ORDER: Record<string, number> = { stale: 0, excluded: 1, title: 2, drop: 3, waiting: 4, unknown: 5, indexed: 6, "": 7 };

/** gobang.kr 글 하나에 한 줄. 색인과 개선이 같은 표에 있다 */
export function articleRows(snap: InsightSnapshot, now: Date): ArticleRow[] {
  const scale = scaleOf(snap.total);
  const saved = new Map(snap.index.map((r) => [Number(r.publication_id), r]));
  const content = snap.pages.filter((r) => r.page.includes(CONTENT_PATH));
  const measured = new Map(mergePages(content).map((r) => [r.page, r]));
  const ours = new Map<string, [PublishedRow, string]>();
  for (const pub of publishedPages(snap.published)) ours.set(pub.permalink.split("#", 1)[0], [pub, pub.title]);
  const byPage = pairsBy(snap.pairs, "page");
  // 여러 글이 같은 제목이면 버린다(지워진 글·제목 없는 글은 사이트 기본 제목을 낸다)
  const seen = new Map<string, number>();
  for (const t of Object.values(snap.titles)) if (t) seen.set(t, (seen.get(t) ?? 0) + 1);
  const fetched = new Map<string, string>();
  for (const [p, t] of Object.entries(snap.titles)) if (t && seen.get(t) === 1) fetched.set(p, t);
  const out: ArticleRow[] = [];
  for (const [page, row] of measured) {
    const hit = ours.get(page);
    const [pub, title] = hit ?? [null, fetched.get(page) ?? ""];
    out.push({ ...articleOf(page, row, pub, title, saved, now, scale), queries: (byPage.get(page) ?? []).slice(0, PAIR_TOP) });
  }
  for (const [page, [pub, title]] of ours) {
    if (!measured.has(page)) out.push({ ...articleOf(page, null, pub, title, saved, now, scale), queries: [] });
  }
  out.sort((a, b) => (ARTICLE_ORDER[a.kind] ?? 9) - (ARTICLE_ORDER[b.kind] ?? 9) || b.opportunity - a.opportunity);
  return out;
}

// ── 개요 — 나빠지는 것 · 잘되는 것 ─────────────────────────────────────────

export interface OverviewEntry {
  type: "article" | "keyword";
  [k: string]: unknown;
}
export interface OverviewBucket {
  key: string;
  label: string;
  rows: OverviewEntry[];
  total: number;
}

const OV_ARTICLE_KEYS = [
  "page", "title", "ours", "impressions", "prev_impressions", "position", "prev_position", "clicks", "days", "kind", "kind_label",
] as const;
const OV_KEYWORD_KEYS = ["query", "impressions", "prev_impressions", "position", "prev_position", "clicks"] as const;

function ovArticle(r: ArticleRow): OverviewEntry {
  const o: OverviewEntry = { type: "article" };
  for (const k of OV_ARTICLE_KEYS) o[k] = r[k] ?? null;
  return o;
}
function ovKeyword(r: KeywordRow): OverviewEntry {
  const o: OverviewEntry = { type: "keyword" };
  for (const k of OV_KEYWORD_KEYS) o[k] = r[k] ?? null;
  return o;
}

export function overview(articles: ArticleRow[], keywords: KeywordRow[], scale = 1.0): { bad: OverviewBucket[]; good: OverviewBucket[] } {
  const riseMin = bar(FIX_MIN_IMPRESSIONS, scale);
  const moveMin = bar(MOVE_MIN_IMPRESSIONS, scale);
  const lost = (r: { prev_impressions: number; impressions: number }) => r.prev_impressions - r.impressions;
  const gained = (r: { prev_impressions: number; impressions: number }) => r.impressions - r.prev_impressions;
  function top<T>(rows: T[], key: (r: T) => number, shape: (r: T) => OverviewEntry) {
    return { rows: [...rows].sort((a, b) => key(a) - key(b)).slice(0, OVERVIEW_TOP).map(shape), total: rows.length };
  }
  const crossed = (r: ArticleRow, outOfFirst: boolean) => {
    const was = r.prev_position || 0;
    const now = r.position || 0;
    if (!was || !now || r.impressions < moveMin) return false;
    return outOfFirst ? was <= FIRST_PAGE && FIRST_PAGE < now : now <= FIRST_PAGE && FIRST_PAGE < was;
  };
  const bad: OverviewBucket[] = [
    { key: "article_drop", label: "노출이 줄어든 글", ...top(articles.filter((r) => r.kind === "drop"), (r) => -lost(r), ovArticle) },
    { key: "article_out", label: "1페이지 밖으로 밀린 글", ...top(articles.filter((r) => crossed(r, true)), (r) => -r.impressions, ovArticle) },
    { key: "keyword_drop", label: "노출이 줄어든 검색어", ...top(keywords.filter((r) => r.kind === "drop"), (r) => -lost(r), ovKeyword) },
    {
      key: "not_indexed",
      label: "검색에 안 들어간 우리 글",
      ...top(articles.filter((r) => r.ours && (r.kind === "stale" || r.kind === "excluded")), (r) => -(r.days || 0), ovArticle),
    },
  ];
  const good: OverviewBucket[] = [
    {
      key: "article_rise",
      label: "노출이 늘어난 글",
      ...top(
        articles.filter((r) => r.prev_impressions && gained(r) >= riseMin && r.impressions >= r.prev_impressions * RISE_RATIO),
        (r) => -gained(r),
        ovArticle
      ),
    },
    { key: "article_in", label: "1페이지로 올라온 글", ...top(articles.filter((r) => crossed(r, false)), (r) => -r.impressions, ovArticle) },
    { key: "keyword_surge", label: "급상승 검색어", ...top(keywords.filter((r) => r.kind === "surge"), (r) => -gained(r), ovKeyword) },
    {
      key: "ours_new",
      label: "검색에 새로 잡힌 우리 글",
      ...top(articles.filter((r) => r.ours && r.impressions && !r.prev_impressions), (r) => -r.impressions, ovArticle),
    },
  ];
  return { bad, good };
}

// ── 요약 · 설명 ───────────────────────────────────────────────────────────

export interface InsightSummary {
  queries: number;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  start: string;
  end: string;
}

export function summary(snap: Pick<InsightSnapshot, "queries" | "total">): InsightSummary {
  const t = snap.total;
  const impressions = t?.impressions ?? 0;
  const clicks = t?.clicks ?? 0;
  return {
    queries: snap.queries.length,
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    position: t?.position ?? 0,
    start: t?.period_start ?? "",
    end: t?.period_end ?? "",
  };
}

export interface GuideKind {
  key: string;
  label: string;
  text: string;
}
export interface GuideMetric {
  items: { label: string; text: string }[];
}
export interface Guides {
  keyword_kinds: GuideKind[];
  article_kinds: GuideKind[];
  metrics: Record<string, GuideMetric>;
}

/** 갈래·지표 설명의 정본. 목록 순서가 곧 화면 드롭다운 순서다. 문턱은 창 길이에 맞춰 다시 적는다 */
export function guides(scale = 1.0, days = WINDOW_DAYS): Guides {
  const surgeMin = bar(SURGE_MIN_IMPRESSIONS, scale);
  const dropMin = bar(DROP_MIN_PREV, scale);
  const splitMin = bar(SPLIT_MIN_IMPRESSIONS, scale);
  const topicMin = bar(TOPIC_MIN_IMPRESSIONS, scale);
  const fixMin = bar(FIX_MIN_IMPRESSIONS, scale);
  return {
    keyword_kinds: [
      { key: "surge", label: "급상승", text: `직전 ${days}일 노출의 ${pyG(SURGE_RATIO)}배 이상으로 늘어난 검색어예요. 노출 ${pyComma(surgeMin)}회 이상만 봐요` },
      { key: "drop", label: "하락", text: `직전 ${days}일 노출이 ${pyComma(dropMin)}회 이상이었는데 이번에 ${pyPct(DROP_RATIO, 0)} 이하로 줄어든 검색어예요` },
      { key: "near", label: "순위 근접", text: `${NEAR_RANGE[0]}~${NEAR_RANGE[1]}위라 조금만 올리면 1페이지에 드는 검색어예요. 노출 ${pyComma(topicMin)}회 이상만 봐요` },
      {
        key: "split",
        label: "글이 갈림",
        text: `한 검색어에 우리 글이 ${SPLIT_RANGE[0]}~${SPLIT_RANGE[1]}개 따로 걸려 순위가 나뉜 검색어예요(노출 ${pyComma(splitMin)}회 이상). 하나로 합치면 그 순위를 한 글이 가져가요`,
      },
    ],
    article_kinds: [
      { key: "stale", label: "색인 지연", text: `발행 ${STALE_DAYS}일이 지났는데 구글이 아직 색인하지 않은 글이에요. Search Console에서 색인을 요청해 주세요` },
      { key: "excluded", label: "색인 제외", text: "구글이 색인하지 않기로 한 글이에요. Search Console에서 사유를 확인해 주세요" },
      {
        key: "title",
        label: "제목 문제",
        text: `${FIX_MAX_POSITION}위 안에서 노출 ${pyComma(fixMin)}회 이상인데 클릭률이 ${pyPct(FIX_MAX_CTR, 0)} 미만이거나 같은 순위 우리 사이트 평균의 ${pyPct(FIX_CTR_RATIO, 0)} 미만인 글이에요. 검색 의도와 제목이 어긋났을 때 나타나는 모양이에요`,
      },
      { key: "drop", label: "하락", text: `직전 ${days}일 노출이 ${pyComma(dropMin)}회 이상이었는데 이번에 ${pyPct(DROP_RATIO, 0)} 이하로 줄어든 글이에요` },
      { key: "waiting", label: "색인 전", text: `발행 후 ${STALE_DAYS}일이 지나지 않은 글이에요. 구글이 넣을 때까지 기다려요` },
      { key: "unknown", label: "미확인", text: "색인 상태를 아직 구글에 물어본 적이 없는 글이에요. 색인 확인을 누르면 확인해요" },
      { key: "indexed", label: "정상", text: "손볼 것이 없는 글이에요. 색인은 됐지만 노출 기록이 아직 없는 글은 노출 전으로 표시해요" },
    ],
    metrics: {
      position_query: {
        items: [
          { label: "뜻", text: "이 검색어로 검색했을 때 우리 사이트가 뜬 자리" },
          { label: "셈법", text: "노출로 가중한 평균이에요. 노출 10회짜리 1위가 노출 1만회짜리 9위를 끌어내리지 않아요" },
          { label: "보는 법", text: `${NEAR_RANGE[0]}위 아래는 클릭이 거의 없어요. 1페이지 안으로 올리는 것이 목표예요` },
        ],
      },
      position_page: {
        items: [
          { label: "뜻", text: "이 글이 뜬 모든 검색어의 평균 자리예요. 검색어 하나의 순위가 아니에요" },
          { label: "어느 검색어인지", text: "근거를 펼치면 이 글이 뜨는 검색어와 각각의 순위가 나와요" },
          { label: "셈법", text: "노출로 가중한 평균이에요. 노출이 큰 검색어의 순위가 더 무거워요" },
        ],
      },
      ctr: {
        items: [
          { label: "뜻", text: "클릭을 노출로 나눈 값" },
          { label: "보는 법", text: "같은 순위 우리 사이트 평균과 견줘 낮으면 제목이 검색 의도와 어긋난 신호예요" },
        ],
      },
      opportunity: {
        items: [
          { label: "뜻", text: `${TARGET_POSITION}위 평균 클릭률까지 올랐을 때 한 달에 늘어날 클릭 수의 추정치` },
          { label: "셈법", text: `노출 × (${TARGET_POSITION}위 평균 클릭률 − 지금 클릭률). 이미 넘겼으면 0이에요` },
          { label: "주의", text: "제목만 고치는 건은 순위가 그대로라 지금 순위의 평균 클릭률이 천장이에요" },
        ],
      },
      range: {
        items: [
          { label: "적용 범위", text: "요약·추이·검색어·글·분포 전부 고른 기간을 따라요" },
          { label: "바꾸면", text: `그 기간(${days}일)으로 구글에 다시 물어 검색어·글 실적을 새로 받아요(약 6초)` },
          { label: "판정 문턱", text: "창 길이에 비례해 조정해요. 7일을 보면서 28일 문턱을 쓰면 급상승·하락이 0건이 돼요" },
        ],
      },
      published: {
        items: [
          { label: "뜻", text: "이 앱이 gobang.kr에 발행한 날이에요" },
          { label: "빈 칸", text: "앱 밖에서 올린 글이라 발행일을 앱이 몰라요. 검색 실적은 그대로 보여요" },
          {
            label: "검색에 떴는지",
            text: "노출 칸에 값이 있으면 검색결과에 뜬 기록이 있다는 뜻이에요. 0이면 상태 칸이 색인 전·색인 지연·색인 제외로 사정을 말해요",
          },
        ],
      },
      delta: {
        items: [
          { label: "견주는 기간", text: `고른 ${days}일 대 그 직전 ${days}일` },
          { label: "신규", text: `직전 ${days}일에는 노출이 없던 검색어예요` },
          { label: "순위", text: "내려가는 것이 좋아요. 1위가 10위 위예요" },
        ],
      },
    },
  };
}
