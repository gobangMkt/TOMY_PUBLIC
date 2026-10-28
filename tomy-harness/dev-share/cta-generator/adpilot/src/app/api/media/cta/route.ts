// CTA 링크 목록·클릭 통계 읽기 + 새 링크 만들기.
// 쓰기는 공개 리다이렉트(gobang-cta-redirect)에 바로 반영되는 일이라 관리자 게이트(adminAuth)를 거친다(로컬·토큰 미설정이면 통과).

import { NextRequest, NextResponse } from "next/server";
import { authorizedAdmin } from "@/lib/adminAuth";
import { CtaLinkError, createLink, fetchClicks, listLinks } from "@/lib/repo/ctaLinks";
import { summarizeClicks, validateCtaInput } from "@/lib/owned/ctaStats";
import { loadLedgerRefs } from "@/lib/mediaWorker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 리다이렉트 주소의 앞부분. AdPilot env가 없으면 일꾼 설정을 읽는다(공개 주소라 비밀이 아니다) */
async function redirectBase(): Promise<string> {
  if (process.env.CTA_REDIRECT_BASE_URL) return process.env.CTA_REDIRECT_BASE_URL.replace(/\/+$/, "");
  const { refs } = await loadLedgerRefs();
  return refs?.cta_redirect_base?.replace(/\/+$/, "") ?? "";
}

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? 28);
  try {
    const since = days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
    const [links, clicks, base, ledger] = await Promise.all([listLinks(), fetchClicks(since), redirectBase(), loadLedgerRefs()]);
    // src(r12) → "#12 글 제목". 원장 글 제목은 일꾼이 준다(꺼져 있으면 src 그대로 보인다)
    const labels: Record<string, string> = {};
    const runs = new Map((ledger.refs?.runs ?? []).map((r) => [r.id, r.title]));
    for (const src of new Set(clicks.map((c) => c.src).filter((s): s is string => !!s))) {
      const m = /^r(\d+)$/.exec(src);
      if (!m) continue;
      const id = Number(m[1]);
      if (ledger.refs) labels[src] = runs.has(id) ? `#${id} ${runs.get(id)}` : `#${id} (지운 글)`;
    }
    return NextResponse.json({
      ok: true,
      days,
      redirect_base: base,
      worker_off: !ledger.refs,
      links: links.map((l) => ({ ...l, redirect_url: base ? `${base}/go/${l.key}` : "" })),
      stats: summarizeClicks(clicks, labels),
    });
  } catch (e) {
    const msg = e instanceof CtaLinkError || e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorizedAdmin(req)) return NextResponse.json({ ok: false, error: "관리자 토큰이 필요해요" }, { status: 401 });
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const v = validateCtaInput(b);
    const row = await createLink({
      ...v,
      utm_source: String(b.utm_source ?? ""),
      utm_campaign: String(b.utm_campaign ?? ""),
      utm_content: String(b.utm_content ?? ""),
    });
    return NextResponse.json({ ok: true, link: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
