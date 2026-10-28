'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@/components/icons';

// 범용 다중선택 드롭다운: 트리거 버튼 하나 → 팝오버(체크박스 목록).
// selected 빈 배열 = 전체. 영역·노출면·형태 필터에 공용으로 쓴다.

type Props = {
  label: string; // 접근성 라벨(예: "노출면 선택")
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  align?: 'left' | 'right'; // 팝오버 펼침 방향. 화면 우측 끝 컨트롤은 'right'로 잘림 방지.
  // 닫힌 상태에 축 이름을 함께 찍는다('그룹 · 전체'). 드롭다운이 여러 개 나란히 놓이면 값만으로는
  // 똑같은 회색 박스 N개가 되어 무슨 축인지 옆 라벨을 읽어야 한다. 별도 라벨 span을 옆에 두는 것보다
  // 안에 넣는 쪽이 낫다 — 라벨이 옆 컨트롤(체크박스 등)에 붙어 읽히는 사고가 없다.
  axis?: string;
  // 다른 필터를 감안했을 때 지금 고를 수 있는 값들. undefined = 제약 없음(전부 선택 가능).
  // 여기 없는 옵션은 목록에서 지우지 않고 아래로 내려 비활성으로 그린다 — 지워 버리면
  // "그런 값이 아예 없다"로 읽히고, 왜 사라졌는지(어느 필터 때문인지)도 알 수 없다.
  available?: string[];
  // 트리거 폭(기본 w-40). 표 머리 **필터 행**처럼 열 폭이 좁은 자리에서 줄인다 — 폭을 고정해 두는 이유는
  // 값이 바뀔 때 옆 컨트롤이 밀리지 않게 하기 위함이다(레이아웃 흔들림 금지, 전역 규칙).
  width?: string;
};

// 축 이름이 있는데 선택값이 없으면 '전체'를 덧붙이지 않고 축 이름만 낸다(예: '나이대 · 전체'가
// 아니라 '나이대') — 축 이름이 이미 "아무것도 안 걸렀다"를 말하므로 '전체'는 같은 뜻의 군더더기다
// (2026-08-28 지적: "나이대 전체 -> 나이대 그렇게해서 항목 텍스트로 뺀거 줄이기").
function triggerLabel(selected: string[], axis?: string): string {
  if (selected.length === 0) return axis ?? '전체';
  if (selected.length === 1) return selected[0];
  return `${selected[0]} 외 ${selected.length - 1}개`;
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  align = 'left',
  axis,
  available,
  width = 'w-40',
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

  const toggle = (p: string) => {
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  };

  // 이미 고른 값은 available 밖이어도 활성으로 남긴다 — 아니면 해제할 수가 없다.
  const usable = (p: string) => !available || available.includes(p) || selected.includes(p);
  const enabled = options.filter(usable);
  const disabled = options.filter((p) => !usable(p));

  const optionRow = (p: string) => {
    const on = selected.includes(p);
    return (
      <button
        key={p}
        type="button"
        role="option"
        aria-selected={on}
        onClick={() => toggle(p)}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
          on ? 'text-ink' : 'text-ink-soft hover:bg-hairline'
        }`}
      >
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            on ? 'border-primary bg-primary text-white' : 'border-border'
          }`}
        >
          {on && <CheckIcon size={11} />}
        </span>
        <span className="truncate">{p}</span>
      </button>
    );
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={triggerLabel(selected, axis)}
        className={`inline-flex ${width} shrink-0 items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none hover:border-ink-mute focus:border-primary`}
      >
        <span className="truncate">
          {axis && selected.length > 0 && <span className="text-ink-mute">{axis} · </span>}
          <span className="font-medium">{triggerLabel(selected, axis)}</span>
        </span>
        <ChevronDownIcon size={13} className="shrink-0 text-ink-mute" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-1.5 max-h-72 w-56 max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-border bg-surface py-1.5 shadow-lg`}
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={() => onChange([])}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              selected.length === 0 ? 'text-ink' : 'text-ink-soft hover:bg-hairline'
            }`}
          >
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                selected.length === 0 ? 'border-primary bg-primary text-white' : 'border-border'
              }`}
            >
              {selected.length === 0 && <CheckIcon size={11} />}
            </span>
            <span className="truncate">전체</span>
          </button>
          <div className="my-1 border-t border-hairline" />
          {enabled.map(optionRow)}
          {disabled.length > 0 && (
            <>
              <div className="my-1 border-t border-hairline" />
              <p className="px-3 pb-0.5 pt-1 text-[11px] leading-tight text-ink-mute">
                다른 필터에 걸려 선택 불가 ({disabled.length})
              </p>
              {disabled.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="option"
                  aria-selected={false}
                  aria-disabled
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-1.5 text-left text-sm text-ink-mute/70"
                >
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded border border-dashed border-border"
                  />
                  <span className="truncate">{p}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
