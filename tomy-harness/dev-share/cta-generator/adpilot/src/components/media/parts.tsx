"use client";

// 미디어 축 판단 화면 공용 조각 — 상태 안내(옮기기 전·수집 중·수집기 꺼짐), 판정 태그 톤, 값+증감 칸, 읽기 훅.
// 새 형태를 만들지 않는다: 안내는 Notice, 태그는 Badge + VERDICT_TONE_CLASS, 표 칸은 Paid 데스크 표와 같은 "값 위·증감 아래".

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, EMPTY_COPY, Notice, VERDICT_TONE_CLASS } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { internalFetch } from "@/lib/adminFetch";

// ── 숫자 표기 ─────────────────────────────────────────────────────────────

export const n0 = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("ko-KR"));
export const p1 = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
export const pos = (v: number | null | undefined) => (v == null || v === 0 ? "—" : `${v.toFixed(1)}위`);

/**
 * 직전 같은 기간 대비. 노출·클릭은 %, 클릭률은 %p, 순위는 위(내려가는 게 좋다). 직전이 0이면 노출은 "신규", 나머지는 비운다
 * (0에서 0으로 온 것을 0%로 적으면 없는 사실을 말한다). 색만으로 말하지 않게 부호·화살표를 같이 쓴다.
 */
export function DeltaText({
  kind,
  now,
  prev,
  className,
}: {
  kind: "count" | "ctr" | "position";
  now: number;
  prev: number;
  className?: string;
}) {
  if (!prev) {
    if (kind === "count" && now) return <span className={cn("text-[13px] font-medium text-positive", className)}>신규</span>;
    return null;
  }
  let text: string;
  let good: boolean | null;
  if (kind === "count") {
    const d = (now - prev) / prev;
    if (Math.abs(d) < 0.005) return <span className={cn("text-[13px] text-muted", className)}>→ 0%</span>;
    text = `${d > 0 ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(0)}%`;
    good = d > 0;
  } else if (kind === "ctr") {
    const d = now - prev;
    if (Math.abs(d) < 0.0005) return <span className={cn("text-[13px] text-muted", className)}>→ 0%p</span>;
    text = `${d > 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(1)}%p`;
    good = d > 0;
  } else {
    if (!now) return null;
    const d = now - prev;
    if (Math.abs(d) < 0.05) return <span className={cn("text-[13px] text-muted", className)}>→ 0위</span>;
    text = `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}위`;
    good = d < 0;
  }
  return (
    <span className={cn("tnum text-[13px] font-medium", good ? "text-positive" : "text-negative", className)} title="직전 같은 기간 대비">
      {text}
    </span>
  );
}

/** 표 칸 — 값 위, 증감 아래(오른쪽 정렬) */
export function ValueDelta({ value, delta }: { value: ReactNode; delta?: ReactNode }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="tnum text-sm text-text">{value}</span>
      {delta}
    </div>
  );
}

// ── 판정 태그 ─────────────────────────────────────────────────────────────

type Tone = "good" | "warn" | "bad" | "mute";
const KIND_TONE: Record<string, Tone> = {
  surge: "good",
  drop: "bad",
  near: "warn",
  split: "warn",
  stale: "bad",
  excluded: "bad",
  title: "warn",
  waiting: "mute",
  unknown: "mute",
  indexed: "good",
};
export const RATING_TONE: Record<string, Tone> = { urgent: "bad", later: "warn", watch: "mute", ok: "good" };
export const STAGE_TONE: Record<string, Tone> = {
  none: "mute",
  proposed: "warn",
  held: "mute",
  measuring: "mute",
  result: "good",
  closed: "mute",
};
export const SIGNAL_TONE: Record<string, Tone> = { act: "warn", watch: "mute", ok: "good" };

export function ToneBadge({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title}>
      <Badge className={VERDICT_TONE_CLASS[tone]}>{children}</Badge>
    </span>
  );
}

export function KindBadge({ kind, label }: { kind: string; label: string }) {
  if (!kind) return <span className="text-[13px] text-muted">—</span>;
  return <ToneBadge tone={KIND_TONE[kind] ?? "mute"}>{label}</ToneBadge>;
}

// ── 상태 안내 ─────────────────────────────────────────────────────────────

export interface InsightHead {
  status: "ok" | "empty" | "missing" | "collecting" | "nodb" | "error";
  collectedAt: string;
  error: string | null;
  worker: { off: boolean; staleAt?: string; hiddenIndex?: number; error?: string };
  window: { start: string; end: string; days: number };
}

/**
 * 판단 화면 맨 위 한 줄 — 있는 사태만. 숫자가 없는 이유를 0이나 빈 표로 흘리지 않고 말한다.
 * 옮기기 전(0024 미적용)·수집 중(표마다 수집 시각이 다름)이면 판정을 내지 않는다(docs/owned-insight-rules.md §1).
 */
export function InsightStatusNotice({ head }: { head: InsightHead | null }) {
  if (!head) return null;
  const notes: { tone: "info" | "warning" | "danger"; text: ReactNode }[] = [];
  // 옮기기 전(0024 미적용)은 결정 대기 D0, 적용 순서는 docs/migrations.md 0024 행. 화면에는 사용자가 알 일만 쓴다
  if (head.status === "missing") {
    notes.push({ tone: "warning", text: "검색 실적을 아직 옮기지 않았어요. 옮기면 여기에 숫자가 채워져요." });
  } else if (head.status === "collecting") {
    notes.push({ tone: "info", text: "구글 실적을 받는 중이라 판정을 잠시 멈췄어요. 끝나면 다시 불러와 주세요." });
  } else if (head.status === "empty") {
    notes.push({ tone: "info", text: "받아 둔 검색 실적이 없어요. 실적 가져오기를 눌러 주세요." });
  } else if (head.status === "nodb" || head.status === "error") {
    // 개선 기록만 못 읽어도 판정을 멈춘다(insightLoader). 무엇을 못 읽었는지는 맞게 말한다
    const what = head.error?.startsWith("개선 기록") ? "개선 기록을" : "검색 실적을";
    notes.push({ tone: "danger", text: EMPTY_COPY.failed(what) });
  }
  if (head.worker.off) {
    const w = head.worker;
    let text = "미디어허브 수집기가 꺼져 있어요. 실적 가져오기·색인 확인은 켠 뒤에 돼요.";
    if (w.staleAt) {
      text = `미디어허브 수집기가 꺼져 있어요. 우리 글 목록은 ${w.staleAt.slice(5, 16).replace("T", " ")}에 받은 것을 써요.`;
    } else if (w.hiddenIndex) {
      text = `미디어허브 수집기가 꺼져 있어 색인 확인 글 ${w.hiddenIndex.toLocaleString("ko-KR")}건과 실적 없는 우리 글이 목록에서 빠졌어요. 켜면 다시 보여요.`;
    }
    notes.push({ tone: "info", text });
  }
  if (!notes.length) return null;
  return (
    <div className="space-y-2">
      {notes.map((n, i) => (
        <Notice key={i} tone={n.tone}>
          {n.text}
        </Notice>
      ))}
    </div>
  );
}

/** 기준 창 한 줄(헤더 titleMeta) */
export function windowText(head: InsightHead | null): string {
  if (!head || !head.window.start) return "";
  const at = head.collectedAt ? ` · ${head.collectedAt.slice(0, 16).replace("T", " ")} 수집` : "";
  return `${head.window.start} ~ ${head.window.end}(${head.window.days}일)${at}`;
}

// ── 읽기 훅 ───────────────────────────────────────────────────────────────

/** GET JSON. 주소가 바뀌면 다시 읽는다. 읽는 동안에도 앞 값을 들고 있다(표가 깜빡이지 않게) */
export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!url) return;
    const my = ++seq.current;
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as T & { ok?: boolean; error?: string };
      if (my !== seq.current) return;
      if (!res.ok || body.ok === false) {
        setError(body.error ?? `불러오지 못했어요 (${res.status})`);
      } else {
        setError(null);
        setData(body);
      }
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, reload: load };
}

/** POST/PUT/DELETE JSON — 응답의 error 문장을 그대로 돌려준다 */
export async function sendJson<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<{ ok: boolean; data: T | null; error: string | null; off?: boolean }> {
  try {
    // 관리자 게이트가 걸린 쓰기(검색어 묶음 만들기·고치기·지우기)는 서버가 401을 줄 때만 토큰을 묻는다
    const res = await internalFetch(
      url,
      {
        method,
        headers: body !== undefined ? { "content-type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      "검색어 묶음은 우리 기록만 바꿔요."
    );
    const data = (await res.json().catch(() => null)) as (T & { ok?: boolean; error?: string; off?: boolean }) | null;
    if (!res.ok || data?.ok === false) return { ok: false, data, error: data?.error ?? `실패했어요 (${res.status})`, off: data?.off };
    return { ok: true, data, error: null };
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
