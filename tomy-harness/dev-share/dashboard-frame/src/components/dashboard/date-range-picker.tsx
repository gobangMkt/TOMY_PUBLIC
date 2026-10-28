'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, type DateRange as RdpRange } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import { presetRange } from '@/lib/ad-banner';
import { excludeToday } from '@/lib/period';
import { CalendarIcon, ChevronDownIcon } from '@/components/icons';

// GA4/구글애즈식 기간 선택기: 트리거 버튼 하나 → 팝오버(좌 프리셋 · 우 달력 그리드 + 선택값 표시 + 비교기간).
// 범위는 그리드에서 시작→끝 두 번 클릭으로만 잡는다 — 구조적으로 from>to 역전 불가이고,
// 달력이 하나뿐이다(2026-07-27: 시작일/종료일 네이티브 date input 제거. 그 칸들은 각자 브라우저 달력을
// 또 띄워 한 팝오버 안에 달력이 셋이 됐다).
// from/to는 ISO(yyyy-mm-dd), 빈 문자열 = 미지정(전체).

type Range = { from: string; to: string };

export type CompareMode = 'prev' | 'yoy' | 'none';

type Props = {
  minDate: string;
  maxDate: string;
  value: Range;
  onChange: (next: Range) => void;
  align?: 'left' | 'right'; // 팝오버 펼침 방향. 화면 우측 끝 컨트롤은 'right'로 잘림 방지.
  compareValue?: CompareMode; // 있으면 팝오버 하단에 비교기간 선택 노출
  onCompareChange?: (c: CompareMode) => void;
};

const COMPARE_OPTS: { value: CompareMode; label: string }[] = [
  { value: 'prev', label: '직전 기간' },
  { value: 'yoy', label: '전년 동기' },
  { value: 'none', label: '비교 안 함' },
];

// ── ISO(yyyy-mm-dd) ↔ Date 변환 ────────────────
// 로컬 자정 기준으로만 다룬다. `new Date('2026-07-01')`은 UTC로 해석돼 KST에서 하루 밀리므로 쓰지 않는다.
function toDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}
function toISO(d: Date | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoShift(date: string, delta: number): string {
  const d = toDate(date);
  if (!d) return '';
  d.setDate(d.getDate() + delta);
  return toISO(d);
}
// ── 클릭 → 범위 규칙 ────────────────
// react-day-picker의 range 기본 동작(addToRange)은 "이미 범위가 있으면 그 끝을 옮긴다"라서,
// 프리셋이 들어있는 상태로 팝오버를 열면 첫 클릭이 새 시작일이 되지 않는다(2026-07-28 신고).
// 규칙을 우리가 갖는다: 홀수 클릭 = 시작일(기존 범위 버림), 짝수 클릭 = 종료일(앞이면 뒤집어 담음).
export type PickPhase = 'start' | 'end';

export function pickDay(
  draft: Range,
  phase: PickPhase,
  iso: string,
): { draft: Range; phase: PickPhase } {
  if (phase === 'start' || !draft.from) return { draft: { from: iso, to: '' }, phase: 'end' };
  const flip = iso < draft.from; // ISO(yyyy-mm-dd)는 문자열 비교 = 날짜 비교
  return {
    draft: flip ? { from: iso, to: draft.from } : { from: draft.from, to: iso },
    phase: 'start',
  };
}

// 두 날짜 사이 일수(양끝 포함).
export function daysBetween(from: string, to: string): number {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

// ── 프리셋 ────────────────
// maxDate(선택 가능한 마지막 날) 기준으로 구간을 만든다. 월·분기는 매출/OKR이 월 단위라 필수.
type Preset = { key: string; label: string; range: (max: string) => Range };

export function monthRange(max: string, monthsAgo: number): Range {
  const base = toDate(max) ?? new Date();
  const first = new Date(base.getFullYear(), base.getMonth() - monthsAgo, 1);
  const last = new Date(base.getFullYear(), base.getMonth() - monthsAgo + 1, 0);
  // 이번 달은 미래로 넘어가지 않게 max에서 자른다.
  return { from: toISO(first), to: toISO(last > base ? base : last) };
}
// 올해 = 그해 1월 1일 ~ max.
export function yearRange(max: string): Range {
  const base = toDate(max) ?? new Date();
  return { from: toISO(new Date(base.getFullYear(), 0, 1)), to: toISO(base) };
}
export function quarterRange(max: string): Range {
  const base = toDate(max) ?? new Date();
  const qStart = new Date(base.getFullYear(), Math.floor(base.getMonth() / 3) * 3, 1);
  return { from: toISO(qStart), to: toISO(base) };
}

// 🚨 오늘(진행 중이라 집계 미완결)은 프리셋 기본값에서 늘 뺀다 — '오늘' 프리셋과 달력 그리드(칸 자체는
// maxDate까지 그대로 선택 가능)로만 명시적으로 볼 수 있다.
// ⚠️ '이번 달'·'이번 분기'는 입력(maxDate)을 당겨서 계산하면 안 된다 — 매달/매분기 1일엔 그 '어제'가
// 이미 지난달/지난분기라 "이번 달"이 그 앞 달로 잘못 잡힌다. 그래서 이 둘은 실제 maxDate로 달/분기를
// 고른 뒤 **끝일만** 어제로 자른다(capEnd). '최근 N일'은 그런 정체성이 없어 입력을 당겨도 안전하다.
function capEnd(r: Range): Range {
  return { from: r.from, to: excludeToday(r.to) };
}

const PRESETS: Preset[] = [
  { key: 'today', label: '오늘', range: (m) => ({ from: m, to: m }) },
  { key: 'yesterday', label: '어제', range: (m) => ({ from: isoShift(m, -1), to: isoShift(m, -1) }) },
  { key: '7', label: '최근 7일', range: (m) => presetRange(excludeToday(m), 7) },
  { key: '30', label: '최근 30일', range: (m) => presetRange(excludeToday(m), 30) },
  { key: '90', label: '최근 90일', range: (m) => presetRange(excludeToday(m), 90) },
  { key: 'thisQuarter', label: '이번 분기', range: (m) => capEnd(quarterRange(m)) },
  { key: 'thisYear', label: '올해', range: (m) => capEnd(yearRange(m)) },
  { key: '365', label: '최근 1년', range: (m) => presetRange(excludeToday(m), 365) },
  { key: 'all', label: '전체 기간', range: () => ({ from: '', to: '' }) },
];

const md = (s: string) => (s ? `${s.slice(5, 7)}.${s.slice(8, 10)}` : '');

function matchPreset(v: Range, max: string): Preset | null {
  if (!v.from && !v.to) return PRESETS.find((p) => p.key === 'all') ?? null;
  for (const p of PRESETS) {
    if (p.key === 'all') continue;
    const r = p.range(max);
    if (r.from === v.from && r.to === v.to) return p;
  }
  return null;
}

function triggerLabel(v: Range, max: string): string {
  const p = matchPreset(v, max);
  if (p?.key === 'all') return '전체 기간';
  if (p) return `${p.label} · ${md(v.from)}–${md(v.to)}`;
  if (v.from && v.to) return `${md(v.from)} – ${md(v.to)}`;
  if (v.from) return `${md(v.from)} ~`;
  if (v.to) return `~ ${md(v.to)}`;
  return '전체 기간';
}

// 달력 셀 스타일 — 선택 구간은 민트 채움(primary-fill), 양끝만 진한 민트. 무지개·과한 라운딩 금지.
const dayBase =
  'relative h-8 w-8 rounded-md text-sm text-ink-soft transition-colors hover:bg-hairline disabled:cursor-default disabled:text-ink-mute/30 disabled:hover:bg-transparent';

const RDP_CLASSNAMES = {
  months: 'flex gap-5',
  month: 'space-y-2',
  month_caption: 'flex h-7 items-center justify-center',
  caption_label: 'text-sm font-semibold text-ink',
  nav: 'absolute inset-x-0 top-0 flex h-7 items-center justify-between px-1',
  button_previous:
    'inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-mute hover:bg-hairline disabled:opacity-30',
  button_next:
    'inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-mute hover:bg-hairline disabled:opacity-30',
  chevron: 'h-3.5 w-3.5 fill-current',
  month_grid: 'border-collapse',
  weekdays: '',
  weekday: 'h-7 w-8 text-xs font-normal text-ink-mute',
  week: '',
  day: 'p-0',
  day_button: dayBase,
  today: 'font-semibold text-primary',
  outside: 'text-ink-mute/40',
  disabled: 'text-ink-mute/30',
  hidden: 'invisible',
  // 범위: 가운데는 연한 민트 띠, 양끝은 진한 민트 채움
  range_middle: '!bg-primary-fill/15 !rounded-none !text-ink',
  range_start: '!bg-primary !text-white !rounded-l-md !rounded-r-none hover:!bg-primary',
  range_end: '!bg-primary !text-white !rounded-r-md !rounded-l-none hover:!bg-primary',
  selected: '',
} as const;

export default function DateRangePicker({
  minDate,
  maxDate,
  value,
  onChange,
  align = 'left',
  compareValue,
  onCompareChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Range>(value);
  const [phase, setPhase] = useState<PickPhase>('start');
  const [hover, setHover] = useState(''); // 종료일 고르는 중 미리보기 띠
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0); // 래퍼 기준 가로 보정(px)
  const [vw, setVw] = useState(0);

  // 화면이 좁으면 달력을 1개월로 — 2개월(약 610px)이 안 들어가면 잘리거나 가로 스크롤이 생긴다.
  const monthsShownCount = vw > 0 && vw < 760 ? 1 : 2;

  // 팝오버 열 때 현재 확정값으로 드래프트 초기화.
  const openPopover = () => {
    setDraft({ from: value.from ?? '', to: value.to ?? '' });
    setPhase('start'); // 열면 항상 "다음 클릭 = 새 시작일"
    setHover('');
    setOpen(true);
  };

  // 열릴 때/리사이즈 시 뷰포트 폭 추적. clientWidth = 스크롤바 제외(이걸 안 쓰면 스스로 스크롤을 만든다).
  useLayoutEffect(() => {
    if (!open) return;
    const sync = () => setVw(document.documentElement.clientWidth);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [open]);

  // ⚠️ align은 '선호'일 뿐 — 그대로 두면 트리거가 화면 우측에 있을 때 팝오버가 삐져나가
  //    가로 스크롤이 생긴다(호출부마다 align을 챙기는 방식은 계속 빠뜨림). 실측해서 화면 안으로 당긴다.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const wrap = wrapRef.current;
      const pop = popRef.current;
      if (!wrap || !pop) return;
      const EDGE = 8; // 화면 가장자리 최소 여백
      const viewport = document.documentElement.clientWidth;
      const wrapRect = wrap.getBoundingClientRect();
      const popW = pop.offsetWidth;
      let left = align === 'right' ? wrapRect.right - popW : wrapRect.left;
      left = Math.min(left, viewport - popW - EDGE); // 오른쪽 넘침 방지
      left = Math.max(EDGE, left); // 왼쪽 넘침 방지
      setShift(left - wrapRect.left);
    };
    place();
    window.addEventListener('scroll', place, true);
    return () => window.removeEventListener('scroll', place, true);
  }, [open, align, vw, monthsShownCount, onCompareChange]);

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

  const draftPreset = matchPreset(draft, maxDate);

  // 그리드에서 시작일만 찍고 적용하면 to가 비는데, 그대로 넘기면 '그 날부터 끝까지'로 해석돼
  // 의도와 다른 기간이 잡힌다 → 하루(from=to)로 확정한다.
  const apply = (next: Range = draft) => {
    const to = next.from && !next.to ? next.from : next.to;
    onChange({ from: next.from, to });
    setOpen(false);
  };
  // 프리셋은 즉시 적용(열기→선택 2클릭). 커스텀 구간만 [적용]으로 확정.
  const pickPreset = (p: Preset) => {
    setPhase('start');
    apply(p.range(maxDate));
  };

  // 종료일을 고르는 중이면 커서 위치까지 띠를 미리 그린다(어디까지 잡히는지 눈으로 확인).
  const preview = phase === 'end' && draft.from && hover;
  const selected = useMemo<RdpRange | undefined>(() => {
    const from = toDate(draft.from);
    if (!from) return undefined;
    if (preview) {
      const h = toDate(hover);
      if (h) return h < from ? { from: h, to: from } : { from, to: h };
    }
    return { from, to: toDate(draft.to) };
  }, [draft.from, draft.to, preview, hover]);

  const onDayPick = (day: Date) => {
    const next = pickDay(draft, phase, toISO(day));
    setDraft(next.draft);
    setPhase(next.phase);
    if (next.phase === 'end') setHover('');
  };

  // 그리드 시작 월 — 종료일(없으면 시작일/최대일)이 보이도록 한 달 앞을 왼쪽에 둔다.
  const defaultMonth = useMemo(() => {
    const anchor = toDate(draft.to) ?? toDate(draft.from) ?? toDate(maxDate) ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  }, [draft.to, draft.from, maxDate]);

  const min = toDate(minDate);
  const max = toDate(maxDate);
  const dayCount = daysBetween(draft.from, draft.to);

  const fieldCls =
    'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-primary';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink outline-none hover:border-ink-mute focus:border-primary"
      >
        <CalendarIcon size={15} className="text-ink-mute" />
        <span className="font-medium">{triggerLabel(value, maxDate)}</span>
        <ChevronDownIcon size={13} className="text-ink-mute" />
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="기간 선택"
          style={{ left: shift }}
          className="absolute top-full z-30 mt-1.5 flex max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {/* 좌: 프리셋 (클릭 즉시 적용) */}
          <ul className="w-28 shrink-0 border-r border-hairline py-1.5">
            {PRESETS.map((p) => {
              const on = draftPreset?.key === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => pickPreset(p)}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                      on ? 'bg-primary/10 font-medium text-primary' : 'text-ink-soft hover:bg-hairline'
                    }`}
                  >
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 우: 2개월 그리드 + 직접입력 + 비교기간 + 액션 */}
          <div className="flex flex-col gap-3 p-3.5">
            <div className="relative">
              <DayPicker
                mode="range"
                locale={ko}
                numberOfMonths={monthsShownCount}
                defaultMonth={defaultMonth}
                selected={selected}
                // 선택은 onDayClick으로만 처리한다(위 pickDay 규칙). RDP의 range 기본 동작(addToRange)은
                // 기존 범위가 있으면 첫 클릭이 "끝 옮기기"가 돼 시작일을 새로 못 잡는다.
                // ⚠️ onSelect를 빼면 안 된다 — useRange가 `!onSelect ? 내부상태 : selected prop`으로 갈라져,
                //    없으면 selected prop이 무시되고 내부 addToRange 결과가 하이라이트를 몬다(v10 소스 확인).
                onSelect={() => {}}
                onDayClick={(day, mods) => {
                  if (mods.disabled) return;
                  onDayPick(day);
                }}
                onDayMouseEnter={(day, mods) => {
                  if (!mods.disabled) setHover(toISO(day));
                }}
                onDayMouseLeave={() => setHover('')}
                startMonth={min}
                endMonth={max}
                disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
                showOutsideDays={false}
                classNames={RDP_CLASSNAMES}
              />
            </div>

            {/* 선택값 표시 — 입력칸이 아니라 읽기 전용이다.
                네이티브 input[type=date]를 쓰면 칸마다 브라우저 달력이 또 떠서 한 팝오버에 달력이 셋(그리드+2)이 된다.
                구글애즈/GA4처럼 기간은 달력 그리드에서만 잡고, 여기서는 확인만 한다. */}
            <div className="flex items-center gap-2 border-t border-hairline pt-3 text-sm">
              <span className="text-xs text-ink-mute">선택 기간</span>
              <span className="tabular font-medium text-ink">
                {!draft.from
                  ? '달력에서 시작일을 클릭하세요'
                  : phase === 'end'
                    ? `${draft.from} – 종료일을 클릭하세요`
                    : `${draft.from} – ${draft.to || draft.from}`}
              </span>
              {dayCount > 0 && <span className="tabular text-ink-mute">· {dayCount}일</span>}
            </div>

            {onCompareChange && (
              <div className="flex items-center gap-2">
                <label className="shrink-0 text-xs text-ink-mute" htmlFor="dr-compare">
                  비교 기간
                </label>
                <select
                  id="dr-compare"
                  value={compareValue ?? 'prev'}
                  onChange={(e) => onCompareChange(e.target.value as CompareMode)}
                  className={`flex-1 ${fieldCls}`}
                >
                  {COMPARE_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-hairline"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => apply()}
                disabled={!draft.from}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
