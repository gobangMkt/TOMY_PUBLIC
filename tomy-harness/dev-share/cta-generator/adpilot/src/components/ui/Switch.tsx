"use client";

import { cn } from "@/lib/utils";

// 공용 토글 스위치 — 트랙/노브 정렬을 절대좌표로 고정(렌더 깨짐 방지).
export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked ? "bg-accent" : "bg-border-bright",
        className
      )}
    >
      <span
        className={cn(
          "absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}
