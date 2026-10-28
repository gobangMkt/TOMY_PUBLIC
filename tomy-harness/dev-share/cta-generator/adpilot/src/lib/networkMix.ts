// 지면(네트워크) 구성 — 소재 단위 실적을 노출된 지면별로 나눈 것. 순수 함수.
// 스펙: docs/2026-10-21-paid-desk-upgrade-spec.md §2.
//
// 왜 필요한가: 같은 문구라도 디스플레이에 몰리면 클릭률이 검색의 몇 분의 일로 나온다. 지면을 모르면
// 지면 탓을 소재 탓으로 오진한다. 그래서 화면과 팀장 브리프에 "어느 지면에서 돈을 썼나"를 한 줄로 붙인다.

export interface NetworkStat {
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
}

/** 매체 지면 코드 → 실적. 매체가 준 코드를 그대로 키로 둔다(이름은 화면에서만 바꾼다) */
export type NetworkMix = Record<string, NetworkStat>;

/** 지면 코드 → 화면 이름. 여기 없는 코드는 원문 그대로 보여 준다(지어내지 않는다) */
export const NETWORK_LABEL: Record<string, string> = {
  SEARCH: "검색",
  SEARCH_PARTNERS: "검색 파트너",
  CONTENT: "디스플레이",
  YOUTUBE: "유튜브",
  YOUTUBE_WATCH: "유튜브",
  YOUTUBE_SEARCH: "유튜브",
  MIXED: "혼합",
};

export const networkLabel = (code: string) => NETWORK_LABEL[code] ?? code;

/** 한 지면에 비용이 이 비율 이상 몰리면 "쏠림"으로 본다 — 팀장 브리프 지시와 같은 값 */
export const NETWORK_SKEW_SHARE = 0.7;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const add = (a: number | null, b: number | null) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));

/**
 * Google `ad_group_ad_asset_view` + `segments.ad_network_type` 행 → 단위 id별 지면 구성.
 * 단위 id는 googleTextUnits·googleMediaUnits와 같은 규칙(`google:<adId>:<assetId>:<fieldType>`)이다.
 */
export function googleNetworkMix(rows: any[]): Map<string, NetworkMix> {
  const out = new Map<string, NetworkMix>();
  for (const r of rows) {
    const fieldType = r.adGroupAdAssetView?.fieldType;
    const adId = r.adGroupAd?.ad?.id;
    const assetId = r.asset?.id;
    const net = r.segments?.adNetworkType;
    if (!fieldType || adId == null || assetId == null || !net) continue;
    const id = `google:${adId}:${assetId}:${fieldType}`;
    const mix = out.get(id) ?? {};
    const cost = num(r.metrics?.costMicros);
    const prev = mix[net] ?? { impressions: null, clicks: null, spend: null, conversions: null };
    mix[net] = {
      impressions: add(prev.impressions, num(r.metrics?.impressions)),
      clicks: add(prev.clicks, num(r.metrics?.clicks)),
      spend: add(prev.spend, cost == null ? null : Math.round(cost / 1e6)),
      conversions: add(prev.conversions, num(r.metrics?.conversions)),
    };
    out.set(id, mix);
  }
  return out;
}

/** 지면 구성을 단위에 붙인다. 지면 조회가 실패했으면(map null) 전부 null — 없는 값을 0으로 채우지 않는다 */
export function attachNetworkMix<T extends { id: string }>(
  units: T[],
  map: Map<string, NetworkMix> | null
): (T & { network_mix: NetworkMix | null })[] {
  return units.map((u) => ({ ...u, network_mix: map ? map.get(u.id) ?? null : null }));
}

export interface NetworkShare {
  label: string;
  share: number;
}

/**
 * 화면 이름으로 접은 비중(큰 순). 비용이 있으면 비용 기준, 비용이 0이면 노출 기준, 둘 다 없으면 null.
 * 유튜브 세 코드처럼 같은 이름으로 접히는 지면은 합친다.
 */
export function networkShares(mix: NetworkMix | null | undefined): { basis: "spend" | "impressions"; shares: NetworkShare[] } | null {
  if (!mix) return null;
  const entries = Object.entries(mix);
  const total = (k: "spend" | "impressions") => entries.reduce((s, [, v]) => s + (v[k] ?? 0), 0);
  const basis = total("spend") > 0 ? "spend" : total("impressions") > 0 ? "impressions" : null;
  if (!basis) return null;
  const sum = total(basis);
  const byLabel = new Map<string, number>();
  for (const [code, v] of entries) {
    const x = v[basis] ?? 0;
    if (x <= 0) continue;
    const label = networkLabel(code);
    byLabel.set(label, (byLabel.get(label) ?? 0) + x);
  }
  const shares = [...byLabel.entries()]
    .map(([label, x]) => ({ label, share: x / sum }))
    .sort((a, b) => b.share - a.share);
  return { basis, shares };
}

const pctText = (s: number) => (s < 0.005 ? "1% 미만" : `${Math.round(s * 100)}%`);

/** 한 줄 — "지면(비용 기준) 디스플레이 72% · 검색 20% · 유튜브 8%". 그릴 근거가 없으면 null(줄을 안 그린다) */
export function networkMixLine(mix: NetworkMix | null | undefined): string | null {
  const r = networkShares(mix);
  if (!r || r.shares.length === 0) return null;
  const basis = r.basis === "spend" ? "비용 기준" : "노출 기준";
  return `지면(${basis}) ${r.shares.map((s) => `${s.label} ${pctText(s.share)}`).join(" · ")}`;
}

/** 비용의 70% 이상이 한 지면에 몰렸으면 그 지면 이름. 비용 기준으로만 판단한다(노출 기준은 쏠림 근거로 약하다) */
export function skewedNetwork(mix: NetworkMix | null | undefined): string | null {
  const r = networkShares(mix);
  if (!r || r.basis !== "spend") return null;
  const top = r.shares[0];
  return top && top.share >= NETWORK_SKEW_SHARE ? top.label : null;
}
