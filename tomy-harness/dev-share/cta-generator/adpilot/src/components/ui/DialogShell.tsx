"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 팝업 공통 껍데기 — `Modal`·`ConfirmDialog`(primitives.tsx)가 이걸로 배경 딤·키보드를 맞춘다.
 *
 * primitives.tsx는 서버 컴포넌트도 가져다 쓰는 파일이라 훅을 둘 수 없어서 이 파일로 나눴다.
 * 하는 일(2026-10-27 감사):
 * - Esc로 닫기(`onEscape`가 있을 때만 — 생성 중처럼 닫으면 안 될 땐 넘기지 않는다)
 * - Tab이 팝업 밖으로 새지 않게 가두고, 닫히면 연 요소로 포커스를 돌린다
 * - 팝업 위에 팝업이 겹치면 위쪽 배경은 옅게 — 딤이 두 겹이면 화면이 거의 검게 보인다
 */

const stack: number[] = [];
let seq = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export type DialogDim = "auto" | "full" | "light" | "none";

/** 배경 딤 단계 — auto는 이미 열린 팝업이 있으면(겹친 확인창) 옅게 */
export function dimLevel(dim: DialogDim, stacked: boolean): Exclude<DialogDim, "auto"> {
  return dim === "auto" ? (stacked ? "light" : "full") : dim;
}

// 서버 렌더에선 레이아웃 효과가 경고만 내므로 브라우저에서만 쓴다
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function DialogShell({
  label,
  onBackdrop,
  onEscape,
  dim = "auto",
  className,
  children,
}: {
  label: string;
  /** 배경 클릭 — 없으면 배경을 눌러도 닫히지 않는다 */
  onBackdrop?: () => void;
  /** Esc — 없으면 Esc를 무시한다 */
  onEscape?: () => void;
  /** auto = 이미 열린 팝업이 있으면 옅게(겹친 확인창), 없으면 기본 딤 */
  dim?: DialogDim;
  className?: string;
  children: ReactNode;
}) {
  const [id] = useState(() => ++seq);
  const [stacked] = useState(() => stack.length > 0);
  // 연 요소는 렌더 때 잡는다 — 커밋 뒤엔 안쪽 autoFocus 버튼이 이미 포커스를 가져가 있다
  const [opener] = useState(() => (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null));
  const boxRef = useRef<HTMLDivElement>(null);
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useIsoLayoutEffect(() => {
    const prev = opener;
    stack.push(id);
    const box = boxRef.current;
    // autoFocus가 걸린 버튼이 이미 포커스를 가져갔으면 그대로 둔다
    if (box && !box.contains(document.activeElement)) {
      (focusables(box)[0] ?? box).focus();
    }
    return () => {
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (prev && prev.isConnected && typeof prev.focus === "function") prev.focus();
    };
  }, [id, opener]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        if (escRef.current) {
          e.preventDefault();
          escRef.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const box = boxRef.current;
      if (!box) return;
      const els = focusables(box);
      if (els.length === 0) {
        e.preventDefault();
        box.focus();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !box.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !box.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [id]);

  const level = dimLevel(dim, stacked);
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        level === "full" && "bg-text/45",
        level === "light" && "bg-text/15"
      )}
      onClick={onBackdrop}
      role="presentation"
      data-dim={level}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn("outline-none", className)}
      >
        {children}
      </div>
    </div>
  );
}
