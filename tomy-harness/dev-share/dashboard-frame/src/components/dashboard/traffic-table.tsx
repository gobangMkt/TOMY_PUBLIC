'use client';

// 소스/매체별 트래픽 표 — **리포트와 주간 흐름이 같은 한 벌을 쓴다**(2026-08-04 공용화).
// 그전엔 주간 흐름이 로컬 복제본(활성·신규·세션 3열, 상위 10 고정)이라 전기간 절대값·증감 열이
// 리포트에만 있었다 — 같은 표가 화면마다 다르게 읽히는 게 stream-table을 공용화한 것과 같은 문제.
// 증감 형식은 전 화면 공통(Delta: 비율 본문 + 절대값 괄호), 계산 정본은 trafficDelta.

import { useState } from 'react';
import InfoTip from '@/components/ui/info-tip';
import { Delta } from '@/components/dashboard/delta';
import { fmtInt } from '@/lib/format';
import { trafficDelta, type TrafficRow } from '@/lib/overview-report';
import { ColumnsIcon } from '@/components/icons';

// GA4 소스/매체는 referral 롱테일이 수백 개다. 10행만 펼쳐 두고 접는다.
// ⚠️ 접기는 **표시 전용**(정렬은 접기 전 전체 기준). 리포트 저장 파일에는 전 행이 실린다.
const ROW_FOLD = 10;

export default function TrafficTable({
  rows,
  prevLabel,
  note,
  hint = 'GA4 sessionSourceMedium을 선택 기간 하나로 조회한 값. 활성 사용자는 유니크 지표라 날짜·차원으로 쪼갠 행을 합산해 만들 수 없다(그래서 기간마다 따로 조회한다).',
  emptyText,
}: {
  rows: TrafficRow[];
  /** 증감 열의 분모가 되는 전기간 이름('전주'·'전기간' 등). */
  prevLabel: string;
  /** 머리 오른쪽 범위 꼬리표(예: 기준 주 날짜). 설명은 hint로. */
  note?: string;
  hint?: string;
  /** 행이 없을 때 표시할 문구 — 생략하면 표 자체를 그리지 않는다(리포트 동작). */
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length && !emptyText) return null;
  const shown = expanded ? rows : rows.slice(0, ROW_FOLD);
  const hidden = Math.max(0, rows.length - ROW_FOLD);
  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <ColumnsIcon size={16} />
          소스/매체별 트래픽
          <InfoTip text={hint} />
        </h4>
        <div className="flex items-center gap-3">
          {note && <span className="text-xs text-ink-mute">{note}</span>}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-ink-mute underline-offset-2 transition-colors hover:text-ink-soft hover:underline"
            >
              {expanded ? '접기' : `${hidden}개 더 보기`}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-mute">
              <th className="py-2 pl-4 pr-2 font-medium">소스 / 매체</th>
              <th className="py-2 pr-3 text-right font-medium">활성</th>
              {/* 전기간 절대값 열 — 증감만 있으면 "▲ 40%"가 4명인지 4만명인지 모른다(2026-08-03). */}
              <th className="py-2 pr-3 text-right font-medium">{prevLabel}</th>
              <th className="py-2 pr-3 text-right font-medium">증감</th>
              <th className="py-2 pr-3 text-right font-medium">신규</th>
              <th className="py-2 pr-4 text-right font-medium">세션</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              // 전기간에 없던 소스는 prevActive=null → '신규'로 쓴다(0으로 두면 -100%로 보인다).
              const { diff, ratio } = trafficDelta(r.active, r.prevActive);
              return (
                <tr key={r.key} className="border-b border-hairline last:border-0">
                  <td className="max-w-[280px] py-2 pl-4 pr-2">
                    <span className="block truncate text-ink-soft" title={r.label}>
                      {r.label}
                    </span>
                  </td>
                  <td className="tabular py-2 pr-3 text-right text-ink">{fmtInt(r.active)}</td>
                  <td className="tabular py-2 pr-3 text-right text-ink-mute">
                    {r.prevActive == null ? '—' : fmtInt(r.prevActive)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {/* 전 화면 공통 형식 = 비율 본문 + 절대값 괄호(components/dashboard/delta.tsx). */}
                    {diff == null ? (
                      <span className="text-ink-mute">신규</span>
                    ) : (
                      <Delta parts={{ ratio, diff }} />
                    )}
                  </td>
                  <td className="tabular py-2 pr-3 text-right text-ink-soft">{fmtInt(r.new)}</td>
                  <td className="tabular py-2 pr-4 text-right text-ink-soft">{fmtInt(r.sessions)}</td>
                </tr>
              );
            })}
            {!rows.length && emptyText && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-mute">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
