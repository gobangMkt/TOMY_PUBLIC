'use client';

// 전면 모달 — 상시 노출하면 화면을 먹지만 가끔은 통째로 봐야 하는 넓은 표·격자용.
// 대시보드 어디서든 이 한 벌만 쓴다(화면마다 오버레이를 새로 짜면 닫기 규칙·여백이 갈린다).
//
// ⚠️ body 포털이다 — 셸 레이아웃이나 카드 안에 그대로 두면 부모의 overflow/transform에 잘린다.
// 열려 있는 동안 배경 스크롤을 잠근다(뒤 화면이 같이 움직이면 어느 쪽을 보는지 흐려진다).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@/components/icons';

export default function FullModal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = 'wide',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** 바닥 고정 액션 줄(선택). 내용이 아무리 길어도 실행 버튼이 항상 손닿는 곳에 있다. */
  footer?: React.ReactNode;
  /**
   * `wide`(기본) = 넓은 표·차트를 통째로 보는 작업창.
   * `medium` = 2단 폼·변환기처럼 폭이 필요하지만 표만큼 넓지 않은 작업창(HTML 붙여넣기 등).
   * `narrow` = 고를 것이 두세 개뿐인 짧은 대화창(리포트 만들기의 주기·기간 선택 등).
   * ⚠️ 오버레이·닫기 규칙은 같다 — 폭만 다르다(모달 껍데기를 새로 짜지 않으려고 여기서 갈랐다).
   */
  size?: 'wide' | 'medium' | 'narrow';
  children: React.ReactNode;
}) {
  // SSR에는 document가 없다 — 마운트 후에만 포털을 연다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[12px] border border-border bg-surface shadow-xl ${
          size === 'narrow' ? 'max-w-[440px]' : size === 'medium' ? 'max-w-[820px]' : 'max-w-[1400px]'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-3.5">
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-hairline hover:text-ink"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer && <div className="border-t border-hairline bg-chrome px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
