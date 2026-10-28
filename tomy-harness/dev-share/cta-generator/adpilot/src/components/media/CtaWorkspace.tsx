"use client";

// CTA 관리 — 발행 글 하단 CTA는 목적지를 직접 박지 않고 리다이렉트 주소(/go/{키})만 쓴다. 목적지를 바꾸면 이미 나간 글도
// 그 순간부터 새 목적지로 간다(공개 리다이렉트 앱이 같은 표를 읽는다). 그래서 고치기·끄기·지우기는 확인창을 거친다.
// 클릭 통계는 봇(링크 미리보기)을 빼고 센다. 줄을 펼치면 유입 채널·글·기기·최근 클릭이 나온다.

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { SkeletonBar } from "@/components/ui/PageSkeleton";
import { Th } from "@/components/ui/table";
import { Switch } from "@/components/ui/Switch";
import {
  ConfirmDialog,
  EmptyState,
  EMPTY_COPY,
  Field,
  Modal,
  Notice,
  PageHeader,
  Section,
  buttonClass,
  INPUT_H,
  inputClass,
} from "@/components/ui/primitives";
import { internalFetch } from "@/lib/adminFetch";
import type { CtaLink } from "@/lib/repo/ctaLinks";
import type { LinkStats } from "@/lib/owned/ctaStats";
import { n0, useJson } from "./parts";

interface CtaResp {
  ok: boolean;
  days: number;
  redirect_base: string;
  worker_off: boolean;
  links: (CtaLink & { redirect_url: string })[];
  stats: Record<string, LinkStats>;
}

const DAYS = [
  { value: "7", label: "최근 7일" },
  { value: "28", label: "최근 28일" },
  { value: "90", label: "최근 90일" },
  { value: "0", label: "기간 전체" },
];
const REASON = "CTA 링크를 바꾸면 공유 주소를 쓴 글에 바로 반영돼요.";

async function send(url: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<string | null> {
  const res = await internalFetch(
    url,
    { method, headers: body !== undefined ? { "content-type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined },
    REASON
  );
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  return res.ok && data?.ok !== false ? null : data?.error ?? `실패했어요 (${res.status})`;
}

export function CtaWorkspace() {
  const [days, setDays] = useState("28");
  const { data, error, reload } = useJson<CtaResp>(`/api/media/cta?days=${days}`);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CtaLink | null>(null);
  const [deleting, setDeleting] = useState<CtaLink | null>(null);
  const [toggling, setToggling] = useState<CtaLink | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const links = data?.links ?? [];

  async function remove(link: CtaLink) {
    const err = await send(`/api/media/cta/${encodeURIComponent(link.key)}`, "DELETE");
    setDeleting(null);
    setMsg(err ? { tone: "danger", text: err } : { tone: "info", text: `${link.key} 링크를 지웠어요.` });
    void reload();
  }
  async function toggle(link: CtaLink) {
    const err = await send(`/api/media/cta/${encodeURIComponent(link.key)}`, "PUT", { active: !link.active });
    setToggling(null);
    setMsg(err ? { tone: "danger", text: err } : { tone: "info", text: `${link.key} 링크를 ${link.active ? "껐어요" : "켰어요"}.` });
    void reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CTA 관리"
        description="발행 글 하단 CTA가 쓰는 공유 주소예요. 목적지를 바꾸면 이미 나간 글도 바로 새 목적지로 가요."
        action={
          <button type="button" className={buttonClass("solid")} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            링크 만들기
          </button>
        }
      />
      {error && <Notice tone="danger">{error}</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Section
        title="CTA 링크"
        kicker={data ? `${n0(links.length)}개` : undefined}
        action={<FilterDropdown heading="클릭 집계 기간" value={days} onChange={setDays} options={DAYS} className="w-32" />}
        bodyClassName="p-0"
      >
        {!data && !error ? (
          <div className="space-y-2 p-4">
            <SkeletonBar className="h-8 w-full" />
            <SkeletonBar className="h-8 w-full" />
          </div>
        ) : !data ? (
          // 읽기 실패를 "아직 링크가 없어요"로 보이면 있는 링크를 또 만들게 된다. 실패는 실패로(EMPTY_COPY.failed)
          <div className="p-4">
            <EmptyState message={EMPTY_COPY.failed("CTA 링크를")} />
          </div>
        ) : links.length === 0 ? (
          <div className="p-4">
            <EmptyState message={EMPTY_COPY.notYet("CTA 링크가")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-[13px] text-muted">
                  <Th className="px-4">링크</Th>
                  <Th>목적지</Th>
                  <Th align="right">클릭</Th>
                  <Th align="right">방문자</Th>
                  <Th>켜짐</Th>
                  <Th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const st = data?.stats[l.key];
                  const isOpen = open === l.key;
                  return (
                    <Fragment key={l.key}>
                      <tr className="border-b border-border align-top">
                        <td className="max-w-[320px] px-4 py-2.5">
                          <button type="button" className="flex items-start gap-1 text-left" onClick={() => setOpen(isOpen ? null : l.key)} aria-expanded={isOpen}>
                            {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />}
                            <span className="min-w-0">
                              <span className="block font-medium text-text">{l.label}</span>
                              <span className="block text-[13px] text-muted">{l.key}</span>
                            </span>
                          </button>
                          {/* 주소 바탕(CTA_REDIRECT_BASE_URL 또는 미디어허브 수집기)이 없으면 공유 주소를 못 만든다. 설정은 docs/readme/ops.md */}
                          {!l.redirect_url && <span className="ml-5 mt-1 block text-[13px] text-muted">공유 주소 준비 중</span>}
                          {l.redirect_url && (
                            <span className="ml-5 mt-1 flex items-center gap-1 text-[13px] text-text-2">
                              <span className="truncate">{l.redirect_url}</span>
                              <button
                                type="button"
                                className={buttonClass("ghost", "!px-1 !py-0.5")}
                                title="공유 주소 복사"
                                aria-label="공유 주소 복사"
                                onClick={() => void navigator.clipboard?.writeText(l.redirect_url)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="max-w-[280px] px-2 py-2.5">
                          <a href={l.destination_url} target="_blank" rel="noopener noreferrer" className="block truncate text-text-2 hover:underline" title={l.destination_url}>
                            {l.destination_url.replace(/^https?:\/\//, "")}
                          </a>
                          {(l.utm_source || l.utm_campaign || l.utm_content) && (
                            <span className="block truncate text-[13px] text-muted">
                              UTM {[l.utm_source, l.utm_campaign, l.utm_content].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </td>
                        <td className="tnum px-2 py-2.5 text-right text-text">{n0(st?.clicks ?? 0)}</td>
                        <td className="tnum px-2 py-2.5 text-right text-text">{n0(st?.visitors ?? 0)}</td>
                        <td className="px-2 py-2.5">
                          <Switch checked={l.active} onChange={() => setToggling(l)} label={l.active ? "켜짐, 누르면 꺼요" : "꺼짐, 누르면 켜요"} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button type="button" className={buttonClass("ghost", "!px-1.5 !py-1.5")} title="고치기" aria-label="고치기" onClick={() => setEditing(l)}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" className={buttonClass("ghost", "!px-1.5 !py-1.5")} title="지우기" aria-label="지우기" onClick={() => setDeleting(l)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border bg-bg-2">
                          <td colSpan={6} className="px-4 py-3 pl-9">
                            {!st ? (
                              <p className="text-[13px] text-muted">{EMPTY_COPY.period("클릭이")}</p>
                            ) : (
                              <div className="grid gap-4 lg:grid-cols-4">
                                <CountList title="유입 채널" rows={st.channels} />
                                <CountList title="글" rows={st.sources} />
                                <CountList title="기기" rows={st.devices} />
                                <div>
                                  <p className="text-[13px] font-semibold text-text">최근 클릭</p>
                                  <ul className="mt-1 space-y-0.5">
                                    {st.recent.map((r, i) => (
                                      <li key={i} className="text-[13px] text-text-2">
                                        {r.clicked_at.slice(0, 16).replace("T", " ")} · {r.channel} · {r.device}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {(creating || editing) && (
        <LinkModal
          link={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(text) => {
            setCreating(false);
            setEditing(null);
            setMsg({ tone: "info", text });
            void reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="CTA 링크 지우기"
        message={
          <>
            <strong className="text-text">{deleting?.key}</strong> 링크를 지우면 이 주소를 쓴 글의 CTA가 바로 404가 돼요. 되돌릴 수 없어요. 잠시 막을 거면 끄기를 쓰세요.
          </>
        }
        confirmLabel="지우기"
        focusCancel
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.active ? "CTA 링크 끄기" : "CTA 링크 켜기"}
        message={
          <>
            <strong className="text-text">{toggling?.key}</strong>: {toggling?.active ? "켜짐 → 꺼짐" : "꺼짐 → 켜짐"}. 이 주소를 쓴 글의 CTA가 바로{" "}
            {toggling?.active ? "404가 돼요" : "목적지로 다시 넘어가요"}. 다시 누르면 되돌릴 수 있어요.
          </>
        }
        confirmLabel={toggling?.active ? "끄기" : "켜기"}
        onConfirm={() => toggling && toggle(toggling)}
        onCancel={() => setToggling(null)}
      />
    </div>
  );
}

function CountList({ title, rows }: { title: string; rows: { label: string; clicks: number }[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-text">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.slice(0, 8).map((r) => (
          <li key={r.label} className="flex justify-between gap-2 text-[13px] text-text-2">
            <span className="truncate">{r.label}</span>
            <span className="tnum shrink-0">{n0(r.clicks)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkModal({ link, onClose, onSaved }: { link: CtaLink | null; onClose: () => void; onSaved: (text: string) => void }) {
  const [key, setKey] = useState(link?.key ?? "");
  const [label, setLabel] = useState(link?.label ?? "");
  const [dest, setDest] = useState(link?.destination_url ?? "");
  const [src, setSrc] = useState(link?.utm_source ?? "");
  const [camp, setCamp] = useState(link?.utm_campaign ?? "");
  const [content, setContent] = useState(link?.utm_content ?? "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const destChanged = !!link && dest.trim() !== link.destination_url;

  async function save() {
    setConfirming(false);
    setSaving(true);
    setErr(null);
    const body = { key, label, destination_url: dest, utm_source: src, utm_campaign: camp, utm_content: content };
    const e = link ? await send(`/api/media/cta/${encodeURIComponent(link.key)}`, "PUT", body) : await send("/api/media/cta", "POST", body);
    setSaving(false);
    if (e) return setErr(e);
    onSaved(link ? `${link.key} 링크를 고쳤어요.` : `${key} 링크를 만들었어요.`);
  }

  return (
    <Modal
      open
      onClose={onClose}
      closable={!saving}
      title={link ? "CTA 링크 고치기" : "CTA 링크 만들기"}
      subtitle={link?.key}
      size="md"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className={buttonClass("solid")}
            disabled={saving || !key.trim() || !label.trim() || !dest.trim()}
            onClick={() => (destChanged ? setConfirming(true) : save())}
          >
            {saving ? "저장하는 중" : link ? "고친 내용 저장하기" : "링크 만들기"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="키" hint="공유 주소 /go/{키}의 끝이에요. 만든 뒤에는 바꿀 수 없어요.">
          <input className={inputClass(INPUT_H)} value={key} disabled={!!link} onChange={(e) => setKey(e.target.value)} placeholder="예: gosiwon_home" />
        </Field>
        <Field label="라벨">
          <input className={inputClass(INPUT_H)} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 혼잘주거 홈 CTA" />
        </Field>
        <Field label="목적지 주소">
          <input className={inputClass(INPUT_H)} type="url" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://gobang.kr/home?..." />
        </Field>
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Field label="UTM source">
            <input className={inputClass(INPUT_H)} value={src} onChange={(e) => setSrc(e.target.value)} />
          </Field>
          <Field label="UTM campaign">
            <input className={inputClass(INPUT_H)} value={camp} onChange={(e) => setCamp(e.target.value)} />
          </Field>
          <Field label="UTM content">
            <input className={inputClass(INPUT_H)} value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="목적지 바꾸기"
        message={
          <>
            <strong className="text-text">{link?.key}</strong>: <strong className="text-text">{link?.destination_url}</strong> → <strong className="text-text">{dest}</strong>. 이 주소를 쓴 글의 CTA가 저장하는 순간부터 새 목적지로 가요. 되돌리려면 다시 고치면 돼요.
          </>
        }
        size="md"
        confirmLabel="저장하기"
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  );
}
