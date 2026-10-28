import { cn } from "@/lib/utils";
import { Fragment, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  MinusCircle,
  X,
  XCircle,
} from "lucide-react";
import { deltaTone } from "@/lib/format";
import { pageWindow } from "@/lib/pagination";
import { DialogShell, type DialogDim } from "./DialogShell";
import { CHANNELS, CHANNEL_META, Channel, NOT_CONNECTED_LABEL } from "@/lib/types";
import { classifyStatus } from "@/lib/statusClass";

/**
 * 공용 어휘 (design-system/MASTER.md "컨트롤 어휘" 결정표와 한 쌍).
 *
 * ⚠️ 이 파일에 있는 것을 화면에서 인라인 클래스로 다시 만들지 않는다.
 * 감사(2026-07-30) 실측: 카드 껍데기가 12변종, 빈 상태 4변종, 버튼 18변종이었다 —
 * 공용 컴포넌트가 있는데도 각 화면이 즉흥으로 다시 그린 결과이고, 그게 "UI가 불편하다"의 실체였다.
 */

/* ── 면(surface) ─────────────────────────────────────── */

/**
 * 카드 껍데기 클래스 — `Card`뿐 아니라 `<Link>`처럼 div가 아닌 태그로
 * 카드 전체를 감싸야 하는 화면(예: 보드 카드)도 이걸로 셸을 맞춘다.
 * 문자열을 직접 다시 타이핑하지 말 것 — 그게 12변종 사고의 원인이었다.
 */
export function cardClass({
  interactive,
  emphasis,
  className,
}: {
  interactive?: boolean;
  emphasis?: boolean;
  className?: string;
} = {}) {
  return cn(
    "rounded-card border border-border bg-surface shadow-card",
    emphasis && "border-l-[3px] border-l-text",
    interactive && "transition-shadow hover:shadow-lift",
    className
  );
}

/**
 * 카드 **안**의 카드 — 한 단 낮은 지면.
 * `cardClass()`는 최상위 카드 전용이라 이 층을 덮는 어휘가 없어서 6곳이 각자 손으로 때웠다
 * (2026-08-05 감사). 흰 카드 위에 또 흰 카드를 얹으면 층이 안 읽히므로 배경을 한 단 낮춘다.
 */
export function subCardClass(className?: string) {
  return cn("rounded-btn border border-border bg-bg-2", className);
}

/**
 * 라디오 카드 한 줄 — 몇 개 중 하나를 골라 **이유까지 읽고** 정할 때(반영 방법·처리 방법).
 * 단순 값 선택(조회 조건)은 드롭다운이 맞고, 이건 고르는 항목마다 설명이 붙는 쪽이다.
 * `<label className={radioCardClass(on)}>` 안에 라디오 입력 + 본문을 넣는다(2026-10-23 등록).
 */
export function radioCardClass(on: boolean, disabled?: boolean, className?: string) {
  return cn(
    "flex gap-2.5 rounded-btn border bg-surface px-3 py-2.5",
    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
    on ? "border-text" : "border-border hover:bg-surface-2",
    className
  );
}

export function Card({
  id,
  className,
  children,
  interactive,
  emphasis,
}: {
  /** 페이지 안 앵커 스크롤용(채널비교처럼 카드를 세로로 쌓고 특정 카드로 점프할 때) */
  id?: string;
  className?: string;
  children: ReactNode;
  /** 카드 전체가 링크·버튼일 때 — 호버 반응을 준다 */
  interactive?: boolean;
  /** 이 화면에서 먼저 봐야 할 하나 — 좌측 잉크 룰로 층을 올린다 */
  emphasis?: boolean;
}) {
  // 앵커 대상 카드는 스크롤 점프가 카드 상단을 뷰포트 맨 위에 딱 붙여, 그 위 PageHeader
  // (경로·제목)와 지표 카드가 통째로 화면 밖으로 밀려나 탭바 밑에 카드만 눌린 것처럼 보인다
  // (2026-09-09 실사고: 워스트 → 일예산 조정 딥링크, 실측 #budget top≈291px).
  // scroll-mt로 그 높이만큼 여백을 남겨 헤더가 계속 보이게 한다.
  return (
    <div
      id={id}
      className={cardClass({ interactive, emphasis, className: cn(id && "scroll-mt-[300px]", className) })}
    >
      {children}
    </div>
  );
}

/** 제목이 있는 카드 — 헤더 형태를 한 곳에서 고정한다 */
export function Section({
  title,
  kicker,
  titleExtra,
  icon,
  action,
  children,
  className,
  bodyClassName,
  id,
  strong,
}: {
  title: string;
  /**
   * 진한 잉크 헤더 바 — 한 화면에 성격이 다른 판 2~3개가 나란히 설 때 **판의 경계**를 제목 위계로
   * 세운다(2026-10-13 개요 "영역이 눈에 안 들어온다" 지적). 색 면을 늘리지 않고 잉크 한 색만 쓴다.
   * 화면마다 쓰지 말 것 — 나란히 선 판이 없는 화면에서 쓰면 모든 섹션이 다시 같은 무게가 된다.
   */
  strong?: boolean;
  kicker?: string;
  /** 제목 바로 옆에 붙는 컨트롤(보기 전환 세그먼트) — 별도 바를 아래에 쌓지 않고 제목줄에 합친다 */
  titleExtra?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 표·리스트처럼 자체 패딩을 갖는 내용이면 "" 로 넘겨 패딩을 뺀다 */
  bodyClassName?: string;
  /** 다른 화면에서 `#id`로 곧바로 오는 섹션이면 앵커를 준다(예: 워스트 → 일예산 조정) */
  id?: string;
}) {
  return (
    <Card className={className} id={id}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b px-4",
          strong ? "rounded-t-card border-text bg-text py-3.5" : "border-border py-3"
        )}
      >
        <div className={cn("flex min-w-0 items-center", strong ? "gap-2.5" : "gap-2")}>
          {icon && <span className={cn("shrink-0", strong ? "text-surface/75" : "text-muted")}>{icon}</span>}
          {/* 제목이 위 탭과 같은 말이면 비운다 — 같은 이름을 두 번 적어 줄만 쓰지 않게(2026-10-17) */}
          {title && (
            <h2
              className={cn(
                "truncate",
                strong ? "text-[18px] font-bold text-surface" : "text-[15px] font-semibold text-text"
              )}
            >
              {title}
            </h2>
          )}
          {titleExtra}
          {kicker &&
            (strong ? (
              <span className="tnum truncate text-[15px] font-semibold text-surface/70">{kicker}</span>
            ) : (
              <span className="label-ko truncate text-muted">{kicker}</span>
            ))}
        </div>
        {action}
      </div>
      <div className={bodyClassName ?? "p-4"}>{children}</div>
    </Card>
  );
}

/**
 * 페이지 제목 — h1의 형태(크기·굵기·행간)를 한 곳에서 고정한다.
 *
 * PageHeader가 안 맞는 화면(뒤로가기 링크가 위에 있거나 메타 줄이 따라붙는 레이아웃)에서
 * 클래스 문자열을 손으로 복제하던 것을 이걸로 모았다. 실측 4곳이 복제였고 그중
 * `entities/[channel]/[id]`는 `text-xl`로 크기까지 갈려 있었다(2026-08-18).
 */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn("text-[22px] font-bold leading-tight text-text", className)}>{children}</h1>
  );
}

/**
 * 문장 안에서 다른 화면으로 가는 링크.
 *
 * 어휘 ④(텍스트+화살표)는 독립된 이동 어포던스용이라, 문장 중간에 넣으면 화살표가 절을
 * 끊는다. 그래서 산문 안 이동은 밑줄로 구분한다 — 손으로 짜던 것을 어휘로 승격했다.
 */
export function LinkInline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("underline decoration-border transition-colors hover:text-primary", className)}>
      {children}
    </span>
  );
}

/**
 * 페이지 헤더 — 화면마다 제각각이던 제목 블록을 한 형태로 고정한다.
 * 전역·상시 요소만 여기 둔다(특정 항목·값에만 걸리는 컨트롤은 해당 섹션 근처로).
 */
export function PageHeader({
  title,
  titleNode,
  titleMeta,
  description,
  icon,
  eyebrow,
  action,
}: {
  title: string;
  /** 제목 자리를 통째로 대신 그린다 — 제목이 곧 전환 드롭다운인 화면(묶음 상세 `GroupSwitcher`) */
  titleNode?: ReactNode;
  /**
   * 제목과 **같은 줄**에 붙는 대상의 속성 — 상태 배지·CPC 전용 주석·소속 링크.
   *
   * 이게 없어서 상세 화면들(채널·집행·광고세트)이 PageHeader를 못 쓰고 헤더를 손으로 다시
   * 짰고, 그 결과 주인공 이름이 `h2 20px`로 내려앉아 화면 종류 라벨(`h1 22px`)보다 작아지는
   * **무게 역전**이 생겼다(2026-08-25 실측: 채널 상세 h1 "상세정보" 22px vs h2 채널명 20px).
   * 제목 옆에 뭘 붙여야 해서 손짜기로 도망가지 않도록 슬롯을 연다.
   */
  titleMeta?: ReactNode;
  description?: ReactNode;
  /** 제목 왼쪽 도메인 아이콘 — 텍스트보다 형태가 먼저 읽히게 */
  icon?: ReactNode;
  /** 이 화면이 어느 층인지(전사/캠페인) 또는 여기까지 온 경로(`Breadcrumb`) */
  eyebrow?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border-bright pb-4">
      <div className="min-w-0">
        {eyebrow}
        <div className={cn("flex flex-wrap items-center gap-2.5", eyebrow && "mt-2")}>
          {icon && <span className="shrink-0 text-text">{icon}</span>}
          {titleNode ?? <PageTitle>{title}</PageTitle>}
          {/* 화면 설명 문장은 제목 옆 ⓘ 안에 둔다 — 제목 아래 한 줄로 펼쳐 두면 매번 읽히는 글이 늘어
              숫자가 묻힌다(2026-10-13 "문장 상세설명은 툴팁 안에 숨겨라" 지적). */}
          {description && <InfoTip align="left">{description}</InfoTip>}
          {titleMeta}
        </div>
      </div>
      {action}
    </header>
  );
}

/**
 * 확인 다이얼로그 — 되돌리기 어려운 실행 전 마지막 확인. 브라우저 기본 `confirm()`을 쓰지 않는다
 * (앱 어휘·톤이 깨진다). 새 확인창이 필요할 때 여기 하나를 재사용한다 — 화면마다 즉흥으로
 * 뜨는 배경·카드가 늘면 카드 껍데기 12변종 사고가 팝업으로 재발한다.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  size = "sm",
  focusCancel = false,
  dim = "auto",
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** md = 확인할 대상을 목록으로 보여줄 때 — sm(384px)에선 목록 줄이 접혀 읽히지 않는다 */
  size?: "sm" | "md";
  /**
   * 첫 포커스를 취소 버튼에 둔다 — 되돌리기 어려운 실행(삭제·매체 반영)에서 Enter 한 번이
   * 곧바로 실행이 되지 않게. 기본은 지금처럼 확인 버튼(2026-10-27).
   */
  focusCancel?: boolean;
  /** 배경 딤 — auto는 다른 팝업 위에 뜨면 옅게(딤 두 겹 방지) */
  dim?: DialogDim;
}) {
  if (!open) return null;
  return (
    <DialogShell
      label={title}
      onBackdrop={onCancel}
      onEscape={onCancel}
      dim={dim}
      className={cardClass({ className: cn("w-full p-5 shadow-pop", size === "md" ? "max-w-lg" : "max-w-sm") })}
    >
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("quiet")} autoFocus={focusCancel}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={buttonClass("solid")} autoFocus={!focusCancel}>
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}

/**
 * 전면 팝업 — 여러 필드를 받거나(리포트 만들기 등) 완성된 결과를 요약해 보여주는 자리.
 * 되돌리기 어려운 실행 직전 확인 한 번은 `ConfirmDialog`를 쓴다 — 이건 그보다 본문이 긴 경우다.
 * 헤더·바닥은 고정하고 본문만 스크롤한다(2026-08-07 신설, 리포트 만들기 팝업).
 * Esc·배경 클릭·X는 `closable`일 때만 닫는다. Tab은 팝업 안에 갇히고 닫으면 연 버튼으로 돌아간다.
 */
export function Modal({
  open,
  onClose,
  closable = true,
  title,
  subtitle,
  children,
  footer,
  headerExtra,
  size = "md",
  dim = "auto",
}: {
  open: boolean;
  onClose: () => void;
  /** 생성 중 등 실수로 닫히면 안 될 때 false — 배경 클릭·X 버튼·Esc 모두 막는다 */
  closable?: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * 제목 줄 오른쪽(닫기 앞)에 붙는 컨트롤 — 본문 위에 바를 하나 더 쌓지 않고 헤더 한 줄에 합친다
   * (2026-10-16 소재 개선안 팝업: 전체 선택·선택 교체, 10-19 탭까지 — 제목·탭·실행·닫기 한 줄).
   */
  headerExtra?: ReactNode;
  /** xl = 여러 열을 나란히 고르는 선택기(묶음 담기 3열, 2026-10-02) — 3xl에선 열마다 이름이 잘린다 */
  /** 2xl = 카드 여러 장을 가로로 흘리며 처리하는 작업 팝업(개선안 처리, 2026-10-17) — 화면 거의 전부를 쓴다 */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** 배경 딤 — auto는 다른 팝업 위에 뜨면 옅게(딤 두 겹 방지) */
  dim?: DialogDim;
}) {
  if (!open) return null;
  const widthCls = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl", "2xl": "max-w-[1400px]" }[size];
  return (
    <DialogShell
      label={title}
      onBackdrop={closable ? onClose : undefined}
      onEscape={closable ? onClose : undefined}
      dim={dim}
      className={cardClass({
        className: cn("flex w-full flex-col shadow-pop", size === "2xl" ? "h-[94vh]" : "max-h-[85vh]", widthCls),
      })}
    >
      {/* 헤더에 컨트롤이 서면(탭·버튼) 제목과 가운데 줄을 맞춘다 — 위 정렬이면 제목이 버튼보다 떠 보인다 */}
      <div
        className={cn(
          "flex justify-between gap-3 border-b border-border px-5",
          headerExtra ? "items-center py-3" : "items-start py-4"
        )}
      >
        {/* 헤더 컨트롤이 없으면 제목 묶음이 줄어들어야 긴 부제가 닫기 버튼을 밀어내지 않는다 */}
        <div className={cn("min-w-0", headerExtra ? "shrink-0" : "flex-1")}>
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {/* flex-1: 안에서 첫 덩어리에 mr-auto를 주면 제목 바로 옆(탭), 나머지는 오른쪽 끝(실행)으로 갈린다 */}
        {headerExtra && <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{headerExtra}</div>}
        {closable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            className={buttonClass("ghost", "shrink-0 !px-1.5 !py-1.5")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="border-t border-border px-5 py-3.5">{footer}</div>}
    </DialogShell>
  );
}

/** 섹션 판 — 배경 톤으로 성격이 같은 블록을 묶는다(선이 아니라 면으로 가른다) */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-card border border-border bg-bg-2 p-4", className)}>
      {children}
    </section>
  );
}

/**
 * 탭 — **같은 화면 안에서 성격이 다른 콘텐츠 뷰를 전환**할 때만 쓴다(순서 있는 단계 표현 금지 —
 * 그건 `PipelineRail`의 몫이고, 탭으로 그리면 "지금 몇 번째 단계인지"가 거짓이 된다).
 *
 * ⚠️ 밑줄만으로 낸 1차 버전은 "탭처럼 안 보인다"는 재지적을 받았다 — 이 팔레트는 회색
 * 배경 톤차가 거의 안 보여 밑줄이 장식 취급됐다. **세그먼트 컨트롤(트랙 위 올라온 칩)**로
 * 바꿔 대비가 아니라 **형태(모양·그림자)**로 어포던스를 냈다.
 *
 * ⚠️ 그 칩도 다시 "구분이 잘 안 된다" 재지적을 받았다(2026-08-13) — `bg-bg-2`(#F4F6F8)와
 * `bg-surface`(#FFFFFF)는 10 이하 밝기차라 `shadow-card`의 흐린 블러만으론 화면·모니터에
 * 따라 거의 안 보인다. 그림자를 더 진하게 쌓는 대신(더 진한 블러도 결국 흐리다) **실선
 * 테두리**를 더했다 — 트랙(`border-border`)과 선택 칩(`border-border-bright`) 둘 다
 * 블러가 아니라 딱 떨어지는 경계선이라 밝기·해상도와 무관하게 항상 보인다. 색은 그대로
 * 안 쓴다(팔레트 원칙 "색은 상태 전용" 유지) — 진하기(잉크 톤)와 두께만 바꿨다.
 */
export interface TabItem<T extends string> {
  key: T;
  label: string;
  /** 라벨 앞 아이콘 — Lucide SVG. 성격이 다른 탭을 형태로 먼저 읽히게 할 때만 쓴다 */
  icon?: ReactNode;
  /**
   * 이 탭 앞에 얇은 세로선을 넣어 앞 묶음과 가른다.
   * 같은 트랙 안에 성격이 다른 갈래가 섞일 때만 쓴다 — 탭마다 넣으면 구분이 아니라 격자가 된다.
   * (2026-08-24 신설: 통합비교의 비교 3탭과 원장 성격의 "상세데이터"를 가르는 데 필요했다.)
   */
  dividerBefore?: boolean;
  /**
   * 지금 고를 수 없는 탭 — 조건(예: 로컬 서버 필요)이 안 맞을 때. 탭 자체를 숨기면
   * "그런 축이 있는지"를 모르게 되니, 흐리고 눌리지 않게만 두고 이유는 `disabledReason`으로 말한다.
   * (2026-09-02 신설: AdPilot 축 전환 탭에 미디어허브를 항상 보이되 로컬이 아니면 잠근다.)
   */
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * 1단 탭 트랙(세그먼트)과 탭 한 칸의 클래스 — `TabBar`와, 버튼이 아니라 링크·특수 라벨을 탭으로 쓰는 곳
 * (대시보드 서브 라우트, 개선안 처리 팝업 머리)이 같은 모양을 쓰게 한 곳에 둔다(2026-10-23).
 * 문자열을 화면에서 다시 타이핑하지 않는다. `compact`는 팝업 머리처럼 한 줄 높이가 모자란 곳 전용.
 */
export function tabTrackClass(className?: string) {
  return cn("inline-flex items-center gap-1 rounded-btn border border-border bg-bg-2 p-1", className);
}

export function tabItemClass(active: boolean, opts: { disabled?: boolean; compact?: boolean } = {}) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-btn border text-sm transition-colors",
    opts.compact ? "px-3 py-1" : "px-3.5 py-2",
    opts.disabled
      ? "cursor-not-allowed border-transparent font-medium text-muted opacity-45"
      : active
        ? "border-border-bright bg-surface font-semibold text-text shadow-card"
        : "border-transparent font-medium text-muted hover:text-text"
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  level = "main",
}: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /**
   * `sub` = 1단 탭(트랙) 아래에 한 번 더 놓이는 하위 탭. 트랙 모양을 되풀이하면 두 줄이 같은 계층으로 읽혀서,
   * 한 단 낮은 밑줄 탭으로 그린다(2026-10-23). 하위 탭이 아닌 곳에는 쓰지 않는다.
   */
  level?: "main" | "sub";
}) {
  if (level === "sub") {
    return (
      <div role="tablist" className="flex items-center gap-5 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            aria-disabled={t.disabled}
            disabled={t.disabled}
            title={t.disabled ? t.disabledReason : undefined}
            onClick={() => !t.disabled && onChange(t.key)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 py-2 text-sm transition-colors",
              t.disabled
                ? "cursor-not-allowed border-transparent font-medium text-muted opacity-45"
                : active === t.key
                  ? "border-text font-semibold text-text"
                  : "border-transparent font-medium text-muted hover:text-text"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div role="tablist" className={tabTrackClass()}>
      {tabs.map((t) => (
        <Fragment key={t.key}>
          {t.dividerBefore && (
            // 장식이 아니라 묶음 경계다 — 스크린리더에는 읽히지 않게 둔다
            <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />
          )}
          <button
            type="button"
            role="tab"
            aria-selected={active === t.key}
            aria-disabled={t.disabled}
            disabled={t.disabled}
            title={t.disabled ? t.disabledReason : undefined}
            onClick={() => !t.disabled && onChange(t.key)}
            className={tabItemClass(active === t.key, { disabled: t.disabled })}
          >
            {t.icon}
            {t.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/* ── 알림·안내 (형태 1벌로 고정) ─────────────────────── */

const NOTICE_TONE = {
  info: { cls: "border-border bg-surface text-muted", icon: Info, iconCls: "text-muted" },
  warning: {
    cls: "border-warning/30 bg-warning/[0.07] text-text",
    icon: AlertTriangle,
    iconCls: "text-warning",
  },
  danger: {
    cls: "border-negative/30 bg-negative/[0.07] text-text",
    icon: XCircle,
    iconCls: "text-negative",
  },
} as const;

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof NOTICE_TONE;
  children: ReactNode;
  className?: string;
}) {
  const t = NOTICE_TONE[tone];
  const Icon = t.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-card border px-4 py-3 text-sm leading-relaxed shadow-card",
        t.cls,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.iconCls)} aria-hidden />
      {/* flex-1 없이는 이 박스가 콘텐츠 폭(max-content)만큼만 잡혀서, 화면이 넓을수록
          카드 오른쪽에 빈 공간이 남고 그 안의 justify-between(닫기 버튼)이 카드 진짜 우측이
          아니라 콘텐츠 폭의 우측 — 즉 시각적으로 가운데 쪽 — 에서 멈춘다. 좁은 화면에서는
          콘텐츠 폭이 카드 폭과 비슷해 안 보이다가 사이드바를 접어 화면이 넓어지면 드러난다. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ── 컨트롤 ─────────────────────────────────────────── */

const BUTTON_VARIANT = {
  /** ① 데이터를 쓴다(생성·저장) — 화면당 1~2개로 아낀다 */
  solid: "bg-text text-surface hover:bg-text-2 border border-transparent",
  /** ② 같은 화면에서 연다·더한다 — 테두리 */
  quiet: "bg-surface text-text border border-border-bright hover:bg-surface-2",
  /** ③ 부수·반복 — 아이콘만 쓸 때 */
  ghost: "bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-text",
} as const;

export function buttonClass(variant: keyof typeof BUTTON_VARIANT = "solid", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
    BUTTON_VARIANT[variant],
    className
  );
}

/**
 * ⑥ 표시 토글 — **아이콘만**. 라벨을 붙이지 않는다.
 *
 * 어휘 ③(반복·부수)의 켜짐/꺼짐 판이다. 화면에 보이는 것만 바꾸고 **숫자는 바꾸지 않는**
 * 스위치가 여기 해당한다(데이터 라벨, 차트 접기 등). 값의 정의가 달라지는 것(가중치 적용)은
 * 부수 동작이 아니므로 라벨 있는 `Switch`를 쓴다 — 형태로 그 차이를 말한다.
 *
 * 왜 라벨을 금지하나: `데이터 라벨 ON`처럼 상태를 글자로 적으면 ①읽어야 알고(렌즈②)
 * ②테두리 버튼이 되어 "같은 화면에서 연다"(어휘②)와 생김새가 같아진다. 켜짐은 색으로 말한다.
 * (2026-08-10 감사에서 손짜기 3형태로 잡혔고, 2026-08-11 사용자가 같은 자리를 다시 지적했다.)
 */
/**
 * 라벨 있는 켜짐/꺼짐 칩 — **조회 조건이 아니라 boolean 하나**를 켜고 끄는 자리.
 *
 * 왜 필요했나(2026-08-24 지적 "소진제외는 체크등으로 하라했잖아 필터가 아니라고 그건"):
 * `0원 제외`처럼 켜고 끄는 게 전부인 값을 `전체 / 0원 제외` 드롭다운으로 만들면 두 번 눌러야
 * 하고, 조회 조건(채널·상태)과 같은 형태라 성격이 섞인다. 필터 묶음과 **떨어뜨려** 둔다.
 * 형태는 고방어드민 `ToggleButton`과 같다(같은 동작을 두 제품이 다르게 그리지 않는다).
 *
 * 아이콘만으로 충분한 표시 토글은 `IconToggle`(어휘 ⑥)을 쓴다 — 이건 라벨이 필요한 쪽이다.
 */
export function ToggleChip({
  on,
  onToggle,
  children,
  title,
  className,
  disabled,
}: {
  on: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
  title?: string;
  className?: string;
  /** 누를 수 없을 때 — 모양만 흐리지 않고 실제로 막는다(키보드·스크린리더에도 눌림으로 안 읽히게) */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
      aria-pressed={on}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on
          ? "border-accent/45 bg-accent/[0.09] font-medium text-text"
          : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-text",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border",
          on ? "border-accent bg-accent text-white" : "border-border bg-surface"
        )}
      >
        {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function IconToggle({
  on,
  onChange,
  icon,
  label,
  className,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  icon: ReactNode;
  /** 스크린리더·툴팁 전용. 화면에는 절대 찍지 않는다 */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        buttonClass("ghost", "!px-1.5 !py-1.5"),
        on && "bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent",
        className
      )}
    >
      {icon}
    </button>
  );
}

/**
 * ④ 다른 화면으로 간다 — 텍스트 + 화살표, 테두리 금지.
 * `external`이면 화살표 대신 새 창 아이콘 — 우리 앱 밖(매체 콘솔)으로 나간다는 걸 구분한다.
 */
export function LinkOut({
  children,
  className,
  external,
}: {
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-text",
        className
      )}
    >
      {children}
      {external ? <ExternalLink className="h-3.5 w-3.5" aria-hidden /> : <span aria-hidden>→</span>}
    </span>
  );
}

/**
 * 상위 층으로 돌아간다 — 텍스트 + **왼쪽** 화살표, 테두리 금지(LinkOut의 역방향).
 * 2026-08-11 `funnelpath/parts.tsx`에서 신설됐다가, 캠페인 전용 화면 밖(엔티티 상세·채널
 * 대시보드)에서도 같은 동작이 필요해져 2026-08-21 공용 어휘로 옮겼다 — 옮기기 전엔 두 화면이
 * `buttonClass("ghost")` + 수동 아이콘으로 같은 동작을 다른 형태(버튼 배경)로 재현하고 있었다.
 */
export function BackLink({
  href,
  onClick,
  children,
}: {
  /** 다른 라우트로 돌아간다(URL이 바뀐다) */
  href?: string;
  /** 같은 화면 안에서 이전 목록/상태로 돌아간다(URL은 안 바뀐다) — 예: 채널 상세 → 채널 목록 */
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls = "inline-flex items-center gap-1.5 text-xs text-muted hover:text-text";
  const content = (
    <>
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {children}
    </>
  );
  // URL 이동이냐 로컬 상태 이동이냐는 구현 디테일일 뿐 — 사용자에게는 둘 다 "상위로 돌아간다"는
  // 같은 동작이라 형태를 갈라 두지 않는다(2026-08-21 감사: 두 화면이 같은 동작을 버튼/링크로
  // 다른 형태로 그리고 있었다).
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

/**
 * 경로(브레드크럼) — **지금 어디에 있고 어떻게 여기까지 왔는지**를 한 줄로 보여준다.
 *
 * `BackLink`와 갈라 쓴다: BackLink는 **한 칸 위**로만 가고, 이건 **경로 전체**를 편다.
 * 계층이 2단(채널→캠페인)일 땐 BackLink로 충분하지만, 3단 이상(채널→캠페인→광고세트→소재)이
 * 되면 "한 칸 위"가 어디였는지가 화면에서 사라진다 — 그때 이걸 쓴다.
 *
 * 어휘 ④(다른 화면으로 간다)를 따른다: 텍스트 + 구분자, **테두리 금지**.
 * 마지막 칸은 현재 위치라 링크가 아니다 — 누를 수 없는 것을 누를 수 있게 그리지 않는다.
 */
export function Breadcrumb({
  items,
}: {
  /** 왼쪽이 상위. 마지막 항목이 현재 위치이고 href를 주지 않는다 */
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="현재 위치" className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted" aria-hidden />}
            {item.href && !last ? (
              <Link href={item.href} className="truncate text-muted hover:text-text">
                {item.label}
              </Link>
            ) : (
              // 현재 위치는 색으로 끝을 표시한다(무채 안에서 굵기만으론 끝이 안 읽힌다)
              <span className="truncate text-text" aria-current={last ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ── 데이터 출처 ─────────────────────────────────────── */

/**
 * 이 화면 숫자가 실데이터인지 샘플인지.
 *
 * 왜 필요한가: 읽기 경로는 조회가 0건이면 조용히 목데이터로 폴백한다. 화면이 그 사실을
 * 말하지 않으면 **샘플 숫자를 실적으로 읽는다** — 사이드바 배지는 Supabase 연결 여부만 보고
 * 있어서 전 화면이 목데이터인데도 LIVE로 켜져 있었다(2026-08-05).
 * "연결됐나"와 "이 숫자가 진짜인가"는 다른 질문이고, 사람이 알아야 하는 건 후자다.
 */
export function DataSourceBadge({
  source,
  detail,
  channels,
  className,
}: {
  source: "live" | "mock";
  /** 왜 그런지 한 줄(예: "5개 채널 연동") */
  detail?: string;
  /**
   * 자격증명 보유 채널 — 넘기면 호버·포커스에서 **채널 이름까지** 펼친다.
   *
   * 배지 본문이 개수만 말하는 이유는 그대로다(헤더는 좁고, 채널명을 늘어놓으면 바로 아래
   * `FreshnessNotice`가 같은 이름을 다시 늘어놓는다). 문제는 개요에서 "어느 채널이 실데이터인가"에
   * 답하던 `ChannelSummary`가 2026-08-13 탭 정리로 통합비교로 옮겨가면서 **그 질문에 답하는 곳이
   * 개요에서 통째로 사라졌다**는 것이다(2026-08-21 신고: "호버해도 네이버·애플이 안 뜬다" —
   * title이 본문과 똑같은 "5개 채널 연동"이었으니 호버해도 새 정보가 0이었다).
   * 그래서 개수는 그대로 두고 이름은 호버로 펼친다. 안 넘기면 예전처럼 네이티브 title만 쓴다.
   */
  channels?: Channel[];
  className?: string;
}) {
  const isLive = source === "live";
  const shellCls = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-btn border px-2 py-1 text-xs font-medium",
    isLive
      ? "border-positive/25 bg-positive/[0.08] text-positive"
      : "border-warning/25 bg-warning/[0.08] text-warning",
    className
  );
  const face = (
    <>
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isLive ? "bg-positive-face" : "bg-warning-face")}
        aria-hidden
      />
      {isLive ? "실데이터" : "샘플 데이터"}
      {detail && <span className="font-normal opacity-80">· {detail}</span>}
    </>
  );

  if (!channels) {
    return (
      <span className={shellCls} title={detail}>
        {face}
      </span>
    );
  }

  const liveSet = new Set(channels);
  // 색만으로 구분하지 않는다 — 채널마다 "실데이터/샘플"을 글자로 적는다.
  return (
    <InfoTip trigger={<span className={shellCls}>{face}</span>} align="right">
      <span className="label-ko mb-1.5 block text-muted">채널별 데이터 출처</span>
      <span className="flex flex-col gap-1">
        {CHANNELS.map((ch) => {
          const on = liveSet.has(ch);
          return (
            <span key={ch} className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CHANNEL_META[ch].color, opacity: on ? 1 : 0.35 }}
                aria-hidden
              />
              <span className={on ? "text-text" : "text-muted"}>{CHANNEL_META[ch].label}</span>
              <span className={cn("ml-auto pl-3 font-medium", on ? "text-positive" : "text-muted")}>
                {on ? "실데이터" : "샘플"}
              </span>
            </span>
          );
        })}
      </span>
    </InfoTip>
  );
}

/* ── 툴팁 ────────────────────────────────────────────── */

/**
 * ⓘ 정의·산식을 호버·포커스로 내리는 어휘.
 *
 * MASTER.md UX 라이팅 4번("상시 노출 설명은 1줄. 정의·산식은 `InfoTip`으로 내린다")이
 * 가리키던 컴포넌트인데 **코드에 없었다** — 그래서 화면마다 네이티브 `title` 한 줄로 때웠고,
 * `title`은 본문과 같은 말을 적어두면 호버해도 새 정보가 0이라는 걸 아무도 못 봤다
 * (2026-08-21 신고: "실데이터에 호버해도 어느 채널인지 안 뜬다"). 이제 여기 한 곳에 있다.
 *
 * 규칙
 *   - 호버 전용 금지 — 키보드 포커스로도 열린다(`tabIndex`+`group-focus-within`).
 *   - `hidden`이 아니라 투명도로 감춘다. `hidden`은 스크린리더에서도 사라진다.
 *   - 상시 노출 설명을 대체하지 않는다. "이게 뭐임?"에는 화면이 한 줄로 먼저 답하고,
 *     용어의 뜻·산식만 여기로 내린다.
 */
export function InfoTip({
  trigger,
  align = "right",
  children,
  className,
}: {
  /** 호버 대상. 없으면 ⓘ 아이콘만(어휘③ 부수 동작) */
  trigger?: ReactNode;
  /** 패널이 붙는 쪽 — 화면 오른쪽 끝의 트리거는 `right`(왼쪽으로 펴져야 안 잘린다) */
  align?: "left" | "right";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <span
        tabIndex={0}
        className="inline-flex cursor-help rounded-btn outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        {trigger ?? <Info className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />}
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full z-30 mt-1.5 w-max max-w-[min(22rem,80vw)] rounded-card border border-border bg-surface p-2.5 text-xs leading-relaxed text-text-2 opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          align === "right" ? "right-0" : "left-0"
        )}
      >
        {children}
      </span>
    </span>
  );
}


/* ── 입력 ────────────────────────────────────────────── */

/**
 * ⑤ 값을 적는다 — input·textarea·select 공통 껍데기.
 * 화면마다 `inputCls`를 로컬로 복제하던 것을 한 곳으로 모았다(복제본이 생기면 포커스색·높이가 갈린다).
 */
export function inputClass(className?: string) {
  return cn(
    "w-full rounded-btn border border-border bg-surface px-2.5 text-sm text-text outline-none focus:border-accent",
    className
  );
}

/** 한 줄 입력 기본 높이 */
export const INPUT_H = "h-9";

/**
 * 조회 조건 드롭다운 — **필터는 폼이 아니다.** 컴포넌트는 `ui/FilterDropdown` 하나다
 * (2026-10-19: 여기 있던 네이티브 `FilterSelect`를 걷어냈다 — 같은 조회 조건이 화면마다 두 모양이었다).
 *
 * `Field`(라벨을 위에 블록으로 얹는 폼 어휘)를 필터에 쓰면 컨트롤이 **세로 2단**이 되고,
 * 그 줄을 품은 헤더가 통째로 두꺼워진다. 2026-08-25 실측: 채널 상세 "캠페인" 섹션 헤더가
 * **79px**(라벨 16 + 마진 6 + select 32 = 54px 래퍼), 그중 34px이 라벨·여백만으로 나간 낭비였고
 * 라벨 텍스트("캠페인")는 바로 옆 섹션 제목과 **똑같은 말**이었다.
 *
 * 그래서 이 어휘는 라벨 슬롯을 **두지 않는다.** 무엇을 거르는 축인지는
 * ①섹션 제목이 이미 말하거나 ②첫 옵션에 축 이름을 넣어 말한다(`전체 채널`) —
 * 크래프트 12번 "닫힌 상태에 축 이름+선택값 병기".
 *
 * 폭은 **고정**이다. `min-w`만 주면 옵션 텍스트가 길어질 때 컨트롤이 그만큼 벌어져
 * 레이아웃이 흔들린다(실측: min-w 160px 지정인데 실제 194px로 늘어나 있었다).
 * 넘치는 이름은 말줄임한다.
 *
 * ⚠️ 폼(모달·생성 화면)에서는 계속 `Field`를 쓴다 — 거기선 라벨이 값을 설명하는 본체다.
 */
/**
 * 조회 조건 컨트롤의 **규격**(높이·글자·테두리). 드롭다운과 텍스트 입력이 한 줄에 서므로
 * 둘이 같은 치수를 써야 한다 — 이걸 안 나눠 뒀더니 드롭다운(h-8) 옆 검색 입력이
 * `inputClass`(h-9)로 남아 **같은 줄에서 4px 어긋났다**(2026-08-25 피어 보고).
 *
 * 입력은 `children`이 없어 컴포넌트로 감쌀 이득이 없으므로 클래스만 공유한다:
 * `<input className={filterControlClass("w-56")} placeholder="…" />`
 */
export function filterControlClass(className?: string) {
  return cn(
    // h-8: 조회 조건은 콘텐츠보다 가벼워야 한다(폼 입력 h-9와 갈라 쓴다)
    "h-8 shrink-0 rounded-btn border border-border bg-surface px-2 text-xs text-text outline-none focus:border-accent",
    className
  );
}

/**
 * 표 아래 쪽 넘김 — `N–M / 총 K` + 이전·쪽 번호·다음(2026-10-16 신설, 소재 비교 4탭).
 * 쪽이 하나뿐이면 그리지 않는다. 쪽 크기 고르기는 여기 두지 않는다 — 조회 조건이라 섹션 헤더의
 * 조회 조건(`FilterDropdown`) 줄에 합친다(바를 새로 쌓지 않는다). 이전·다음은 어휘 ③(아이콘만 + title).
 */
export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onChange,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const step = "!px-2 !py-1 min-w-[2rem] text-[13px]";
  return (
    <nav aria-label="쪽 넘김" className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-2", className)}>
      <span className="tnum text-[13px] text-muted">
        {from}–{to} / 총 {total}
      </span>
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          className={buttonClass("ghost", step)}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          title="이전 쪽"
          aria-label="이전 쪽"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {pageWindow(page, pageCount).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-[13px] text-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                buttonClass("ghost", cn("tnum", step)),
                n === page && "border-border-bright bg-surface-2 font-semibold text-text"
              )}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          className={buttonClass("ghost", step)}
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          title="다음 쪽"
          aria-label="다음 쪽"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </nav>
  );
}

/** 라벨 + 입력 한 쌍. 라벨은 한글이므로 `.label-ko`(대문자·넓은 자간은 한글을 뭉갠다) */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-ko mb-1.5 block text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

/* ── 값 표시 ─────────────────────────────────────────── */

/** 값의 증감(전기 대비) — 색만으로 의미 전달 금지라 화살표+부호를 병기한다. `lib/format.ts`의 `delta()` 반환형과 짝. */
export interface StatTrend {
  arrow: string;
  pct: number;
  dir: "up" | "down" | "flat";
}

/**
 * 라벨 + 값. 화면마다 Stat/Cell/Meta 세 이름으로 흩어져 있던 것을 하나로 모았다.
 * size: sm(카드 내부 셀) / md(요약 타일) / lg(대표 수치)
 *
 * `trend`를 쓰는 화면(리포트 KPI 등)은 형제 타일 중 증감이 없는 것도 반드시 `trend={null}`로
 * 넘긴다 — prop을 통째로 생략한 타일과 값이 없어 `null`인 타일을 구분해서, 후자만 빈 줄을
 * 예약한다. 그래야 같은 줄에 나열된 타일 중 하나만 증감이 있어도 줄 높이가 안 흔들린다
 * (2026-08-06 실측: `sub`를 조건부로만 넘긴 타일이 같은 5열 줄에서 혼자 3줄이 됐던 사고).
 */
export function StatBlock({
  label,
  value,
  sub,
  trend,
  trendTitle,
  lowerIsBetter,
  size = "md",
  align = "left",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  trend?: StatTrend | null;
  /** 증감 비교 기준 설명(예: "최근 7일 vs 직전 7일") — 값이 있을 때만 표시 */
  trendTitle?: string;
  /** CPI처럼 낮을수록 좋은 지표면 up/down의 색 의미를 반전한다 */
  lowerIsBetter?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
}) {
  const valueCls = {
    sm: "text-sm font-semibold",
    md: "text-xl font-bold leading-none",
    lg: "text-2xl font-bold leading-none",
  }[size];
  const showTrendRow = trend !== undefined;
  return (
    <div className={cn(align === "right" && "text-right", className)}>
      <p className={cn("truncate text-muted", size === "lg" ? "text-[13px] font-medium" : "label-ko")}>{label}</p>
      {/* ⚠️ 값은 truncate 금지 — 화면이 좁으면 숫자를 "…"로 잘라 감추는 게 아니라 줄바꿈한다.
          숫자·통화 문자열은 공백이 없어 기본 줄바꿈이 안 먹으므로 overflow-wrap:anywhere로
          강제한다(2026-08-13 실측: 5열 그리드에서 "소진 ₩6,339,933"이 "₩6,339,…"로 잘려
          실제 금액이 안 보였다 — 라벨과 달리 값은 잘리면 안 되는 사실이다). */}
      <p className={cn("tnum mt-1.5 text-text [overflow-wrap:anywhere]", valueCls)}>{value}</p>
      {showTrendRow ? (
        <div className={cn("mt-2 flex items-center gap-2", align === "right" && "justify-end")}>
          {trend && (
            <span
              className={cn(
                "tnum inline-flex items-center gap-0.5 font-medium",
                size === "lg" ? "text-[13px]" : "text-xs",
                deltaTone(trend.dir, lowerIsBetter)
              )}
              title={trendTitle}
            >
              <span aria-hidden>{trend.arrow}</span>
              {trend.pct >= 0 ? "+" : ""}
              {trend.pct.toFixed(1)}%
            </span>
          )}
          {sub && <span className={cn("truncate text-muted", size === "lg" ? "text-[13px]" : "text-xs")}>{sub}</span>}
        </div>
      ) : (
        sub && <p className="mt-1.5 truncate text-xs text-muted">{sub}</p>
      )}
    </div>
  );
}

/** 타일형 통계 — StatBlock을 카드에 담은 것 */
export function StatTile(props: Parameters<typeof StatBlock>[0]) {
  return (
    <Card className="px-4 py-3.5">
      <StatBlock {...props} />
    </Card>
  );
}

/* ── 배지·상태 ───────────────────────────────────────── */

export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-btn border px-2 py-0.5 text-xs font-medium",
        !color && "border-border bg-surface-2 text-muted",
        className
      )}
      style={color ? { color, backgroundColor: color + "14", borderColor: color + "33" } : undefined}
    >
      {children}
    </span>
  );
}

/**
 * 반복성 메타 주석(소스·자격 제한 등) — 상태가 아니라 참고정보라 배지(테두리+톤배경) 대신
 * 아이콘+무채 텍스트로만 표기한다. 표 행마다 배지를 박스로 두르면 "배지 남발"이 된다(2026-07-31).
 * 판정·연동상태처럼 진짜 '상태'를 알리는 자리는 계속 `Badge`를 쓴다 — 여긴 그 반대편 어휘다.
 */
export function MetaNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs text-muted", className)}>
      <Info className="h-3 w-3 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** 판정 톤(good/warn/bad/mute) → 배지 클래스. `VERDICT_META[...].tone`과 짝 — 화면마다 다시 정의하지 않는다. */
export const VERDICT_TONE_CLASS: Record<string, string> = {
  good: "border-positive/25 bg-positive/[0.08] text-positive",
  warn: "border-warning/25 bg-warning/[0.08] text-warning",
  bad: "border-negative/25 bg-negative/[0.08] text-negative",
  mute: "border-border bg-surface-2 text-muted",
};

/**
 * 채널 점 + 이름. 기록에 채널이 비었거나 모르는 값이면 점 없이 "채널 미상" — 빈 채널을 Google로 지어 그리면
 * 없는 사실(Google 소재)이 화면에 생긴다(엔진 규칙 "없는 값을 추정·날조 금지", 2026-10-27 감사 06).
 */
export function ChannelName({ channel }: { channel?: string | null }) {
  const ch = channel ? (CHANNEL_META as Record<string, { color: string; label: string } | undefined>)[channel] : undefined;
  if (!ch) return <span className="text-muted">채널 미상</span>;
  return (
    <>
      <ChannelDot color={ch.color} />
      {ch.label}
    </>
  );
}

export function ChannelDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
}

/**
 * 매체별 캠페인 상태값 → 사람 언어.
 * 매체마다 어휘가 다르다 — Google은 `ENABLED`, Naver는 `ELIGIBLE`, Meta는 `ACTIVE`인데
 * 셋 다 같은 뜻(운영중)이다. 예전엔 Meta 어휘만 매핑돼 있어서 Google·Naver 캠페인은
 * 전부 raw 문자열이 그대로 노출됐다(2026-08-06 "ENABLED가 뭐임" 신고로 발견).
 *
 * ⚠️ 이 상태는 매체의 **on/off 스위치**일 뿐이다 — ENABLED인데 예산 소진·심사 대기·
 * 타겟 매칭 실패 등으로 실제 게재가 안 되는 경우까지는 안 말해준다(그건 매체 콘솔의
 * "게재 상태(serving status)" 몫이라 여기서 지어내지 않는다).
 */
export const CAMPAIGN_STATUS_MAP: Record<string, { tone: "good" | "warn" | "mute" | "bad"; label: string }> = {
  // 운영중 — 매체마다 다른 단어, 같은 뜻
  ACTIVE: { tone: "good", label: "운영중" },
  ENABLED: { tone: "good", label: "운영중" },
  ELIGIBLE: { tone: "good", label: "운영중" },
  LEARNING: { tone: "warn", label: "학습중" },
  // 일시정지
  PAUSED: { tone: "mute", label: "일시정지" },
  CAMPAIGN_PAUSED: { tone: "mute", label: "일시정지(캠페인)" },
  ADSET_PAUSED: { tone: "mute", label: "일시정지(광고그룹)" },
  // 삭제·보관 — 화면에 남아 있어도 더 손댈 게 없는 상태
  REMOVED: { tone: "mute", label: "삭제됨" },
  DELETED: { tone: "mute", label: "삭제됨" },
  ARCHIVED: { tone: "mute", label: "보관됨" },
  // 검수·문제 — 사람이 확인해야 하는 상태
  PENDING_REVIEW: { tone: "warn", label: "검수중" },
  IN_PROCESS: { tone: "warn", label: "검수중" },
  DISAPPROVED: { tone: "bad", label: "반려" },
  WITH_ISSUES: { tone: "bad", label: "문제있음" },
  PENDING_BILLING_INFO: { tone: "bad", label: "결제정보 필요" },
};

/**
 * 필터·정렬용 3버킷. 켜짐 판정은 `classifyStatus`(lib/statusClass) 하나에 얹는다 — on→운영중, off→일시정지,
 * 모름→기타(숨기지 않는다). 검수중(`IN_PROCESS`·`PENDING_REVIEW`)은 기타다: Meta effective_status에서 둘 다
 * 아직 게재가 확인되지 않은 처리·검수 대기라 "운영중"으로 세면 켜진 게 확인되지 않은 것이 섞인다.
 * 표시 라벨·톤(`CAMPAIGN_STATUS_MAP`)은 그대로 "검수중"이다.
 */
export function statusBucket(status: string | null | undefined): "운영중" | "일시정지" | "기타" {
  const c = classifyStatus(status);
  if (c === "on") return "운영중";
  if (c === "off") return "일시정지";
  return "기타";
}

/** 톤별 아이콘 — 색만으로 상태를 구분하지 않는다(판정 톤 3~4종을 형태로도 구분). */
const STATUS_TONE_ICON = {
  good: CheckCircle2,
  warn: AlertTriangle,
  mute: MinusCircle,
  bad: XCircle,
} as const;

/** 텍스트 대신 아이콘 하나로 상태를 보여준다. 라벨은 title(호버 툴팁)과 aria-label(스크린리더)로만 남긴다. */
export function StatusPill({ status }: { status?: string | null }) {
  const m = status ? CAMPAIGN_STATUS_MAP[status] : undefined;
  if (!m) {
    // 모르는 상태값은 지어내지 않고 raw 그대로 — 다만 다음에 매핑을 추가할 수 있게 title로 남긴다.
    return (
      <span className="text-xs font-medium text-muted" title="아직 매핑 안 된 상태값">
        {status ?? "—"}
      </span>
    );
  }
  const Icon = STATUS_TONE_ICON[m.tone];
  const textCls = { good: "text-positive", warn: "text-warning", mute: "text-muted", bad: "text-negative" }[
    m.tone
  ];
  return (
    <span className={cn("inline-flex items-center", textCls)} title={m.label}>
      <Icon className="h-4 w-4" role="img" aria-label={m.label} />
    </span>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Card className="px-4 py-10 text-center">
      <p className="text-sm text-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

/**
 * 빈 상태 표준 문구 (2026-08-10 신설).
 *
 * 왜: 같은 사태를 「데이터 없음」/「표시할 데이터가 없습니다」/「이 기간에 데이터가 없어요」/
 * 「선택한 조건에 데이터가 없어요」 4가지로 쓰고 있었다(감사 실측: 30곳 중 `~습니다` 6곳,
 * 체언 종결 5곳). 문구를 화면마다 다시 타이핑하면 문체가 갈리므로 사태별로 한 벌만 둔다.
 *
 * 사태는 5가지뿐이고, 사용자가 취할 행동이 전부 다르므로 이 구분은 유지한다:
 * ①기간에 없음 ②조건(필터)에 없음 ③아직 만든 게 없음 ④연동 안 됨 ⑤불러오기 실패.
 *
 * 문체는 `design-system/MASTER.md` UX 라이팅 정본 = **해요체 하나**. `~습니다`·체언 종결 금지.
 * `subject`는 조사까지 붙여서 넘긴다("소재가", "캠페인이") — 한국어 조사는 앞 글자에 따라
 * 갈려서 코드로 붙이면 "소재이(가)"류가 나온다.
 */
export const EMPTY_COPY = {
  /** ① 기간을 좁힌 결과 비었다 — 기간을 넓히면 채워질 수 있다 */
  period: (subject = "데이터가") => `이 기간에 ${subject} 없어요.`,
  /** ② 필터·선택 조건으로 좁혀서 비었다 — 조건을 풀면 채워질 수 있다 */
  filter: (subject = "데이터가") => `선택한 조건에 ${subject} 없어요.`,
  /** ③ 아직 아무것도 만들지 않았다 — 만들기 액션과 함께 쓴다 */
  notYet: (subject: string) => `아직 ${subject} 없어요.`,
  /** ④ 채널 자격증명이 없어 숫자를 낼 수 없다 — 없는 값을 지어내지 않는다 */
  notConnected: (channelLabel: string, subject = "숫자가") =>
    `${channelLabel} — ${NOT_CONNECTED_LABEL}. 연동하면 ${subject} 채워져요.`,
  /** ⑤ 불러오기 실패 — 사용자가 할 수 있는 행동으로 끝낸다 */
  failed: (subject = "데이터를") => `${subject} 불러오지 못했어요. 새로고침해 주세요.`,
} as const;

/**
 * 덩어리 — 카드·팝업 안의 한 영역(진단·지금 문구·추천안·입력 등). 이름표(18px 아이콘 + 15px 굵은 잉크, 내용보다 한 단 크게) + 본문.
 * 카드 안 구획을 가를 땐 간격만으로 하지 말고 카드 폭 띠 + 사이 선으로(winning 11-1 ⑧).
 * `surface`면 한 단 다른 면을 깐다 — 사용자가 고르거나 입력하는 덩어리만 쓴다(면이 2개를 넘으면 구분이 사라진다).
 * 덩어리 사이 간격은 부모가 `space-y-5` 이상으로 준다(안쪽 8px의 2.5배). 손으로 이름표를 짜지 말 것 — 회색 13px로 돌아간다.
 * 원리: service-master winning 11-1 "덩어리마다 이름표를 먼저 단다"(2026-10-17).
 */
export function Block({
  icon,
  label,
  aside,
  surface = false,
  children,
  className,
}: {
  icon: ReactNode;
  label: string;
  /** 이름표 줄 오른쪽(글자 수·추천도 등) */
  aside?: ReactNode;
  surface?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", surface && "rounded-btn bg-bg-2 p-3.5", className)}>
      <h4 className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[15px] font-bold text-text">
          <span className="text-text [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        {aside}
      </h4>
      {children}
    </section>
  );
}

/**
 * 상태 묶음 이름표 — 아이콘 + 색 + 이름 + 건수. 요약 줄과 구역 머리가 **같은 부품**을 써서, 요약에서 본 모양을 구역에서 다시 찾게 한다.
 * `size="lg"`는 구역 머리, 기본은 요약 줄. 건수 0이면 흐리게.
 */
export function StateHeading({
  icon,
  label,
  count,
  toneClass,
  size = "sm",
}: {
  icon: ReactNode;
  label: string;
  count: number;
  /** 아이콘 색(text-warning 등) — 할 일이 있는 상태만 색, 기다리는 상태는 text-muted */
  toneClass: string;
  size?: "sm" | "lg";
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", count === 0 && "opacity-50")}>
      <span className={cn(toneClass, size === "lg" ? "[&>svg]:h-5 [&>svg]:w-5" : "[&>svg]:h-4 [&>svg]:w-4")} aria-hidden>
        {icon}
      </span>
      <span className={cn("font-bold text-text", size === "lg" ? "text-[17px]" : "text-sm")}>{label}</span>
      <span className={cn("tnum font-bold text-text-2", size === "lg" ? "text-[17px]" : "text-sm")}>{count}</span>
    </span>
  );
}
