'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, CheckIcon } from '@/components/icons';

// 컴팩트 셀렉트 — 선택지가 3~4개여도 Segmented로 깔면 필터 줄이 통째로 부풀어 화면을 먹는다.
// 접힌 드롭다운으로 바꿔 폭을 값 하나 크기로 고정한다(2026-07-28 필터 정리).
//
// 레이아웃 흔들림 금지(어드민 전역 규칙): 선택값 길이가 달라도 버튼 폭이 변하지 않게 width 고정 +
// truncate. 값이 아니라 폭이 움직이면 옆 버튼들이 매번 밀린다.
//
// 🚨 **닫힌 모양은 '버튼'이 아니라 '필드'다**(2026-08-05 사용자 지적 "드롭다운 메뉴와 탭버튼 메뉴
// 구분 명확히되게"). 그전엔 이 트리거가 `bg-surface` + `hover:bg-hairline`이라 바로 옆 `ActionButton`
// (테두리 버튼)과 클래스가 거의 같았고, 표 헤더 한 줄에 [상세 항목 보기][대비▾][기간▾]가 나란히
// 놓이면 **무엇이 조회 조건이고 무엇이 누르는 동작인지 눌러 봐야** 알았다. 같은 어드민의 다른 드롭다운
// (`dashboard/multi-select.tsx`·`date-range-picker.tsx`)은 이미 `bg-bg`(눌린 면) + `hover:border-ink-mute`
// + `{축} · {값}` 형태였다 → **드롭다운 3종을 그 형태로 수렴**한다(어휘는 하나여야 한다).
//  · 면: `bg-bg`(카드 `bg-surface` 위에 놓이면 살짝 눌린 필드로 읽힌다)
//  · hover: 배경이 아니라 **테두리**가 진해진다(버튼은 배경이 바뀐다 — 반응으로도 갈린다)
//  · 라벨: `대비 · 전년동월`처럼 축과 값을 `·`로 가른다(축은 연하게, 값은 `font-medium`)
export type SelectOption<T extends string> = { value: T; label: string };

export default function SelectMenu<T extends string>({
  label,
  options,
  value,
  onChange,
  width = 'w-[104px]',
  ariaLabel,
  align = 'down',
}: {
  label?: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (v: T) => void;
  width?: string;
  ariaLabel: string;
  /**
   * 팝업이 열리는 방향. 기본 `down`(트리거 아래). `up`은 트리거 바로 위(칩 아래)에 여는 것을
   * 아는 자리 — 짧은 대화창(`FullModal`)의 마지막 필드처럼, 아래로 열면 모달의 `overflow-auto`
   * 컨텐츠 경계에 팝업이 잘리는 위치에 둘 때 쓴다(2026-08-06 실측: 리포트 만들기 '종류' 드롭다운이
   * 짤렸다 — 모달이 내용 높이에 딱 맞아 아래로 열 여유가 없었다).
   */
  align?: 'down' | 'up';
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

  const current = options.find((o) => o.value === value)?.label ?? '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`inline-flex ${width} items-center justify-between gap-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none transition-colors hover:border-ink-mute focus:border-primary`}
      >
        <span className="truncate">
          {label && <span className="text-ink-mute">{label} · </span>}
          <span className="font-medium">{current}</span>
        </span>
        <ChevronDownIcon size={14} className="shrink-0 text-ink-mute" />
      </button>
      {open && (
        // 🚨 **z-50 — 표의 sticky thead(z-40)보다 위여야 한다**(2026-08-05 실측 버그: 마케팅 월간흐름은
        // 이 셀렉트가 격자표 **바로 위** 섹션 헤더에 있어서, 아래로 열린 팝업이 z-40 thead에 가려
        // 통째로 안 보였다 — "필터 드롭다운 클릭하면 행에 가려서 드롭다운이 안보임").
        // z 스케일: 표 sticky 40 < 드롭다운 50 < FullModal 70 < InfoTip 80.
        <div
          role="menu"
          className={`absolute right-0 z-50 min-w-full rounded-lg border border-border bg-bg p-1 shadow-lg ${
            align === 'up' ? 'bottom-full mb-1' : 'mt-1'
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-hairline ${
                o.value === value ? 'font-medium text-ink' : 'text-ink-soft'
              }`}
            >
              <CheckIcon size={13} className={o.value === value ? 'text-primary' : 'invisible'} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
