export function krw(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

/**
 * 금액 입력칸에 보이는 값 — 숫자만 남기고 천 단위 쉼표를 붙인다(입력칸마다 표기가 갈리지 않게 한 곳에서).
 * 원 단위 정수만 받는다: 소수점 이하는 버린다(점을 지우고 자릿수를 이어 붙이면 "1234.5"가 12345로 10배가 된다).
 */
export function moneyInput(v: string): string {
  const digits = v.split(".")[0].replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

export function num(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("ko-KR");
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return n.toFixed(digits) + "%";
}

/**
 * 비율(0~1) → 백분율 표기. `pct`는 **이미 백분율인 값**을 받으므로 CTR·전환효율에 쓰면 100배 축소된다.
 * (구 위치: components/strategy/StrategyViews.tsx. 포매터가 컴포넌트 파일에 있으면
 * 클라이언트 컴포넌트가 그걸 쓰려고 전략 모듈 전체를 끌고 온다.)
 */
export function ratioPct(n: number | null | undefined, digits = 1): string {
  return n == null ? "—" : `${(n * 100).toFixed(digits)}%`;
}

// 증감 방향(색만으로 의미전달 금지 → 부호·화살표 병기)
export function delta(curr: number, prev: number) {
  if (prev === 0) return { dir: "flat" as const, pct: 0, arrow: "→" };
  const d = ((curr - prev) / prev) * 100;
  const dir = d > 0.5 ? ("up" as const) : d < -0.5 ? ("down" as const) : ("flat" as const);
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "→";
  return { dir, pct: d, arrow };
}

// CPI는 낮을수록 좋음 → 색 의미 반전 처리에 사용
export function deltaTone(dir: "up" | "down" | "flat", lowerIsBetter = false) {
  if (dir === "flat") return "text-muted";
  const good = lowerIsBetter ? dir === "down" : dir === "up";
  return good ? "text-positive" : "text-negative";
}

/**
 * Date → `YYYY-MM-DD`(UTC 기준) 변환 전용. **"오늘"을 구할 때 쓰지 않는다** — KST 00~09시엔 하루 전 날짜가 나온다.
 * "오늘"은 `reliability.todayISO` 하나로 구한다(2026-10-27 감사 02: 두 정의가 섞여 판정 창 끝이 하루 갈렸다).
 */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * DB 시각(timestamptz, UTC) → 화면용 KST `YYYY-MM-DD HH:MM`. 날짜만 필요하면 `actionEffect.kstDate`.
 * 문자열을 그대로 잘라 보이면 오전 10시 변경이 "01:00"으로 보인다(9시간 어긋남).
 */
export function kstDateTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return String(iso).slice(0, 16).replace("T", " ");
  return new Date(t + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}
