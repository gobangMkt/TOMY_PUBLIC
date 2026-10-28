'use client';

import type { Metric } from '@/lib/ad-banner';
import { CheckIcon } from '@/components/icons';

// 지표 다중선택 토글. 체크박스(✓)로 선택 여부를 확실히 표시 + 시리즈 색으로 계열 식별.
// 선택 = 시리즈색 채움 박스 + 흰 ✓ + ink 라벨, 해제 = 빈 박스 + 흐린 라벨.
// 최소 1개 유지 — 마지막 활성 항목 해제 클릭은 무시. 하단 차트 범례는 이 토글이 대체.

export type MetricItem = { value: Metric; label: string; color: string; kind: 'bar' | 'line' };

export default function MetricToggle({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: MetricItem[];
  value: Metric[];
  onChange: (v: Metric[]) => void;
  ariaLabel?: string;
}) {
  const toggle = (v: Metric) => {
    const on = value.includes(v);
    if (on) {
      if (value.length <= 1) return; // 마지막 1개 해제 차단
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex flex-wrap items-center gap-1">
      {items.map((it) => {
        const on = value.includes(it.value);
        return (
          <button
            key={it.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(it.value)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition-colors ${
              on
                ? 'border-border bg-hairline text-ink'
                : 'border-transparent text-ink-mute hover:bg-hairline'
            }`}
          >
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
              style={
                on
                  ? { backgroundColor: it.color, borderColor: it.color }
                  : { borderColor: '#c2c7cc' }
              }
            >
              {on && <CheckIcon size={11} className="text-white" />}
            </span>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
