// 로딩 골격 — 라우트 `loading.tsx`가 부르는 단 하나의 어휘.
//
// 왜 이걸 만들었나: Paid 데스크 4화면이 전부 force-dynamic + await 구조라서 화면을 옮기면
// 응답이 올 때까지 **이전 화면이 그대로 멈춰** 있었다(감사 2026-08-10, loading.tsx 전 앱 0건).
// 스피너 하나로 때우면 뜬 다음에 레이아웃이 튀므로, 그 화면의 골격(타일 행·차트 판·표)을 그린다.
//
// ⚠️ 라우트마다 손으로 짜지 않는다 — 같은 역할이 다른 형태로 늘어나는 게 이 코드베이스가 앓던 병이다.
// 새 화면의 골격이 여기 조합으로 안 나오면 shape 옵션을 여기에 더한다.

import { cn } from "@/lib/utils";
import { Card, PageHeader } from "./primitives";

/**
 * 골격 막대 하나. 무채(`surface-2`)만 쓴다 — 색이 보이면 그건 상태라는 원칙 때문에
 * 로딩 자리에 상태색·accent를 쓰지 않는다.
 * 펄스는 `prefers-reduced-motion`에서 끈다(globals.css의 전역 규칙 + 여기서 한 번 더 명시).
 */
export function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-3 animate-pulse rounded bg-surface-2 motion-reduce:animate-none",
        className
      )}
    />
  );
}

/** 카드 상단 제목 줄 — 실제 `Section` 헤더와 같은 높이·선을 유지한다 */
function SkeletonCardHead() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <SkeletonBar className="h-4 w-32" />
      <SkeletonBar className="h-3 w-20" />
    </div>
  );
}

/** KPI 타일 행 — `StatTile`과 같은 격자·패딩 */
function SkeletonTiles({ count }: { count: number }) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="px-4 py-3.5">
          <SkeletonBar className="h-3 w-16" />
          <SkeletonBar className="mt-2.5 h-6 w-24" />
          <SkeletonBar className="mt-3 h-3 w-12" />
        </Card>
      ))}
    </section>
  );
}

/** 차트 판 — recharts 컨테이너 높이(260~300px)에 맞춰 판을 예약한다 */
function SkeletonChart({ h }: { h: string }) {
  return (
    <Card>
      <SkeletonCardHead />
      <div className="px-4 py-4">
        <SkeletonBar className={cn("w-full rounded-btn", h)} />
      </div>
    </Card>
  );
}

/** 표 — 헤더 줄 + 데이터 줄. 줄 높이를 실제 원장 표와 맞춰 스크롤 위치가 안 튄다 */
function SkeletonTable({ rows }: { rows: number }) {
  return (
    <Card>
      <SkeletonCardHead />
      <div className="px-4 py-2">
        <div className="flex items-center gap-4 border-b border-border py-2.5">
          <SkeletonBar className="h-3 flex-[3]" />
          <SkeletonBar className="h-3 flex-1" />
          <SkeletonBar className="h-3 flex-1" />
          <SkeletonBar className="h-3 flex-1" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 py-3 last:border-0">
            <SkeletonBar className="h-3.5 flex-[3]" />
            <SkeletonBar className="h-3.5 flex-1" />
            <SkeletonBar className="h-3.5 flex-1" />
            <SkeletonBar className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 독립 카드 스택 — 리포트 보관함처럼 카드 한 장이 항목 하나인 자리 */
function SkeletonCards({ count }: { count: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <SkeletonBar className="h-4 max-w-[16rem]" />
            <SkeletonBar className="mt-2 h-3 max-w-[22rem]" />
          </div>
          <SkeletonBar className="h-9 w-24 shrink-0 rounded-btn" />
        </Card>
      ))}
    </div>
  );
}

/** 카드 한 장 안에 쌓이는 목록 줄 — 채널 목록(행 클릭 → 상세)이 이 형태 */
function SkeletonRows({ count }: { count: number }) {
  return (
    <Card>
      <SkeletonCardHead />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
          <SkeletonBar className="h-2 w-2 shrink-0 rounded-full" />
          <SkeletonBar className="h-4 w-24 shrink-0" />
          <SkeletonBar className="hidden h-3.5 flex-1 sm:block" />
          <SkeletonBar className="hidden h-3.5 w-20 shrink-0 lg:block" />
          <SkeletonBar className="h-3.5 w-4 shrink-0" />
        </div>
      ))}
    </Card>
  );
}

/** 카드 한 장 안의 2열 격자 — 채널별 요약처럼 서브카드가 나열되는 자리 */
function SkeletonGrid({ count }: { count: number }) {
  return (
    <Card>
      <SkeletonCardHead />
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface px-4 py-3">
            <SkeletonBar className="h-4 w-28" />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <SkeletonBar className="h-8" />
              <SkeletonBar className="h-8" />
              <SkeletonBar className="h-8" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 조회 조건 줄 — 드롭다운 자리를 `INPUT_H`(h-9)로 예약 */
function SkeletonFilters({ count }: { count: number }) {
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 px-4 py-3.5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>
            <SkeletonBar className="h-3 w-12" />
            <SkeletonBar className="mt-1.5 h-9 w-36 rounded-btn" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export interface PageSkeletonShape {
  /** 제목 위 배지 개수(층 배지·데이터 출처 배지) */
  chips?: number;
  /** 헤더 우측 컨트롤(기간 선택 등) 자리 예약 여부 */
  action?: boolean;
  /** 조회 조건(드롭다운) 개수 */
  filters?: number;
  /** KPI 타일 개수 */
  tiles?: number;
  /** 차트 판 — 1장(single) / 2열(pair) */
  chart?: "none" | "single" | "pair";
  /** 표 데이터 줄 수 */
  table?: number;
  /** 카드 한 장 안에 쌓이는 목록 줄 수(채널 목록) */
  rows?: number;
  /** 카드 한 장 안 2열 격자 개수(채널별 요약) */
  grid?: number;
  /** 독립 카드 스택 개수(리포트 보관함) */
  cards?: number;
}

/**
 * 화면 골격. 제목·설명은 화면마다 고정된 문자열이라 **실제 값을 넘긴다** —
 * 제목까지 회색 막대로 두면 뭘 여는 중인지 모르고, 로드 후 헤더 높이가 튄다.
 */
export function PageSkeleton({
  title,
  description,
  chips = 2,
  action = true,
  filters = 0,
  tiles = 0,
  chart = "none",
  table = 0,
  rows = 0,
  grid = 0,
  cards = 0,
}: { title: string; description?: string } & PageSkeletonShape) {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">{title} 화면을 불러오는 중이에요</span>

      <PageHeader
        eyebrow={
          chips > 0 ? (
            <span className="flex flex-wrap items-center gap-2">
              {Array.from({ length: chips }, (_, i) => (
                <SkeletonBar key={i} className={cn("h-5 rounded-btn", i === 0 ? "w-20" : "w-28")} />
              ))}
            </span>
          ) : undefined
        }
        title={title}
        description={description}
        action={action ? <SkeletonBar className="h-9 w-56 rounded-btn" /> : undefined}
      />

      {filters > 0 && <SkeletonFilters count={filters} />}
      {tiles > 0 && <SkeletonTiles count={tiles} />}
      {chart === "single" && <SkeletonChart h="h-[280px]" />}
      {chart === "pair" && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonChart h="h-[260px]" />
          <SkeletonChart h="h-[260px]" />
        </section>
      )}
      {table > 0 && <SkeletonTable rows={table} />}
      {rows > 0 && <SkeletonRows count={rows} />}
      {grid > 0 && <SkeletonGrid count={grid} />}
      {cards > 0 && <SkeletonCards count={cards} />}
    </div>
  );
}

/**
 * 팝업 안 표·목록이 불러와지는 동안의 골격 — 문장 한 줄("읽는 중")은 눈에 안 띄어 떴는지 안 떴는지 모르겠다는 지적(2026-10-27).
 * 실제 표처럼 머리 줄 + 행 N개를 그린다. 불러오는 대상은 `label`로 한 줄 말해 준다.
 */
export function TableSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="space-y-2.5" aria-hidden>
        <div className="flex gap-3">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="ml-auto h-3 w-28" />
          <SkeletonBar className="h-3 w-20" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border pt-2.5">
            <SkeletonBar className="h-4 w-4 rounded-sm" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkeletonBar className="h-3 w-1/3" />
              <SkeletonBar className="h-4 w-1/2" />
            </div>
            <SkeletonBar className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
