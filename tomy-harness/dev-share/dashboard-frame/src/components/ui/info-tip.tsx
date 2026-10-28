'use client';

// 지표 설명 툴팁(ⓘ). 대시보드에서 "이 숫자가 뭘 센 건지"를 화면에 깔지 않고 여기로 넣는다.
//
// native `title`을 버린 이유(2026-07-28):
//   ① 뜨는 데 1~2초 걸리고 사용자가 hover 가능한지 알 수 없다(점선 밑줄만으론 발견이 안 됨)
//   ② 줄바꿈·폭·색을 못 잡아 긴 설명이 한 줄로 늘어난다
//   ③ 터치·키보드에선 아예 안 뜬다
// 그래서 ⓘ 버튼 + 직접 그린 말풍선. hover/포커스로 잠깐 열고 Esc로 닫는다.
//
// 상태가 두 개다(2026-08-04 사용자 요청 "툴팁 클릭하면 고정 및 닫기뜨게"):
//   ① **훑기(hover/포커스)** — 마우스를 떼면 닫힌다. 클릭 없이 읽고 지나가는 용도, `pointer-events-none`.
//   ② **고정(클릭)** — 마우스를 떼도 남고 오른쪽 위 [✕]가 붙는다. 마우스가 얹혀 있어야만 보이면
//      ⓘ에서 손을 떼는 순간 사라져 ⓐ글을 드래그해 복사할 수 없고 ⓑ설명을 보면서 그 아래 표·차트를
//      짚어 볼 수 없다. 고정 중엔 포인터를 받으므로 본문 선택이 되고, 스크롤하면 닫는 대신 **따라 움직인다**
//      (고정한 사람의 의도는 '계속 보기'다 — 훑기 상태는 그대로 닫는다).
// 닫는 길: [✕] · Esc · 밖 클릭 · ⓘ 다시 클릭.
//
// ⚠️ 카드 안에 절대배치하면 안 된다 — 스코어보드 밴드가 `overflow-hidden`이라 잘린다.
//    트리거의 화면 좌표를 재서 body 포털에 `fixed`로 띄운다.
//
// 🚨🚨 **가독성 하한은 전사 표준이다 — 폭 288px · 폰트 13px · leading 1.5**(디자인팀장 정본
//    `에이전트/service-master/context/domains/uxui/reference_uxui_baseline.md` §툴팁·팝오버, 2026-08-28
//    사용자 지시 "툴팁 앞으로 무엇을 하던 이런식으로 해야함, BI는 달라질 수 있지만 가독성 쓰레기로
//    절대 만들지 않도록"으로 5건 대기 없이 즉시 승격). 이 어드민은 272px·12px이라 셋 중 둘을 어기고
//    있었다(2026-08-31 지적 "어드민 내에 있는 모든 툴팁들이 디자인이 없어"). **색·모서리·트리거
//    아이콘은 프로젝트마다 달라도 이 셋은 안 바뀐다.**
// 🚨 **항목이 2개 이상이면 문단이 아니라 리스트다**(같은 정본) — 점 마커 + 굵은 라벨 + 콜론.
//    이유는 폰트 크기가 아니라 **구조**다: 점 마커는 (a)항목 개수를 즉시 세게 하고 (b)라벨만 훑어
//    필요한 것만 골라 읽게 한다. 문단은 "정의가 몇 개인지"조차 끝까지 읽어야 안다.
//    ⛔ `—`(em dash)를 라벨-설명 구분자로 쓰지 말 것 — 채움 문자처럼 읽혀 구조를 숨긴다. `items`로 쓴다.
//    ⛔ 구조가 필요 없는 단문까지 리스트로 갈아엎지 말 것 — `text`(단문)와 `items`(리스트) 두 모드다.
//    참조 구현 = 찐정책 `src/app/_islands/HelpTip.tsx`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InfoIcon, XIcon } from '@/components/icons';
import { parseTipBlocks } from '@/lib/tip-format';

/** 말풍선 폭(px) — 좌표 계산이 이 값을 쓰므로 CSS로 따로 주지 않는다. **288 미만으로 내리지 말 것**(위 하한). */
const TIP_W = 288;

type Pos = { top: number; left: number; up: boolean; arrow: number };

export default function InfoTip({
  text,
  items,
  tone = 'ink',
  className,
}: {
  /** 단문·문단. `items`와 함께 주면 리스트 위 머리글로 쓴다. */
  text?: string;
  /**
   * 성격이 다른 항목 2개 이상을 나열할 때(점 마커 + 굵은 라벨 + 콜론). 정의·산식 여러 개를 한 문단에
   * `—`로 이어 붙이지 말 것 — 항목 경계가 사라져 몇 개인지조차 안 보인다(§파일 머리 하한 규칙).
   */
  items?: { label: string; text: string }[];
  // 놓이는 면에 따라 ⓘ 색만 갈린다 — 말풍선 자체는 어느 면에서도 같은 흰 카드다.
  tone?: 'ink' | 'board';
  className?: string;
}) {
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [pinned, setPinned] = useState(false);

  const place = useCallback(() => {
    const el = btn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(8, cx - TIP_W / 2), Math.max(8, window.innerWidth - TIP_W - 8));
    // 아래 공간이 부족하면 위로 뒤집는다(밴드가 화면 아래쪽에 걸릴 때).
    const up = r.bottom + 150 > window.innerHeight;
    setPos({ top: up ? r.top - 8 : r.bottom + 8, left, up, arrow: cx - left });
  }, []);

  const close = useCallback(() => {
    setPos(null);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    // 스크롤되면 fixed 좌표가 어긋난다 — 고정 중이면 다시 재서 따라가고, 훑기 중이면 닫는다.
    // (캡처 단계로 잡아야 내부 스크롤 컨테이너도 걸린다.)
    const onMove = () => (pinned ? place() : close());
    const onDown = (e: PointerEvent) => {
      if (!pinned) return;
      const t = e.target as Node;
      // ⓘ 자신을 누른 건 아래 onClick이 토글로 처리한다(여기서 먼저 닫으면 두 번 닫힌다).
      if (wrap.current?.contains(t) || tip.current?.contains(t)) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [pos, pinned, close, place]);

  const arrowSide = pos?.up
    ? '-bottom-[5px] border-r border-b border-border'
    : '-top-[5px] border-t border-l border-border';

  return (
    <span
      ref={wrap}
      className={`relative inline-flex align-middle ${className ?? ''}`}
      onPointerEnter={() => !pinned && place()}
      onPointerLeave={() => !pinned && close()}
    >
      <button
        ref={btn}
        type="button"
        aria-label={pinned ? '설명 닫기' : '설명 보기'}
        aria-expanded={!!pos}
        onFocus={() => !pinned && place()}
        onBlur={() => !pinned && close()}
        onClick={() => {
          if (pinned) return close();
          place();
          setPinned(true);
        }}
        className={`inline-flex items-center justify-center rounded-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          pinned
            ? 'text-primary' // 고정 중 = 민트(#10a6a6, 텍스트용 딥민트)
            : tone === 'board'
              ? 'text-board-mute hover:text-white'
              : 'text-ink-mute/70 hover:text-ink-soft'
        }`}
      >
        <InfoIcon size={14} />
      </button>

      {pos &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            data-pinned={pinned || undefined}
            style={{
              top: pos.top,
              left: pos.left,
              width: TIP_W,
              transform: pos.up ? 'translateY(-100%)' : undefined,
            }}
            // 폰트 13px · leading 1.55 = 전사 가독성 하한(§파일 머리). `text-xs`(12px)로 되돌리지 말 것.
            className={`fixed z-[80] rounded-lg border border-border bg-surface py-3 text-[13px] leading-[1.55] text-ink-soft shadow-card ${
              pinned ? 'select-text pl-3.5 pr-9 ring-1 ring-primary/25' : 'pointer-events-none px-3.5'
            }`}
          >
            {/* 🚨 기존 hint 문자열(수백 개)은 `· 라벨 = 설명` 꼴로 여러 항목을 한 문단에 담고 있다 —
                `parseTipBlocks`가 그 관례를 **실제 리스트로 승격**해 문자열을 안 고치고도 하한(점 마커
                + 굵은 라벨)을 지킨다(§lib/tip-format.ts). 새 문구는 파싱에 기대지 말고 `items`를 쓸 것.
                whitespace-pre-line: 문단 안 `\n`·`\n\n`을 그대로 살린다(2026-08-05 교정). */}
            {text &&
              parseTipBlocks(text).map((block, i) =>
                block.kind === 'text' ? (
                  <span key={i} className={`block whitespace-pre-line ${i > 0 ? 'mt-2' : ''}`}>
                    {block.text}
                  </span>
                ) : (
                  <ul key={i} className={`flex flex-col gap-1.5 ${i > 0 ? 'mt-2' : ''}`}>
                    {block.items.map((it, j) => (
                      <li key={j} className="flex gap-2">
                        <span aria-hidden className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-primary" />
                        <span className="whitespace-pre-line">
                          {it.label && <b className="font-semibold text-ink">{it.label}</b>}
                          {it.label ? ': ' : ''}
                          {it.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
            {items && items.length > 0 && (
              <ul className={`flex flex-col gap-2 ${text ? 'mt-2.5' : ''}`}>
                {items.map((it) => (
                  <li key={it.label} className="flex gap-2">
                    {/* 점 마커 — 항목 개수를 세게 하고 라벨만 훑어 고르게 하는 장치(§하한 규칙). */}
                    <span aria-hidden className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-primary" />
                    <span className="whitespace-pre-line">
                      <b className="font-semibold text-ink">{it.label}</b>: {it.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pinned && (
              <button
                type="button"
                aria-label="닫기"
                onClick={close}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded text-ink-mute transition-colors hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <XIcon size={12} />
              </button>
            )}
            <span
              aria-hidden
              style={{ left: Math.max(10, Math.min(pos.arrow - 5, TIP_W - 20)) }}
              className={`absolute h-[10px] w-[10px] rotate-45 bg-surface ${arrowSide}`}
            />
          </div>,
          document.body,
        )}
    </span>
  );
}
