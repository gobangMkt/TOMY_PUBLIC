'use client';

// 주간 흐름 — '월간 흐름'의 주 단위 짝(2026-07-31 신설). 매주 사람이 해야 하는 일이 이 탭 하나에
// 모인다: u-ceo [전주 불러오기] 동기화. 그 결과(조회·문의)를 WAU·매출과 함께 장기 주간 시계열 +
// 전년동주(52주 전) 대비로 본다 — 월간 흐름과 같은 어휘(차트 먼저 → 표는 값+YoY 항상 · 접기/전체보기).
import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/page-header';
import {
  TrendMultiLine,
  TrendDualLine,
  channelSeriesDefs,
  PLATFORM_COLOR,
  MINT,
  MINT_DARK,
  AMBER,
} from '@/components/charts/trend-charts';
import { FunnelCombo, RevenueCombo, MetricCombo } from '@/components/charts/combo-charts';
import { ScopeBlock, ChartCard } from '@/components/dashboard/scope-block';
import InfoTip from '@/components/ui/info-tip';
import TodoRow from '@/components/ui/todo-row';
import SelectMenu from '@/components/ui/select-menu';
import { ActionButton, ToggleButton, ExternalLink } from '@/components/ui/controls';
import UceoSyncButton, { UAGENT_ACCOUNT_URL, UCEO_LOGIN_URL, UAGENT_LOGIN_URL } from '@/components/metrics/uceo-sync-button';
import WeeklyEntry from '@/components/overview/weekly-entry';
import StreamTable from '@/components/dashboard/stream-table';
import TrafficTable from '@/components/dashboard/traffic-table';
import ScopeAchievement from '@/components/overview/scope-achievement';
import Ga4CollectButton from './ga4-collect-button';
import AppMetricsCard from './app-metrics-card';
import { mergeSyncedWeeks, storeInputWeek, storePendingLabels, weekLabelY } from '@/lib/app-store-weekly';
import { AppInstallChart, AppRatingChart } from './app-store-charts';
import { useAppMetrics } from './use-app-metrics';
import { useFirstLoad } from '@/lib/use-first-load';
import {
  ColumnsIcon,
  PrevPeriodIcon,
  YoyIcon,
  CheckIcon,
  EyeIcon,
  WonIcon,
  SpeechIcon,
  CursorIcon,
} from '@/components/icons';
import { fmtInt, fmtPct } from '@/lib/format';
import { lastFullWeek, shiftDays, todayKST, weekStartSunday } from '@/lib/period';
import { UBOSS_GROUP } from '@/lib/revenue';
import {
  CHANNEL_TREND_TOP,
  PLATFORMS,
  PLATFORM_LABEL,
  channelWauSeries,
  tableBy,
  topChannelsOf,
} from '@/lib/metrics';
import { sliceMetrics, bucketMetrics, channelFunnelRows, ujunggaeInquiryStartOf } from '@/lib/inquiries';
import { bmRowsInRange, buildTrendSeries, revenueScopeIds } from '@/lib/overview-report';
import { Delta } from '@/components/dashboard/delta';
import { useWeekly } from './use-weekly';
import {
  WEEK_METRIC_META,
  weekNeedsSync,
  weekEntryRows,
  pendingEntryCount,
  deltaOfWeek,
  recentWeekOptions,
  weekRangeLabel,
  type WeekMetricKey,
  type WeekRow,
} from '@/lib/weekly';

// 월간 흐름과 **같은 강조 어휘**(2026-08-03) — 기준=앰버, 비교 대상=민트. 두 화면이 같은 격자를 쓰는데
// 강조 색·고정 방식이 다르면 표 읽는 법을 화면마다 다시 익혀야 한다. 고정(sticky) 행이라 배경은
// 반투명이 아니라 color-mix **불투명**이어야 한다(밑을 지나가는 행이 비친다).
const BASE_CELL = 'bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-accent2))]';
const BASE_DELTA = 'bg-[color-mix(in_srgb,var(--color-surface)_82%,var(--color-accent2))]';
const CMP_CELL = 'bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-primary))]';
const CMP_DELTA = 'bg-[color-mix(in_srgb,var(--color-surface)_84%,var(--color-primary))]';
type DeltaMode = 'yoy' | 'mom';
// 🚨 세션 만료(u-ceo/u-agent)로 [전주 불러오기]가 실패하면 배너에 바로 재연결 버튼을 낸다
// (2026-08-24 요청) — 그전엔 드롭다운을 열어 '세션 갱신' 메뉴를 따로 찾아야 했다.
type SyncNote = { tone: 'ok' | 'warn' | 'err'; text: string; expired?: Array<'uceo' | 'uagent' | 'play' | 'asc'> };
const isExpiredCode = (code: unknown) => code === 'session_expired' || code === 'no_session';
// u-agent 세션 없음/만료는 서버가 `uagent_` 접두사로 구분해 준다(route.ts).
const isUagentExpiredCode = (code: unknown) => code === 'uagent_session_expired' || code === 'uagent_no_session';

const fmtBy = (key: WeekMetricKey, v: number | null): string => {
  if (v === null) return '·';
  if (key === 'revenue') return `${Math.round(v / 10_000).toLocaleString('ko-KR')}만`;
  if (key === 'rate') return fmtPct(v);
  return Math.round(v).toLocaleString('ko-KR');
};

// 차트 카드 = 리포트와 **같은 공용 `ChartCard`**(2026-08-04 합집합 — 로컬 `Panel` 복제본 삭제).
// 두 화면이 같은 차트를 다른 껍데기에 담으면 같은 리포트로 안 읽힌다.
const manOf = (n: number) => `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;

export default function WeeklyView() {
  const { rows, weeks, weeklyWau, daily, targets, targetHistory, txns, loading, isSample, streamSeries, channelWau, ga4Recs, reload, reloadRevenueOnly } =
    useWeekly();
  // 스켈레톤은 첫 로드에만 — 저장 직후 재조회에도 띄우면 입력표가 통째로 사라진다(use-first-load.ts).
  const firstLoad = useFirstLoad(loading);
  const [mode, setModeState] = useState<DeltaMode>('yoy');
  const [tableExpanded, setTableExpanded] = useState(false);
  // 🚨 진행 중인 주 행은 **기본 접힘**(2026-08-03 지적 "진행중인 달은 어차피 수치 입력못하는데 표기
  // 안해도 되는거 아님? 접음으로 해놔도 될 것 같은데. 진행중인 주도 마찬가지"). 반쪽 값이라 대비도
  // 못 내고 강조도 안 하는 행이 표 맨 위 한 줄을 늘 먹고 있었다. 필요하면 펼친다(월간 흐름과 같은 규칙).
  const [inProgressOpen, setInProgressOpen] = useState(false);
  // 🚨 마감 체크리스트도 **다 했으면 접힌다**(2026-08-03 요청 "다했는데 굳이 계속 보고 있을 필요없음").
  // 주간 매출 입력과 같은 규칙: 기본값은 **남은 할 일 여부**가 정하고 수동 토글이 그걸 덮는다.
  // 접혀도 헤더의 `N/3 완료`는 남으므로 '무엇이 남았나'는 한 줄로 계속 보인다.
  const [todoOverride, setTodoOverride] = useState<boolean | null>(null);
  // 🚨 **기준 주 = [주간 매출 입력]에서 고른 주**(2026-08-10 사용자 요청 "차트를 보여주는 기준 주 =>
  // 주간 매출 입력 부분의 주랑 연동시킬 것 — 그게 의식의 흐름에 더 맞음"). 입력할 주를 고르는 것과
  // 그 주의 실적을 보는 것이 별개 컨트롤이라 "방금 입력한 매출이 왜 차트엔 안 보이지"가 났다 —
  // 이제 단일 상태(`activeWeek`)를 입력 표의 드롭다운과 아래 격자표 행 클릭이 함께 쓴다.
  const [activeWeek, setActiveWeek] = useState<string>(() => lastFullWeek().from);
  // 기준 행을 표 머리 바로 아래에 고정하려면 머리 높이를 실측해야 한다(콜백 ref — 로딩 중엔 표가 없다).
  const [theadEl, setTheadEl] = useState<HTMLTableSectionElement | null>(null);
  const [theadH, setTheadH] = useState(0);
  useEffect(() => {
    if (!theadEl) return;
    const measure = () => setTheadH(theadEl.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(theadEl);
    return () => ro.disconnect();
  }, [theadEl]);
  const [syncing, setSyncing] = useState<'' | 'week' | 'range' | 'session'>('');
  const [syncNote, setSyncNote] = useState<SyncNote | null>(null);
  const TABLE_FOLD = 12;

  const today = todayKST();
  const lastFull = lastFullWeek(today).from; // 직전에 끝난 주(일~토) — "이번 주" 배너·동기화 대상
  const appMetrics = useAppMetrics({ lastFull, live: streamSeries });
  const doneRows = useMemo(() => rows.filter((r) => r.weekStart <= lastFull), [rows, lastFull]);
  const allWeeks = useMemo(() => doneRows.map((r) => r.weekStart), [doneRows]);
  const inProgressRow = useMemo(() => rows.find((r) => r.weekStart > lastFull) ?? null, [rows, lastFull]);
  const needsSync = useMemo(() => weekNeedsSync(rows, lastFull), [rows, lastFull]);

  // 마감 체크리스트 상태 — 사람이 체크하는 게 아니라 **원장에 값이 들어왔는지**로 판정한다.
  // 매출은 스코프별로 따로 센다: 고방은 항목이 여러 개라 "몇 개 남음"이 필요하고,
  // U사장님은 애드 1개라 있음/없음이면 충분하다.
  // 🚨 판정은 **`pendingEntryCount`(원장 행 존재)** 한 벌만 쓴다 — 화면에서 필터를 손으로 짜지 말 것.
  // 2026-08-03 사고: 여기 로컬 필터가 `recorded === 0`(금액 기준)이라 **0원으로 마감한 항목이 계속
  // '해야 함'** 이었다(지적 "고방매출 다 기입했는데 왜 여전히 해야함으로 뜸?" — 8개를 0원으로 다 채워
  // 아래 표 배지는 '이 주 입력 완료'인데 위 체크리스트만 미완료로 남아 두 곳이 서로 다른 말을 했다).
  // 0원 확인과 미확인은 다른 상태이므로 판정 기준은 금액이 아니라 행 존재(`entries`)다.
  const entry = useMemo(() => {
    const week = { from: lastFull, to: shiftDays(lastFull, 6) };
    const all = weekEntryRows(targets, txns, week);
    return {
      gobangPending: pendingEntryCount(all.filter((r) => r.group !== UBOSS_GROUP)),
      ubossPending: pendingEntryCount(all.filter((r) => r.group === UBOSS_GROUP)),
    };
  }, [targets, txns, lastFull]);
  const { gobangPending, ubossPending } = entry;
  // 화면 숫자는 GA4 직결이라 대개 채워져 있다 — 이 판정은 **그래도 비어 있는 경우**(GA4 미연결·조회
  // 실패)에만 적재 버튼을 띄우기 위한 것이다. 평소엔 버튼이 아예 안 보인다(누를 일이 없다).
  const wauMissing = useMemo(() => {
    const row = rows.find((r) => r.weekStart === lastFull);
    return !row || row.wau === null;
  }, [rows, lastFull]);
  // 앱 지표는 콘솔 반영이 늦어 직전 주가 아니라 1주 전(`storeInputWeek`)을 채운다. 원장을 다 읽기 전엔 판정하지 않는다.
  const appInputWeek = storeInputWeek(lastFull);
  const appPending = useMemo(
    () => (appMetrics.loading ? [] : storePendingLabels(appMetrics.store, appInputWeek)),
    [appMetrics.loading, appMetrics.store, appInputWeek],
  );
  const TODO_TOTAL = 4;
  const doneCount = [!needsSync, gobangPending === 0, ubossPending === 0, appPending.length === 0].filter(Boolean).length;
  const todoOpen = todoOverride ?? doneCount < TODO_TOTAL;

  const visibleWeeks = useMemo(
    () => (tableExpanded ? allWeeks : allWeeks.slice(-TABLE_FOLD)),
    [allWeeks, tableExpanded],
  );
  // 강조 대상 = 기준 주(주간 매출 입력과 공유). 비교 대상 = 대비 모드가 가리키는 주(-52주 / -1주).
  const compareWeek = useMemo(
    () => shiftDays(activeWeek, mode === 'yoy' ? -364 : -7),
    [activeWeek, mode],
  );
  // ⚠️ 비교 행이 접기에 잘리면 대비%만 있고 검산할 값이 안 보인다. 다만 전년동주는 **52주 아래**라
  //    월간(12행)처럼 그 사이를 다 펼치면 53행이 된다 → 사이는 접어 둔 채 **그 한 줄만 바닥에 덧댄다**.
  const visibleRowsDesc = useMemo(() => {
    const list = [...visibleWeeks].reverse().map((w) => rows.find((r) => r.weekStart === w)!).filter(Boolean);
    if (!list.some((r) => r.weekStart === compareWeek)) {
      const extra = rows.find((r) => r.weekStart === compareWeek);
      if (extra) return [...list, extra];
    }
    return list;
  }, [visibleWeeks, rows, compareWeek]);
  const focusRow = (weekStart: string) => setActiveWeek(weekStart);

  // [주간 매출 입력]의 주 드롭다운 — 최근 12주가 기본이지만, 격자표에서 12주보다 옛 행을 클릭해
  // `activeWeek`가 그 밖으로 나가면 드롭다운이 빈 라벨을 보이지 않도록 그 값을 목록 맨 앞에 끼운다.
  const entryWeekOptions = useMemo(() => {
    const opts = recentWeekOptions(12);
    if (opts.some((o) => o.value === activeWeek)) return opts;
    return [{ value: activeWeek, label: weekRangeLabel(activeWeek) }, ...opts];
  }, [activeWeek]);

  // 차트 = 최근 26주(6개월) 고정 — 리포트와 같은 창(대비 대상 확보 + x축 길이 통일).
  const chartWeeks = useMemo(() => allWeeks.slice(-26), [allWeeks]);
  // 스토어 값은 콘솔 반영이 1주 늦다: 앱 대시보드와 같이 입력 대상 주까지만 그린다.
  const storeChartWeeks = useMemo(() => {
    const end = storeInputWeek(lastFull);
    return chartWeeks.filter((x) => x <= end);
  }, [chartWeeks, lastFull]);

  // 🚨 추이 6계열(매출+트래픽·퍼널·U사장님 매출·활성사용자당 조회·문의)은 **통합리포트와 같은 함수**
  // `buildTrendSeries` 한 벌로 만든다(2026-10-19 싱크 점검 — 그전엔 이 화면이 같은 계열을 따로 짜며
  // 주석으로만 "리포트와 같은 규칙"이라 했고, 빈 주 처리가 이미 갈라져 있었다). 화면에서 다시 짜지 말 것.
  const trend = useMemo(() => {
    const { gobangIds, ubossIds } = revenueScopeIds(targets);
    return buildTrendSeries({
      unit: 'week',
      chartFrom: chartWeeks[0] ?? lastFull,
      txns,
      gobangIds,
      ubossIds,
      daily,
      weeks,
      weeklyWau,
      monthlyMau: [],
      today,
    });
  }, [targets, txns, daily, weeks, weeklyWau, chartWeeks, lastFull, today]);
  const { revenueTraffic, funnel, ubossRevenue, perUser } = trend;

  // BM별 매출·건수·건당 매출 — 리포트와 같은 계산(`bmRowsInRange`). 기간 = 기준 주(표에서 고른 주).
  const bmChart = useMemo(
    () =>
      bmRowsInRange(targets, txns, activeWeek, shiftDays(activeWeek, 6)).map((b) => ({
        label: b.name,
        revenue: b.revenue,
        purchases: b.count,
        aov: b.aov,
      })),
    [targets, txns, activeWeek],
  );

  // U중개사 문의가 처음 발생한 주 — 그 이전은 수집 누락이 아니라 채널 미존재(리포트와 같은 규칙).
  const ujunggaeInquiryStart = useMemo(() => ujunggaeInquiryStartOf(weeks), [weeks]);

  // 채널 구분(U사장님/U중개사) 퍼널 — 리포트·U사장님 지표 화면과 같은 `channelFunnelRows` 경로
  // (화면에서 채널 필드를 직접 집어 짜지 말 것 — CLAUDE.md §채널 구분 추이).
  const channelFunnel = useMemo(() => {
    const from = chartWeeks[0];
    if (!from) return { usajang: [], ujunggae: [] };
    const slice = sliceMetrics(daily, weeks, from, shiftDays(lastFull, 6), weekStartSunday);
    const buckets = bucketMetrics(slice, 'week');
    return {
      usajang: channelFunnelRows(buckets, 'usajang'),
      ujunggae: channelFunnelRows(buckets, 'ujunggae', ujunggaeInquiryStart),
    };
  }, [daily, weeks, chartWeeks, lastFull, ujunggaeInquiryStart]);

  // 스트림 계열 정의 — 리포트·폐지된 대시보드와 같은 색·라벨(PLATFORM_COLOR 정본).
  const STREAM_SERIES = useMemo(
    () => PLATFORMS.map((p) => ({ key: p, name: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p] })),
    [],
  );
  // 스트림별 주 WAU — 최근 26주만 그린다(다른 차트와 x축 길이를 맞춘다).
  const streamChart = useMemo(() => {
    const inWindow = new Set(chartWeeks);
    return streamSeries.filter((p) => inWindow.has(p.key));
  }, [streamSeries, chartWeeks]);
  // 채널(소스/매체)별 주 WAU — 같은 창에서 상위 N개만. 계열 색은 순위 순으로 민트 램프(공용 정본).
  const channelChart = useMemo(() => {
    const inWindow = new Set(chartWeeks);
    const rows = channelWau.filter((r) => inWindow.has(r.weekStart));
    const keys = topChannelsOf(rows.map((r) => ({ channel: r.channel, value: r.wau })), CHANNEL_TREND_TOP);
    return { data: channelWauSeries(rows, keys), series: channelSeriesDefs(keys) };
  }, [channelWau, chartWeeks]);
  // 스트림 표(활성·신규·재방문·재방문율·세션) = **기준 주 7일**만. 집계 정본은 `tableBy`.
  const weekRecs = useMemo(() => {
    const to = shiftDays(activeWeek, 6);
    return ga4Recs.filter((r) => r.date >= activeWeek && r.date <= to);
  }, [ga4Recs, activeWeek]);
  const streamTable = useMemo(() => tableBy(weekRecs, 'platform'), [weekRecs]);
  // 전주 같은 7일 — 스트림·소스/매체 표의 증감 열 분모(2026-08-04 요청 "스트림별 사용자도 전주대비 넣어").
  const prevWeekRecs = useMemo(() => {
    const from = shiftDays(activeWeek, -7);
    const to = shiftDays(activeWeek, -1);
    return ga4Recs.filter((r) => r.date >= from && r.date <= to);
  }, [ga4Recs, activeWeek]);
  const prevStreamTable = useMemo(() => tableBy(prevWeekRecs, 'platform'), [prevWeekRecs]);
  // 소스/매체 표 — 리포트와 **같은 공용 TrafficTable**(전주 절대값 + 증감 열, 10행 접기). 그전엔
  // 로컬 표(활성·신규·세션 3열, 상위 10 고정)라 같은 표가 두 화면에서 다르게 읽혔다(2026-08-04 통일).
  const trafficRows = useMemo(() => {
    const prevBy = new Map(tableBy(prevWeekRecs, 'channel').map((r) => [r.key, r.activeUsers]));
    return tableBy(weekRecs, 'channel')
      .map((r) => ({
        key: r.key,
        label: r.label,
        active: r.activeUsers,
        new: r.newUsers,
        sessions: r.sessions,
        // 전주에 없던 소스는 null(신규 유입) — 0으로 두면 '-100%'로 읽힌다(trafficDelta 규칙).
        prevActive: prevBy.has(r.key) ? prevBy.get(r.key)! : null,
      }))
      .sort((a, b) => b.active - a.active);
  }, [weekRecs, prevWeekRecs]);
  // 스토어 콘솔(Play·ASC)에서 입력 대상 주(+앞 3주 중 빈 칸)를 받아 **빈 칸에만** 저장한다.
  const syncAppStore = async (): Promise<{ text: string; err: boolean; expired?: SyncNote['expired'] }> => {
    const to = appInputWeek;
    const res = await fetch(`/api/metrics/app-store-sync?from=${shiftDays(to, -21)}&to=${to}`)
      .then((r) => r.json())
      .catch(() => null);
    if (!res) return { text: '앱 지표 수집 요청에 실패했습니다.', err: true };
    let cells = 0;
    try {
      const merged = mergeSyncedWeeks(appMetrics.store, res.weeks ?? []);
      cells = merged.cells;
      if (merged.rows.length) await appMetrics.saveRows(merged.rows);
    } catch (e) {
      return { text: `앱 지표 저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`, err: true };
    }
    const errs: { target: 'play' | 'asc'; error: string; message: string }[] = res.errors ?? [];
    if (!errs.length) return { text: cells ? `앱 지표 ${cells}칸 반영` : '앱 지표 새로 채울 칸 없음', err: false };
    const name = (t: string) => (t === 'play' ? 'Play 콘솔' : 'App Store Connect');
    return {
      text: `${cells ? `앱 지표 ${cells}칸 반영, ` : ''}${errs.map((e) => `${name(e.target)} 실패(${e.message})`).join(' · ')}`,
      err: true,
      expired: errs.filter((e) => /session/.test(e.error)).map((e) => e.target),
    };
  };

  const refreshStoreSession = async (target: 'play' | 'asc') => {
    const name = target === 'play' ? 'Play 콘솔' : 'App Store Connect';
    setSyncing('session');
    setSyncNote({ tone: 'warn', text: `브라우저 창이 열립니다 — ${name}에 로그인하세요(최대 3분 대기).` });
    try {
      const res = await fetch(`/api/metrics/app-store-sync/session?target=${target}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setSyncNote(
        res.ok && data?.ok
          ? { tone: 'ok', text: data?.message || '세션을 갱신했습니다.' }
          : { tone: 'err', text: data?.message || '세션 갱신에 실패했습니다.' },
      );
    } catch {
      setSyncNote({ tone: 'err', text: '세션 갱신 요청에 실패했습니다.' });
    } finally {
      setSyncing('');
    }
  };

  const syncWeek = async (rangeMode: 'week' | 'range') => {
    setSyncing(rangeMode);
    setSyncNote(null);
    try {
      // U사장님 지표는 이미 찼고 앱 지표만 남았으면 u-ceo는 건드리지 않는다.
      if (rangeMode === 'week' && !needsSync) {
        const app = await syncAppStore();
        setSyncNote({ tone: app.err ? 'warn' : 'ok', text: app.text, expired: app.expired });
        return;
      }
      const body = rangeMode === 'range' ? { op: 'sync', from: allWeeks[Math.max(0, allWeeks.length - 12)], to: lastFull } : { op: 'sync' };
      const res = await fetch('/api/inquiries/uceo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        // u-ceo·u-agent 둘 다 로그인이어야 반영된다(2026-09-28) — 어느 쪽이 막혔는지 배너에 구분해 보여준다.
        setSyncNote({
          tone: 'err',
          text: data?.message || 'U사장님 데이터를 불러오지 못했습니다.',
          expired: isExpiredCode(data?.error) ? ['uceo'] : isUagentExpiredCode(data?.error) ? ['uagent'] : undefined,
        });
        return;
      }
      const synced: { weekStart: string }[] = data.weeks ?? [];
      const uceoNote: SyncNote = synced.length
        ? { tone: 'ok', text: `${synced.length}개 주 반영 완료` }
        : { tone: 'err', text: '반영할 확정 주(7일치)가 없습니다.' };
      reload();
      // 앱 지표(스토어 콘솔)도 같이 — 막혀도 u-ceo 결과는 그대로 두고 막힌 콘솔만 알린다.
      const app = rangeMode === 'week' && appPending.length > 0 ? await syncAppStore() : null;
      setSyncNote(
        !app
          ? uceoNote
          : {
              tone: app.err ? 'warn' : uceoNote.tone,
              text: `${uceoNote.text} · ${app.text}`,
              expired: app.expired,
            },
      );
    } catch {
      setSyncNote({ tone: 'err', text: '수집 요청에 실패했습니다.' });
    } finally {
      setSyncing('');
    }
  };

  const refreshSession = async () => {
    setSyncing('session');
    setSyncNote({ tone: 'warn', text: '브라우저 창이 열립니다 — u-ceo.kr에 로그인하세요(최대 3분 대기).' });
    try {
      const res = await fetch('/api/inquiries/uceo/session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setSyncNote(
        res.ok && data?.ok
          ? { tone: 'ok', text: data?.message || '세션을 갱신했습니다.' }
          : { tone: 'err', text: data?.message || '세션 갱신에 실패했습니다.' },
      );
    } catch {
      setSyncNote({ tone: 'err', text: '세션 갱신 요청에 실패했습니다.' });
    } finally {
      setSyncing('');
    }
  };

  const refreshUagentSession = async () => {
    setSyncing('session');
    setSyncNote({ tone: 'warn', text: '브라우저 창이 열립니다 — u-agent.kr에 로그인하세요(최대 3분 대기).' });
    try {
      const res = await fetch('/api/inquiries/uagent/refresh', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setSyncNote(
        res.ok && data?.ok
          ? { tone: 'ok', text: data?.message || '세션을 갱신했습니다.' }
          : { tone: 'err', text: data?.message || '세션 갱신에 실패했습니다.' },
      );
    } catch {
      setSyncNote({ tone: 'err', text: '세션 갱신 요청에 실패했습니다.' });
    } finally {
      setSyncing('');
    }
  };

  if (firstLoad) {
    return (
      <>
        <PageHeader icon={ColumnsIcon} title="주간 흐름" subtitle="불러오는 중…" />
        <div className="h-64 animate-pulse rounded-xl bg-ink/[0.03]" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={ColumnsIcon}
        title="주간 흐름"
        subtitle="주간 매출·지표 현황"
      />

      {isSample && !syncNote && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          원장이 아직 연결되지 않아 샘플 데이터입니다.
        </p>
      )}
      {/* 🚨 **이번 주 마감 체크리스트**(2026-08-03 신설, 지적 "매주 어디에 무슨 내용 입력하면
          되는데? 앞으로 그냥 통합만 관리하면 되게끔"). 그전엔 [전주 불러오기] 배너와 매출 입력표가
          따로 있어 **매주 할 일이 전부 몇 개이고 지금 몇 개 남았는지**를 화면이 말해주지 않았다.
          이 블록이 그 답이다 — 항목마다 ①무엇을 ②어디서 가져와 ③어디에 넣는지를 한 줄로 적는다.
          체크는 실제 원장 상태에서 나온다(사람이 체크하는 게 아니라 데이터가 채워지면 켜진다). */}
      <section className="mb-6 rounded-xl border border-mint/40 bg-mint/[0.04]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-mint/25 px-4 py-2.5">
          <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink">
            <CheckIcon size={15} className="text-primary" />
            이번 주 마감
            <span className="text-[12px] font-normal text-muted">
              {lastFull} ~ {shiftDays(lastFull, 6)} ·{' '}
              <b className={`font-semibold ${doneCount === TODO_TOTAL ? 'text-primary' : 'text-alert'}`}>
                {doneCount}/{TODO_TOTAL} 완료
              </b>
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            onClick={() => setTodoOverride(!todoOpen)}
            title="이번 주 마감 항목 목록을 펼치거나 접습니다"
            className="!py-1 !text-[12px]"
          >
            {todoOpen ? '접기' : doneCount === TODO_TOTAL ? '할 일 보기' : `남은 ${TODO_TOTAL - doneCount}개 보기`}
          </ActionButton>
          {(needsSync || appPending.length > 0) && (
            <UceoSyncButton
              busy={syncing}
              rangeLabel="최근 12주"
              onSyncWeek={() => syncWeek('week')}
              onSyncRange={() => syncWeek('range')}
              onRefreshSession={refreshSession}
              onRefreshUagentSession={refreshUagentSession}
              onRefreshPlaySession={() => refreshStoreSession('play')}
              onRefreshAscSession={() => refreshStoreSession('asc')}
            />
          )}
          </div>
        </header>
        {todoOpen && (
        <ol className="divide-y divide-mint/15">
          {/* 🚨 **GA4 적재는 체크리스트 항목이 아니다**(2026-08-03 지적 "GA4 트래픽은 알아서 딸려오는
              건데 왜 적재 눌러야 함?"). WAU는 이제 `/api/metrics/weekly-wau`로 GA4에서 바로 읽으므로
              사람이 눌러 채울 것이 없다. 적재(원장에 쌓기)는 **14개월 뒤 사라질 값을 보존하는 관리
              동작**이고 배포되면 GAS 트리거가 매일 돌린다 → 마감 할 일 목록에서 뺐다. */}
          <TodoRow
            done={!needsSync}
            title="U사장님 지표"
            how={needsSync ? '위 [전주 불러오기]' : '자동수집 완료'}
            hint="지점 조회수·문의수·판매 건수를 u-ceo·u-agent에서 그대로 당겨옵니다. 값이 이상하면 U사장님 › 지표에서 수기 보정하세요."
          />
          <TodoRow
            done={gobangPending === 0}
            title="고방 매출"
            how={gobangPending > 0 ? `아래 표에서 ${gobangPending}개 입력` : ''}
            hint="BM(콘텐츠·배너·오퍼월·리드판매·진단리포트)과 SNS(인스타·블로그) 항목을 아래 [주간 매출 입력]에 금액(만원)·건수로 넣습니다. 고방블로그·빌리투어숏폼은 매주 일요일 원천 시트에서 자동 반영되므로 입력칸이 없습니다."
          />
          <TodoRow
            done={ubossPending === 0}
            title="U사장님 애드 매출"
            how={ubossPending > 0 ? `아래 표 'U사장님 광고' 칸` : ''}
            hint={`구글 드라이브의 『${Number(lastFull.slice(5, 7))}월 운영현황.xlsx』에서 그 주 금액을 확인해 넣습니다. 어드민에 자동 수집 경로가 없는 유일한 매출 항목입니다.`}
          />
          <TodoRow
            done={appPending.length === 0}
            title="앱 지표"
            how={appPending.length > 0 ? `${weekLabelY(appInputWeek)}주 ${appPending.length}칸 · 위 [전주 불러오기]` : ''}
            hint="Play 콘솔·App Store Connect에서 신규 설치·활성·평점을 가져옵니다. 콘솔 반영이 늦어 직전 주가 아니라 한 주 앞 주를 채웁니다. 이미 있는 값은 덮지 않습니다. 로그인이 풀렸으면 [불러오기 옵션]에서 세션을 연결하세요. 값이 이상하면 앱 지표 표에서 수기로 고칩니다."
          />
        </ol>
        )}
        {todoOpen && (
        <footer className="border-t border-mint/25 px-4 py-2 text-[12px] text-muted">
          월 1회 입력은 <b>통합 › 월간 흐름</b> · 목표 수정은 <b>통합 › OKR</b>
        </footer>
        )}
      </section>

      {syncNote && (
        <div
          role="status"
          className={`mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-[13px] ${
            syncNote.tone === 'ok'
              ? 'border-mint/40 bg-mint/[0.06] text-ink'
              : syncNote.tone === 'warn'
                ? 'border-accent2/40 bg-accent2/10 text-ink-soft'
                : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{syncNote.text}</span>
          {/* 세션 만료가 원인이면 바로 그 서비스에 재연결할 수 있게 버튼 + 바로가기(로그인 화면·
              계정 정본 노션)를 한 번에 낸다. 드롭다운 안에 묻어두면 급할 때 못 찾는다(사용자 지적). */}
          {syncNote.expired && syncNote.expired.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {syncNote.expired.includes('uceo') && (
                <>
                  <ActionButton onClick={refreshSession} disabled={!!syncing} className="!py-1 !text-[12px]">
                    u-ceo 세션 연결
                  </ActionButton>
                  <ExternalLink href={UCEO_LOGIN_URL} title="u-ceo 로그인 화면을 새 탭으로 엽니다" className="text-[12px]">
                    u-ceo 로그인
                  </ExternalLink>
                </>
              )}
              {syncNote.expired.includes('play') && (
                <ActionButton onClick={() => refreshStoreSession('play')} disabled={!!syncing} className="!py-1 !text-[12px]">
                  Play 콘솔 세션 연결
                </ActionButton>
              )}
              {syncNote.expired.includes('asc') && (
                <ActionButton onClick={() => refreshStoreSession('asc')} disabled={!!syncing} className="!py-1 !text-[12px]">
                  App Store Connect 세션 연결
                </ActionButton>
              )}
              {syncNote.expired.includes('uagent') && (
                <>
                  <ActionButton onClick={refreshUagentSession} disabled={!!syncing} className="!py-1 !text-[12px]">
                    U중개사 세션 연결
                  </ActionButton>
                  <ExternalLink href={UAGENT_LOGIN_URL} title="u-agent 로그인 화면을 새 탭으로 엽니다" className="text-[12px]">
                    u-agent 로그인
                  </ExternalLink>
                  <ExternalLink href={UAGENT_ACCOUNT_URL} title="노션 [계정 관리]에서 u-agent 로그인 계정을 확인합니다" className="text-[12px]">
                    계정 확인
                  </ExternalLink>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ① 주간 매출 입력 — 이 화면의 '해야 할 일'이라 추이·표보다 위에 둔다(2026-08-03 신설).
          지표(조회·문의·판매)는 위 [전주 불러오기]가, 매출은 여기가 담당해 한 주가 이 화면에서 닫힌다.
          reloadRevenueOnly = 저장 직후엔 매출 원장만 다시 받는다(GA4·지표 원장은 안 바뀌었다).
          🚨 weekStart/onWeekChange = **아래 차트·격자표와 공유하는 기준 주**(2026-08-10) — 여기서
          고른 주를 그대로 아래에서 본다(격자표 행 클릭도 같은 상태를 바꾼다). */}
      <WeeklyEntry
        targets={targets}
        txns={txns}
        onSaved={reloadRevenueOnly}
        weekStart={activeWeek}
        weekOptions={entryWeekOptions}
        onWeekChange={setActiveWeek}
      />

      {/* ② 그 주 기준 안내 — 카드는 아래 **각 사업 구역 안**으로 들어갔다(2026-08-03 요청 "주간매출 =
          고방 주간매출 = 고방 항목 하위에 넣기"). 구 배치는 카드 4장이 구역 바깥 한 줄이라, 바로 아래
          구역에 같은 사업 차트가 또 나오며 '고방'이 화면에 두 번 등장했다.
          2026-08-10: 이 기준 주가 곧 위 [주간 매출 입력]에서 고른 주다(단일 상태) — 입력하려고
          고른 주의 실적을 그대로 아래에서 보는 게 자연스러운 흐름이라는 지적을 반영했다. */}
      <p className="mb-2 text-[12px] text-ink-mute">
        기준 주 <b className="font-semibold text-ink-soft">{activeWeek} ~ {shiftDays(activeWeek, 6)}</b> · 위 [주간 매출
        입력]에서 고른 주와 같습니다 — 아래 표에서 행을 클릭해도 바뀝니다
      </p>

      {/* ③ 추이 — 최근 26주(6개월) 고정. **구역 = 사업**(고방 / U사장님)으로 가른다(2026-08-03,
          폐지된 통합 대시보드와 같은 2구역 어휘 + 같은 차트 컴포넌트). 그전엔 4장이 한 그리드에
          섞여 있어 'WAU(고방)'와 '조회·문의(U사장님)'가 같은 무게로 읽혔다. */}
      <div className="mb-6 space-y-4">
        <ScopeBlock label="고방" color={MINT} note="GA4 트래픽 · BM·SNS 매출">
          <ScopeAchievement
            targets={targets}
            txns={txns}
            targetHistory={targetHistory}
            from={activeWeek}
            to={shiftDays(activeWeek, 6)}
            periodLabel={`${activeWeek.slice(5)}~${shiftDays(activeWeek, 6).slice(5)}`}
            unitNote="그 주"
            only="gobang"
            showCaption={false}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 매출 + 트래픽 한 차트 — 리포트와 같은 카드(규모가 100배 벌어져 높이 층으로 나눈다:
                막대=매출(앰버) / 선=WAU(민트)). 구 WAU·매출 별도 2장은 2026-08-04 합집합에서 합쳤다. */}
            <ChartCard
              icon={WonIcon}
              title="매출 · 트래픽 (WAU)"
              note="최근 6개월 · 주별(일~토)"
              hint="막대 = 고방(BM·SNS) 매출 합, 선 = WAU(GA4 주 순 활성 사용자). 규모가 100배 이상 벌어져 높이를 층으로 나눠 겹칩니다 — 두 계열의 막대·선 높이를 서로 견주지 마세요. 축은 최근 6개월 전체이고, 매출 원장에 그 주 행이 없으면 막대를 그리지 않습니다(0원 마감과 미입력은 다른 상태). 입력은 위 [주간 매출 입력], 삭제·수정은 고방 › 매출의 건별 원장. WAU는 유니크 지표라 일별 합으로 만들 수 없어 주(yearWeek) 단위로 따로 조회하고, 같은 주에 GA4 값과 적재 값이 둘 다 있으면 GA4가 정본입니다."
            >
              <MetricCombo
                data={revenueTraffic}
                bar={{ key: 'revenue', name: '매출', color: AMBER, fmt: manOf }}
                line={{ key: 'users', name: 'WAU', color: MINT, fmt: fmtInt }}
                height={250}
                ariaLabel="매출·WAU 추이"
              />
            </ChartCard>
            {/* 스트림별 — **총계와 별개 조회**다(WAU는 유니크라 스트림 합 ≠ 총계) → 스택·같은 축 겹치기 금지. */}
            <ChartCard
              icon={EyeIcon}
              title="스트림별 트래픽"
              note="최근 6개월 · 주별(일~토)"
              hint="스트림(웹·안드로이드·iOS)별 주 순 활성 사용자입니다. ⚠️ 유니크 지표라 스트림 합이 총계와 다릅니다(한 사람이 웹·앱을 함께 쓰면 양쪽에 세어집니다) — 그래서 총계 차트와 별도 카드로 두고, 쌓거나 같은 축에 겹치지 않습니다. 범례를 눌러 계열을 껐다 켤 수 있습니다."
            >
              <TrendMultiLine
                data={streamChart}
                series={STREAM_SERIES}
                fmt={fmtInt}
                ariaLabel="스트림별 주 WAU 추이"
                height={250}
              />
            </ChartCard>
            {/* 스토어 신규 설치 · 평점 — 고방 › 앱 대시보드와 같은 값(use-app-metrics), 2026-10-18 토미 지시.
                스토어 활성은 GA4 WAU와 겹치는 지표라 올리지 않는다. */}
            <AppInstallChart rows={appMetrics.rows} weeks={storeChartWeeks} />
            <AppRatingChart rows={appMetrics.rows} weeks={storeChartWeeks} />
            {/* BM별 — 리포트에만 있던 카드(2026-08-04 합집합). 추이가 아니라 기준 주 스냅샷이다. */}
            <ChartCard
              icon={CursorIcon}
              title="BM별 매출·건수·건당 매출"
              note={`기준 주 · ${activeWeek.slice(5)}~${shiftDays(activeWeek, 6).slice(5)}`}
              hint="고방 항목별 매출 막대 · 건수 선 · 건당 매출 점선. 위 추이 차트들과 달리 기준 주(표에서 고른 주)만 집계합니다. 건수는 매출이 실제로 발생한 거래 수입니다(수기 '수량' 칸은 U사장님 항목이 늘 0이라 쓰지 않고, [매출 없음]으로 확정한 0원 행도 세지 않습니다). 그 주에 매출·건수가 0인 항목은 나오지 않습니다."
            >
              <RevenueCombo data={bmChart} height={260} ariaLabel="BM별 매출·건수·건당 매출" />
            </ChartCard>
            {/* 활성사용자당 조회·문의 — 리포트 고방 구역과 같은 차트(파생 선 색까지 동일 = 앰버). */}
            <ChartCard
              icon={SpeechIcon}
              title="활성사용자당 조회·문의"
              note="최근 6개월 · 주별(일~토)"
              hint="지점 조회수 ÷ WAU, 지점 문의수 ÷ WAU — 사용자 1인당 '횟수'이지 비율이 아닙니다(1을 넘습니다). 규모가 커질 때 1인당 행동이 유지되는지를 봅니다. 자릿수가 벌어져 좌우 축을 따로 씁니다."
            >
              <TrendDualLine
                data={perUser}
                left={{ key: 'viewsPerUser', name: '조회/사용자', color: MINT }}
                right={{ key: 'inquiriesPerUser', name: '문의/사용자', color: AMBER }}
                fmt={(n) => n.toFixed(2)}
                ariaLabel="활성사용자당 조회·문의 추이"
                height={260}
              />
            </ChartCard>
          </div>
          {/* 채널(소스/매체)별 — 스트림별과 같은 성격의 별도 조회다(합 ≠ 총계). 아래 소스/매체 표는
              기준 주 한 주짜리라 "이 채널이 늘고 있나"를 답하지 못해 추이를 따로 낸다(2026-09-14 요청).
              🚨 여기만 **구역 마지막 줄에 1단**이다(2026-09-14 지정) — 계열이 10개라 2단 폭에서는 범례가
              두 줄로 접히고 아래쪽 계열들이 한 덩어리로 뭉친다. */}
          <ChartCard
            icon={EyeIcon}
            title="채널별 트래픽"
            note={`최근 6개월 · 주별(일~토) · 상위 ${CHANNEL_TREND_TOP}개 소스/매체`}
            hint={`GA4 세션 소스/매체별 주 순 활성 사용자입니다(상위 ${CHANNEL_TREND_TOP}개 — 롱테일은 아래 소스/매체 표에서 봅니다). ⚠️ 유니크 지표라 채널 합이 총 WAU와 다릅니다(한 사람이 두 채널로 들어오면 양쪽에 세어집니다) — 그래서 총계 차트와 별도 카드로 두고, 쌓거나 같은 축에 겹치지 않습니다. 일별 값을 주로 더해 만들 수 없어 주(yearWeek) 단위로 따로 조회합니다. 선을 클릭하면 그 계열만 앰버로 강조되고(다시 클릭하면 해제), 범례를 눌러 계열을 껐다 켤 수 있습니다.`}
          >
            <TrendMultiLine
              data={channelChart.data}
              series={channelChart.series}
              fmt={fmtInt}
              ariaLabel="채널별 주 활성 사용자 추이"
              height={280}
            />
          </ChartCard>
          {/* 스트림 표 — 리포트와 **같은 공용 컴포넌트**(components/dashboard/stream-table.tsx).
              기준 주 7일치다(위 차트는 최근 6개월). 증감은 전주 같은 7일 대비. */}
          <StreamTable
            rows={streamTable}
            prevRows={prevStreamTable}
            prevLabel="전주"
            range={`${activeWeek} ~ ${shiftDays(activeWeek, 6)}`}
            rangeNote="기준 주(아래 표에서 고른 주) 7일치입니다 — 위 차트들(최근 6개월)과 기간이 다릅니다."
            emptyText="그 주 GA4 데이터가 없습니다"
          />
          {/* 소스/매체 표 — 리포트와 같은 공용 TrafficTable(전주 절대값 + 증감 열, 10행 접기). */}
          <TrafficTable
            rows={trafficRows}
            prevLabel="전주"
            note={`${activeWeek} ~ ${shiftDays(activeWeek, 6)}`}
            hint="기준 주 7일치 GA4 세션 소스/매체입니다(전주 열·증감은 그 직전 7일 대비). 활성 사용자는 유니크 지표라 날짜·차원으로 쪼갠 행을 합산해 만들 수 없어 기간마다 따로 집계합니다."
            emptyText="그 주 GA4 데이터가 없습니다"
          />
          {/* 앱 지표 — 기토 주간 지표 5종(GA4 WAU 웹/앱 · 다운로드 · 스토어 활성 · 평점). 고방 › 앱 대시보드와
              같은 표·같은 데이터(use-app-metrics). 행 클릭 = 화면 기준 주 공유. */}
          <AppMetricsCard data={appMetrics} lastFull={lastFull} activeWeek={activeWeek} onFocusWeek={focusRow} />
        </ScopeBlock>

        <ScopeBlock label="U사장님" color={MINT_DARK} note="지점 퍼널(U사장님 + U중개사 합) · 애드 매출">
          <ScopeAchievement
            targets={targets}
            txns={txns}
            targetHistory={targetHistory}
            from={activeWeek}
            to={shiftDays(activeWeek, 6)}
            periodLabel={`${activeWeek.slice(5)}~${shiftDays(activeWeek, 6).slice(5)}`}
            unitNote="그 주"
            only="uboss"
            showCaption={false}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={SpeechIcon}
              title="조회·문의·문의율 (통합)"
              note="최근 6개월 · 주별(일~토) · U사장님 + U중개사 합"
              hint="지점 조회 막대 · 지점 문의 선 · 문의율(문의÷조회) 점선. 두 채널(U사장님 + U중개사)을 합한 값입니다 — 채널별로 가른 건 아래 두 카드입니다. ⚠️ 이 '문의율'의 분모는 조회수입니다(고방 지표의 문의율은 분모가 MAU라 다른 지표입니다)."
            >
              <FunnelCombo data={funnel} height={280} ariaLabel="주별 조회·문의·문의율 추이" />
            </ChartCard>
            <ChartCard
              icon={WonIcon}
              title="매출·판매 건수·객단가"
              note="최근 6개월 · 주별(일~토) · U사장님 애드"
              hint="애드 매출 막대 · 판매 건수 선 · 객단가(매출÷판매 건수) 점선. 판매 건수 = 지점이 광고상품을 산 건수(u-ceo 수집)이고, x축은 매출이 있는 주만입니다. ⚠️ 애드 매출은 토스PG 주차 정산 1행으로 들어와 정산일이 든 주에 몰립니다 — 주 단위 톱니는 실제 변동이 아닙니다."
            >
              <RevenueCombo data={ubossRevenue} height={280} ariaLabel="주별 애드 매출·판매 건수·객단가 추이" />
            </ChartCard>
          </div>
          {/* 채널 구분(U사장님/U중개사) — 리포트·U사장님 지표 화면과 같은 채널마다 FunnelCombo 1개 방식
              (2026-08-04 합집합 — 리포트에만 있던 카드 2장). 두 차트는 축이 따로라 규모 비교용이 아니다. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={SpeechIcon}
              title="U사장님 (조회·문의·문의율)"
              note="최근 6개월 · 주별(일~토)"
              hint="조회 막대 · 문의 선 · 문의율(문의÷조회) 점선. ⚠️ 옆 U중개사 카드와 축이 따로라 두 차트의 높이를 서로 견주면 안 됩니다(규모가 4~7배 벌어져 한 축에 담으면 작은 쪽이 바닥에 눌립니다)."
            >
              <FunnelCombo data={channelFunnel.usajang} height={260} ariaLabel="U사장님 조회·문의·문의율 추이" />
            </ChartCard>
            <ChartCard
              icon={SpeechIcon}
              title="U중개사 (조회·문의·문의율)"
              note="최근 6개월 · 주별(일~토)"
              hint={`조회 막대 · 문의 선 · 문의율(문의÷조회) 점선. U중개사는 u-agent.kr이라는 별개 서비스이고 정본도 그 API입니다(u-ceo의 웨스테이 값이 아닙니다).${ujunggaeInquiryStart ? ` 문의 데이터는 ${ujunggaeInquiryStart} 주부터 있습니다 — 그 앞은 0이 아니라 '없음'입니다.` : ''} ⚠️ 옆 U사장님 카드와 축이 따로입니다.`}
            >
              <FunnelCombo data={channelFunnel.ujunggae} height={260} ariaLabel="U중개사 조회·문의·문의율 추이" />
            </ChartCard>
          </div>
        </ScopeBlock>
      </div>

      {/* ③ 주 격자표 — 최신이 위, 값+대비(전년동주/전주)를 항상 나란히 */}
      <section className="mb-6 rounded-xl border border-border bg-surface">
        <header className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-3">
          <h2 className="text-base font-semibold text-ink">
            주별 지표
            <span className="ml-2 text-[12px] font-normal text-muted">
              최신이 위 · {tableExpanded ? allWeeks.length : Math.min(TABLE_FOLD, allWeeks.length)}/{allWeeks.length}주
              <InfoTip text="표기: `·` = 그 주에 데이터 없음(0이 아님), 전년동주 = 364일(52주) 전 같은 일~토 구간. 진행 중인 주(일~토가 안 끝난 주)는 반쪽 값이라 맨 위에 참고용으로만 얹고 대비는 계산하지 않습니다." />
            </span>
          </h2>
          {/* 컨트롤 무리 = [나가기·액션] │ [보기 토글…] │ [조회 조건] — 월간 흐름 표 헤더와 **같은 순서**
              (컨트롤 어휘 ②·④-b·⑤·⑥, controls.tsx). 2026-08-05 일관성 감사에서 고친 것 셋:
               ① 토글 2개가 테두리 버튼(②)이라 액션과 생김새가 같았다 → ⑥ ToggleButton
               ② '원장 시트'가 버튼 테두리를 달고 있었다(어휘 ④-b는 테두리 금지, 화살표로 나감을 말한다)
                  → 공용 `ExternalLink`로 교체(로컬 클래스 삭제)
               ③ 드롭다운이 맨 앞이라 월간 흐름과 순서가 반대였다 → 조회 조건은 맨 뒤 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 원장 대조용 바로가기 — "숫자가 안 맞는다"를 확인하려면 시트를 열어야 한다(2026-08-03). */}
            <span className="inline-flex items-center gap-1">
              <ExternalLink href="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit">
                원장 시트
              </ExternalLink>
              <InfoTip text="정본 = 일별 탭. 조회·문의는 U사장님+U중개사 합이라 u-ceo 화면의 단독 값과 다릅니다." />
            </span>
            {/* 적재는 마감 할 일이 아니라 **보존 관리**다(화면 숫자는 GA4에서 직접 온다) → 표 헤더에 둔다.
                14개월이 지나면 GA4에서 사라지므로 원장에 쌓아 둬야 장기 시계열·전년동주가 유지된다. */}
            {wauMissing && <Ga4CollectButton onDone={reload} />}
            <span aria-hidden className="h-5 w-px bg-ink/[0.14]" />
            {/* 진행 중인 주 행 — 기본 접힘. 반쪽 값이라 대비도 강조도 없는 행이 맨 위를 먹고 있었다. */}
            {inProgressRow && (
              <ToggleButton
                on={inProgressOpen}
                onToggle={() => setInProgressOpen((v) => !v)}
                title="진행 중인 주(반쪽 값) 행을 표에 넣거나 뺍니다"
              >
                진행 중 주
              </ToggleButton>
            )}
            {allWeeks.length > TABLE_FOLD && (
              <ToggleButton
                on={tableExpanded}
                onToggle={() => setTableExpanded((v) => !v)}
                title="표에 보이는 주 수를 늘리거나 줄입니다"
              >
                전체 {allWeeks.length}주
              </ToggleButton>
            )}
            <span aria-hidden className="h-5 w-px bg-ink/[0.14]" />
            {/* 🚨 **무엇을 고르는 컨트롤인지 닫힌 상태에 박는다**(2026-08-03 지적 "[전년동주/전주] 탭이
                비교 기준탭이라는거에 대한 명시필요함"). 구 구성은 라벨 없는 세그먼트 두 개라 표를
                거르는 필터인지 대비 기준인지 눌러 보고 알아야 했다 → **월간 흐름과 같은 `대비`
                드롭다운**으로 통일(어드민 조회 조건은 전부 드롭다운 + 축 이름 병기). 같은 격자를 쓰는
                두 화면이 컨트롤 형태까지 같아야 표 읽는 법을 다시 익히지 않는다. */}
            <SelectMenu
              label="대비"
              ariaLabel="값 옆에 붙일 대비 기준 선택"
              value={mode}
              options={[
                { value: 'yoy', label: '전년동주' },
                { value: 'mom', label: '전주' },
              ]}
              onChange={(v) => setModeState(v as DeltaMode)}
              width="w-[132px]"
            />
          </div>
        </header>
        {/* 표에 자체 스크롤 — 기준 행(위)·비교 행(아래)을 고정해 한 화면에 두기 위함(월간 흐름과 동일) */}
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full border-collapse text-right text-[13px]">
            {/* ⚠️ 그룹(thead)에도 배경을 깐다 — rowSpan 셀 때문에 thead 박스가 두 행 합보다 커서
                셀이 못 덮는 띠가 남고, 그 틈으로 스크롤되는 숫자가 비쳤다(실측 9px). */}
            <thead ref={setTheadEl} className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--color-border)]">
              <tr className="text-[12px] text-muted">
                <th rowSpan={2} className="sticky left-0 z-10 w-[104px] min-w-[104px] border-r border-border bg-surface px-3 py-2 text-left align-bottom text-[12px] font-semibold text-ink-soft whitespace-nowrap">
                  주(일요일 시작)
                </th>
                {WEEK_METRIC_META.map((meta) => (
                  <th key={meta.key} colSpan={2} className="border-l border-hairline bg-surface px-2.5 py-2 font-medium whitespace-nowrap">
                    {meta.label}
                    {meta.scope && <span className="ml-1 text-[10px] font-normal text-muted/80">{meta.scope}</span>}
                    {meta.hint && <InfoTip text={meta.hint} />}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-hairline text-[11px] text-muted">
                {WEEK_METRIC_META.map((meta) => (
                  <Fragment key={meta.key}>
                    <th className="border-l border-hairline bg-surface px-2.5 py-1.5 font-medium">값</th>
                    <th className="bg-surface px-2.5 py-1.5 font-medium">
                      <span className="inline-flex items-center justify-end gap-1">
                        {mode === 'yoy' ? (
                          <YoyIcon size={11} className="text-primary/70" />
                        ) : (
                          <PrevPeriodIcon size={11} className="text-ink-mute/80" />
                        )}
                        {mode === 'yoy' ? '전년동주' : '전주'}
                      </span>
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ⚠️ 진행 중인 주는 **강조하지 않는다** — 반쪽 값이라 결론으로 읽히면 안 된다. 앰버는 이제
                  '기준' 색이므로(월간과 통일) 이 행은 흐린 회색으로 낮춘다. */}
              {inProgressRow && inProgressOpen && (
                <tr className="border-b border-dashed border-border bg-ink/[0.015] text-muted">
                  <th className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2 text-left text-[13.5px] font-semibold text-muted whitespace-nowrap">
                    {inProgressRow.weekStart.slice(5)}
                    <span className="ml-1 rounded bg-ink/[0.06] px-1 py-0.5 text-[10px] font-medium text-muted">진행 중</span>
                  </th>
                  {WEEK_METRIC_META.map((meta) => (
                    <Fragment key={meta.key}>
                      <td className="border-l border-hairline px-2.5 py-2 tabular-nums whitespace-nowrap text-ink">
                        {fmtBy(meta.key, inProgressRow[meta.key])}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-muted/60">
                        · <InfoTip text="진행 중인 주라 대비를 내지 않습니다" />
                      </td>
                    </Fragment>
                  ))}
                </tr>
              )}
              {visibleRowsDesc.map((r: WeekRow, i: number) => {
                const isBase = r.weekStart === activeWeek;
                const isCmp = r.weekStart === compareWeek;
                // 앞 행과 이어지지 않으면(접힌 구간을 건너뛰고 덧댄 비교 행) 끊긴 걸 표시한다.
                const gap = i > 0 && shiftDays(visibleRowsDesc[i - 1].weekStart, -7) !== r.weekStart;
                const pin = isBase
                  ? 'sticky z-20 shadow-[0_1px_0_var(--color-border)]'
                  : isCmp
                    ? 'sticky bottom-0 z-20 shadow-[0_-1px_0_var(--color-border)]'
                    : '';
                const pinWeek = isBase
                  ? 'sticky left-0 z-30 shadow-[0_1px_0_var(--color-border)]'
                  : isCmp
                    ? 'sticky left-0 bottom-0 z-30 shadow-[0_-1px_0_var(--color-border)]'
                    : 'sticky left-0 z-10';
                const pinTop = isBase ? { top: theadH } : undefined;
                const cellBg = isBase ? BASE_CELL : isCmp ? CMP_CELL : '';
                const deltaBg = isBase ? BASE_DELTA : isCmp ? CMP_DELTA : '';
                return (
                <tr
                  key={r.weekStart}
                  onClick={() => focusRow(r.weekStart)}
                  title={`클릭하면 ${r.weekStart}주와 비교 대상(${mode === 'yoy' ? '전년동주' : '전주'})을 함께 강조합니다`}
                  className={`cursor-pointer border-t border-hairline transition-colors ${
                    gap ? 'border-t-2 border-dashed border-border' : ''
                  } ${isBase || isCmp ? '' : 'hover:bg-hairline/60'}`}
                >
                  <th
                    style={pinTop}
                    className={`${pinWeek} border-r border-border px-3 py-2 text-left text-[13.5px] whitespace-nowrap text-ink ${
                      isBase ? `${BASE_CELL} font-bold` : isCmp ? `${CMP_CELL} font-semibold` : 'bg-surface font-semibold'
                    }`}
                  >
                    {r.weekStart.slice(5)}
                    {isBase && (
                      <span className="ml-1 rounded bg-accent2 px-1 py-0.5 text-[10px] font-semibold text-white">기준</span>
                    )}
                    {isCmp && (
                      <span className="ml-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                        {mode === 'yoy' ? '전년동주' : '전주'}
                      </span>
                    )}
                    {gap && <InfoTip text="사이 주는 접혀 있습니다 — 비교 대상 한 줄만 끌어와 붙였습니다. [전체보기]로 펼칩니다." />}
                  </th>
                  {WEEK_METRIC_META.map((meta) => (
                    <Fragment key={meta.key}>
                      <td
                        style={pinTop}
                        className={`border-l border-hairline px-2.5 py-2 tabular-nums whitespace-nowrap text-ink ${pin} ${cellBg}`}
                      >
                        {fmtBy(meta.key, r[meta.key])}
                      </td>
                      <td style={pinTop} className={`px-2.5 py-2 tabular-nums whitespace-nowrap ${pin} ${deltaBg}`}>
                        <Delta
                          parts={deltaOfWeek(rows, r.weekStart, meta.key, mode === 'yoy' ? -52 : -1)}
                          fmt={(n) => fmtBy(meta.key, n)}
                        />
                      </td>
                    </Fragment>
                  ))}
                </tr>
                );
              })}
              {!visibleRowsDesc.length && !inProgressRow && (
                <tr>
                  <td colSpan={WEEK_METRIC_META.length * 2 + 1} className="px-3 py-8 text-center text-muted">
                    아직 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </>
  );
}
