'use client';

// 기간 스코프 결론 — **고방 / U사장님 각자의 매출과 목표 달성률** 두 장.
//
// 🚨 왜 생겼나: 통합 대시보드를 폐지하면서(2026-08-03 사용자 판단 "통합대시보드랑 주간흐름·월간흐름이
// 별반 차이가 없는 것 같은데? 월간흐름·주간흐름을 더 강화하고 통합대시보드 없애자") 그 화면이 **유일하게**
// 갖고 있던 것을 두 흐름 화면이 물려받아야 했다. 겹쳤던 것(추이 차트·기간 값·전기간 대비)은 이미 흐름
// 화면의 차트와 격자표에 있었고, 없던 것은 이 둘이다:
//   ① **고방/U사장님 스코프 분리** — 흐름 화면의 매출은 전사 합(고방 + U사장님)이라 어느 사업이
//      목표에 못 미치는지 알 수 없었다. U사장님이 전사의 93%라 합치면 고방 상황이 통째로 묻힌다.
//   ② **목표 대비 달성률** — 흐름 화면은 값과 대비(전년동주/전주)만 냈다.
//
// 왜 격자표에 열로 넣지 않았나: 월간 9지표 × [값·대비] = 19열인데 여기에 스코프 2 × [매출·달성률]을
// 더하면 27열이 되어 "지표가 고정이라 가로 스크롤이 없다"는 그 표의 전제가 깨진다. 결론은 카드로,
// 시계열은 표로 — 역할을 가른다.
//
// ⚠️ 두 사업의 달성률을 **합치거나 서로 비교하지 않는다**(목표가 따로다 — 리포트·OKR과 같은 규칙).

import { ScoreCard } from '@/components/dashboard/score-card';
import { WonIcon, TargetIcon } from '@/components/icons';
import { fmtMan } from '@/lib/format';
import {
  scopeItemIds,
  sumTxnsInRange,
  targetForRange,
  type MonthlyTarget,
  type RevenueScope,
  type RevenueTxn,
  type TargetHistoryEntry,
} from '@/lib/revenue';

const man = (won: number) => Math.round(won / 10_000).toLocaleString('ko-KR');

export type ScopeSummary = {
  scope: RevenueScope;
  label: string;
  revenue: number;
  target: number;
  /** 목표 미설정(0)이면 null — 0을 분모로 달성률을 내면 무한/거짓 미달이 된다. */
  rate: number | null;
  /** 이 스코프에 든 항목 이름들 — 툴팁이 "무엇의 합인지"를 이름으로 말한다(2026-08-04). */
  items?: string[];
};

/**
 * 카드 라벨 정본.
 *
 * 🚨 **사업 구역(`ScopeBlock`) 안에서는 스코프 이름을 라벨에 넣지 않는다**(2026-08-04 지적:
 * "이미 고방이라는 그룹 하위에 들어가는건데 왜 고방 고방 이런걸 중복해서 쓰는거야"). 구역 머리가
 * 이미 '고방'이라고 말하고 있으므로 카드까지 반복하면 같은 단어가 화면에 두 번 박힌다.
 * 구역 없이 두 사업을 나란히 놓는 화면(월간 흐름)에서만 접두를 붙인다 — 그땐 구분이 라벨의 몫이다.
 *
 * 🚨 **기준은 기간이다** — 달성률은 '고방의 목표'가 아니라 **그 기간 목표** 대비다. 기간은 `sub`에
 * `…기준`으로 박는다(라벨에 날짜를 넣으면 두 줄로 접힌다).
 *
 * ⚠️ U사장님의 **'애드'는 접두가 아니라 한정어라 항상 남긴다**: 시트 ④의 U사장님 합계에는 U중개사
 * 연간계약·케어프로가 들어 있지만 어드민엔 그 실적 수집 경로가 없어 **목표에서 뺐다** → 이 값은 애드
 * 단독 기준이다. 지우면 애드만 100% 넘긴 걸 사업 전체 달성으로 오독한다.
 */
const CARD_TEXT: Record<RevenueScope, { prefix: string; qualifier: string; scopeNote: string }> = {
  gobang: {
    prefix: '고방',
    qualifier: '',
    scopeNote: '고방 BM·고방 SNS 항목',
  },
  uboss: {
    prefix: 'U사장님',
    qualifier: ' (애드)',
    scopeNote: 'U사장님 애드 항목(U중개사 연간계약·케어프로는 어드민에 실적 수집 경로가 없어 목표·실적 모두에서 제외)',
  },
};

/**
 * 라벨 앞에 붙는 **기간 단위** — "전체 목표가 아니라 그 기간 목표 대비"임을 라벨이 스스로 말한다
 * (2026-08-04 지적 "전체가 아니라 해당 기간 달성률이잖아? 주간 매출목표 달성률이라고 하던지").
 * sub의 `{기간} 기준`이 어느 주·어느 달인지를 말하고, 이 접두가 **무엇 단위의 목표인지**를 말한다.
 */
const UNIT_LABEL: Record<string, string> = { '그 주': '주간', '그 달': '월간' };

/** 항목 이름 나열 — 너무 길면 잘라 '외 N개'로 접는다(툴팁이 목록으로 도배되지 않게). */
const itemsNote = (items: string[] | undefined) => {
  if (!items?.length) return '';
  const head = items.slice(0, 6).join(' · ');
  return items.length > 6 ? `${head} 외 ${items.length - 6}개` : head;
};

/**
 * 스코프별 실적·목표·달성률. 분모 = `targetForRange`(월 목표의 **일할 배분**) — 일~토 주는 달을
 * 걸치므로 걸친 쪽 달 목표를 일수만큼만 가져와야 분모가 맞는다. 한 달 전체를 주면 그 달 목표 합과 같다.
 *
 * `history`(목표 개정 이력)를 같이 넘겨야 **이미 지난 기간의 분모가 그 기간이 시작될 때 유효했던
 * 목표로 고정**된다(2026-09-28: 9월 고방 목표가 9/22에 1,345만→86만으로 낮아지면서, history 없이
 * 라이브 목표만 읽던 예전 계산은 9/22 이전 주 달성률까지 조용히 337.7%로 재계산해버렸다). 생략하면
 * 예전처럼 라이브 목표만 쓴다 — 기존 호출부·테스트는 안 건드려도 된다.
 */
export function scopeSummaries(
  targets: MonthlyTarget[],
  txns: RevenueTxn[],
  from: string,
  to: string,
  history: TargetHistoryEntry[] = [],
): ScopeSummary[] {
  return (
    [
      { scope: 'gobang' as RevenueScope, label: '고방' },
      { scope: 'uboss' as RevenueScope, label: 'U사장님' },
    ]
  ).map(({ scope, label }) => {
    const ids = scopeItemIds(targets, scope);
    const revenue = sumTxnsInRange(txns, from, to, ids).revenue;
    const target = targetForRange(targets, scope, from, to, history);
    // 항목 이름 — 매트릭스 등장 순서 그대로, 중복 제거(월마다 같은 항목이 반복된다).
    const items = [...new Set(targets.filter((t) => ids.has(t.itemId)).map((t) => t.name))];
    return { scope, label, revenue, target, rate: target > 0 ? revenue / target : null, items };
  });
}

export default function ScopeAchievement({
  targets,
  txns,
  from,
  to,
  targetHistory = [],
  periodLabel,
  unitNote,
  only,
  showCaption = true,
  onOpenLedger,
}: {
  targets: MonthlyTarget[];
  txns: RevenueTxn[];
  from: string;
  to: string;
  /** 목표 개정 이력 — 이미 지난 기간의 달성률을 그때 목표로 고정한다(scopeSummaries 참고). 생략 시 라이브 목표. */
  targetHistory?: TargetHistoryEntry[];
  /** 화면에 박는 기준 기간(예: '26-07' · '7.26~8.1') — 어느 기간의 결론인지 라벨이 말해야 한다. */
  periodLabel: string;
  /** 기간 종류 한 마디('그 주'·'그 달') — 툴팁 문장에 들어간다. */
  unitNote: string;
  /**
   * 한 사업만 그린다 — **사업 구역(`ScopeBlock`) 안에 그 사업 카드만** 넣을 때 쓴다
   * (2026-08-03 요청 "주간매출 = 고방 주간매출 = 고방 항목 하위에 넣기"). 구 배치는 카드 4장이 구역
   * 바깥에 한 줄로 있어서, 아래 구역에 같은 사업 차트가 또 나오며 '고방'이 화면에 두 번 등장했다.
   */
  only?: RevenueScope;
  /** 기준 기간 안내 줄 — 한 화면에 이 컴포넌트가 두 번 들어가면 한쪽만 켠다(같은 문장 반복 금지). */
  showCaption?: boolean;
  /**
   * 매출·달성률 카드를 누르면 그 사업의 **항목별 월간 매출 상세**를 연다(2026-09-04 요청
   * "고방월간매출 클릭 시, 고방 매출 월별지표도 함께 뜨게"). 카드가 총액 한 숫자라 "그 달을 만든
   * 상품이 뭔지"는 매출 화면까지 가야 알 수 있었다. 넘기지 않으면 카드는 그대로 읽기 전용이다
   * (리포트 스냅샷에서는 넘기지 않는다 — 스냅샷 안에서 지금 원장을 부르면 시점이 깨진다).
   */
  onOpenLedger?: (scope: RevenueScope) => void;
}) {
  const all = scopeSummaries(targets, txns, from, to, targetHistory);
  const rows = only ? all.filter((r) => r.scope === only) : all;

  return (
    <div>
      {/* 기준 기간은 **카드마다 배지로 반복하지 않고 이 줄 하나**에 둔다(2026-08-03 실측: 배지가
          라벨과 폭을 다퉈 '고방 매 / 출'처럼 줄바꿈됐다). 어느 기간의 결론인지 + 어떻게 바꾸는지를
          한 줄이 같이 말한다. */}
      {showCaption && (
        <p className="mb-2 text-[12px] text-ink-mute">
          기준 {unitNote.replace('그 ', '')} <b className="font-semibold text-ink-soft">{periodLabel}</b> · 아래 표에서
          행을 클릭하면 기준이 바뀝니다
        </p>
      )}
      <div className={`grid grid-cols-1 gap-3 ${only ? '' : 'sm:grid-cols-2'}`}>
        {rows.map((r) => (
          <ScopeCards
            key={r.scope}
            row={r}
            periodLabel={periodLabel}
            unitNote={unitNote}
            showScope={!only}
            onOpenLedger={onOpenLedger}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 한 사업의 결론 카드 2장(매출·달성률) — **흐름 화면과 리포트가 같은 이 컴포넌트를 쓴다**(2026-08-04).
 * 그전엔 리포트가 로컬 복제본을 갖고 있어 라벨·툴팁이 갈렸다(리포트 카드에는 U사장님 '애드' 표기가
 * 아예 없었다 — 규칙 위반).
 *
 * 🚨 카드만 보고 **기준이 읽혀야 한다**(2026-08-04 지적 "고방 매출목표달성률이 뭔기준임?"):
 *   · 라벨 = 무엇의 목표인지(U사장님은 '애드' 필수)
 *   · sub  = 기간 + 분자/분모 숫자(값을 판단하는 숫자만 — 설명은 sub에 넣지 않는다)
 *   · ⓘ    = 산식·기간 배분 규칙·스코프에 든 항목 이름·정본 위치·주의
 */
export function ScopeCards({
  row: r,
  periodLabel,
  unitNote,
  showScope = false,
  onOpenLedger,
}: {
  row: ScopeSummary;
  periodLabel: string;
  /** 기간 종류 한 마디 — '그 주' | '그 달'. 라벨 접두('주간'·'월간')와 툴팁 문장이 여기서 나온다. */
  unitNote: string;
  /** 사업 구역 바깥에서 두 사업을 나란히 놓을 때만 true — 라벨에 '고방'·'U사장님'을 붙인다. */
  showScope?: boolean;
  /** 넘기면 두 카드 모두 눌러서 「항목별 월간 매출 상세」를 연다(같은 표·같은 기준 달). */
  onOpenLedger?: (scope: RevenueScope) => void;
}) {
  const t = CARD_TEXT[r.scope];
  const items = itemsNote(r.items);
  const head = showScope ? `${t.prefix} ` : '';
  const unit = UNIT_LABEL[unitNote] ? `${UNIT_LABEL[unitNote]} ` : '';
  // 두 카드가 같은 표를 연다 — 매출(분자)과 달성률(분자÷분모)의 내역이 그 표 한 장에 다 있다.
  const open = onOpenLedger ? () => onOpenLedger(r.scope) : undefined;
  const openTitle = `${periodLabel} ${t.prefix} 매출을 만든 항목(광고상품)별 내역을 표로 봅니다`;
  return (
    <div className="grid grid-cols-2 gap-3">
      <ScoreCard
        icon={WonIcon}
        label={`${head}${unit}매출${t.qualifier}`}
        value={man(r.revenue)}
        unit="만원"
        sub={`${periodLabel} 기준`}
        onClick={open}
        clickTitle={openTitle}
        hint={`${periodLabel} ${unitNote}에 매출 원장에 기록된 합계입니다. 대상 = ${t.scopeNote}.${items ? ` 실제 항목: ${items}.` : ''} 원장 정본 = 구글시트 '[NF] 고방 매출 원장'의 '원장' 탭(고방 › 매출 화면에서 건별로 보고 고칩니다).`}
      />
      <ScoreCard
        icon={TargetIcon}
        label={`${head}${unit}매출목표 달성률${t.qualifier}`}
        value={r.rate === null ? '—' : `${(r.rate * 100).toFixed(1)}`}
        unit={r.rate === null ? undefined : '%'}
        // sub = 분자/분모를 그대로 보여준다 — %만 있으면 "무엇을 무엇으로 나눈 값인지"가 안 보인다.
        sub={r.target > 0 ? `${periodLabel} 기준 · ${fmtMan(r.revenue)} / 목표 ${fmtMan(r.target)}` : '목표 미설정'}
        progress={r.target > 0 ? { actual: r.revenue, target: r.target } : undefined}
        onClick={open}
        clickTitle={openTitle}
        hint={`${UNIT_LABEL[unitNote] ?? '기간'} 달성률입니다 — 목표 전체(연·반기) 대비가 아닙니다. 달성률 = ${periodLabel} 매출 ÷ ${periodLabel} 목표. 분자 = 위 매출 카드와 같은 값(대상 = ${t.scopeNote}). 분모 = 매출 목표 매트릭스(통합 › OKR 화면 · 시트 '목표' 탭)의 **월 목표를 이 기간 일수로 배분**한 값 — 7일 주면 그 달 목표의 7/31이고, ${unitNote}이 달을 걸치면 각 달에서 일수만큼 가져옵니다. **이미 지난 기간은 그 기간이 시작될 때 유효했던 목표로 고정**됩니다(나중에 목표를 고쳐도 지난 카드는 안 흔들립니다 — 개정 이력 기준). 고방과 U사장님은 목표가 따로라 합산하거나 서로 비교하지 않습니다. ⚠️ 애드 매출은 토스PG 주차 정산이 1행으로 들어와 주 단위 달성률이 정산일 든 주에 몰립니다 — 페이스는 월 단위로 보세요.`}
      />
    </div>
  );
}
