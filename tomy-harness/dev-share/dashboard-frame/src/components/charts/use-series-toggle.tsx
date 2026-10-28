'use client';

// 계열 껐다 켜기 — 범례를 클릭하면 그 계열만 숨긴다(2026-07-28 사용자 요청:
// "웹/안드/iOS 중 웹 누르면 웹이 꺼지거나"). **계열이 2개 이상인 모든 차트가 이 훅 하나를 쓴다** —
// 화면마다 손으로 구현하면 off 표시(색·취소선)와 클릭 판정이 화면마다 갈린다.
//
// 쓰는 법:
//   const s = useSeriesToggle();
//   <Legend {...s.legendProps} />
//   <Line dataKey="web" hide={s.isHidden('web')} />   // ← dataKey와 같은 키로 판정
//
// ⚠️ 축 domain은 우리가 데이터에서 미리 계산한다(baselineDomain·layerDomain) → 계열을 꺼도
//    축이 다시 스케일되지 않는다. 의도된 동작이다: 껐다 켤 때 남은 계열이 위아래로 튀지 않는다.
// ⚠️ 마지막 계열까지 끄면 빈 그래프가 된다(막지 않는다 — 사용자가 다시 켜면 된다).

import { useCallback, useMemo, useState } from 'react';

const OFF_COLOR = '#b1b6bc'; // --color-disabled

// Recharts 범례 payload에서 우리가 쓰는 필드만. Line/Bar는 dataKey를, 그 외는 value(이름)를 준다.
type LegendEntry = { dataKey?: unknown; value?: unknown };
const keyOf = (e: LegendEntry | undefined, fallback?: string) =>
  String(e?.dataKey ?? e?.value ?? fallback ?? '');

export function useSeriesToggle() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set<string>());

  const toggle = useCallback((key: string) => {
    if (!key) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isHidden = useCallback((key: string) => hidden.has(key), [hidden]);

  const legendProps = useMemo(
    () => ({
      wrapperStyle: { fontSize: 12, cursor: 'pointer' as const },
      onClick: (entry: LegendEntry) => toggle(keyOf(entry)),
      // 꺼진 계열은 회색 + 취소선 — 범례에서 사라지면 다시 켤 방법이 없어진다.
      formatter: (value: string, entry?: LegendEntry) => {
        const off = hidden.has(keyOf(entry, value));
        return (
          <span style={off ? { color: OFF_COLOR, textDecoration: 'line-through' } : undefined}>{value}</span>
        );
      },
    }),
    [hidden, toggle],
  );

  return { hidden, toggle, isHidden, legendProps };
}
