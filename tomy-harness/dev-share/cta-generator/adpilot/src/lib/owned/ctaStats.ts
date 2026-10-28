// CTA 링크 클릭 통계 접기 — 정본. 2026-10-28(스펙 2-4) 미디어허브 services/cta_links.py에서 옮겼다(parity.test.ts가 잠근다).
// 클릭 한 번마다 공개 리다이렉트 앱(for_Release/미니앱/gobang-cta-redirect)이 cta_clicks에 한 줄 남긴다.
// 봇(링크 미리보기)은 리다이렉트가 표시만 해 두고 여기서 뺀다 — 공유 한 번이 클릭 한 번으로 잡히면 숫자를 못 믿는다.

/** 유입 채널 — 축은 하나(리퍼러 호스트). 위에서부터 처음 맞는 것, 어디에도 안 맞으면 기타 사이트, 리퍼러가 없으면 알 수 없음 */
export const CTA_CHANNELS: [string, string[]][] = [
  ["gobang.kr", ["gobang.kr"]],
  ["네이버", ["naver.com", "naver.net"]],
  ["인스타그램", ["instagram.com"]],
  ["카카오", ["kakao.com", "daum.net"]],
  ["검색엔진", ["google.", "bing.com"]],
];
export const CHANNEL_OTHER = "기타 사이트";
export const CHANNEL_NONE = "알 수 없음";
export const DEVICE_LABEL: Record<string, string> = { mobile: "모바일", desktop: "PC", tablet: "태블릿", unknown: "알 수 없음" };

export function channelOf(host: string | null | undefined): string {
  const h = (host ?? "").toLowerCase();
  if (!h) return CHANNEL_NONE;
  for (const [label, needles] of CTA_CHANNELS) {
    if (needles.some((n) => h === n || h.endsWith(`.${n}`) || (n.endsWith(".") && h.includes(n)))) return label;
  }
  return CHANNEL_OTHER;
}

export interface ClickRow {
  key: string | null;
  src: string | null;
  clicked_at: string | null;
  referer: string | null;
  referer_host: string | null;
  device: string | null;
  visitor: string | null;
  is_bot: boolean | null;
}

export interface CountRow {
  label: string;
  clicks: number;
}

function count(values: string[]): CountRow[] {
  const tally = new Map<string, number>();
  for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([label, clicks]) => ({ label, clicks }));
}

export interface LinkStats {
  clicks: number;
  visitors: number;
  last_clicked_at: string;
  channels: CountRow[];
  sources: CountRow[];
  devices: CountRow[];
  recent: { clicked_at: string; channel: string; referer: string; source: string; device: string }[];
}

const deviceOf = (d: string | null) => DEVICE_LABEL[d || "unknown"] ?? "알 수 없음";

/**
 * 클릭 행을 링크 키별로 접는다. srcLabels는 src(`r12`)를 사람이 읽는 이름(`#12 글 제목`)으로 바꾸는 표다.
 * 표에 없는 src는 값 그대로, src가 없으면 `출처 표시 없음` — CTA 관리 화면에서 주소를 복사해 손으로 건 자리다.
 */
export function summarizeClicks(rows: ClickRow[], srcLabels: Record<string, string> = {}): Record<string, LinkStats> {
  const byKey = new Map<string, ClickRow[]>();
  for (const row of rows) {
    if (row.is_bot) continue;
    const k = row.key || "";
    const g = byKey.get(k);
    if (g) g.push(row);
    else byKey.set(k, [row]);
  }
  const out: Record<string, LinkStats> = {};
  for (const [key, items] of byKey) {
    items.sort((a, b) => {
      const x = a.clicked_at || "";
      const y = b.clicked_at || "";
      return x < y ? 1 : x > y ? -1 : 0;
    });
    const label = (src: string | null, empty: string) => srcLabels[src || ""] ?? (src || empty);
    out[key] = {
      clicks: items.length,
      visitors: new Set(items.map((r) => r.visitor).filter(Boolean)).size,
      last_clicked_at: items[0].clicked_at || "",
      channels: count(items.map((r) => channelOf(r.referer_host))),
      sources: count(items.map((r) => label(r.src, "출처 표시 없음"))),
      devices: count(items.map((r) => deviceOf(r.device))),
      recent: items.slice(0, 10).map((r) => ({
        clicked_at: r.clicked_at || "",
        channel: channelOf(r.referer_host),
        referer: r.referer || "",
        source: label(r.src, ""),
        device: deviceOf(r.device),
      })),
    };
  }
  return out;
}

/** CTA 링크 입력 검사. 키는 리다이렉트 주소(/go/{키})의 한 구간이라 공백·/·?·#을 못 쓴다 */
export function validateCtaInput(b: Record<string, unknown>): { key: string; label: string; destination_url: string } {
  const key = String(b.key ?? "").trim();
  const label = String(b.label ?? "").trim();
  const dest = String(b.destination_url ?? "").trim();
  if (!key || !label || !dest) throw new Error("키·라벨·목적지 주소를 모두 넣어 주세요");
  if (!/^[^\s/?#]{1,80}$/.test(key)) throw new Error("키에는 공백·/·?·#을 쓸 수 없어요");
  if (!/^https?:\/\//.test(dest)) throw new Error("목적지 주소는 http:// 또는 https://로 시작해야 해요");
  return { key, label, destination_url: dest };
}
