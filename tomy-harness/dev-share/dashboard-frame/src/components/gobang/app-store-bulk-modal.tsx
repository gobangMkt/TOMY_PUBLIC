'use client';

// 앱 스토어 값 일괄 입력(2026-10-16): 지난 주들의 미입력을 한 번에 채운다(요청 "미입력 부분 한방에 어캐 채우냐").
// 콘솔(Play Console·App Store Connect)에서 내려받은 **일별 CSV를 통째로 붙여 넣으면** 주(일~토)로 접어
// 미리보기를 보여주고 한 번에 저장한다. 접는 법 = 다운로드 7일 합 · 활성 7일 평균 · 평점 토요일 값
// (lib/app-store-weekly.ts `foldDaily`). 7일이 다 없는 주는 반쪽 값이라 저장하지 않는다.
// ⚠️ 기본은 **빈 칸만 채운다**. 이미 넣은 값을 덮으려면 [기존 값 덮어쓰기]를 켜야 한다.
import { useMemo, useState } from 'react';
import FullModal from '@/components/ui/full-modal';
import SelectMenu from '@/components/ui/select-menu';
import { ExternalLink, PrimaryButton, ToggleButton } from '@/components/ui/controls';
import { fmtInt } from '@/lib/format';
import { weekRangeLabel } from '@/lib/weekly';
import {
  ASC_ANALYTICS_URL,
  PLAY_CONSOLE_URL,
  STORE_FIELDS,
  cellNumber,
  draftOf,
  emptyStoreValues,
  foldDaily,
  foldWeekly,
  parsePastedTable,
  ratingDefaultCol,
  storeRowFromDraft,
  type StoreField,
  type StoreValues,
} from '@/lib/app-store-weekly';

type Unit = 'daily' | 'weekly';
const AGG_LABEL = { sum: '7일 합', avg: '7일 평균', last: '토요일 값' } as const;
// 지표별로 콘솔 어디서 무엇을 받아 붙이는지(2026-10-17 공식 도움말 조사, service-master
// reference_marketing_app_store_metrics.md). iOS 평점은 콘솔이 이력을 주지 않아 붙여넣기 대상이 아니다.
const PASTE_GUIDE: Record<StoreField, string> = {
  aos_downloads: 'Play Console › 통계 › 사용자 획득 › 신규 사용자, 간격 일별로 보고서 내보내기한 CSV',
  ios_downloads: 'App Store Connect › 분석 › 지표 › 최초 다운로드 수, 일별 값',
  aos_active_avg: 'Play Console › 통계 › 일일 활성 사용자, 간격 일별로 보고서 내보내기한 CSV',
  ios_active_avg: 'App Store Connect › 분석 › 지표 › 활성 기기, 하루 단위 값(데이터 공유 동의자만 집계)',
  aos_rating: 'Play Console › 평점 및 리뷰 › 평점 › 기간 전체·집계 일별 CSV. 값 열은 전체 기간 평균(Total Average Rating)이 자동 선택됨',
  ios_rating: 'App Store Connect는 평점 이력을 내보내지 않음. 매주 평가 및 리뷰의 개요 평점을 표의 연필로 직접 입력',
};

export default function AppStoreBulkModal({
  open,
  onClose,
  store,
  lastFull,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  store: Map<string, StoreValues>;
  lastFull: string;
  onSave: (rows: Record<string, string>[]) => Promise<void>;
}) {
  const [field, setField] = useState<StoreField>('aos_downloads');
  const [unit, setUnit] = useState<Unit>('daily');
  const [text, setText] = useState('');
  const [col, setCol] = useState<string>('');
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const meta = STORE_FIELDS.find((f) => f.key === field)!;

  const table = useMemo(() => (text.trim() ? parsePastedTable(text) : null), [text]);
  const autoCol = table ? (meta.rating ? ratingDefaultCol(table) : table.defaultCol) : -1;
  const colIndex = table ? (table.columns.some((c) => String(c.index) === col) ? Number(col) : autoCol) : -1;

  const fmt = (n: number) => (meta.rating ? n.toFixed(2) : fmtInt(n));
  const preview = useMemo(() => {
    if (!table) return [];
    const points = table.rows
      .map((r) => ({ date: r.date, value: cellNumber(r.cells[colIndex]) }))
      .filter((p): p is { date: string; value: number } => p.value !== null);
    const folded = unit === 'daily' ? foldDaily(points, meta.agg, lastFull) : foldWeekly(points, lastFull);
    return folded
      .map((w) => {
        const cur = store.get(w.week)?.[field] ?? null;
        const status: 'skip' | 'same' | 'keep' | 'new' | 'overwrite' =
          w.value === null
            ? 'skip'
            : cur === w.value
              ? 'same'
              : cur === null
                ? 'new'
                : overwrite
                  ? 'overwrite'
                  : 'keep';
        return { ...w, cur, status };
      })
      .reverse();
  }, [table, colIndex, unit, meta.agg, lastFull, store, field, overwrite]);
  const toSave = preview.filter((p) => p.status === 'new' || p.status === 'overwrite');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const rows = toSave.map((p) =>
        storeRowFromDraft(p.week, { ...draftOf(store.get(p.week) ?? emptyStoreValues()), [field]: String(p.value) }),
      );
      await onSave(rows);
      setText('');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const statusText = (p: (typeof preview)[number]) =>
    p.status === 'skip'
      ? meta.agg === 'last' && unit === 'daily'
        ? '제외(토요일 값 없음)'
        : `제외(${p.days}일만 있음)`
      : p.status === 'same'
        ? '같음'
        : p.status === 'new'
          ? '새로 채움'
          : p.status === 'overwrite'
            ? '덮어씀'
            : '기존 값 유지';

  return (
    <FullModal
      open={open}
      onClose={onClose}
      size="medium"
      title="앱 스토어 값 일괄 입력"
      subtitle="콘솔에서 내려받은 CSV를 붙여 넣으면 주(일~토) 단위로 접어 한 번에 저장합니다"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-mute">
            {err ? <span className="text-rose-700">{err}</span> : `${meta.label} · ${toSave.length}주 저장 예정`}
          </span>
          <PrimaryButton onClick={() => void save()} disabled={saving || !toSave.length}>
            {saving ? '저장 중…' : `${toSave.length}주 저장`}
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SelectMenu
            label="지표"
            ariaLabel="채울 지표 선택"
            value={field}
            options={STORE_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
            onChange={(v) => setField(v as StoreField)}
            width="w-[260px]"
          />
          <SelectMenu
            label="단위"
            ariaLabel="붙여 넣는 값의 단위 선택"
            value={unit}
            options={[
              { value: 'daily', label: `일별(${AGG_LABEL[meta.agg]})` },
              { value: 'weekly', label: '주별(그대로)' },
            ]}
            onChange={(v) => setUnit(v as Unit)}
            width="w-[200px]"
          />
          {table && table.columns.length > 1 && (
            <SelectMenu
              label="값 열"
              ariaLabel="붙여 넣은 표에서 값으로 쓸 열 선택"
              value={String(colIndex)}
              options={table.columns.map((c) => ({ value: String(c.index), label: c.label }))}
              onChange={(v) => setCol(v)}
              width="w-[220px]"
            />
          )}
          <ToggleButton on={overwrite} onToggle={() => setOverwrite((v) => !v)} title="이미 들어 있는 값도 붙여 넣은 값으로 바꿉니다">
            기존 값 덮어쓰기
          </ToggleButton>
          <span className="ml-auto inline-flex items-center gap-3">
            <ExternalLink href={meta.os === 'aos' ? PLAY_CONSOLE_URL : ASC_ANALYTICS_URL}>
              {meta.os === 'aos' ? 'Play 콘솔' : 'ASC 분석'}
            </ExternalLink>
          </span>
        </div>
        <p className="text-[12px] text-ink-mute">{PASTE_GUIDE[field]}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'콘솔에서 내려받은 CSV를 통째로 붙여 넣으세요. 날짜 열은 자동으로 찾습니다.\n예) 2026-10-04,1234\n    2026-10-05,1180'}
          className="h-40 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted focus:border-mint focus:outline-none"
        />
        {text.trim() && !table && (
          <p className="text-[12px] text-rose-700">날짜와 숫자가 있는 줄을 찾지 못했습니다. 날짜 열과 값 열이 함께 들어 있는지 확인해 주세요.</p>
        )}
        {preview.length > 0 && (
          <div className="max-h-[40vh] overflow-auto rounded-lg border border-hairline">
            <table className="w-full border-collapse text-right text-[13px]">
              <thead className="sticky top-0 bg-surface shadow-[0_1px_0_var(--color-border)]">
                <tr className="text-[12px] text-muted">
                  <th className="px-3 py-1.5 text-left font-medium">주(일~토)</th>
                  <th className="px-3 py-1.5 font-medium">넣을 값</th>
                  <th className="px-3 py-1.5 font-medium">지금 값</th>
                  <th className="px-3 py-1.5 text-left font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.week} className="border-t border-hairline">
                    <td className="px-3 py-1.5 text-left font-medium whitespace-nowrap text-ink">{weekRangeLabel(p.week)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ink">{p.value === null ? '·' : fmt(p.value)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ink-mute">{p.cur === null ? '·' : fmt(p.cur)}</td>
                    <td
                      className={`px-3 py-1.5 text-left text-[12px] ${
                        p.status === 'new' || p.status === 'overwrite' ? 'text-primary' : 'text-ink-mute'
                      }`}
                    >
                      {statusText(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FullModal>
  );
}
