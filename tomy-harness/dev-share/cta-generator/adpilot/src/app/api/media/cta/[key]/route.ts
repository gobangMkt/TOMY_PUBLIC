// CTA 링크 고치기·지우기. 목적지를 바꾸면 이미 나간 글의 CTA가 그 순간부터 새 목적지로 간다 — 관리자 게이트를 거친다.

import { NextRequest, NextResponse } from "next/server";
import { authorizedAdmin } from "@/lib/adminAuth";
import { deleteLink, updateLink } from "@/lib/repo/ctaLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  if (!authorizedAdmin(req)) return NextResponse.json({ ok: false, error: "관리자 토큰이 필요해요" }, { status: 401 });
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (typeof b.destination_url === "string" && !/^https?:\/\//.test(b.destination_url.trim())) {
      return NextResponse.json({ ok: false, error: "목적지 주소는 http:// 또는 https://로 시작해야 해요" }, { status: 400 });
    }
    const fields: Record<string, unknown> = {};
    for (const k of ["label", "destination_url", "utm_source", "utm_campaign", "utm_content"]) {
      if (typeof b[k] === "string") fields[k] = (b[k] as string).trim() || (k === "label" || k === "destination_url" ? undefined : null);
    }
    if (typeof b.active === "boolean") fields.active = b.active;
    const row = await updateLink(decodeURIComponent(params.key), fields);
    return NextResponse.json({ ok: true, link: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { key: string } }) {
  if (!authorizedAdmin(req)) return NextResponse.json({ ok: false, error: "관리자 토큰이 필요해요" }, { status: 401 });
  try {
    await deleteLink(decodeURIComponent(params.key));
    return NextResponse.json({ ok: true, deleted: params.key });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
