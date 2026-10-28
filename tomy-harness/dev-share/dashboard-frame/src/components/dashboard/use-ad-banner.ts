'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdBannerRow } from '@/lib/ad-banner';

export type AdBannerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: AdBannerRow[]; source: 'sheet' | 'fixture'; sheetUrl: string | null };

type ApiResponse = {
  ok: boolean;
  source?: 'sheet' | 'fixture';
  sheetUrl?: string | null;
  rows?: AdBannerRow[];
  message?: string;
};

// ad_banner 데이터 로딩 공통 훅 (대시보드·원본데이터 공용).
export function useAdBanner() {
  const [state, setState] = useState<AdBannerState>({ status: 'loading' });
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (fresh = false) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/ad-banner${fresh ? '?fresh=1' : ''}`, { cache: 'no-store' });
      const data: ApiResponse = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok || !data.rows) {
        setState({ status: 'error', message: data.message || '데이터를 불러오지 못했습니다.' });
        return;
      }
      setState({
        status: 'ready',
        rows: data.rows,
        source: data.source ?? 'sheet',
        sheetUrl: data.sheetUrl ?? null,
      });
      setUpdatedAt(new Date());
    } catch {
      setState({ status: 'error', message: '네트워크 오류로 데이터를 불러오지 못했습니다.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { state, updatedAt, load, reload: () => load(true) };
}
