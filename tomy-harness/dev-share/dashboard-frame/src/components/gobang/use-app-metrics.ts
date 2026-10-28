'use client';

// 앱 지표 데이터 한 벌 — 주간 흐름(고방 구역 표)과 앱 대시보드(차트+표)가 같이 쓴다(2026-10-16).
// 두 화면이 각자 원장을 읽고 계산하면 같은 주의 숫자가 화면마다 갈린다 → 계산은 lib/app-store-weekly.ts,
// 읽기·저장은 여기 한 곳.
//  · 스트림별 주 순사용자 = 원장 `주_WAU_스트림`(전년동주용 이력) 위에 GA4 실시간(`/api/metrics/weekly-wau`)
//  · 스토어 값 = 원장 `주_앱_스토어`
// `live`를 넘기면(주간 흐름은 이미 받아 둔 값이 있다) GA4 조회를 건너뛴다. URL이 use-weekly와 같아
// 넘기지 않아도 클라이언트 캐시를 공유한다.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cachedJson } from '@/lib/client-cache';
import { shiftDays } from '@/lib/period';
import { streamWauSeries, type MauStreamPoint, type WeeklyWauStream } from '@/lib/metrics';
import type { AppRatings } from '@/lib/app-store';
import {
  STORE_TAB,
  buildAppWeeks,
  mergeStreamWeeks,
  parseStoreRows,
  type AppWeekRow,
  type StoreValues,
} from '@/lib/app-store-weekly';

// 스토어 원장은 콘솔 백필로 2020-10-04주부터 있다(2026-10-18). 이보다 늦추면 과거 연도가 화면에서 사라진다.
const LEDGER_FROM = '2020-10-01';
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type AppMetricsData = {
  rows: AppWeekRow[];
  byWeek: Map<string, AppWeekRow>;
  store: Map<string, StoreValues>;
  ratings: AppRatings | null;
  loading: boolean;
  loadErr: string;
  /** `주_앱_스토어`에 행을 쓰고 원장을 다시 읽는다. */
  saveRows: (rows: Record<string, string>[]) => Promise<void>;
};

export function useAppMetrics({ lastFull, live }: { lastFull: string; live?: MauStreamPoint[] }): AppMetricsData {
  const [ratings, setRatings] = useState<AppRatings | null>(null);
  useEffect(() => {
    cachedJson<AppRatings & { ok: boolean }>('/api/metrics/app-ratings')
      .then((r) => setRatings(r?.ok ? r : null))
      .catch(() => setRatings(null));
  }, []);

  const [fetchedLive, setFetchedLive] = useState<MauStreamPoint[]>([]);
  useEffect(() => {
    if (live) return;
    const to = iso(new Date(Date.now() - DAY));
    cachedJson<{ byStream?: unknown }>(`/api/metrics/weekly-wau?to=${to}`)
      .then((r) => setFetchedLive(streamWauSeries(Array.isArray(r?.byStream) ? (r.byStream as WeeklyWauStream[]) : [])))
      .catch(() => setFetchedLive([]));
  }, [live]);

  const [ledger, setLedger] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const ledgerUrl = useMemo(
    () =>
      `/api/traffic?tabs=${encodeURIComponent(`주_WAU_스트림,${STORE_TAB}`)}&from=${LEDGER_FROM}&to=${shiftDays(lastFull, 6)}`,
    [lastFull],
  );
  const loadLedger = useCallback(
    (fresh = false) =>
      cachedJson<{ ok: boolean; message?: string; tabs?: Record<string, Record<string, unknown>[]> }>(ledgerUrl, { fresh })
        .then((r) => {
          if (!r?.ok) throw new Error(r?.message || '지표 원장을 읽지 못했습니다');
          setLedger(r.tabs ?? {});
          setLoadErr('');
        })
        .catch((e) => setLoadErr(e instanceof Error ? e.message : '지표 원장을 읽지 못했습니다'))
        .finally(() => setLoading(false)),
    [ledgerUrl],
  );
  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const series = live ?? fetchedLive;
  const store = useMemo(() => parseStoreRows(ledger[STORE_TAB] ?? []), [ledger]);
  const rows = useMemo(
    () => buildAppWeeks(mergeStreamWeeks(ledger['주_WAU_스트림'] ?? [], series), store, lastFull),
    [ledger, series, store, lastFull],
  );
  const byWeek = useMemo(() => new Map(rows.map((r) => [r.week, r])), [rows]);

  const saveRows = useCallback(
    async (toSave: Record<string, string>[]) => {
      const res = await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tab: STORE_TAB, rows: toSave }),
      }).then((x) => x.json());
      if (!res?.ok) throw new Error(res?.message || res?.error || '저장 실패');
      await loadLedger(true);
    },
    [loadLedger],
  );

  return { rows, byWeek, store, ratings, loading, loadErr, saveRows };
}
