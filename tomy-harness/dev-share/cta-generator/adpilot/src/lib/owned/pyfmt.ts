// 파이썬 서식·반올림을 그대로 옮긴 것 — Owned 판정 문구가 미디어허브(Python) 시절과 글자 하나까지 같게.
// 판정 근거 문장("노출 1,234회")은 화면·팀장 프롬프트·내보낸 파일에 그대로 나가서, 서식이 갈리면 같은 판정이 다른 말을 한다.
//
// 파이썬 round()·format은 정확히 반인 값에서 짝수 쪽으로 간다(2.5 → 2). JS Math.round·toFixed는 위로 간다.
// 판정 숫자(기회 클릭 수 등)가 여기서 갈리므로 반올림은 반드시 pyRound를 쓴다.

/** 파이썬 round(x, nd) — 정확히 반이면 짝수 쪽 */
export function pyRound(x: number, nd = 0): number {
  if (!Number.isFinite(x)) return x;
  const m = 10 ** nd;
  const s = x * m;
  const f = Math.floor(s);
  const diff = s - f;
  let r: number;
  if (diff === 0.5) r = f % 2 === 0 ? f : f + 1;
  else r = Math.round(s);
  const out = r / m;
  return Object.is(out, -0) ? 0 : out;
}

/** f'{x:.{nd}f}' */
export function pyFixed(x: number, nd: number): string {
  const r = pyRound(x, nd);
  const s = r.toFixed(nd);
  return s === `-${(0).toFixed(nd)}` ? (0).toFixed(nd) : s;
}

/** f'{n:,}' — 정수 천 단위 쉼표. 실수가 오면 파이썬처럼 소수를 그대로 둔다 */
export function pyComma(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) {
    const neg = n < 0;
    const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return neg ? `-${digits}` : digits;
  }
  const [i, d] = String(n).split(".");
  return `${pyComma(Number(i))}.${d}`;
}

/** f'{x:.{nd}%}' */
export function pyPct(x: number, nd: number): string {
  return `${pyFixed(x * 100, nd)}%`;
}

/** f'{x:+.{nd}%}' — 0 이상이면 + */
export function pySignedPct(x: number, nd: number): string {
  const body = pyFixed(x * 100, nd);
  return body.startsWith("-") ? `${body}%` : `+${body}%`;
}

/** f'{x:+.{nd}f}' */
export function pySignedFixed(x: number, nd: number): string {
  const body = pyFixed(x, nd);
  return body.startsWith("-") ? body : `+${body}`;
}

/** f'{x:g}' — 판정 상수(2.0 → "2", 1.3 → "1.3")에만 쓴다 */
export function pyG(x: number): string {
  return Number.isInteger(x) ? String(x) : String(x);
}

/** 파이썬 str.split() — 공백 덩어리로 쪼개고 빈 조각을 버린다 */
export function pySplit(s: string | null | undefined): string[] {
  return (s ?? "").split(/\s+/).filter(Boolean);
}

/** 파이썬 str.isdigit()(ASCII 숫자만 보는 근사 — 검색어 어절에서 충분하다) */
export function isDigits(s: string): boolean {
  return /^\d+$/.test(s);
}

/** datetime.fromisoformat — 시각 없는 날짜·시각은 로컬 시각으로 읽는다(파이썬 naive datetime과 같다) */
export function parseLocalIso(stamp: string): Date | null {
  if (!stamp) return null;
  const s = /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? `${stamp}T00:00:00` : stamp;
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?/.test(s)) return null;
  const d = new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** (now - then).days — 내림. 파이썬 timedelta.days와 같다 */
export function daysBetween(then: Date, now: Date): number {
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}
