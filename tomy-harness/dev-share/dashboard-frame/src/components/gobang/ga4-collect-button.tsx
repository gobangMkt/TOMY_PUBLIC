'use client';

// GA4 → 트래픽 원장 적재를 **화면에서** 돌린다. 주 WAU만이 아니라 월 MAU·소스매체도 같은 라우트가
// 함께 다시 계산하므로 이 버튼 하나가 세 화면(주간 흐름·NF 월간흐름·마케팅 개요)에서 재사용된다
// (2026-09-01 `WauCollectButton`에서 개명 — 이름이 WAU 전용처럼 읽혀 다른 화면에 붙이기 헷갈렸다).
//
// 🚨 왜 필요한가(2026-08-03 지적 "왜 WAU 이번주차꺼는 자동으로 안들어옴?"): 적재는 원래 GAS
// 시간트리거(`collectDaily`, 05시)가 `/api/traffic/collect`를 깨워 돌린다 — GA4 서비스계정 키가
// 어드민에만 있어 GAS가 GA4를 직접 못 읽기 때문이다. 그런데 이 어드민은 **로컬 전용**(프로덕션 미가동)
// 이라 GAS가 localhost를 호출할 방법이 없다 → 사람이 누르는 경로가 있어야 한다. 없으면 원장이 조용히
// 낡는다(2026-09-01 재확인: 8/5 이후 27일간 아무도 안 눌러 8월 MAU가 반쪽값 그대로 남아 있었다).
//
// ⚠️ GA4 7개 조회 + 시트 쓰기라 수십 초 걸린다(라우트 maxDuration 300s) → 진행 상태를 반드시 보여준다.
// ⚠️ 주·월 롤업은 라우트가 400일 창으로 다시 계산한다(월 중간에 하루만 넣으면 그 달 유니크가 확정 전
//    값으로 굳는다) → 여기서 넘기는 `days`는 **일별 재수집 창**일 뿐이고, 주 WAU·월 MAU는 항상 다시 채워진다.

import { useState } from 'react';
import { PrimaryButton } from '@/components/ui/controls';

export default function Ga4CollectButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/traffic/collect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // 최근 3일 rolling(GA4 소급 변동 대비)이 기본인데, 며칠 밀린 상태를 한 번에 메우려면 창이 넓어야
        // 한다 → 14일. 주·월 롤업은 라우트가 400일로 다시 조회하므로 지난 주·달도 함께 채워진다.
        body: JSON.stringify({ days: 14 }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      if (j?.ok) {
        const rows = Array.isArray(j.tabs) ? j.tabs.reduce((s: number, t: { rows: number }) => s + t.rows, 0) : 0;
        setNote({ tone: 'ok', text: `적재 완료 — ${rows.toLocaleString('ko-KR')}행` });
        onDone();
      } else {
        setNote({ tone: 'err', text: j?.message || j?.error || '적재에 실패했습니다.' });
      }
    } catch {
      setNote({ tone: 'err', text: '요청에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      {note && (
        <span className={`text-[11px] ${note.tone === 'ok' ? 'text-success' : 'text-rose-700'}`}>{note.text}</span>
      )}
      <PrimaryButton
        onClick={run}
        disabled={busy}
        title="GA4에서 최근 트래픽을 읽어 원장에 적재합니다(주 WAU·월 MAU·소스/매체 포함, 30초 이상 걸릴 수 있습니다)"
      >
        {busy ? 'GA4 적재 중…' : 'GA4 적재'}
      </PrimaryButton>
    </span>
  );
}
