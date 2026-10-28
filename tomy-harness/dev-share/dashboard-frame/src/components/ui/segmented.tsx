'use client';

type Opt<T extends string> = { value: T; label: string };

// 단일 선택 세그먼트 컨트롤. 활성 = 민트(primary) 채움 + 흰 텍스트.
// value가 옵션에 없으면(커스텀 상태) 아무것도 활성화되지 않는다.
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Opt<T>[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-border bg-bg p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              active ? 'bg-primary font-medium text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
