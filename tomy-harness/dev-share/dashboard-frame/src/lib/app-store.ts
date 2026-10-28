// 고방 네이티브 앱 스토어 평점(서버 전용) — 공개 스토어 값을 읽는다(콘솔 권한 불필요).
// iOS = iTunes Lookup API(JSON), Android = Play 스토어 상세 페이지의 schema.org 평점.
// ⚠️ 둘 다 **오늘 시점 값 하나**다. 주별 이력은 스토어 콘솔 연동(Play 대량 보고서 ratings CSV ·
//    App Store Connect 분석 보고서) 전까지 없다 — 표에 과거 주 평점을 지어 넣지 말 것.
// ⚠️ Play 표시 평점은 최근 평가에 가중치를 둔 값이라 전체 평균과 다르다.

export const IOS_APP_ID = '1196256988';
export const ANDROID_PACKAGE = 'muggle.android.gobang';

export type StoreRating = { rating: number; count: number } | null;
export type AppRatings = { android: StoreRating; ios: StoreRating; fetchedAt: string };

export function parseItunesLookup(json: unknown): StoreRating {
  const r = (json as { results?: { averageUserRating?: unknown; userRatingCount?: unknown }[] })?.results?.[0];
  const rating = Number(r?.averageUserRating);
  const count = Number(r?.userRatingCount);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return { rating, count: Number.isFinite(count) ? count : 0 };
}

export function parsePlayRating(html: string): StoreRating {
  const rating = Number(html.match(/"ratingValue":"?([0-9.]+)"?/)?.[1]);
  const count = Number(html.match(/"ratingCount":"?([0-9]+)"?/)?.[1]);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return { rating, count: Number.isFinite(count) ? count : 0 };
}

async function fetchIos(): Promise<StoreRating> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=kr`, { cache: 'no-store' });
  if (!res.ok) return null;
  return parseItunesLookup(await res.json());
}

async function fetchAndroid(): Promise<StoreRating> {
  const res = await fetch(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&hl=ko&gl=KR`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  return parsePlayRating(await res.text());
}

/** 한쪽이 실패해도 다른 쪽은 보여준다(실패한 쪽만 null). */
export async function fetchAppRatings(): Promise<AppRatings> {
  const [android, ios] = await Promise.all([fetchAndroid().catch(() => null), fetchIos().catch(() => null)]);
  return { android, ios, fetchedAt: new Date().toISOString() };
}
