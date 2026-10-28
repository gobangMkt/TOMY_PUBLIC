import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 중위값 — 기준선 산식 하나(2026-10-27 합침: actionQueue·copyWeak·creativeMaturity에 세 벌이 있었다).
 * 빈 배열은 0(기준선 없음). 호출부는 모두 동료 수를 먼저 거른다.
 */
export function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/**
 * ISO 시각 → 한국 날짜(YYYY-MM-DD). 매체 리포트 날짜는 한국 시간이다 — 서버(UTC)의 날짜로 자르면
 * 오전 9시 전 조치가 전날로 간다. 시각으로 못 읽으면 앞 10자를 그대로 쓴다.
 */
export function kstDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return String(iso).slice(0, 10);
  return new Date(t + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 날짜 "M/D" 표기(YYYY-MM-DD → 11/2). 화면의 짧은 날짜 표기 하나 */
export const mdSlash = (iso: string): string => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
