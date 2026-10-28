// CTA 링크(cta_links)·클릭(cta_clicks) — 미디어 축 CTA 관리 화면. 표 구조 기록은 0024 머리(라이브에 이미 있던 표).
// 발행 콘텐츠 하단 CTA는 목적지를 직접 박지 않고 `{리다이렉트 주소}/go/{키}`만 쓴다. 목적지(destination_url)를 바꾸면
// 이미 나간 글도 그 순간부터 새 목적지로 넘어간다 — 그래서 쓰기 라우트는 관리자 게이트를 거친다(공개 리다이렉트에 바로 반영).
// 302는 공개 앱 for_Release/미니앱/gobang-cta-redirect가 같은 표로 낸다. 2026-10-28(스펙 2-4) 미디어허브 services/cta_links.py에서 옮겼다.

import { resolveDb, type Db, type RepoOpts } from "./_db";
import { selectAllPages } from "../pagedSelect";
import type { ClickRow } from "../owned/ctaStats";

export interface CtaLink {
  id: string;
  key: string;
  label: string;
  destination_url: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const CTA_UPDATABLE = ["label", "destination_url", "utm_source", "utm_campaign", "utm_content", "active"] as const;

export class CtaLinkError extends Error {}

function need(opts: RepoOpts): Db {
  const db = resolveDb(opts);
  if (!db) throw new CtaLinkError("Supabase가 연결되지 않아 CTA 링크를 읽지 못했어요");
  return db;
}

function translate(err: { code?: string; message?: string }): string {
  if (err.code === "23505") return "이미 있는 키예요. 다른 키를 쓰거나 기존 링크를 고쳐 주세요";
  return `CTA 링크 저장소 오류: ${err.message ?? "사유 없음"}`;
}

export async function listLinks(opts: RepoOpts = {}): Promise<CtaLink[]> {
  const db = need(opts);
  const { data, error } = await db.from("cta_links").select("*").order("created_at", { ascending: false });
  if (error) throw new CtaLinkError(translate(error));
  return (data ?? []) as CtaLink[];
}

export async function createLink(
  v: { key: string; label: string; destination_url: string; utm_source?: string; utm_campaign?: string; utm_content?: string },
  opts: RepoOpts = {}
): Promise<CtaLink> {
  const db = need(opts);
  const body = {
    key: v.key,
    label: v.label,
    destination_url: v.destination_url,
    utm_source: v.utm_source?.trim() || null,
    utm_campaign: v.utm_campaign?.trim() || null,
    utm_content: v.utm_content?.trim() || null,
  };
  const { data, error } = await db.from("cta_links").insert(body).select().single();
  if (error || !data) throw new CtaLinkError(translate(error ?? {}));
  return data as CtaLink;
}

export async function updateLink(key: string, fields: Record<string, unknown>, opts: RepoOpts = {}): Promise<CtaLink> {
  const db = need(opts);
  const body: Record<string, unknown> = {};
  for (const k of CTA_UPDATABLE) if (k in fields && fields[k] !== undefined) body[k] = fields[k];
  if (!Object.keys(body).length) throw new CtaLinkError("고칠 값이 없어요");
  body.updated_at = new Date().toISOString();
  const { data, error } = await db.from("cta_links").update(body).eq("key", key).select();
  if (error) throw new CtaLinkError(translate(error));
  if (!data || !data.length) throw new CtaLinkError(`CTA 링크를 찾지 못했어요: ${key}`);
  return data[0] as CtaLink;
}

export async function deleteLink(key: string, opts: RepoOpts = {}): Promise<void> {
  const db = need(opts);
  const { error } = await db.from("cta_links").delete().eq("key", key);
  if (error) throw new CtaLinkError(translate(error));
}

/** 클릭 기록. since(ISO)가 없으면 전체 기간. 2만 행에서 멈춘다(미디어허브와 같은 상한) */
export async function fetchClicks(sinceIso: string | null, opts: RepoOpts = {}): Promise<ClickRow[]> {
  const db = need(opts);
  const res = await selectAllPages<Record<string, unknown>>((f, t) => {
    if (f >= 20_000) return Promise.resolve({ data: [], error: null });
    let q = db.from("cta_clicks").select("id,key,src,clicked_at,referer,referer_host,device,visitor,is_bot");
    if (sinceIso) q = q.gte("clicked_at", sinceIso);
    return q.order("id", { ascending: false }).range(f, t);
  });
  if (res.error && !res.data.length) throw new CtaLinkError(translate(res.error));
  return res.data as unknown as ClickRow[];
}
