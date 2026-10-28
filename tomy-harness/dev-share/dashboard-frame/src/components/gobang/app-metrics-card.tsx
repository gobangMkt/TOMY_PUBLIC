'use client';

// 앱 지표 표 — 기토가 매주 보라고 한 지표 5종(2026-10-14 신설, 10-16 그룹 머리로 재구성).
//  1) GA4 WAU 웹/앱 각각 · 2) 다운로드 · 3) AOS 1일 활성 사용자 · 4) iOS 활성 상태 기기 · 5) 평점
// 쓰는 곳 2: 주간 흐름 고방 구역 · 고방 › 앱(대시보드, 차트 위에 같은 표). 데이터는 `use-app-metrics.ts` 한 벌.
//
// 🚨 머리는 **3단 그룹**이다(2026-10-16 지적 "구분이 보기 어렵다, 다운로드면 다운로드 아래 AOS·iOS·합"):
//    ① 지표 그룹(GA4 WAU / 다운로드 / 스토어 활성 / 평점) ② OS(웹·안드로이드·iOS·합 / AOS·iOS·합) ③ 값·대비.
//    그룹 경계는 진한 세로선(`border-border`), 그룹 안은 옅은 선(`border-hairline`).
// 기능은 「주별 지표」와 같다: 대비(전년동주/전주) · 기준/비교 행 고정 · 행 클릭 = 기준 주 · 12주 접기.
// 스토어 값 입력 = 행 연필(한 주) · [일괄 입력](콘솔 CSV, 여러 주). 저장 탭 `주_앱_스토어`.
// ⚠️ 앱 합 = 두 스트림 단순 합. 웹은 따로 보여줄 뿐 합에 넣지 않는다(웹+앱 합산 금지, 같은 사람 중복).
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { deltaOf, fmtInt } from '@/lib/format';
import { toCsv, downloadCsv } from '@/lib/csv';
import { downloadTableImage, type ImgCell, type ImgRow } from '@/lib/table-image';
import { weekRangeLabel } from '@/lib/weekly';
import { shiftDays } from '@/lib/period';
import type { AppRatings, StoreRating } from '@/lib/app-store';
import {
  STORE_TAB,
  FIELD_BY_KEY,
  appMetricsCsv,
  draftOf,
  storeInputWeek,
  storeRowFromDraft,
  valueOf,
  weekLabelY,
  type AppMetricKey,
  type AppWeekRow,
  type StoreField,
} from '@/lib/app-store-weekly';
import { ActionButton, ExternalLink, ToggleButton } from '@/components/ui/controls';
import SelectMenu from '@/components/ui/select-menu';
import InfoTip from '@/components/ui/info-tip';
import { DownloadIcon, ImageIcon, PhoneIcon, PrevPeriodIcon, YoyIcon } from '@/components/icons';
import { Delta } from '@/components/dashboard/delta';
import { highlightPins, useTheadHeight } from '@/components/dashboard/grid-highlight';
import ManualValueInput, {
  ManualDisplayButton,
  RowEditActions,
  RowEditPencil,
} from '@/components/dashboard/manual-value-input';
import AppStoreBulkModal from './app-store-bulk-modal';
import type { AppMetricsData } from './use-app-metrics';

const TABLE_FOLD = 12;
const LEDGER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit';
type DeltaMode = 'yoy' | 'mom';

const ratingText = (r: StoreRating) => (r ? `${r.rating.toFixed(2)}(${fmtInt(r.count)}건)` : '조회 실패');

// 열 정의: 화면·이미지 내보내기가 같은 순서를 쓴다.
export type AppMetricGroup = 'wau' | 'download' | 'active' | 'rating';
export const GROUP_LABEL: Record<AppMetricGroup, string> = {
  wau: 'GA4 WAU(주 순사용자)',
  download: '스토어 신규 설치',
  active: '스토어 활성(일 평균)',
  rating: '평점',
};
const GROUP_HINT: Record<AppMetricGroup, { label: string; text: string }[]> = {
  wau: [
    { label: '정의', text: '스트림별 그 주(일~토) 순 활성 사용자입니다. GA4에서 자동으로 들어옵니다.' },
    { label: '앱 합', text: '안드로이드 + iOS입니다. 웹은 같은 사람이 겹칠 수 있어 넣지 않습니다.' },
  ],
  download: [
    { label: 'AOS', text: 'Play Console 통계 › 사용자 › 사용자 획득 › 새 사용자 수(일 단위)를 그 주 7일 합한 값입니다. 보는 곳: Play Console › 앱 › 통계.' },
    { label: 'iOS', text: 'App Store Connect 분석 › 최초 다운로드 수(일별)를 그 주 7일 합한 값입니다. 보는 곳: App Store Connect › 앱 분석 › 측정 기준 › 최초 다운로드 수.' },
    { label: '주의', text: '둘 다 계정 기준 첫 설치라 재설치·업데이트는 빠집니다.' },
  ],
  active: [
    { label: 'AOS', text: 'Play Console 통계 › 참여도 › 일일 활성 사용자(DAU, 그날 앱을 연 사용자)를 7일 평균한 값입니다. 보는 곳: Play Console › 앱 › 통계.' },
    { label: 'iOS', text: 'App Store Connect 분석 › 활성 기기(하루 단위, 데이터 공유 동의자만)를 7일 평균한 값입니다. 보는 곳: App Store Connect › 앱 분석 › 측정 기준 › 활성 기기.' },
    { label: '주의', text: '주간 유니크(WAU)가 아니라 일 평균입니다. 단위·모수가 달라 OS끼리 크기를 견주지 말고 추세로 봅니다.' },
  ],
  rating: [
    { label: 'AOS', text: 'Play Console 평점의 전체 기간 평균(CSV의 Total Average Rating) 그 주 토요일 값입니다. 보는 곳: Play Console › 앱 › 평점 › Google Play 평점.' },
    { label: 'iOS', text: 'App Store Connect 개요 평점을 매주 직접 기록한 값입니다. 보는 곳: App Store Connect › 앱 › 평가 및 리뷰 › 개요. 콘솔이 이력을 주지 않아 지난 주는 채울 수 없습니다.' },
  ],
};
type Meta = {
  key: AppMetricKey;
  group: AppMetricGroup;
  label: string;
  field?: StoreField;
  rating?: boolean;
  strong?: boolean;
  /** [상세 항목]을 켜야 보이는 OS별 열(합이 있는 지표만). 웹·평점은 합이 없어 늘 보인다. */
  detail?: boolean;
};
export const APP_META: Meta[] = [
  { key: 'web', group: 'wau', label: '웹' },
  { key: 'android', group: 'wau', label: '안드로이드', detail: true },
  { key: 'ios', group: 'wau', label: 'iOS', detail: true },
  { key: 'appTotal', group: 'wau', label: '앱 합', strong: true },
  { key: 'aos_downloads', group: 'download', label: 'AOS', field: 'aos_downloads', detail: true },
  { key: 'ios_downloads', group: 'download', label: 'iOS', field: 'ios_downloads', detail: true },
  { key: 'downloadsTotal', group: 'download', label: '합', strong: true },
  { key: 'aos_active_avg', group: 'active', label: 'AOS', field: 'aos_active_avg', detail: true },
  { key: 'ios_active_avg', group: 'active', label: 'iOS', field: 'ios_active_avg', detail: true },
  { key: 'activeTotal', group: 'active', label: '합', strong: true },
  { key: 'aos_rating', group: 'rating', label: 'AOS', field: 'aos_rating', rating: true },
  { key: 'ios_rating', group: 'rating', label: 'iOS', field: 'ios_rating', rating: true },
];
// 표 열 순서 = 그룹마다 합 → AOS → iOS(2026-10-18 지시). 차트가 APP_META 순서를 쓰므로 표만 따로 둔다.
// WAU는 웹이 합에 안 들어가는 별개 열이라 맨 앞에 두고 앱 합 → 안드로이드 → iOS가 뒤따른다.
const TABLE_KEYS: AppMetricKey[] = [
  'web',
  'appTotal',
  'android',
  'ios',
  'downloadsTotal',
  'aos_downloads',
  'ios_downloads',
  'activeTotal',
  'aos_active_avg',
  'ios_active_avg',
  'aos_rating',
  'ios_rating',
];
const TABLE_META: Meta[] = TABLE_KEYS.map((k) => APP_META.find((m) => m.key === k) as Meta);
const groupsOf = (cols: Meta[]) =>
  cols.reduce<{ group: AppMetricGroup; span: number }[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.group === m.group) last.span++;
    else acc.push({ group: m.group, span: 1 });
    return acc;
  }, []);
export const fmtAppMetric = (m: { rating?: boolean }) => (n: number) => (m.rating ? n.toFixed(2) : fmtInt(Math.round(n)));

export function appMetricsHint(ratings: AppRatings | null) {
  return [
    '· GA4 WAU = 스트림별 주 순 활성 사용자입니다(일~토). 주간 흐름의 「스트림별 사용자」 표는 일별 값을 더한 것이라 이 값보다 큽니다.',
    '· 앱 합 = 안드로이드 + iOS입니다. 웹은 같은 사람이 겹칠 수 있어 합에 넣지 않습니다.',
    '· 스토어 신규 설치 = AOS는 Play Console 통계의 사용자 획득 › 신규 사용자, iOS는 App Store Connect 분석의 최초 다운로드 수를 그 주 일~토 합한 값입니다. 둘 다 계정 기준 첫 설치라 재설치·업데이트는 빠집니다.',
    '· 스토어 활성 = AOS는 Play Console 일일 활성 사용자(그날 앱을 연 사용자), iOS는 App Store Connect 활성 기기(하루 단위, 데이터 공유 동의자만)의 일별 값을 7일 평균한 값입니다. 단위·모수가 달라 OS끼리 크기를 견주지 말고 주별 추세로 봅니다.',
    '· 평점 = 누적 평균입니다. AOS는 Play Console 평점의 전체 기간 평균(CSV의 Total Average Rating) 토요일 값, iOS는 App Store Connect 개요 평점을 매주 기록한 값입니다. iOS는 콘솔이 평점 이력을 주지 않아 지난 주는 채울 수 없습니다.',
    '· 스토어 값은 직접 넣습니다. 한 주는 행의 연필, 여러 주는 [일괄 입력]에 콘솔 CSV를 붙여 넣습니다.',
    '· `·` = 미입력·데이터 없음(0이 아님). 합은 두 OS가 모두 있는 주만 냅니다.',
    '· 전년동주 = 364일(52주) 전 같은 일~토 구간입니다. 안드로이드·iOS는 2025-10-19주부터 기록이 있습니다.',
    ratings
      ? `· 참고(오늘 스토어 공개값, ${ratings.fetchedAt.slice(0, 10)}): 안드로이드 ${ratingText(ratings.android)}, iOS ${ratingText(ratings.ios)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function AppMetricsCard({
  data,
  lastFull,
  activeWeek,
  onFocusWeek,
  readOnly = false,
}: {
  data: AppMetricsData;
  lastFull: string;
  /** 기준 주. 주간 흐름에서는 화면 기준 주(주별 지표·주간 매출 입력과 공유) */
  activeWeek: string;
  onFocusWeek: (week: string) => void;
  /** 리포트 스냅샷용 — 입력·수정·일괄 입력을 모두 숨긴다(스냅샷을 고치면 숫자 뜻이 깨진다). */
  readOnly?: boolean;
}) {
  const { rows, byWeek, store, ratings, loadErr, saveRows } = data;
  const latestWeek = rows[rows.length - 1]?.week ?? null;
  const inputWeek = storeInputWeek(lastFull);

  const [mode, setMode] = useState<DeltaMode>('yoy');
  const [expanded, setExpanded] = useState(false);
  // 기준 주는 입력 대상 주를 넘지 않는다(그 뒤 주는 스토어 값이 아직 안 들어와 대비가 빈칸뿐). 통합 화면도 같은 카드를 쓴다.
  const cappedWeek = activeWeek > inputWeek ? inputWeek : activeWeek;
  const baseWeek = byWeek.has(cappedWeek) ? cappedWeek : latestWeek;
  const compareWeek = baseWeek ? shiftDays(baseWeek, mode === 'yoy' ? -364 : -7) : null;
  // ⚠️ 비교 행이 접기에 잘리면 대비%만 있고 검산할 값이 안 보인다 → 사이는 접어 둔 채 그 한 줄만 덧댄다
  //    (주별 지표와 같은 규칙).
  const visibleRowsDesc = useMemo(() => {
    const list = (expanded ? rows : rows.slice(-TABLE_FOLD)).slice().reverse();
    if (compareWeek && !list.some((r) => r.week === compareWeek)) {
      const extra = byWeek.get(compareWeek);
      if (extra) return [...list, extra];
    }
    return list;
  }, [rows, expanded, compareWeek, byWeek]);
  const { ref: theadRef, height: theadH } = useTheadHeight();

  // 🚨 주 단위 일괄 편집: 연필 한 번으로 그 주 스토어 6칸이 입력칸이 되고 저장 한 번에 보낸다
  // (NF 월간흐름·마케팅 상세와 같은 어휘). GAS가 행을 교체하므로 draft는 기존 값으로 채워 시작한다.
  const [editWeek, setEditWeek] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Record<StoreField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  // 열 = 기본은 그룹마다 합(+웹·평점). [상세 항목]을 켜면 AOS·iOS가 붙는다. 한 주를 편집하는 동안엔
  // 입력칸이 OS별 열에 있으므로 켠 것으로 본다.
  const [detail, setDetail] = useState(false);
  const showDetail = detail || editWeek !== null;
  const cols = useMemo(() => TABLE_META.filter((m) => showDetail || !m.detail), [showDetail]);
  const groups = useMemo(() => groupsOf(cols), [cols]);
  const groupStart = (i: number) => i === 0 || cols[i - 1].group !== cols[i].group;
  const startEdit = (r: AppWeekRow) => {
    setDraft(draftOf(r.store));
    setEditWeek(r.week);
    setSaveErr('');
  };
  const cancelEdit = () => {
    setEditWeek(null);
    setDraft({});
    setSaveErr('');
  };
  const commitEdit = async () => {
    if (!editWeek) return;
    setSaving(true);
    setSaveErr('');
    try {
      await saveRows([storeRowFromDraft(editWeek, draft)]);
      cancelEdit();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 내보내기 = 지금 표에 보이는 주(접힘 12주 / 전체), 최신이 위.
  const exportRows = visibleRowsDesc;
  const stamp = latestWeek ?? lastFull;
  const range = exportRows.length ? `${exportRows[exportRows.length - 1].week} ~ ${shiftDays(exportRows[0].week, 6)}` : '';
  const ratingNote = ratings
    ? `참고: 오늘(${ratings.fetchedAt.slice(0, 10)}) 스토어 공개 평점 안드로이드 ${ratingText(ratings.android)} / iOS ${ratingText(ratings.ios)}`
    : '';
  const exportCsv = () => {
    const { headers, body } = appMetricsCsv(exportRows);
    downloadCsv(`고방_앱지표_${stamp}.csv`, toCsv(headers, body));
  };
  const exportImage = () => {
    const imgRows: ImgRow[] = exportRows.map((r) => ({
      tone: 'item',
      cells: [
        { text: weekRangeLabel(r.week), align: 'left' },
        ...cols.map((m): ImgCell => {
          const v = valueOf(r, m.key);
          return v === null
            ? { text: '미입력', align: 'right', tone: 'faint' }
            : { text: fmtAppMetric(m)(v), align: 'right', tone: m.strong ? 'strong' : undefined };
        }),
      ],
    }));
    const short: Record<AppMetricGroup, string> = { wau: 'WAU', download: '신규 설치', active: '활성', rating: '평점' };
    void downloadTableImage(`고방_앱지표_${stamp}.png`, {
      title: '고방 앱 지표 (주별)',
      subtitle: `${range} · 주별(일~토) · GA4 주 순사용자 + 스토어 신규 설치·활성(일 평균)·평점`,
      headers: [
        { text: '주', align: 'left' },
        ...cols.map((m): ImgCell => ({ text: `${short[m.group]} ${m.label}`, align: 'right' })),
      ],
      rows: imgRows,
      footnote: ratingNote || undefined,
    });
  };

  // 그룹 경계 = 2px 진한 선(마케팅 표의 구분 경계와 같은 어휘), 그룹 안 = 옅은 선
  const edgeOf = (i: number) => (groupStart(i) ? 'border-l-2 border-border' : 'border-l border-hairline');

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <PhoneIcon size={16} />
          앱 지표
          <InfoTip text={appMetricsHint(ratings)} />
          <span className="text-xs font-normal text-ink-mute">
            최신이 위 · {expanded ? rows.length : Math.min(TABLE_FOLD, rows.length)}/{rows.length}주
          </span>
        </h4>
        {/* 컨트롤 무리 = [나가기·액션] │ [보기 토글] │ [조회 조건]: 주별 지표 헤더와 같은 순서 */}
        <div data-export-skip="true" className="flex flex-wrap items-center gap-3">
          {!readOnly && (
            <span className="inline-flex items-center gap-1">
              <ExternalLink href={LEDGER_SHEET_URL}>원장 시트</ExternalLink>
              <InfoTip text={`스토어 값은 \`${STORE_TAB}\` 탭, 스트림별 주 순사용자 이력은 \`주_WAU_스트림\` 탭입니다.`} />
            </span>
          )}
          {!readOnly && (
            <ActionButton onClick={() => setBulkOpen(true)} title="콘솔에서 내려받은 일별 CSV를 붙여 넣어 여러 주를 한 번에 채웁니다">
              일괄 입력
            </ActionButton>
          )}
          <ActionButton onClick={exportCsv} disabled={!exportRows.length} title="보이는 주를 CSV 파일로 내려받습니다(엑셀에서 바로 열림)">
            <DownloadIcon size={14} />
            CSV
          </ActionButton>
          <ActionButton onClick={exportImage} disabled={!exportRows.length} title="보이는 주를 그림(PNG)으로 내려받습니다(카톡·노션에 그대로 붙이기)">
            <ImageIcon size={14} />
            이미지
          </ActionButton>
          <span aria-hidden className="h-5 w-px bg-ink/[0.14]" />
          <ToggleButton
            on={showDetail}
            onToggle={() => setDetail((v) => !v)}
            title="끄면 지표마다 합만, 켜면 AOS·iOS 값을 함께 봅니다(평점은 합이 없어 늘 보입니다)"
          >
            상세 항목
          </ToggleButton>
          {rows.length > TABLE_FOLD && (
            <ToggleButton on={expanded} onToggle={() => setExpanded((v) => !v)} title="표에 보이는 주 수를 늘리거나 줄입니다">
              전체 {rows.length}주
            </ToggleButton>
          )}
          <span aria-hidden className="h-5 w-px bg-ink/[0.14]" />
          <SelectMenu
            label="대비"
            ariaLabel="값 옆에 붙일 대비 기준 선택"
            value={mode}
            options={[
              { value: 'yoy', label: '전년동주' },
              { value: 'mom', label: '전주' },
            ]}
            onChange={(v) => setMode(v as DeltaMode)}
            width="w-[132px]"
          />
        </div>
      </div>
      {loadErr && (
        <p className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
          지표 원장 불러오기 실패: {loadErr}
        </p>
      )}
      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full border-collapse text-right text-[13px]">
          <thead ref={theadRef} className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--color-border)]">
            {/* ① 지표 그룹 */}
            <tr className="text-[12.5px] text-ink-soft">
              <th
                rowSpan={3}
                className="sticky left-0 z-10 w-[120px] min-w-[120px] border-r border-border bg-surface px-3 py-2 text-left align-bottom text-[12px] font-semibold whitespace-nowrap text-ink-soft"
              >
                주(일요일 시작)
              </th>
              {groups.map((g, gi) => (
                <th
                  key={g.group}
                  colSpan={g.span * 2}
                  className={`${gi === 0 ? '' : 'border-l-2'} border-border bg-surface px-2.5 pt-2 pb-1 text-center font-semibold whitespace-nowrap`}
                >
                  <span className="inline-flex items-center gap-1">
                    {GROUP_LABEL[g.group]}
                    <InfoTip items={GROUP_HINT[g.group]} />
                  </span>
                </th>
              ))}
            </tr>
            {/* ② OS */}
            <tr className="text-[12px] text-muted">
              {cols.map((m, i) => (
                <th
                  key={m.key}
                  colSpan={2}
                  className={`${edgeOf(i)} border-t border-hairline bg-surface px-2.5 py-1 font-medium whitespace-nowrap ${m.strong ? 'text-ink-soft' : ''}`}
                >
                  {m.label}
                </th>
              ))}
            </tr>
            {/* ③ 값 · 대비 */}
            <tr className="border-b border-hairline text-[11px] text-muted">
              {cols.map((m, i) => (
                <Fragment key={m.key}>
                  <th className={`${edgeOf(i)} bg-surface px-2.5 py-1.5 font-medium`}>값</th>
                  <th className="bg-surface px-2.5 py-1.5 font-medium whitespace-nowrap">
                    <span className="inline-flex items-center justify-end gap-1">
                      {mode === 'yoy' ? (
                        <YoyIcon size={11} className="text-primary/70" />
                      ) : (
                        <PrevPeriodIcon size={11} className="text-ink-mute/80" />
                      )}
                      {mode === 'yoy' ? '전년동주' : '전주'}
                    </span>
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRowsDesc.map((r, i) => {
              const isBase = r.week === baseWeek;
              const isCmp = r.week === compareWeek;
              const isEditing = editWeek === r.week;
              // 입력 대상 주 뒤의 완결 주: 콘솔 값이 아직 안 와 기준 주가 될 수 없다. 회색·비활성으로 두고 이유는 툴팁에.
              const pending = r.week > inputWeek && r.week <= lastFull;
              const gap = i > 0 && shiftDays(visibleRowsDesc[i - 1].week, -7) !== r.week;
              const { pin, pinLabel, pinTop, cellBg, deltaBg } = highlightPins(isBase, isCmp, theadH);
              const prevRow = byWeek.get(shiftDays(r.week, mode === 'yoy' ? -364 : -7));
              return (
                <tr
                  key={r.week}
                  onClick={() => !isEditing && !pending && onFocusWeek(r.week)}
                  title={isEditing ? undefined : pending ? '기준 주가 될 수 없는 주입니다(스토어 값 미확정). ⓘ 참고' : `클릭하면 ${r.week}주와 비교 대상(${mode === 'yoy' ? '전년동주' : '전주'})을 함께 강조합니다`}
                  className={`group border-t border-hairline transition-colors ${isEditing ? '' : pending ? 'cursor-not-allowed bg-ink/[0.045] text-muted' : 'cursor-pointer'} ${
                    gap ? 'border-t-2 border-dashed border-border' : ''
                  } ${isBase || isCmp || isEditing || pending ? '' : 'hover:bg-hairline/60'}`}
                >
                  <th
                    style={pinTop}
                    className={`${pinLabel} border-r border-border px-3 py-2 text-left align-top text-[13.5px] whitespace-nowrap text-ink ${
                      isBase ? `${cellBg} font-bold` : isCmp ? `${cellBg} font-semibold` : pending ? 'bg-[#eceeef] font-medium text-muted' : 'bg-surface font-semibold'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {weekLabelY(r.week)}
                      {isBase && <span className="rounded bg-accent2 px-1 py-0.5 text-[10px] font-semibold text-white">기준</span>}
                      {isCmp && (
                        <span className="rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                          {mode === 'yoy' ? '전년동주' : '전주'}
                        </span>
                      )}
                      {/* 연필은 행에 올렸을 때만(주별 지표처럼 평소 행 머리는 날짜·배지만). 최신 주는 주황 '입력'이 대신한다. */}
                      {!isEditing && !pending && !readOnly && (
                        <span data-export-skip="true" className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <RowEditPencil label={`${r.week} 스토어`} onEdit={() => startEdit(r)} />
                        </span>
                      )}
                      {pending && (
                        <>
                          <span className="rounded border border-border bg-white px-1 py-0.5 text-[10px] font-semibold text-muted">기준 아님</span>
                          <InfoTip
                            text="이 주는 기준 주로 쓸 수 없습니다."
                            items={[
                              { label: '이유', text: '스토어 콘솔 값이 1주 늦게 확정돼, 이 주는 아직 값이 비어 있거나 덜 찬 값입니다.' },
                              { label: '기준 주', text: `한 주 앞인 ${weekLabelY(inputWeek)} 주입니다. 대비와 차트도 거기까지만 봅니다.` },
                              { label: '입력', text: '이 주 값은 다음 주에 위 기준 주 행에서 채웁니다.' },
                            ]}
                          />
                        </>
                      )}
                      {gap && <InfoTip text="사이 주는 접혀 있습니다. 비교 대상 한 줄만 끌어와 붙였습니다. [전체]로 펼칩니다." />}
                    </span>
                    {isEditing && (
                      <RowEditActions saving={saving} error={saveErr} onSave={() => void commitEdit()} onCancel={cancelEdit} />
                    )}
                  </th>
                  {cols.map((m, ci) => {
                    const v = valueOf(r, m.key);
                    const meta = m.field ? FIELD_BY_KEY.get(m.field) : undefined;
                    const fmt = fmtAppMetric(m);
                    let body: ReactNode;
                    if (m.field && meta && isEditing) {
                      body = (
                        <ManualValueInput
                          ym={r.week}
                          label={meta.label}
                          value={draft[m.field] ?? ''}
                          disabled={saving}
                          sourceUrl={meta.source.href}
                          sourceLabel={meta.source.label}
                          onChange={(raw) => setDraft((d) => ({ ...d, [m.field as StoreField]: raw }))}
                          onCommit={() => void commitEdit()}
                          onCancel={cancelEdit}
                        />
                      );
                    } else if (!readOnly && m.field && meta && (v !== null || r.week === inputWeek)) {
                      // 주황 '입력'은 이번에 넣을 주(직전 완결 주의 1주 전, 콘솔 반영 지연)에만. 지난 주 빈칸까지 칠하면 칸 전부가
                      // 주황이 돼 매주 할 일이 안 보인다(지난 주는 연필이나 [일괄 입력]으로 채운다).
                      body = (
                        <ManualDisplayButton
                          empty={v === null}
                          text={v === null ? '' : fmt(v)}
                          title={`클릭해서 그 주 스토어 값을 한꺼번에 ${v === null ? '입력' : '수정'} (${r.week} ${meta.label})`}
                          onEdit={() => startEdit(r)}
                        />
                      );
                    } else if (v === null) {
                      body = <span className="text-muted/60">·</span>;
                    } else {
                      body = <span className={m.strong ? 'font-semibold' : ''}>{fmt(v)}</span>;
                    }
                    return (
                      <Fragment key={m.key}>
                        <td
                          style={pinTop}
                          className={`${edgeOf(ci)} px-2.5 py-2 align-top tabular-nums whitespace-nowrap ${pending ? 'text-muted/70' : 'text-ink'} ${pin} ${cellBg}`}
                        >
                          {body}
                        </td>
                        <td style={pinTop} className={`px-2.5 py-2 align-top tabular-nums whitespace-nowrap ${pin} ${deltaBg}`}>
                          <Delta parts={deltaOf(v, valueOf(prevRow, m.key))} fmt={fmt} />
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
            {!visibleRowsDesc.length && (
              <tr>
                <td colSpan={cols.length * 2 + 1} className="px-3 py-8 text-center text-muted">
                  아직 데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AppStoreBulkModal open={bulkOpen} onClose={() => setBulkOpen(false)} store={store} lastFull={lastFull} onSave={saveRows} />
    </div>
  );
}
