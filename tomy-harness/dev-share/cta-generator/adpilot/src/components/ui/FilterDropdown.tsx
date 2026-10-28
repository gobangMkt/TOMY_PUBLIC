"use client";

// 조회 조건 드롭다운 — 열면 조건 이름(제목) / 구분선 / 항목 순이다. 제목은 누를 수 없고 항목만 누를 수 있어서
// "이름"과 "고를 수 있는 것"이 섞여 보이지 않는다(2026-10-18 "제목 / line / 항목으로 통일").
// 네이티브 <select>는 제목·아이콘을 못 넣어서 같은 모양으로 직접 그린다.
// 조회 조건 단일 선택은 전 화면 이것 하나다(2026-10-19 FilterSelect 폐기 — 같은 줄에 두 모양이 섞였다).
// 폼(팝업·생성 화면) 안의 선택은 조회 조건이 아니므로 계속 `Field` + 네이티브 select.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass, subCardClass } from "./primitives";

export interface FilterOption {
  value: string;
  label: string;
  /** 항목 왼쪽 아이콘(표 태그와 같은 아이콘 등) */
  icon?: ReactNode;
  /** 값 하나만 지금 못 고를 때 — 지우지 않고 남겨 "있는데 지금 데이터가 없다"로 읽히게 한다 */
  disabled?: boolean;
}

export function FilterDropdown({
  heading,
  value,
  onChange,
  options,
  allLabel,
  allValue = "",
  placeholder,
  className,
  title,
  disabled,
}: {
  /** 열었을 때 맨 위 제목 = 조건 이름 */
  heading: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  /** 있으면 항목 맨 앞에 "전체" 항목(값 allValue)을 둔다 */
  allLabel?: string;
  allValue?: string;
  /** 전체 상태일 때 닫힌 칸에 보일 글자. 기본은 제목 */
  placeholder?: string;
  className?: string;
  title?: string;
  /** 축 전체를 고를 수 없을 때만(거를 행이 0개 등). 값 하나만 막을 땐 옵션의 disabled */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cur = options.find((o) => o.value === value);
  const isAll = allLabel != null && value === allValue;
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const row =
    "flex w-full items-center gap-2 rounded-btn px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        disabled={disabled}
        className={cn(buttonClass("quiet", "h-8 min-w-0 justify-between px-2 text-xs"), className, open && "border-text")}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {!isAll && cur?.icon}
          <span className={cn("truncate", isAll && "text-muted")}>{isAll || !cur ? placeholder ?? heading : cur.label}</span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        // 캠페인 필터처럼 항목이 수십 개면 목록만 스크롤한다. 이름이 길어도 메뉴가 화면을 가로지르지 않게 폭 상한
        <div
          role="listbox"
          className={cn(
            subCardClass("absolute left-0 top-full z-50 mt-1.5 max-h-80 min-w-[11rem] max-w-[24rem] overflow-y-auto bg-surface p-1 shadow-pop")
          )}
        >
          <p className="px-2.5 pb-1.5 pt-2 text-[13px] font-semibold text-muted">{heading}</p>
          <div className="mb-1 border-t border-border" />
          {allLabel != null && (
            <button type="button" role="option" aria-selected={value === allValue} onClick={() => pick(allValue)} className={row}>
              <span className="min-w-0 flex-1 truncate">{allLabel}</span>
              {value === allValue && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              aria-disabled={o.disabled}
              disabled={o.disabled}
              onClick={() => pick(o.value)}
              className={row}
            >
              {o.icon && <span className="shrink-0">{o.icon}</span>}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {value === o.value && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
