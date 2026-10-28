'use client';

import Link from 'next/link';
import { RefreshIcon, ArrowRightIcon, CheckIcon } from '@/components/icons';

// ─────────────────────────────────────────────────────────────────────────────
// 어드민 컨트롤 어휘 정본 (2026-07-30 신설)
//
// 같은 기능이 화면마다 다른 형태로 나오던 문제를 끝내려고 만든 파일이다. 실측 사고:
// '새로고침' 하나가 [텍스트만] / [아이콘+텍스트] / [아이콘만] 세 형태로 갈려 있었고,
// 페이지로 이동하는 [목표]가 버튼 테두리를 달고 있어 "여기서 목표를 고치나?"로 읽혔다.
//
// **동작의 종류가 형태를 정한다** — 화면 사정에 맞춰 그때그때 고르지 않는다:
//   ① 주 액션(PrimaryButton)  = 데이터를 쓴다(저장·반영·생성). 민트 채움. 화면당 1~2개.
//   ② 보조 액션(ActionButton) = 같은 화면에서 무언가 연다·더한다(모달 열기·행 추가). 테두리.
//   ③ 아이콘 버튼(IconButton) = 반복·부수 동작(새로고침·초기화). 라벨 없이 아이콘 + title.
//   ④ 페이지 이동(NavLink)    = 다른 화면으로 간다. **버튼 테두리 금지**, 텍스트 + 화살표(→).
//   ④-b 외부 원천(ExternalLink) = 어드민 밖으로 새 탭(시트·토스·콘솔). 같은 규칙 + 화살표 ↗.
//   ⑤ 선택(SelectMenu·MultiSelect) = 조회 조건. 어드민은 전부 드롭다운(design-system.md 규칙).
//   ⑥ 보기 토글(ToggleButton) = 같은 표·화면에 무언가를 **넣고 뺀다**(켜짐/꺼짐이 대칭인 상태).
//      체크 표식 + 켜짐이면 민트 틴트. 라벨은 **명사로 고정**(문구가 바뀌면 폭이 흔들린다).
//
// ⚠️ ③과 ④를 섞지 말 것: 테두리가 있으면 "여기서 처리된다", 화살표가 있으면 "여기서 나간다"다.
// 어포던스가 목적지를 말해야 사용자가 클릭 전에 결과를 안다.
//
// ⚠️ **②와 ⑥과 ⑤를 한 줄에 놓을 때가 이 어휘의 시험대다**(2026-08-05 지적 "드롭다운 메뉴와 탭버튼
// 메뉴 구분 명확히되게"). 월간 흐름 표 헤더에 [검색량 확인][진행 중 달 보기][분기 합계 보기][대비▾]가
// 나란히 있었는데 ⑥이 어휘에 없어서 **상태 토글 3개를 전부 ②(ActionButton)로 때웠고**, ⑤의 닫힌 모양도
// ②와 클래스가 거의 같아 넷이 한 무리로 보였다. 이제 형태가 셋으로 갈린다:
//   · ② 액션   = 테두리 + 라벨만(아이콘 없음) · hover 시 **배경**이 바뀐다 → "누르면 뭔가 열린다"
//   · ⑥ 토글   = 왼쪽 **체크 표식** + 켜짐이면 민트 틴트 → "지금 켜져 있다/꺼져 있다"
//   · ⑤ 드롭다운 = 눌린 면(bg-bg) + `축 · 값` + 오른쪽 ▾ · hover 시 **테두리**가 진해진다 → "고르는 칸"
// 배치 순서도 고정: **[액션] │ [토글…] │ [조회 조건…]** (세로 hairline으로 무리를 가른다).
// ─────────────────────────────────────────────────────────────────────────────

// active:scale = 눌렀을 때 실제 클릭 모션(2026-08-03 추가). hover는 마우스 오버 상태일 뿐 "눌렀다"는
// 반응이 아니라서, 클릭 자체에 즉각 피드백이 없으면 "눌린 건가 안 눌린 건가"를 데이터가 바뀔 때까지
// 기다려야 알 수 있었다(uxui checklist 14번, 전 제품 공통 예외 없음).
const BASE = 'inline-flex shrink-0 items-center gap-1.5 rounded-lg transition-all active:scale-[0.96]';

/** ① 주 액션 — 데이터를 쓰는 동작. 민트 채움은 화면당 1~2개로 아낀다. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  title,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${BASE} bg-mint px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** ② 보조 액션 — 모달을 열거나 행을 더하는 동작(화면을 떠나지 않는다). */
export function ActionButton({
  children,
  onClick,
  disabled,
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${BASE} border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-soft hover:bg-hairline disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * ⑥ 보기 토글 — 같은 표·화면에 무언가를 넣고 뺀다(분기 합계 행·진행 중 달 행·세부 채널 열…).
 *
 * ②(ActionButton)와 왜 다른가: ②는 **일회성 동작**(모달이 열리고 끝)이라 상태가 없고, 이건 **상태**다
 * (지금 켜져 있는지가 화면의 정보다). 그걸 같은 옷으로 입히면 "누르면 뭐가 열리나?"와 "지금 켜져 있나?"를
 * 같은 형태가 말하게 된다 — 실제로 월간·주간 흐름 표 헤더에서 그 둘이 섞여 있었다.
 *
 * ⚠️ **라벨은 상태에 따라 바꾸지 않는다**(명사 고정). 그전엔 '진행 중 달 보기'↔'진행 중 달 숨기기'로
 * 글자 수가 달라져 누를 때마다 옆 버튼들이 밀렸다(레이아웃 흔들림 금지 — 어드민 전역 규칙).
 * 켜짐/꺼짐은 체크 표식과 틴트가 말한다.
 */
export function ToggleButton({
  children,
  on,
  onToggle,
  title,
  size = 'sm',
  className = '',
}: {
  children: React.ReactNode;
  on: boolean;
  onToggle: () => void;
  title?: string;
  /** `md` = 팝업·패널처럼 눌러 고르는 것이 본문인 자리(표 헤더의 `sm`보다 크다) */
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={title}
      className={`${BASE} border ${size === 'md' ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-[12px]'} ${
        on
          ? 'border-primary/45 bg-primary/[0.09] font-medium text-ink'
          : 'border-border bg-surface text-ink-soft hover:bg-hairline'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border ${
          on ? 'border-primary bg-primary text-white' : 'border-ink-mute/45'
        }`}
      >
        {on && <CheckIcon size={9} />}
      </span>
      {children}
    </button>
  );
}

/**
 * ③ 아이콘 버튼 — 반복·부수 동작. **라벨을 붙이지 않는다**(붙이면 보조 액션과 구분이 사라진다).
 * `FilterResetButton`과 같은 형태·크기다(툴바에 나란히 놓여도 리듬이 맞는다).
 */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
  className = '',
}: {
  icon: (p: { size?: number; className?: string }) => React.ReactElement;
  label: string; // 화면에 안 보이지만 aria-label·title로 필수
  onClick?: () => void;
  disabled?: boolean;
  spinning?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-border p-1.5 text-ink-soft transition-colors hover:bg-hairline disabled:opacity-50 ${className}`}
    >
      <Icon size={14} className={spinning ? 'animate-spin' : undefined} />
    </button>
  );
}

/** 새로고침 — 어드민 전역 단일 형태(아이콘만). 텍스트 '새로고침' 버튼을 새로 만들지 말 것. */
export function RefreshButton({
  onClick,
  loading,
  label = '새로고침',
  className = '',
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <IconButton icon={RefreshIcon} label={label} onClick={onClick} disabled={loading} spinning={loading} className={className} />
  );
}

/**
 * 원장 표의 값 입력칸 — 인라인 수정 행이 있는 표(주간 원장·일별 원장)가 함께 쓴다.
 * 화면마다 이 문자열을 복사해 두면 포커스 링·높이가 갈린다(2026-09-07 일별 원장 창을 뗄 때 정본화).
 */
export const INPUT_CLS =
  'rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30';

/**
 * ④-b 외부 원천으로 나가기 — 어드민 밖(구글시트·토스 대시보드·Play Console 등) **새 탭**으로 간다.
 *
 * ④(NavLink)와 형태 규칙은 같다(테두리 금지 · 화살표로 "여기서 나간다"). 다른 점 둘:
 *  · next/Link가 아니라 `<a target="_blank">` — 어드민 라우터가 처리할 주소가 아니다.
 *  · 화살표가 **↗**(45° 위)다. 같은 앱 안에서 옆으로 가는 것(→)과 바깥으로 나가는 것을 형태로 가른다.
 *
 * 왜 정본이 필요했나: '값을 어디서 보고 오는지' 링크가 월간 흐름(수기 입력 축)·주간 매출 입력·
 * 시트 연동 배지에 각각 손으로 짜여 있어 색·크기·화살표 유무가 다 달랐다. 새로 달 때 이걸 쓴다.
 * ⚠️ 원천 링크는 '눌러도 데이터가 바뀌지 않는다'가 읽혀야 한다 — 그래서 민트 채움(①)을 쓰지 않는다.
 */
export function ExternalLink({
  href,
  children,
  title,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12px] text-primary underline-offset-2 transition-colors hover:underline ${className}`}
    >
      {children}
      <ArrowRightIcon size={12} className="-rotate-45 opacity-70" />
    </a>
  );
}

/**
 * ④ 페이지 이동 — 화살표로 "여기서 나간다"를 말한다. **버튼 테두리를 주지 않는다.**
 * 라벨은 목적지를 말해야 한다: '목표' ✕ → '목표 관리' ○ (한 단어 라벨은 이 화면의 기능으로 읽힌다).
 */
export function NavLink({
  href,
  children,
  title,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline ${className}`}
    >
      {children}
      <ArrowRightIcon size={13} className="opacity-60" />
    </Link>
  );
}
