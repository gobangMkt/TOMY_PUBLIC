'use client';

// 주간 흐름 데이터 훅 — WAU + U사장님 지표 원장(u-ceo) + 매출 원장을 주 키(일요일 시작)로 합친다.
//
// 🚨 **WAU 소스는 둘이고 GA4가 우선이다**(2026-08-03 교정, 지적 "GA4 트래픽은 알아서 딸려오는 건데 왜
// 적재 눌러야 함?"). 그전엔 적재 탭(`주_WAU`)만 읽어서, 적재 배치가 멈추면(로컬 어드민이라 GAS
// 시간트리거가 호출할 대상이 없다) **GA4에 값이 그대로 있는데도 최근 주가 비었고** 사람이 [적재]를
// 눌러 메워야 했다. 트래픽 대시보드·리포트는 처음부터 GA4를 직접 읽는다 — 이제 이 화면도 같다:
//   · `/api/metrics/weekly-wau` = GA4 직결(최근 400일). **최근 구간의 정본.**
//   · `/api/traffic?tabs=주_WAU` = 적재 원장. GA4 무료 보존 14개월보다 **옛 과거** 담당.
// 병합은 '같은 주가 양쪽에 있으면 GA4 채택'이다(GA4가 원본이고 적재본은 그 사본이다).
import { useEffect, useMemo, useState } from 'react';
import { cachedJson, useJsonVersion } from '@/lib/client-cache';
import { useInquiries, maxInquiryDate } from '@/lib/use-inquiries';
import { useRevenue } from '@/lib/use-revenue';
import { seriesRevenue } from '@/lib/revenue';
import { buildWeeklyMatrix, resolveWeekLedger, type WeekRow } from '@/lib/weekly';
import {
  streamWauSeries,
  type MetricRecord,
  type WeeklyWauChannel,
  type WeeklyWauStream,
} from '@/lib/metrics';
import { todayKST } from '@/lib/period';

const FROM = '2023-01-01'; // 지표 원장 일별·주간 백필 시작(CLAUDE.md 정본 참조)
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

type WauTabRow = { week_start?: string; active?: string | number };

export function useWeekly() {
  const inquiryRange = useMemo(() => ({ from: FROM, to: maxInquiryDate() }), []);
  // daily = 채널별(U사장님/U중개사) 퍼널 차트용 — 리포트와 같은 sliceMetrics→bucketMetrics 경로
  // (2026-08-04 합집합: 리포트에만 있던 채널별 카드 2장을 이 화면에도 넣는다).
  const { manual, daily, source: iSource, loading: iLoading, reload: reloadInquiries } = useInquiries(inquiryRange);
  // 🚨 주 지표 정본 = **일별 원장**(주 원장은 일별이 없는 주의 폴백) — 리포트가 타는 `sliceMetrics`와
  // 같은 규칙으로 맞춘다. 2026-09-07까지 이 화면만 주 원장 직결이라 같은 주 판매 건수가 리포트
  // 92건 / 여기 77건으로 갈렸다. 판정은 `resolveWeekLedger` 한 벌만 쓴다(화면에서 다시 짜지 말 것).
  const weeks = useMemo(() => resolveWeekLedger(daily, manual), [daily, manual]);
  const { txns, targets, targetHistory, source: rSource, loading: rLoading, reload: reloadRevenue } = useRevenue();

  const [wauRows, setWauRows] = useState<{ weekStart: string; wau: number }[]>([]);
  // 고방 구역이 쓰는 GA4 상세(2026-08-03 요청 "WAU, 스트림별 WAU 넣고 / 새사용자·재사용자·재사용률
  // 스트림표도 넣어"). 스트림 WAU는 **총계와 별개 조회**다(유니크라 스트림 합 ≠ 총계).
  const [streamWau, setStreamWau] = useState<WeeklyWauStream[]>([]);
  // 채널(소스/매체)별 주 WAU — 스트림별과 같은 이유로 **별도 조회**다(유니크라 채널 합 ≠ 총계).
  const [channelWau, setChannelWau] = useState<WeeklyWauChannel[]>([]);
  const [ga4Recs, setGa4Recs] = useState<MetricRecord[]>([]);
  const [wauLoading, setWauLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const version = useJsonVersion(['/api/traffic', '/api/metrics']);

  useEffect(() => {
    let alive = true;
    setWauLoading(true);
    const to = iso(new Date(Date.now() - DAY));
    Promise.all([
      cachedJson<{ tabs?: Record<string, WauTabRow[]> }>(
        `/api/traffic?tabs=${encodeURIComponent('주_WAU')}&from=${FROM}&to=${to}${nonce > 0 ? '&fresh=1' : ''}`,
      ).catch(() => null),
      cachedJson<{ weeks?: unknown; byStream?: unknown; byChannel?: unknown }>(`/api/metrics/weekly-wau?to=${to}`).catch(() => null),
      // 스트림 표(활성·신규·재방문·재방문율·세션)용 일별 레코드 — 최근 26주(182일)만.
      // ⚠️ 넓게 받으면 GA4 왕복이 길어진다. 표는 화면에서 **기준 주만 필터**해 `tableBy`로 만든다.
      cachedJson<{ current?: unknown }>(
        `/api/metrics?from=${iso(new Date(Date.parse(`${to}T00:00:00Z`) - 182 * DAY))}&to=${to}`,
      ).catch(() => null),
    ])
      .then(([traffic, ga4, metrics]) => {
        if (!alive) return;
        const tabs = (traffic?.tabs ?? {}) as Record<string, WauTabRow[]>;
        // 적재 원장 먼저 깔고 → GA4로 덮는다(같은 주는 GA4가 이긴다).
        const by = new Map<string, number>();
        for (const r of tabs['주_WAU'] ?? []) {
          const key = String(r.week_start ?? '');
          if (key) by.set(key, Number(r.active ?? 0));
        }
        const live = Array.isArray(ga4?.weeks) ? (ga4.weeks as { weekStart?: string; wau?: number }[]) : [];
        for (const w of live) {
          const key = String(w.weekStart ?? '');
          // ⚠️ 0은 버린다 — GA4가 아직 집계하지 않은 주가 0으로 와서 적재된 실적을 덮으면 급락으로 보인다.
          if (key && Number(w.wau ?? 0) > 0) by.set(key, Number(w.wau));
        }
        setWauRows([...by.entries()].map(([weekStart, wau]) => ({ weekStart, wau })).sort((a, c) => (a.weekStart < c.weekStart ? -1 : 1)));
        setStreamWau(Array.isArray(ga4?.byStream) ? (ga4.byStream as WeeklyWauStream[]) : []);
        setChannelWau(Array.isArray(ga4?.byChannel) ? (ga4.byChannel as WeeklyWauChannel[]) : []);
        setGa4Recs(Array.isArray(metrics?.current) ? (metrics.current as MetricRecord[]) : []);
      })
      .finally(() => {
        if (alive) setWauLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nonce, version]);

  const rows = useMemo<WeekRow[]>(() => {
    const revenueByWeek = new Map<string, number>();
    seriesRevenue(txns, 'week').forEach((p) => revenueByWeek.set(p.key, p.revenue));
    return buildWeeklyMatrix({ weeklyWau: wauRows, weeks, revenueByWeek, today: todayKST() });
  }, [wauRows, weeks, txns]);

  // 스트림별 주 WAU 시계열(차트용) — 계산 정본은 lib/metrics.ts(화면에서 다시 짜지 말 것).
  const streamSeries = useMemo(() => streamWauSeries(streamWau), [streamWau]);
  // 채널은 **창(최근 26주)을 자른 뒤** 상위 N을 뽑아야 순위가 맞다(창 밖 옛 채널이 끼면 안 된다)
  // → 창을 아는 화면이 `topChannelsOf`·`channelWauSeries`(lib 정본)로 만든다. 여기선 원본만 넘긴다.
  const loading = iLoading || rLoading || wauLoading;
  const isSample = iSource === 'fixture' || iSource === '' || rSource === 'unset';

  const reload = () => {
    reloadInquiries();
    reloadRevenue();
    setNonce((n) => n + 1);
  };

  // 매출 저장 직후엔 원장만 다시 받으면 된다(GA4 `주_WAU`·지표 원장은 안 바뀌었다) — 셋을 다
  // 다시 부르면 저장 한 번에 콜드 왕복 3개가 붙는다.
  const reloadRevenueOnly = () => reloadRevenue();

  // targets·txns는 주간 매출 입력(components/overview/weekly-entry.tsx)이 쓴다 — 그 화면이
  // useRevenue를 또 호출하면 같은 원장을 두 번 받는다.
  return {
    rows,
    weeks,
    weeklyWau: wauRows,
    daily,
    targets,
    targetHistory,
    txns,
    loading,
    isSample,
    streamSeries,
    channelWau,
    ga4Recs,
    hasWau: wauRows.length > 0,
    reload,
    reloadRevenueOnly,
  };
}
