'use client';

import { useCallback, useEffect, useState } from 'react';
import { cachedJson, useJsonVersion } from '@/lib/client-cache';
import { REVENUE_TXNS } from '@/data/revenue-txns';
import { REVENUE_TARGETS } from '@/data/revenue-targets';
import type { RevenueTxn, MonthlyTarget, TargetHistoryEntry } from '@/lib/revenue';

export type RevenueSource = 'gas' | 'unset' | '';

type State = {
  txns: RevenueTxn[];
  targets: MonthlyTarget[];
  targetHistory: TargetHistoryEntry[];
  source: RevenueSource;
  loading: boolean;
  err: string;
};

// /api/revenue 에서 건별 거래 + 목표 매트릭스(+개정 이력)를 로드. 실패/미연결 시 픽스처 폴백.
// dashboard·raw·progress·targets 화면 공통 진입점.
export function useRevenue() {
  const [state, setState] = useState<State>({
    txns: REVENUE_TXNS,
    targets: REVENUE_TARGETS,
    targetHistory: [],
    source: '',
    loading: true,
    err: '',
  });

  // fresh=true(새로고침 버튼)면 서버 캐시 우회해 최신 시트를 강제로 당긴다.
  // 초기/탭 진입 로드는 fresh=false → **클라이언트 캐시 히트로 네트워크 0**(client-cache.ts).
  const load = useCallback(async (fresh = false) => {
    setState((s) => ({ ...s, loading: true, err: '' }));
    try {
      const data = await cachedJson<{
        ok?: boolean;
        txns?: RevenueTxn[];
        targets?: MonthlyTarget[];
        targetHistory?: TargetHistoryEntry[];
        source?: RevenueSource;
        message?: string;
      }>(`/api/revenue${fresh ? '?fresh=1' : ''}`);
      if (data?.ok) {
        setState({
          txns: data.txns ?? [],
          targets: data.targets?.length ? data.targets : REVENUE_TARGETS,
          targetHistory: data.targetHistory ?? [],
          source: data.source ?? '',
          loading: false,
          err: '',
        });
      } else {
        setState((s) => ({ ...s, loading: false, err: data?.message || '매출 데이터를 불러오지 못했습니다.' }));
      }
    } catch {
      setState((s) => ({ ...s, loading: false, err: '데이터 요청에 실패했습니다.' }));
    }
  }, []);

  // version = 배경 갱신으로 원장 내용이 바뀌면 오른다 → 그때만 다시 조립한다(캐시 히트라 네트워크 0).
  const version = useJsonVersion(['/api/revenue']);
  useEffect(() => {
    load(false);
  }, [load, version]);

  const setTxns = useCallback((updater: (prev: RevenueTxn[]) => RevenueTxn[]) => {
    setState((s) => ({ ...s, txns: updater(s.txns) }));
  }, []);

  const setTargets = useCallback((updater: (prev: MonthlyTarget[]) => MonthlyTarget[]) => {
    setState((s) => ({ ...s, targets: updater(s.targets) }));
  }, []);

  const setTargetHistory = useCallback(
    (updater: (prev: TargetHistoryEntry[]) => TargetHistoryEntry[]) => {
      setState((s) => ({ ...s, targetHistory: updater(s.targetHistory) }));
    },
    [],
  );

  return { ...state, reload: () => load(true), setTxns, setTargets, setTargetHistory };
}
