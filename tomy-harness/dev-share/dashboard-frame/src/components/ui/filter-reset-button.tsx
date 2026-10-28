'use client';

import { XIcon } from '@/components/icons';

type Props = {
  active: boolean; // 초기화할 값이 있는지(dirty)
  onClick: () => void;
  label?: string;
  className?: string; // 배치용(예: ml-auto로 툴바 맨 우측 고정)
};

// admin 전체 필터 툴바 공통 규칙: 초기화는 항상 툴바 맨 우측 + 아이콘 하나만.
// active와 무관하게 항상 마운트하고 disabled로만 토글한다 — 조건부 마운트/해제는
// 옆 컨트롤을 리플로우시킨다(2026-07-26 배너 필터에서 재발).
export default function FilterResetButton({ active, onClick, label = '필터 초기화', className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!active}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-lg border p-1.5 transition-colors ${
        active
          ? 'border-border text-ink-soft hover:bg-hairline'
          : 'cursor-default border-transparent text-ink-mute/30'
      } ${className}`}
    >
      <XIcon size={14} />
    </button>
  );
}
