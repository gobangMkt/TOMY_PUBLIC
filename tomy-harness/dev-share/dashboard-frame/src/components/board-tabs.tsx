'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { findLocation, isActive } from '@/lib/nav';

// 축 내부 화면 전환 탭바 — 라우트 링크(딥링크·뒤로가기 보존). 현재 축에 tabs가 없으면 아무것도 안 그린다.
// 활성 강조는 민트 언더라인 + 볼드 단일(색코딩 금지). role=tablist + 좌우 키보드 이동.
export default function BoardTabs() {
  const pathname = usePathname();
  const loc = findLocation(pathname);
  const tabs = loc?.item.tabs;
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  if (!tabs || tabs.length === 0) return null;

  const activeIdx = tabs.findIndex((t) => isActive(pathname, t.href));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const from = activeIdx < 0 ? 0 : activeIdx;
    const next = (from + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={`${loc?.item.label} 화면`}
      onKeyDown={onKeyDown}
      className="mt-4 flex items-center gap-1 border-b border-border"
    >
      {tabs.map((t, i) => {
        const active = i === activeIdx;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            tabIndex={active || (activeIdx < 0 && i === 0) ? 0 : -1}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-primary font-semibold text-ink'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {Icon && <Icon size={15} className={active ? 'text-primary' : 'text-ink-mute'} />}
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
