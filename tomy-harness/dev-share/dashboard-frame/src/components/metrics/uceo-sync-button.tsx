'use client';

import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, ChevronDownIcon } from '@/components/icons';
import { ExternalLink } from '@/components/ui/controls';

// u-agent 로그인 계정 정본 — 노션 [계정 관리]. 세션 만료 배너(inquiries-view/weekly-view)에서도
// 같은 링크를 써야 해서 export한다 — 계정 찾으러 갈 곳이 드롭다운 안에만 있으면 급할 때 못 찾는다.
export const UAGENT_ACCOUNT_URL = 'https://example.com/YOUR_GUIDE_URL';
// 세션 만료 배너의 "로그인 화면 열기" 바로가기용 — 헤디드 로그인 창이 자동으로 뜨긴 하지만,
// 그새 계정을 못 찾아 대기만 하는 상황을 줄이려 직접 열 수 있는 링크도 함께 낸다.
export const UCEO_LOGIN_URL = 'https://u-ceo.kr/login';
export const UAGENT_LOGIN_URL = 'https://u-agent.kr';

// u-ceo 불러오기 분할 버튼 — 주 동작(전주)은 바로 누르고, 드문 동작(기간 재수집)은 접어 둔다.
// 버튼이 헤더·표 위 두 곳에 흩어져 있어 위계가 헷갈렸던 것을 이 하나로 합쳤다.
// 라벨 길이가 상태에 따라 바뀌어도 헤더가 흔들리지 않게 메인 버튼 폭을 고정한다.
//
// 자리 = **주간 원장 섹션 헤더**(2026-07-28). 필터 줄(소스·값·기간)에 두면 위계가 깨진다 —
// 저건 '무엇을 볼지' 고르는 조회 조건이고 이건 '원장에 값을 쓰는' 실행 동작이다. 채우는 대상인
// 원장 표 바로 위에 두고, 채움 버튼이라 시선을 끄는 만큼 필터보다 작게 쓴다(px-2.5·13px).
export default function UceoSyncButton({
  busy,
  disabled,
  rangeLabel,
  onSyncWeek,
  onSyncRange,
  onRefreshSession,
  onRefreshUagentSession,
  onRefreshPlaySession,
  onRefreshAscSession,
}: {
  busy: '' | 'week' | 'range' | 'session';
  disabled?: boolean;
  rangeLabel: string;
  onSyncWeek: () => void;
  onSyncRange: () => void;
  onRefreshSession: () => void;
  onRefreshUagentSession: () => void;
  /** 앱 지표(스토어 콘솔)도 함께 수집하는 화면에서만 넘긴다. */
  onRefreshPlaySession?: () => void;
  onRefreshAscSession?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    busy === 'week' ? '불러오는 중…' : busy === 'range' ? '수집 중…' : busy === 'session' ? '로그인 중…' : '전주 불러오기';
  const off = !!busy || !!disabled;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onSyncWeek}
          disabled={off}
          title={disabled ? '원장이 연결되지 않아 저장할 수 없습니다' : 'u-ceo에서 전주(월~일) 확정치를 가져와 원장에 반영'}
          className="inline-flex w-[118px] items-center justify-center gap-1 whitespace-nowrap rounded-l-lg bg-primary px-2.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <DownloadIcon size={13} />
          {label}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={off}
          aria-label="불러오기 옵션"
          aria-expanded={open}
          className="inline-flex items-center rounded-r-lg border-l border-white/25 bg-primary px-1 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ChevronDownIcon size={13} />
        </button>
      </div>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-[248px] rounded-lg border border-border bg-bg p-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSyncRange();
            }}
            className="w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-hairline"
          >
            조회 기간 다시 수집
            <span className="mt-0.5 block text-xs text-ink-mute">{rangeLabel} 확정 주 전부 덮어쓰기</span>
          </button>
          <div className="my-1 h-px bg-hairline" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRefreshSession();
            }}
            className="w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-hairline"
          >
            u-ceo 세션 갱신
            <span className="mt-0.5 block text-xs text-ink-mute">브라우저 창에서 로그인 — 최대 3분 대기</span>
          </button>
          {/* u-agent 행만 링크가 하나 더 붙는다 — 로그인 창이 뜨면 아이디·비번을 찾으러 가야 하는데
              그 정본이 노션 [계정 관리]다. `<a>`를 메뉴 버튼 안에 넣을 수 없어 행 위에 겹쳐 얹는다 —
              flex로 가르면 버튼이 좁아져 설명 줄만 두 줄로 접히고 위 u-ceo 행과 높이가 어긋난다. */}
          <div className="relative">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRefreshUagentSession();
              }}
              className="w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-hairline"
            >
              U중개사(u-agent) 세션 갱신
              <span className="mt-0.5 block text-xs text-ink-mute">브라우저 창에서 로그인 — 최대 3분 대기</span>
            </button>
            <ExternalLink
              href={UAGENT_ACCOUNT_URL}
              title="노션 [계정 관리] 페이지를 새 탭으로 엽니다 — u-agent 로그인 계정을 여기서 확인하세요"
              className="absolute right-2 top-2"
            >
              계정
            </ExternalLink>
          </div>
          {onRefreshPlaySession && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRefreshPlaySession();
              }}
              className="w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-hairline"
            >
              Play 콘솔 세션 갱신
              <span className="mt-0.5 block text-xs text-ink-mute">앱 지표 수집용 · 창에서 로그인 — 최대 3분 대기</span>
            </button>
          )}
          {onRefreshAscSession && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRefreshAscSession();
              }}
              className="w-full rounded-md px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-hairline"
            >
              App Store Connect 세션 갱신
              <span className="mt-0.5 block text-xs text-ink-mute">앱 지표 수집용 · 창에서 로그인 — 최대 3분 대기</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
