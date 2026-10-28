'use client';

// 스트림별 사용자 표 — 주간 흐름(고방 구역)과 리포트가 **같은 한 벌**을 쓴다(2026-08-04 공용화).
//
// 왜 꺼냈나: 두 화면이 같은 집계(`tableBy(recs,'platform')`)를 각자 그리고 있었다. 전기간 대비를
// 넣으라는 요청에 두 곳을 각각 고치면 형식이 또 갈린다 — 차트·카드·증감 표기를 한 벌로 모은 것과
// 같은 이유(CLAUDE.md §대시보드 공용 조각).
//
// 🚨 **이 표만은 증감을 '숫자 옆 % 한 조각'으로 쓴다**(2026-08-04 사용자 지정: "스트림에선 굳이
// 따로 빼지말고, 숫자 옆에 그냥 %로만 표기"). 전 화면 공통 형식은 `Delta`(비율 + 절대값 괄호,
// 전용 열)지만, 여기서 그렇게 하면 지표 5개마다 [전기간][증감] 두 열이 붙어 **표가 16열**이 된다.
// 스트림은 3행짜리 작은 표라 절대값은 바로 옆 칸(그 지표의 값)에서 읽힌다 — 괄호를 또 붙일 이유가 없다.
// ⚠️ 비율 지표(재방문율)의 증감은 **%p**다(35.6%→38.3%의 증감은 2.7%가 아니라 2.7%p — %로 쓰면
//    증감률과 같은 기호가 되어 서로 헷갈린다). 이건 전 화면 공통 규칙 그대로다.

import { fmtInt, fmtPct, deltaOf, arrowOf, deltaTone } from '@/lib/format';
import type { TableRow } from '@/lib/metrics';
import InfoTip from '@/components/ui/info-tip';

const HINT =
  '재방문율 = 재방문 사용자 ÷ 활성 사용자(GA4가 재방문을 안 줄 때는 활성−신규로 채웁니다). ⚠️ 활성 사용자는 유니크라 스트림 합이 총계보다 큽니다(한 사람이 웹·앱을 함께 쓰면 양쪽에 세어집니다).';

/**
 * 값 옆에 붙는 증감 한 조각. 이전 값이 없거나 0이면(배율 무한대) 아무것도 그리지 않는다 —
 * 자리를 채우려고 '—'를 넣으면 3행짜리 표가 대시밭이 된다.
 * `pp`=비율 지표 → 차이를 %포인트로 낸다.
 */
export function Pct({ cur, prev, pp = false }: { cur: number; prev: number | undefined; pp?: boolean }) {
  if (prev == null) return null;
  if (pp) {
    const diff = cur - prev;
    if (Math.abs(diff) < 0.00005) return null; // 반올림해서 0.0%p면 표기가 의미 없다
    return (
      <span className={`ml-1 whitespace-nowrap text-[11px] ${deltaTone(diff)}`}>
        {arrowOf(diff)}
        {(Math.abs(diff) * 100).toFixed(1)}%p
      </span>
    );
  }
  const { ratio, diff } = deltaOf(cur, prev);
  if (diff == null || ratio == null) return null;
  return (
    <span className={`ml-1 whitespace-nowrap text-[11px] ${deltaTone(diff)}`}>
      {arrowOf(diff)}
      {(Math.abs(ratio) * 100).toFixed(1)}%
    </span>
  );
}

export default function StreamTable({
  rows,
  prevRows,
  range,
  prevLabel = '전주',
  rangeNote,
  hint,
  emptyText = '그 기간 GA4 데이터가 없습니다',
  className = '',
}: {
  rows: TableRow[];
  /** 이전 기간 같은 집계. 없으면 증감 표기를 아예 내지 않는다. */
  prevRows?: TableRow[];
  /** 표가 말하는 기간(머리 오른쪽). */
  range: string;
  /** 증감 기준 이름 — 주간이면 '전주', 월간이면 '전월'. 머리 오른쪽에 한 번만 적는다. */
  prevLabel?: string;
  /** 기간이 위 차트와 다를 때의 안내(툴팁 앞에 붙는다). */
  rangeNote?: string;
  hint?: string;
  emptyText?: string;
  className?: string;
}) {
  // 이전 기간에 없던 스트림은 비교 자체가 불가 → 그 행만 증감이 빠진다(0으로 두면 ▲∞가 된다).
  const prev = new Map((prevRows ?? []).map((r) => [r.key, r]));
  const showDelta = Boolean(prevRows?.length);

  return (
    <div className={`rounded-[10px] border border-border bg-surface p-4 ${className}`}>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink">
          스트림별 사용자
          <InfoTip
            text={`${rangeNote ? `${rangeNote} ` : ''}${hint ?? HINT}${showDelta ? ` 각 값 옆의 %는 ${prevLabel} 대비 증감입니다(재방문율만 %포인트).` : ''}`}
          />
        </h3>
        <p className="text-[11px] text-muted">
          {range}
          {showDelta && <span className="ml-1.5 text-ink-mute">· % = {prevLabel} 대비</span>}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-[13px]">
          <thead>
            <tr className="border-b border-hairline text-[12px] text-muted">
              <th className="py-1.5 pr-3 text-left font-medium">스트림</th>
              <th className="py-1.5 pr-3 font-medium">활성</th>
              <th className="py-1.5 pr-3 font-medium">신규</th>
              <th className="py-1.5 pr-3 font-medium">재방문</th>
              <th className="py-1.5 pr-3 font-medium">재방문율</th>
              <th className="py-1.5 font-medium">세션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = prev.get(r.key);
              return (
                <tr key={r.key} className="border-b border-hairline last:border-0">
                  <td className="py-1.5 pr-3 text-left font-medium text-ink">{r.label}</td>
                  <td className="py-1.5 pr-3 text-ink">
                    <span className="tabular">{fmtInt(r.activeUsers)}</span>
                    <Pct cur={r.activeUsers} prev={p?.activeUsers} />
                  </td>
                  <td className="py-1.5 pr-3 text-ink-soft">
                    <span className="tabular">{fmtInt(r.newUsers)}</span>
                    <Pct cur={r.newUsers} prev={p?.newUsers} />
                  </td>
                  <td className="py-1.5 pr-3 text-ink-soft">
                    <span className="tabular">{fmtInt(r.returningUsers)}</span>
                    <Pct cur={r.returningUsers} prev={p?.returningUsers} />
                  </td>
                  <td className="py-1.5 pr-3 text-ink-soft">
                    <span className="tabular">{fmtPct(r.returnRate)}</span>
                    <Pct cur={r.returnRate} prev={p?.returnRate} pp />
                  </td>
                  <td className="py-1.5 text-ink-soft">
                    <span className="tabular">{fmtInt(r.sessions)}</span>
                    <Pct cur={r.sessions} prev={p?.sessions} />
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
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
