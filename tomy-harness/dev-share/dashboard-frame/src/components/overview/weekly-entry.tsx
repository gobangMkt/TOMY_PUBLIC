'use client';

// 주간 입력 — "매주 이 화면 하나에서 고방·U사장님 데이터를 다 채운다"(2026-08-03 사용자 요청).
//
// 왜 여기(통합 › 주간 흐름)인가: 축 역할이 **통합 = 합산·리포트 / 고방·U사장님 = 상세 수집**으로
// 정리됐는데, 정작 매주 손으로 채워야 하는 매출은 고방 축(BM·SNS)과 U사장님 축(애드)에 흩어져
// 있어 한 주를 마감하려면 화면 두세 개를 돌아야 했다. 지표(조회·문의·판매)는 이미 이 화면의
// [전주 불러오기]가 처리하므로, 남은 매출 입력을 그 옆에 붙여 **한 주 = 한 화면**으로 닫는다.
//
// 규칙:
//  · 시트 자동동기화 항목(고방블로그·빌리투어숏폼)은 입력칸 대신 '시트 연동' 안내 — 여기서 또
//    넣으면 일요일 sync가 같은 주를 덮어써 실적이 두 번 잡히거나 사라진다(lib/weekly.ts SYNCED_ITEM_IDS).
//  · 이미 기록된 금액이 있으면 그 값을 보여주고 입력칸은 '추가 입력'이다 — 원장은 건별 append라
//    덮어쓰기가 아니다(같은 주에 두 건이 나면 두 줄이 맞다).
//  · **0원도 저장한다**(2026-08-03) — 매출이 없었던 항목은 `0`을 넣어 마감한다. 기록이 아예 없는
//    것(아직 확인 안 함)과 0원으로 확인한 것은 다른 상태라, 미입력 판정은 금액이 아니라 원장
//    행 존재(`WeekEntryRow.entries`)로 한다. 그래서 매출 0인 주도 배지가 '입력 완료'로 닫힌다.
//  · 🚨 **저장은 표 전체에 하나다**(2026-08-03 사용자 요청 "쭉 입력한 후 저장 한번 누르면 반영되게 —
//    지금은 하나하고 저장 하나하고 저장임"). 행마다 [저장]이 있으면 항목 수(9개)만큼 왕복이 생기고
//    저장마다 원장을 다시 받아 화면이 멈췄다. 이제 입력칸은 초안(draft)일 뿐이고 하단 [N건 저장]이
//    한 번에 쓴다. 옛 규칙("한 번에 다 저장하는 버튼은 두지 않는다 — 실패한 항목이 어느 것인지
//    사라진다")의 우려는 **행별 결과 표시**로 푼다: 순차 저장하며 성공 행은 값을 비우고 '저장됨',
//    실패 행은 입력값을 그대로 남기고 그 행에 사유를 띄운다(다시 [저장]을 누르면 남은 것만 간다).
//  · **[매출 없음]은 쓰기가 아니라 0 채우기 토글**이다 — 누르면 금액칸이 `0`이 되고 다시 누르면
//    비워진다. 실제 쓰기는 하단 저장 한 번뿐이라, 실수로 눌러도 저장 전에 되돌릴 수 있다.

import { Fragment, useEffect, useMemo, useState } from 'react';
import { fmtMan } from '@/lib/format';
import { shiftDays } from '@/lib/period';
import {
  weekEntryRows,
  pendingEntryCount,
  entryScopeSections,
  entryGroupBlocks,
  parseAmountInput,
  entryUnitOf,
  MEMO_ITEM_IDS,
  type AmountUnit,
  type WeekEntryRow,
} from '@/lib/weekly';
import type { MonthlyTarget, RevenueTxn } from '@/lib/revenue';
import SelectMenu from '@/components/ui/select-menu';
import InfoTip from '@/components/ui/info-tip';
import { ActionButton, PrimaryButton, ExternalLink } from '@/components/ui/controls';
import { groupDotClass, shortGroupLabel } from '@/components/revenue/group-badge';
import { CalendarIcon, CheckIcon } from '@/components/icons';

// 외부 원천 시트 — '시트 연동' 배지에서 바로 열어 확인할 수 있게(매출 진척 화면과 같은 링크).
const SYNC_SHEET_URL: Record<string, string> = {
  gobangblog: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0',
  billyshort: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=1252517232',
};

/**
 * 항목별 **원천 바로가기** — '이 금액을 어디서 보고 오는지'를 입력칸 옆에 둔다(2026-08-04 요청
 * "토스 바로가기도 추가해놔서 내가 값 입력하기 쉽게"). 월간 흐름의 수기 입력 축이 쓰는
 * `MANUAL_METRICS[].source`와 같은 규칙이다 — 원천이 특정되지 않은 항목엔 링크를 달지 않는다.
 */
const SOURCE_LINK: Record<string, { url: string; label: string; hint: string }> = {
  usajang_ad: {
    url: 'https://dashboard.tosspayments.com/sales-reports/tm/12413',
    label: '토스 정산달력',
    hint: '토스페이먼츠 정산달력(새 창). 그 주 일별 매출액을 더해 넣습니다. 이 항목은 원 단위 그대로 입력합니다(토스 정산금액과 동일, 만원 환산 없음).',
  },
  // 2026-08-06 사용자 요청 — 고방블로그(SNS, 시트 자동동기화 항목)도 실제 수익을 검산할 원천이
  // 있다. 입력칸은 없지만(자동 반영) '얼마가 맞는 값인지'는 애드포스트에서 확인한다.
  gobangblog: {
    url: 'https://adpost.naver.com/report/revenue',
    label: '애드포스트',
    hint: '네이버 애드포스트 리포트(새 창). 고방블로그 노출·수익을 확인합니다. 이 항목은 매주 일요일 자동 반영되므로 수기 입력은 필요 없습니다.',
  },
};

/**
 * 타이핑 중 **반대 단위 환산 미리보기** — 만원 모드면 원 단위, 원 모드면 만원 단위로 보여준다.
 * 1만 배 오입력(2026-08-04 사고)을 방향과 무관하게 눈으로 잡는 장치다.
 */
function amountPreview(raw: string, unit: AmountUnit): string {
  const cleaned = raw.replace(/[,\s]/g, '');
  const n = Number(cleaned);
  if (cleaned === '' || !Number.isFinite(n) || n < 0) return '';
  return unit === 'man'
    ? `= ${(n * 10_000).toLocaleString()}원`
    : `= ${(n / 10_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`;
}

type Draft = { man: string; units: string; memo: string };
/** 행별 저장 결과 — 'saved' 또는 실패 사유(그 행에 그대로 띄운다). */
type Result = 'saved' | { error: string };

const EMPTY: Draft = { man: '', units: '', memo: '' };

/**
 * 입력값 검증 — 정본은 `lib/weekly.ts`의 `parseAmountInput`이다(0원 허용 + 단위별 상한).
 * 화면에 로컬 판정을 두면 규칙이 갈린다 — 마감 체크리스트가 로컬 필터를 갖고 있어 0원 마감이
 * '해야 함'으로 남았던 2026-08-03 사고와 같은 종류다.
 */
function amountWonOf(raw: string, unit: AmountUnit): number | null {
  const r = parseAmountInput(raw, unit);
  return r.ok ? (r.won ?? 0) : null;
}

function EntryRow({
  row,
  draft,
  result,
  saving,
  nested,
  unit,
  onChange,
  onSubmit,
}: {
  row: WeekEntryRow;
  draft: Draft;
  result?: Result;
  saving: boolean;
  /** BM·SNS 버킷 소제목 아래 항목인가 — 위계상 한 단 더 들여쓴다(그룹›버킷›항목 3단 관례). */
  nested?: boolean;
  /** 금액칸 입력 단위(만원/원) — 행마다 `entryUnitOf(row.itemId)`가 고정한다(사람이 고르지 않는다). */
  unit: AmountUnit;
  onChange: (next: Draft) => void;
  onSubmit: () => void;
}) {
  // 판정은 금액이 아니라 **행 존재**다 — 0원으로 확인한 항목도 '기록됨'이다(그래야 마감이 닫힌다).
  const filled = row.entries > 0;
  const zeroed = draft.man.trim() === '0';
  const err = result && result !== 'saved' ? result.error : '';
  const source = SOURCE_LINK[row.itemId];
  // 타이핑 중에도 반대 단위로 환산해 보여준다 — 단위를 헷갈려 넣는 1만 배 사고를 눈으로 잡는다.
  const preview = amountPreview(draft.man, unit);
  const tooBig =
    draft.man.trim() !== '' &&
    !parseAmountInput(draft.man, unit).ok &&
    Number(draft.man.replace(/[,\s]/g, '')) > 0;

  return (
    // 🚨 **행 높이 고정**(2026-08-06 지적 "각 열별 높이 차이 나지 않게") — 입력칸 2개가 있는 행과
    // 시트연동 링크 하나뿐인 행(고방블로그 등)의 콘텐츠 높이가 서로 달라 표가 들쭉날쭉했다.
    // `h-12`(48px) + 각 셀 `align-middle`로 짧은 콘텐츠를 그 높이 안에 가운데 정렬한다.
    // ⚠️ 행 배경 색 틴트는 넣지 않는다(2026-08-06 디자인팀장 리뷰) — 매출 격자표·목표 매트릭스의
    // 위계 관례(그룹›버킷›항목 3단)가 항목 tier엔 색을 칠하지 않고 배경농도+들여쓰기만 쓴다.
    // BM/SNS 색은 버킷 소제목의 색점 하나로 충분히 전달된다(레퍼런스 트랜스포즈).
    <tr className="h-12 border-t border-hairline">
      <td className={`py-2 pr-2 align-middle ${nested ? 'pl-12' : 'pl-4'}`}>
        <span className="inline-flex flex-wrap items-center gap-1.5 text-ink-soft">
          {row.name}
          {/* 원천 바로가기 = 어드민 밖으로 나가는 동작 → §컨트롤 어휘 ④-b(ExternalLink). 손으로 짜지 않는다. */}
          {source && (
            <ExternalLink href={source.url} title={source.hint} className="ml-0.5">
              {source.label}
            </ExternalLink>
          )}
          {/* 목표 매트릭스에 없는 비정기 매출(기타매출 등)은 금액만으론 내역을 알 수 없어 이름 옆에
              메모칸을 낸다(2026-09-02 사용자 요청 — 처음엔 금액칸 아래 뒀다가 "레이아웃이 이상하다"는
              지적으로 이름 옆으로 옮김). 정형 항목은 이름이 곧 내역이라 여기 없다(`MEMO_ITEM_IDS`). */}
          {!row.synced && MEMO_ITEM_IDS.has(row.itemId) && (
            <input
              value={draft.memo}
              onChange={(e) => onChange({ ...draft, memo: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) onSubmit();
              }}
              placeholder="메모(무슨 매출인지)"
              aria-label={`${row.name} 메모`}
              className="ml-2 w-[160px] rounded-lg border border-border bg-bg px-2 py-1 text-[12px] text-ink focus:border-primary focus:outline-none"
            />
          )}
        </span>
      </td>
      {/* 총액(2026-08-06, 구 '기록됨') — 이 칸이 실제로 재는 건 그 주에 누적된 **총액**이라 '기록됨'
          보다 그 뜻을 그대로 말하는 이름이 낫다는 지적을 받았다. 기록/미입력 상태 태그도 항목명이
          아니라 **이 값 바로 옆**으로 옮겼다(2026-08-06 재지적 "기록됨은 총액 옆에 표시하는 게 더
          자연스럽겠다") — 상태는 이 칸이 말하는 그 값에 대한 것이라 값과 한 덩어리로 읽혀야 한다.
          시트연동 항목은 그 옆 '시트 연동·자동' 배지가 이미 같은 역할을 하므로 중복하지 않는다. */}
      <td className={`tabular py-2 pr-3 text-right align-middle ${filled ? 'text-ink' : 'text-ink-mute'}`}>
        <span className="inline-flex items-center justify-end gap-1.5">
          {filled && (
            <span className="whitespace-nowrap">
              {row.recorded > 0 ? fmtMan(row.recorded) : '0원'}
              {row.units > 0 && <span className="ml-1 text-xs text-ink-mute">({row.units}건)</span>}
            </span>
          )}
          {!row.synced &&
            (filled ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                <CheckIcon size={10} />
                기록됨
              </span>
            ) : (
              <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] font-semibold text-alert">미입력</span>
            ))}
          {/* 시트연동 항목은 상태 태그가 없으니(위 배지가 그 역할) 아직 안 채워진 주엔 빈칸 대신
              중립 표기를 남긴다 — 표의 '0/없음 = ·' 관례. */}
          {!filled && row.synced && <span className="text-ink-mute">·</span>}
        </span>
      </td>
      {row.synced ? (
        <td className="py-2 pr-4 text-right align-middle" colSpan={3}>
          <span className="inline-flex items-center gap-1">
            <a
              href={SYNC_SHEET_URL[row.itemId]}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-border bg-chrome px-1.5 py-0.5 text-[11px] font-medium text-ink-mute transition-colors hover:border-primary hover:text-primary"
            >
              시트 연동 · 자동
            </a>
            <InfoTip text="매주 일요일 00시에 자동으로 원장에 반영됩니다" />
          </span>
        </td>
      ) : (
        <>
          <td className="py-2 pr-2 text-right align-middle">
            <div className="flex flex-col items-end gap-0.5">
              <input
                value={draft.man}
                onChange={(e) => onChange({ ...draft, man: e.target.value })}
                onKeyDown={(e) => {
                  // 타이핑한 손을 마우스로 옮기지 않고 그 자리에서 표 전체를 저장한다.
                  if (e.key === 'Enter' && !saving) onSubmit();
                }}
                inputMode="numeric"
                placeholder={filled ? '+ 추가' : unit === 'man' ? '만원' : '원'}
                aria-label={`${row.name} ${filled ? `추가 금액(${unit === 'man' ? '만원' : '원'})` : `금액(${unit === 'man' ? '만원' : '원'})`}`}
                className={`${unit === 'man' ? 'w-[88px]' : 'w-[104px]'} rounded-lg border bg-bg px-2 py-1 text-right text-sm tabular focus:border-primary focus:outline-none ${
                  err || tooBig ? 'border-rose-400 text-ink' : 'border-border text-ink'
                }`}
              />
              {/* 환산 미리보기 — 넣은 값이 실제로 얼마인지 반대 단위로 그 자리에서 보인다(1만 배 오입력 방지). */}
              {preview && (
                <span className={`whitespace-nowrap text-[10px] tabular ${tooBig ? 'text-rose-700' : 'text-ink-mute'}`}>
                  {preview}
                </span>
              )}
            </div>
          </td>
          <td className="py-2 pr-2 text-right align-middle">
            <input
              value={draft.units}
              onChange={(e) => onChange({ ...draft, units: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) onSubmit();
              }}
              inputMode="numeric"
              placeholder="건"
              aria-label={`${row.name} ${filled ? '추가 건수' : '건수'}`}
              className="w-[64px] rounded-lg border border-border bg-bg px-2 py-1 text-right text-sm text-ink tabular focus:border-primary focus:outline-none"
            />
          </td>
          {/* [매출 없음] = 금액칸에 0을 채우는 토글(쓰기가 아니다 — 실제 저장은 하단 한 번).
              이미 기록된 행에는 내지 않는다: 원장은 append라 또 넣으면 0원 행이 하나 더 쌓인다. */}
          <td className="py-2 pr-4 text-right align-middle">
            <div className="flex items-center justify-end gap-2">
              {err && <span className="text-[11px] text-rose-700">{err}</span>}
              {result === 'saved' && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-success">
                  <CheckIcon size={12} />
                  저장됨
                </span>
              )}
              {filled ? null : (
                <ActionButton
                  onClick={() => onChange({ ...draft, man: zeroed ? '' : '0', units: '' })}
                  disabled={saving}
                  title={
                    zeroed
                      ? '0원 마감을 취소합니다(아직 저장되지 않았습니다)'
                      : '이 주에 이 항목 매출이 없었음 — 금액을 0으로 채웁니다. 실제 기록은 아래 [저장]을 누를 때 한 번에 됩니다.'
                  }
                  className={`min-w-[86px] justify-center ${zeroed ? 'border-primary text-primary' : ''}`}
                >
                  매출 없음
                </ActionButton>
              )}
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

export default function WeeklyEntry({
  targets,
  txns,
  onSaved,
  weekStart,
  weekOptions,
  onWeekChange,
}: {
  targets: MonthlyTarget[];
  txns: RevenueTxn[];
  /** 저장 뒤 원장 재조회 — Promise를 주면 그 사이를 '원장 반영 중…'으로 알린다. */
  onSaved: () => void | Promise<void>;
  /** 입력 대상 주(일요일 시작) — **차트 기준 주와 같은 상태**(부모 `WeeklyView`가 소유). */
  weekStart: string;
  /** 주 선택지 — 부모가 넘긴다(기준 주가 최근 목록 밖이면 부모가 그 값을 앞에 끼워 넣는다). */
  weekOptions: { value: string; label: string }[];
  onWeekChange: (weekStart: string) => void;
}) {
  const week = useMemo(() => ({ from: weekStart, to: shiftDays(weekStart, 6) }), [weekStart]);
  const rows = useMemo(() => weekEntryRows(targets, txns, week), [targets, txns, week]);
  const sections = useMemo(() => entryScopeSections(rows), [rows]);
  const pending = pendingEntryCount(rows);

  // 🚨 **항상 기본 접힘 + 미입력이면 눈에 띄는 표시**(2026-08-03 요청 "안적혀있으면 표시뜨게. 기본 접기").
  // 처음엔 미입력이 있으면 자동으로 펴지게 했는데, 그러면 마감 전 주를 열 때마다 11줄 표가 화면 한 판을
  // 먹어 아래 추이·표로 내려가는 길을 막는다. 남았다는 **사실**은 헤더 배지(앰버 `N개 미입력`)가 말하고,
  // 채우겠다고 결정한 순간에 사람이 펼친다.
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? false;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  // 저장이 끝난 뒤 원장을 다시 받는 구간. 화면을 스켈레톤으로 갈아치우지 않고 여기서만 알린다
  // (2026-09-21 사고: 재조회 동안 화면 전체가 '불러오는 중'이 돼 입력표째 사라졌다).
  const [refreshing, setRefreshing] = useState(false);

  // 주를 바꾸면 초안·결과를 버린다 — 다른 주 입력값이 남아 있으면 엉뚱한 주에 실적이 박힌다.
  useEffect(() => {
    setDrafts({});
    setResults({});
    setDone(0);
    setOpenOverride(null); // 주를 바꾸면 접힘도 그 주의 미입력 여부가 다시 정한다
  }, [weekStart]);

  // 저장 대상 = 금액을 채운 수기 행. 공란은 '아직 확인 안 함'이라 건드리지 않는다.
  const queue = useMemo(
    () => rows.filter((r) => !r.synced && (drafts[r.itemId]?.man ?? '').trim() !== ''),
    [rows, drafts],
  );
  const failed = Object.values(results).filter((r) => r !== 'saved').length;
  const savedCount = Object.values(results).filter((r) => r === 'saved').length;

  const setDraft = (itemId: string, next: Draft) => {
    setDrafts((d) => ({ ...d, [itemId]: next }));
    // 값을 다시 만지면 이전 결과 뱃지를 **키째로** 지운다(옛 '저장됨'이 새 입력에 붙으면 거짓말이 되고,
    // undefined를 값으로 남기면 아래 failed 집계가 그걸 실패로 센다).
    setResults((r) => {
      if (!(itemId in r)) return r;
      const next2 = { ...r };
      delete next2[itemId];
      return next2;
    });
  };

  /**
   * 표 전체를 한 번에 저장한다 — **순차**로 보낸다(같은 시트에 append하는 GAS라 병렬이면 락 경합·
   * 순서 뒤섞임이 난다). 성공 행은 초안을 비우고, 실패 행은 값을 남겨 다시 누르면 그것만 간다.
   * 원장 재조회(onSaved)는 **끝나고 한 번** — 행마다 부르면 저장마다 콜드 왕복이 붙는다.
   */
  const saveAll = async () => {
    if (!queue.length || saving) return;
    // 먼저 전부 검증한다(하나라도 잘못됐으면 아무것도 보내지 않는다 — 절반만 들어가면 원장이 애매해진다).
    const bad: Record<string, Result> = {};
    for (const r of queue) {
      // 사유를 그대로 보여준다 — '0 이상의 숫자'와 '금액이 너무 큽니다'는 고쳐야 할 게 다르다.
      const v = parseAmountInput(drafts[r.itemId]?.man ?? '', entryUnitOf(r.itemId));
      if (!v.ok) bad[r.itemId] = { error: v.error ?? '0 이상의 숫자' };
    }
    if (Object.keys(bad).length) {
      setResults((prev) => ({ ...prev, ...bad }));
      return;
    }

    setSaving(true);
    setDone(0);
    let ok = 0;
    for (const r of queue) {
      const d = drafts[r.itemId] ?? EMPTY;
      const amountWon = amountWonOf(d.man, entryUnitOf(r.itemId)) ?? 0;
      // 0원 마감엔 건수를 싣지 않는다 — 매출이 없었다면 팔린 건도 없다.
      const unitsRaw = amountWon === 0 ? '' : d.units;
      const base = amountWon === 0 ? '주간입력 · 매출 없음' : '주간입력';
      const memo = MEMO_ITEM_IDS.has(r.itemId) && d.memo.trim() ? `${base} · ${d.memo.trim()}` : base;
      try {
        const res = await fetch('/api/revenue', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            op: 'upsert',
            input: {
              // 그 주의 수요일에 기록한다 — 주 경계(일/토)에 붙이면 월을 걸친 주에서 어느 달로 잡힐지
              // 헷갈린다. 주 중앙이면 항상 그 주 안이고, 주간 버킷 집계는 어차피 같은 주로 묶인다.
              date: shiftDays(week.from, 3),
              itemId: r.itemId,
              units: unitsRaw.trim() === '' ? null : Number(unitsRaw),
              amount: amountWon,
              // 0원 행은 건별 원장에서 '왜 0원짜리가 있나'로 읽히므로 사유를 메모에 남긴다.
              memo,
            },
          }),
        });
        const j = await res.json().catch(() => ({ ok: false }));
        if (j?.ok) {
          ok += 1;
          setResults((prev) => ({ ...prev, [r.itemId]: 'saved' }));
          setDrafts((prev) => ({ ...prev, [r.itemId]: EMPTY }));
        } else {
          const message = (j?.errors && j.errors.join(' ')) || j?.message || '저장 실패';
          setResults((prev) => ({ ...prev, [r.itemId]: { error: message } }));
        }
      } catch {
        setResults((prev) => ({ ...prev, [r.itemId]: { error: '요청 실패' } }));
      }
      setDone((n) => n + 1);
    }
    setSaving(false);
    // 성공이 하나라도 있으면 원장을 다시 받아 '기록됨'을 갱신한다 — 그 왕복(GAS 3~20초)이 끝나야
    // 표의 기록 금액이 새 값으로 바뀌므로, 끝날 때까지 상태 줄에 '원장 반영 중…'을 세워 둔다.
    if (ok > 0) {
      setRefreshing(true);
      try {
        await onSaved();
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (!rows.length) return null;

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-ink">
          <CalendarIcon size={16} className="text-primary" />
          주간 매출 입력
          <span className="text-[12px] font-normal text-muted">
            {pending > 0 ? (
              <span className="rounded bg-accent2/15 px-1.5 py-0.5 font-semibold text-alert">{pending}개 미입력</span>
            ) : (
              '이 주 입력 완료'
            )}
            <InfoTip text="선택한 주에 발생한 매출을 항목별로 원장에 기록합니다. 금액을 쭉 입력한 뒤 아래 [저장]을 한 번 누르면 전부 반영됩니다(입력칸에서 Enter도 같은 동작). 금액칸 단위는 항목마다 고정입니다 — U사장님 광고는 토스 정산금액을 그대로 넣도록 원 단위, 나머지는 만원 단위입니다(타이핑 중 반대 단위 환산이 아래 작게 보여 오입력을 잡습니다). 매출이 없었던 항목은 [매출 없음]으로 금액칸을 0으로 채우면 되고, 저장 전이라 다시 눌러 되돌릴 수 있습니다 — 0원으로 저장된 항목은 '기록됨 = 0원'이 되어 미입력에서 빠집니다(기록이 없는 것과 0원으로 확인한 것은 다른 상태입니다). 원장은 건별 기록이라 저장할수록 더해집니다(덮어쓰기 아님) — 잘못 넣은 건은 고방 › 매출의 건별 원장에서 지웁니다. 고방블로그·빌리투어숏폼은 매주 일요일 00시에 원천 시트에서 자동 반영되므로 입력칸이 없습니다." />
          </span>
        </h2>
        <div className="flex items-center gap-3">
        <ActionButton
          onClick={() => setOpenOverride(!open)}
          title="이 주 매출 입력표를 펼치거나 접습니다"
          className="!py-1 !text-[12px]"
        >
          {open ? '접기' : pending > 0 ? `펼쳐서 ${pending}개 입력` : `펼쳐서 보기 (${rows.filter((r) => !r.synced).length}개 항목)`}
        </ActionButton>
        {/* 조회 조건 = 드롭다운(어드민 컨트롤 어휘). 진행 중인 주는 목록에 없다.
            🚨 이 값이 곧 **차트 기준 주**다(위 WeeklyView 참조) — 여기서 바꾸면 아래 추이·격자표도
            같은 주로 따라온다(그 반대도 마찬가지 — 격자표 행 클릭도 이 값을 바꾼다). */}
        <SelectMenu
          label="주"
          ariaLabel="입력할 주 선택(차트가 보는 기준 주와 같습니다)"
          value={weekStart}
          options={weekOptions}
          onChange={onWeekChange}
          width="w-[136px]"
        />
        </div>
      </header>
      {open && (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-mute">
              <th className="py-2 pl-4 pr-2 font-medium">항목</th>
              <th className="py-2 pr-3 text-right font-medium">총액</th>
              <th className="py-2 pr-2 text-right font-medium">금액</th>
              <th className="py-2 pr-2 text-right font-medium">건수</th>
              <th className="py-2 pr-4" aria-label="매출 없음" />
            </tr>
          </thead>
          {/* 🚨 사업 2구획(고방 / U사장님) — 구분 정본은 `entryScopeSections`다(화면에서 group을
              손으로 비교하지 않는다). 구획 머리는 매출 격자표의 그룹 머리와 같은 어휘:
              연한 배경 + 색점 + 볼드, 그리고 그 구획의 미입력 수를 배지로 단다. */}
          {sections.map((s) => {
            // 세부 그룹(고방 BM·SNS)이 둘 이상 섞인 구획에만 소제목 구분선을 그린다 —
            // U사장님처럼 그룹이 하나뿐이면 구분선이 또 하나의 빈 헤더처럼 겹쳐 보인다.
            const blocks = entryGroupBlocks(s.rows);
            const showSubgroups = blocks.length > 1;
            return (
              <tbody key={s.scope}>
                {/* 구획 머리는 **회색 판 + 위쪽 2px 경계**다(2026-08-04 강화). 처음엔 `bg-ink/[0.04]` +
                    13px였는데 흰 표에서 배경이 거의 안 보이고 항목명과 무게가 같아 "구분이 안 됐다".
                    판 + 굵은 경계 + 14px 볼드라야 스크롤 중에도 사업이 바뀌는 지점이 읽힌다. */}
                <tr className="border-t-2 border-border bg-chrome">
                  <th colSpan={5} className="py-2 pl-4 pr-4 text-left">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${groupDotClass(s.rows[0]?.group ?? '')}`}
                      />
                      <span className="text-[14px] font-bold text-ink">{s.label}</span>
                      <span className="text-[11px] font-normal text-ink-mute">
                        {s.rows.filter((r) => !r.synced).length}개 입력 항목
                      </span>
                      {s.pending > 0 ? (
                        <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[11px] font-semibold text-alert">
                          {s.pending}개 미입력
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-success">
                          <CheckIcon size={11} />
                          입력 완료
                        </span>
                      )}
                    </span>
                  </th>
                </tr>
                {blocks.map((b) => (
                  <Fragment key={b.group}>
                    {/* 버킷(BM/SNS) 소제목(2026-08-06 디자인팀장 리뷰로 재설계) — 처음엔 칩 배지
                        (`GroupBadge`)를 썼는데 "그룹인데 태그방식이라 어색하다"는 지적을 받았다.
                        원인 = 이 화면에만 있는 신규 발명이었다 — 매출 격자표·목표 매트릭스에
                        이미 **그룹›버킷›항목 3단** 위계 어휘가 있다(배경농도 bg-ink/[0.05]→[0.025]→
                        없음 + 들여쓰기, `revenue-dashboard.tsx` ROW_TONE·`revenue-targets.tsx`와
                        동일 클래스). 그 버킷 tier를 그대로 가져온다: 옅은 회색 띠(`bg-ink/[0.025]`)
                        + 색점(정체성 유지) + 무채색 semibold 텍스트, 들여쓰기만으로 위계를 준다
                        (색을 항목 행까지 칠하지 않는다 — 그건 상태·강조에나 쓰는 것). */}
                    {showSubgroups && (
                      <tr className="border-t border-hairline bg-ink/[0.025]">
                        <td colSpan={5} className="px-4 py-1.5 pl-9 text-left">
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${groupDotClass(b.group)}`} />
                            <span className="text-[13px] font-semibold text-ink-soft">{shortGroupLabel(b.group)}</span>
                          </span>
                        </td>
                      </tr>
                    )}
                    {b.rows.map((r) => (
                      <EntryRow
                        key={r.itemId}
                        row={r}
                        nested={showSubgroups}
                        unit={entryUnitOf(r.itemId)}
                        draft={drafts[r.itemId] ?? EMPTY}
                        result={results[r.itemId]}
                        saving={saving}
                        onChange={(next) => setDraft(r.itemId, next)}
                        onSubmit={saveAll}
                      />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      )}
      {/* 쓰기 버튼은 표 전체에 하나 — 입력을 다 끝낸 시선이 표 아래에 있으므로 하단에 둔다.
          왼쪽 상태 줄이 '무엇이 저장 대기인지·무엇이 실패했는지'를 말한다(일괄 저장의 안전판). */}
      {open && (
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
        <span className="text-[12px] text-ink-mute">
          {saving
            ? `${done}/${queue.length} 저장 중…`
            : refreshing
              ? '원장 반영 중…'
              : queue.length > 0
                ? `${queue.length}건 저장 대기`
                : savedCount > 0
                  ? `${savedCount}건 저장됨${failed > 0 ? ` · ${failed}건 실패(값이 남아 있습니다)` : ''}`
                  : '금액을 입력하면 여기서 한 번에 저장합니다'}
        </span>
        <PrimaryButton onClick={saveAll} disabled={saving || refreshing || queue.length === 0} className="min-w-[96px] justify-center">
          {saving ? '저장 중…' : refreshing ? '반영 중…' : queue.length > 0 ? `${queue.length}건 저장` : '저장'}
        </PrimaryButton>
      </footer>
      )}
    </section>
  );
}
