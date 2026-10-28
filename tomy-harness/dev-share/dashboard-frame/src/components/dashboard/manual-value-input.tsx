'use client';

import { ArrowRightIcon, CheckIcon, PencilIcon, XIcon } from '@/components/icons';

/**
 * 월 격자표 수기 입력 칸 — **행 단위 일괄 편집**에서 쓰는 입력 하나. 부모가 그 달 행의 [수정]을
 * 누르면 대상 칸 전부가 이 컴포넌트로 바뀌고, 값은 부모의 draft에만 쌓인다 — **이 칸은 저장하지
 * 않는다**. 실제 쓰기는 행 하나가 [저장] 한 번으로 몰아서 한다(마케팅 채널 월간흐름
 * `marketing-channel-grid.tsx`에서 먼저 쓰던 어휘, 2026-09-01 NF 월간흐름 `monthly-grid.tsx`와
 * 공용화 — 칸마다 따로 저장하면 여러 칸을 고칠 때 그만큼 왕복해야 한다).
 */
export default function ManualValueInput({
  ym,
  label,
  value,
  disabled,
  sourceUrl,
  sourceLabel,
  onChange,
  onCommit,
  onCancel,
}: {
  ym: string;
  label: string;
  value: string;
  disabled?: boolean;
  /** 이 값을 어디서 보고 오는지 바로가기 — 없으면 링크를 안 그린다. */
  sourceUrl?: string;
  /** 링크 표시 문구. 생략하면 `"{label} 열기"`. */
  sourceLabel?: string;
  onChange: (raw: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
          if (e.key === 'Escape') onCancel();
        }}
        aria-label={`${ym} ${label} 입력`}
        className="w-20 rounded border border-mint bg-white px-1.5 py-0.5 text-right text-[13px] tabular-nums text-ink focus:outline-none disabled:opacity-60"
      />
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[11px] text-primary underline-offset-2 hover:underline"
        >
          {sourceLabel ?? `${label} 열기`}
          <ArrowRightIcon size={10} className="opacity-70" />
        </a>
      )}
    </div>
  );
}

/**
 * 수기 입력 칸의 **보기 상태** — 클릭하면 그 행의 일괄 편집이 열린다(`onEdit`). 미입력은 앰버 테두리 +
 * '입력'으로 눈에 띄게 한다(2026-08-03 지적 "입력필요 적혀있는데 어쩌란거야" — 누를 수 있는 칸임을
 * 형태로 말한다). NF 월간흐름 `monthly-grid.tsx`에서 쓰던 것을 2026-10-16 주간 앱 지표 카드와 공용화.
 * 연필은 부모 행에 `group` 클래스가 있으면 hover 때 드러난다.
 */
export function ManualDisplayButton({
  empty,
  text,
  title,
  onEdit,
}: {
  empty: boolean;
  text: string;
  title: string;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // 행 클릭(기준 선택 등)까지 같이 발동하면 값을 고치려다 강조가 딴 데로 옮겨간다.
        e.stopPropagation();
        onEdit();
      }}
      title={title}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-right tabular-nums transition-colors ${
        empty
          ? 'border-accent2/50 bg-accent2/10 text-alert hover:bg-accent2/20'
          : 'border-transparent text-muted hover:border-border hover:bg-hairline'
      }`}
    >
      {empty ? '입력' : text}
      <PencilIcon size={10} className={empty ? 'opacity-80' : 'opacity-0 transition-opacity group-hover:opacity-60'} />
    </button>
  );
}

/**
 * 행 단위 일괄 편집의 머리 컨트롤 — 보기 상태 = 연필(③ 아이콘만), 편집 상태 = 저장(민트)·취소 + 오류.
 * 마케팅 채널 월간흐름·NF 월간흐름 행 머리에 손으로 짜여 있던 것과 같은 형태(2026-10-16 공용화,
 * 두 격자는 아직 자체 마크업 — design-system.md §남은 부채).
 */
export function RowEditPencil({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      title={`${label} 값을 한 번에 수정합니다`}
      aria-label={`${label} 수정`}
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded text-ink-mute/70 transition-colors hover:bg-hairline hover:text-ink"
    >
      <PencilIcon size={11} />
    </button>
  );
}

export function RowEditActions({
  saving,
  error,
  onSave,
  onCancel,
}: {
  saving: boolean;
  error: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1 flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title="저장"
          aria-label="저장"
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded bg-mint text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <CheckIcon size={12} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          title="취소"
          aria-label="취소"
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded border border-border text-ink-mute transition-colors hover:bg-hairline disabled:opacity-50"
        >
          <XIcon size={12} />
        </button>
      </div>
      {error && <span className="max-w-[140px] whitespace-normal text-[11px] leading-tight text-rose-700">{error}</span>}
    </div>
  );
}
