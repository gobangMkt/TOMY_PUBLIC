'use client';

// 증감 표기 정본 컴포넌트 — **비율 + 절대 증감을 항상 함께** 그린다(2026-08-03 사용자 확정).
//
// 왜 한 곳인가: 그전엔 화면마다 따로 그려 형식이 갈렸다 — 트래픽 대시보드는 `▲ 2.34% (−4,902)`,
// 월간·주간 흐름과 기간 비교표는 `▲ 30.47%`(비율만), 리포트 소스/매체 표는 `▼ 121 (3.7%)`(절대값 먼저).
// 같은 뜻인데 형식이 셋이면 볼 때마다 무엇이 앞인지 다시 읽어야 한다. 이 파일 하나만 쓴다.
//
// 형식: `▲ 30.5% (+1,234)` — 비율이 본문, 절대값이 괄호 보조.
//  · 비교 대상이 없으면(prev 없음) `—`
//  · prev가 0이면 배율이 무한대라 비율을 못 낸다 → 절대값만 `▲ (+1,234)`
//  · 절대값 포맷은 화면이 정한다(`fmt`) — 매출은 만원, 비율 지표는 %p처럼 단위가 다르다.

import { arrowOf, deltaTone, fmtInt, signOf, type DeltaParts } from '@/lib/format';

export function Delta({
  parts,
  fmt = fmtInt,
  className = '',
}: {
  parts: DeltaParts;
  /** 절대 증감 포맷터. 부호는 이 컴포넌트가 붙이므로 **절대값만** 그리면 된다. */
  fmt?: (n: number) => string;
  className?: string;
}) {
  const { ratio, diff } = parts;
  if (diff == null) return <span className={`text-ink-mute ${className}`}>—</span>;
  return (
    // ⚠️ 두 조각 각각에 `whitespace-nowrap` — 좁은 표 칸에서 줄바꿈이 조각 **안쪽**을 가르면
    //    '▼' 뒤에 절대값이 붙고 비율이 다음 줄로 밀려 **절대값이 비율보다 먼저 보인다**(실측).
    //    조각 사이에서만 접히게 해야 순서가 항상 '비율 → (절대값)'으로 유지된다.
    <span className={`tabular inline-flex flex-wrap items-baseline justify-end gap-x-1 ${deltaTone(diff)} ${className}`}>
      <span className="whitespace-nowrap">
        {arrowOf(diff)}
        {ratio != null && ` ${(Math.abs(ratio) * 100).toFixed(1)}%`}
      </span>
      <span className="whitespace-nowrap text-[0.85em] text-ink-mute">
        ({signOf(diff)}
        {fmt(Math.abs(diff))})
      </span>
    </span>
  );
}

export default Delta;
