'use client';

import { useCallback, useEffect, useState } from 'react';
import { cachedJson, useJsonVersion } from '@/lib/client-cache';
import { INQUIRY_FIXTURE, type WeeklyInquiry, type DailyInquiry } from '@/lib/inquiries';

export type InquirySource = 'gas' | 'fixture' | '';
export type Range = { from: string; to: string };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

// 문의수 기본 기간 = 최근 약 12주(84일, 어제 기준). 최소 = 1년 전.
export function defaultInquiryRange(): Range {
  const to = new Date(Date.now() - DAY);
  const from = new Date(to.getTime() - 83 * DAY);
  return { from: iso(from), to: iso(to) };
}
export const minInquiryDate = () => iso(new Date(Date.now() - 365 * DAY));
export const maxInquiryDate = () => iso(new Date(Date.now() - DAY));

type State = {
  manual: WeeklyInquiry[]; // 주 단위 원장('문의수' 탭) — 수기보정 화면·롤백 안전판
  daily: DailyInquiry[]; // 일별 원장('일별' 탭, 2026-07-28~) — 월·기간 집계의 정본
  ga4: WeeklyInquiry[]; // GA4 inquiry/branch_view (무료 대조용, 조회 전용)
  source: InquirySource;
  loading: boolean;
  err: string;
};

// /api/inquiries 에서 수기(GAS 시트) + GA4 데이터를 로드. 시트 미연결 시 픽스처 폴백.
// 문의수 화면(U사장님/GA4 토글) 공통 진입점. use-metrics/use-revenue 패턴 미러링.
// initialRange — 넓은 기간이 필요한 화면은 마운트 후 setRange로 넓히지 말고 여기로 넘긴다
//   (그러지 않으면 기본 12주로 1회 + 넓힌 기간으로 1회, 콜드 왕복이 2번 난다).
export function useInquiries(initialRange?: Range) {
  const [range, setRange] = useState<Range>(() => initialRange ?? defaultInquiryRange());
  const [state, setState] = useState<State>({
    manual: INQUIRY_FIXTURE,
    daily: [],
    ga4: [],
    source: '',
    loading: true,
    err: '',
  });

  const load = useCallback(async (r: Range, fresh = false) => {
    setState((s) => ({ ...s, loading: true, err: '' }));
    try {
      const qs = new URLSearchParams();
      if (r.from) qs.set('from', r.from);
      if (r.to) qs.set('to', r.to);
      if (fresh) qs.set('fresh', '1');
      const data = await cachedJson<{
        ok?: boolean;
        manual?: WeeklyInquiry[];
        daily?: DailyInquiry[];
        ga4?: WeeklyInquiry[];
        source?: InquirySource;
        message?: string;
      }>(`/api/inquiries?${qs.toString()}`);
      if (data?.ok) {
        setState({
          manual: data.manual ?? [],
          daily: data.daily ?? [],
          ga4: data.ga4 ?? [],
          source: data.source ?? '',
          loading: false,
          err: '',
        });
      } else {
        setState((s) => ({ ...s, loading: false, err: data?.message || '문의수 데이터를 불러오지 못했습니다.' }));
      }
    } catch {
      setState((s) => ({ ...s, loading: false, err: '데이터 요청에 실패했습니다.' }));
    }
  }, []);

  const version = useJsonVersion(['/api/inquiries']);
  useEffect(() => {
    load(range);
  }, [load, range, version]);

  const setManual = useCallback((updater: (prev: WeeklyInquiry[]) => WeeklyInquiry[]) => {
    setState((s) => ({ ...s, manual: updater(s.manual) }));
  }, []);

  return { ...state, range, setRange, reload: () => load(range, true), setManual };
}
