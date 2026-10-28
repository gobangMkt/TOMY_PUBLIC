"use client";

// 표 공통 부품 — **열 너비 조절**과 머리글.
//
// 왜 뽑았나(2026-08-24 지시 "소재 캠페인 등 표 좌우너비 수정가능하게 (항상 모든 표공통)"):
// 이 기능은 `CompareLedger` 안에만 지역 구현으로 있었다. 표가 늘어날 때마다 같은 200줄을
// 다시 짜면 동작이 미묘하게 갈리고(스냅샷 시점·최소 폭·되돌리기 방법), 사용자는 표마다
// 되는지 안 되는지를 눌러봐야 알게 된다.
//
// 규칙 셋(원 구현의 판단을 그대로 옮겼다):
//   ① **드래그를 시작하는 순간** 전 열의 실제 폭을 스냅샷한다. 미리 얼려두면 그 폭이
//      첫 페인트(웹폰트 적용 전) 값이라 머리글이 영구히 잘린다.
//   ② 한 번이라도 끌면 그때부터 `table-layout: fixed`다 — 리사이즈는 fixed에서만 된다.
//      그 전에는 `auto`로 두어 내용에 맞는 자연 폭을 쓴다.
//   ③ **더블클릭으로 그 열만 자연 폭으로 되돌린다** — 되돌리는 법을 따로 안내하지 않아도 되게.

import { ReactNode, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** 열 너비를 사람이 끌어 정할 수 있게 하는 상태 묶음 */
export function useColumnResize() {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  /** 사람이 직접 끌어서 폭을 정한 열. 자동 배분이 건드리지 않는다 */
  const [manualCols, setManualCols] = useState<Set<string>>(() => new Set());
  const theadRowRef = useRef<HTMLTableRowElement>(null);

  /** 지금 화면에 그려진 폭을 그대로 고정값으로 옮긴다 — 드래그 직전 상태가 시작점이 되게 */
  function snapshotWidths() {
    const row = theadRowRef.current;
    if (!row) return;
    const ths = row.querySelectorAll<HTMLTableCellElement>("th[data-col-key]");
    setColWidths((prev) => {
      const next = { ...prev };
      ths.forEach((th) => {
        const key = th.dataset.colKey;
        if (key && next[key] === undefined) {
          next[key] = Math.round(th.getBoundingClientRect().width);
        }
      });
      return next;
    });
  }

  function startColResize(key: string, e: React.MouseEvent) {
    e.preventDefault();
    setManualCols((m) => (m.has(key) ? m : new Set(m).add(key)));
    snapshotWidths();
    const th = (e.currentTarget as HTMLElement).closest("th");
    const startX = e.clientX;
    const startWidth = th?.getBoundingClientRect().width ?? 80;
    function onMove(ev: MouseEvent) {
      const next = Math.max(48, Math.round(startWidth + (ev.clientX - startX)));
      setColWidths((w) => ({ ...w, [key]: next }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function resetColWidth(key: string) {
    setColWidths((w) => {
      const next = { ...w };
      delete next[key];
      return next;
    });
    setManualCols((m) => {
      if (!m.has(key)) return m;
      const next = new Set(m);
      next.delete(key);
      return next;
    });
  }

  const frozen = Object.keys(colWidths).length > 0;

  /**
   * `<col>`에 줄 style.
   *
   * `flexKey`(보통 이름 열)는 사람이 손대기 전까지 `width:100%`를 먹어 **남는 폭을 몰아받는다** —
   * 늘어난 폭을 숫자 열에 흩뿌리면 표가 헐렁해진다. 얼린 뒤에는 고정 폭만 쓴다.
   */
  function colStyle(key: string, flexKey?: string): React.CSSProperties | undefined {
    if (key === flexKey && !manualCols.has(key)) return frozen ? undefined : { width: "100%" };
    return colWidths[key] ? { width: colWidths[key] } : undefined;
  }

  return {
    theadRowRef,
    startColResize,
    resetColWidth,
    colStyle,
    /** 얼렸으면 fixed — 리사이즈는 fixed에서만 된다 */
    tableLayout: (frozen ? "fixed" : "auto") as "fixed" | "auto",
  };
}

export function ColResizeHandle({
  onResize,
  onReset,
}: {
  onResize: (e: React.MouseEvent) => void;
  onReset: () => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="열 너비 조절"
      title="드래그로 너비 조절 · 더블클릭으로 기본값"
      onMouseDown={onResize}
      onDoubleClick={onReset}
      className="absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize select-none"
    >
      <span className="mx-auto block h-full w-px bg-transparent hover:bg-border-bright active:bg-text/30" />
    </span>
  );
}

/** 머리글 한 칸 — 리사이즈 핸들을 품는다 */
export function Th({
  children,
  align = "left",
  colKey,
  className,
  onResize,
  onResetWidth,
}: {
  children?: ReactNode;
  align?: "left" | "right";
  colKey?: string;
  className?: string;
  onResize?: (e: React.MouseEvent) => void;
  onResetWidth?: () => void;
}) {
  return (
    <th
      data-col-key={colKey}
      className={cn(
        "relative overflow-hidden px-3 py-2 font-medium",
        align === "left" ? "text-left" : "text-right",
        className
      )}
    >
      <span className="block truncate">{children}</span>
      {onResize && onResetWidth && <ColResizeHandle onResize={onResize} onReset={onResetWidth} />}
    </th>
  );
}

/** 정렬 가능한 머리글 — 누르면 정렬, 끌면 폭 조절 */
export function ThSort({
  colKey,
  align = "left",
  active,
  dir,
  onSort,
  onResize,
  onResetWidth,
  children,
}: {
  colKey: string;
  align?: "left" | "right";
  active: string;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  onResize?: (e: React.MouseEvent) => void;
  onResetWidth?: () => void;
  children: ReactNode;
}) {
  const on = active === colKey;
  const Icon = !on ? ArrowUpDown : dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <th
      data-col-key={colKey}
      className={cn(
        "relative overflow-hidden px-3 py-2 font-medium",
        align === "left" ? "text-left" : "text-right"
      )}
    >
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate hover:text-text",
          align === "right" && "flex-row-reverse",
          on && "text-text"
        )}
      >
        <span className="truncate">{children}</span>
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
      </button>
      {onResize && onResetWidth && <ColResizeHandle onResize={onResize} onReset={onResetWidth} />}
    </th>
  );
}
