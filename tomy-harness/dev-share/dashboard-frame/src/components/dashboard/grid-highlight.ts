'use client';

// 월 격자표의 '지금 대비하는 두 줄' 강조 — **NF 월간흐름·마케팅 월간흐름이 공유하는 한 벌**
// (2026-08-05 공용화. 그전엔 monthly-view.tsx에만 있어서, 같은 격자를 쓰는 두 화면이 다른 강조를
// 갖게 될 상황이었다 — "같은 격자를 쓰는 두 화면이 다르면 읽는 법을 다시 익힌다"가 이 프로젝트 규칙).
//
// 규칙(2026-08-03 확정):
//  · **기준 = 앰버(accent2) / 비교 대상 = 민트(primary)** — 둘 다 민트 농담이던 때는 어느 줄이 기준인지
//    배지를 읽어야 알았다. 앰버는 이 프로젝트에서 이미 '선택된 것'(차트 클릭 막대) 색이라 어휘가 맞는다.
//  · 강조 행의 **대비 칸은 값 칸보다 한 단 진하게**(BASE_DELTA/CMP_DELTA) — 같은 색이면 값과 대비의
//    경계가 강조 행에서만 사라진다.
//  · ⚠️ **불투명이어야 한다** — 강조 행은 표 위/아래에 sticky로 붙어 다른 행이 그 밑을 지나가므로
//    반투명 틴트면 지나가는 숫자가 비쳐 보인다. 그래서 tr이 아니라 **셀마다** color-mix 배경을 깐다.
//  · ⚠️ `var(--surface)`·`var(--primary)`는 **없는 변수다**(토큰은 `--color-surface`·`--color-primary`)
//    — 오타면 color-mix가 통째로 무효가 되어 배경이 조용히 안 칠해진다(2026-08-03까지 그렇게 죽어 있었다).

import { useEffect, useState } from 'react';
import { shiftYm } from '@/lib/traffic';
import { shiftQuarter, monthsSoFar } from '@/lib/monthly';
import { monthsIn } from '@/lib/revenue';

/**
 * 클릭으로 고른 행 — 달·분기·연 셋 중 하나(2026-08-05, 사용자 요청 "분기 & 연도 클릭 시, 이전 기간
 * 비교 보이게"). **한 표에 기준은 하나다** — 달과 분기를 동시에 강조하면 앰버 줄이 둘이 되어 무엇과
 * 무엇을 견주는 중인지 알 수 없다. NF·마케팅 두 격자가 같은 타입·같은 판정을 쓴다.
 */
export type GridFocus = { kind: 'month' | 'quarter' | 'year'; key: string };

/** 그 기간이 덮는 월 목록 — 접기 확장·강조 판정이 쓴다. */
export const focusMonths = (f: GridFocus): string[] =>
  f.kind === 'month' ? [f.key] : monthsIn(f.kind, f.key);

/**
 * 비교 대상 기간 키. 달=전년동월(-12)/전월(-1) · 분기=전년동분기(-4)/전분기(-1) · **연=항상 전년**
 * (연에는 '전월'에 해당하는 짝이 없다 — [대비] 드롭다운과 무관하다).
 */
export const shiftGridFocus = (f: GridFocus, yoy: boolean): string =>
  f.kind === 'month'
    ? shiftYm(f.key, yoy ? -12 : -1)
    : f.kind === 'quarter'
      ? shiftQuarter(f.key, yoy ? -4 : -1)
      : String(Number(f.key) - 1);

/**
 * 비교 짝 **관계 이름** — 배지·툴팁이 같은 말을 쓴다(화면에서 문구를 손으로 적으면 둘이 갈린다).
 * ⚠️ **연도 숫자를 넣지 않는다**(2026-08-05 실측 버그): 배지는 비교 **대상 행**에 붙는데 거기에
 * `2024년 같은 기간`처럼 그 행 자신의 대비 짝을 쓰면, `2026년`을 골랐을 때 `2025년` 행에
 * '2024년 같은 기간' 배지가 붙어 무엇의 비교 대상인지 거꾸로 읽힌다. 배지는 **기준과의 관계**다.
 */
export const focusCmpLabel = (kind: GridFocus['kind'], yoy: boolean): string =>
  kind === 'year' ? '전년' : kind === 'quarter' ? (yoy ? '전년 동분기' : '전분기') : yoy ? '전년동월' : '전월';

/**
 * 기준(분기·연)이 **진행 중인가** — 매칭 로직을 켤지 말지 결정하는 게이트(mode·지표와 무관, 날짜만
 * 본다). 기준이 이미 끝난 기간이면 경과분 = 전체라 비교 대상도 자기 값(전체)을 그대로 보여줘도
 * 델타와 어긋나지 않는다(예: '2025년'을 클릭하면 완결이라 '2024년'도 12개월 전체가 맞다). **월 기준은
 * 항상 false**다 — 달은 그 자체로 완결 단위라 부분 매칭 문제가 없다.
 *
 * ⚠️ **매칭 라벨 문구는 여기서 만들지 않는다**(2026-08-05 code-review로 발견한 버그) — 예전엔 "기준의
 * 경과분(달력 월)"만 보고 `matchRangeLabel`을 계산해 `7월만` 같은 문구를 냈는데, [대비]가 **전월**(mom)
 * 이고 기준이 **분기**면 비교 대상은 전분기(다른 달력 달, 예: 4월)라서 라벨이 실제 매칭된 달과 달랐다
 * (분기 하나가 딱 1개월만 지난 시점엔 "달 개수"는 같아도 "어느 달인지"가 mode·kind에 따라 달라진다).
 * 라벨은 반드시 **그 지표의 실제 `prevMonths`**(deltaOfYear/deltaOfQuarter·marketingPeriodDelta가
 * 돌려주는 값)에서 `matchRangeLabel`로 뽑아야 mode·분기이동을 전부 반영한 정확한 문구가 된다.
 */
export function activeIsPartial(active: GridFocus | null, lastComplete: string | null): boolean {
  if (!active || active.kind === 'month') return false;
  const full = focusMonths(active);
  const soFar = monthsSoFar(full, lastComplete);
  return soFar.length > 0 && soFar.length < full.length;
}

export const BASE_CELL = 'bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-accent2))]';
export const BASE_DELTA = 'bg-[color-mix(in_srgb,var(--color-surface)_82%,var(--color-accent2))]';
export const CMP_CELL = 'bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-primary))]';
export const CMP_DELTA = 'bg-[color-mix(in_srgb,var(--color-surface)_84%,var(--color-primary))]';

/**
 * thead 높이 실측 — 기준 행을 **머리 바로 아래**에 고정하려면 그 높이를 알아야 한다(2·3행 구조라
 * 상수로 박으면 폰트·줌·상세 토글에 따라 어긋난다).
 * ⚠️ **콜백 ref로 잡는다** — 로딩 중엔 표가 없어 `useEffect(…, [])`가 도는 시점에 `ref.current`가
 * null이고, 데이터가 온 뒤 다시 돌지 않아 오프셋이 0으로 굳는다(실측).
 */
export function useTheadHeight() {
  const [el, setEl] = useState<HTMLTableSectionElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { ref: setEl, height };
}

/**
 * 기준·비교 행의 sticky 고정 + 배경 클래스. **기준은 머리 바로 아래, 비교는 바닥**에 박아 두면
 * 스크롤 위치와 무관하게 대비하는 두 줄이 항상 같은 화면에 있다(2026-08-03 "화면이 좁으니까
 * 전년동기가 떠도 안보이네").
 */
export function highlightPins(isBase: boolean, isCmp: boolean, theadH: number) {
  return {
    /** 값·대비 셀에 붙일 sticky 클래스 */
    pin: isBase
      ? 'sticky z-20 shadow-[0_1px_0_var(--color-border)]'
      : isCmp
        ? 'sticky bottom-0 z-20 shadow-[0_-1px_0_var(--color-border)]'
        : '',
    /** 맨 왼쪽 라벨 칸(가로도 고정)에 붙일 클래스 */
    pinLabel: isBase
      ? 'sticky left-0 z-30 shadow-[0_1px_0_var(--color-border)]'
      : isCmp
        ? 'sticky left-0 bottom-0 z-30 shadow-[0_-1px_0_var(--color-border)]'
        : 'sticky left-0 z-10',
    /** 기준 행만 top 오프셋을 준다(머리 높이만큼 내려 붙인다) */
    pinTop: isBase ? { top: theadH } : undefined,
    cellBg: isBase ? BASE_CELL : isCmp ? CMP_CELL : '',
    deltaBg: isBase ? BASE_DELTA : isCmp ? CMP_DELTA : '',
  };
}
