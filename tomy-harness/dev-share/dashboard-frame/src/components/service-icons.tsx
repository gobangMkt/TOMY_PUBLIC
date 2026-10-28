// 서비스 로고(파비콘) — 각 서비스 repo의 `src/app/icon.svg`를 그대로 옮겼다.
//
// `components/icons.tsx`의 Lucide 계열(단색·currentColor)과 다른 층위다 — 이건 브랜드 마크라
// **고정 색**을 쓴다(그 서비스의 파비콘·워드마크와 같은 그림이어야 인식이 이어진다). 방문분석
// 개별비교에서 "지금 어느 서비스를 보고 있나"를 형태로 구분하기 위한 용도(2026-08-27 지시)라,
// 새 서비스가 registry에 등록될 때마다 여기 한 벌씩 추가한다.
//
// ⚠️ 원본 SVG를 고칠 때(로고가 바뀌면) 각 서비스 repo의 `icon.svg`와 다시 맞출 것 — 여기서
// 임의로 다시 그리지 않는다.

type IconProps = { size?: number; className?: string };

/** 줍줍분양(gobang-bunyang) — 돋보기(검색) 마크. */
export function BunyangIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="8.6" cy="8.6" r="6.5" fill="#25B9B9" />
      <rect x="12.1" y="13.4" width="5.6" height="2.7" rx="1.35" transform="rotate(45 14.9 14.75)" fill="#25B9B9" />
      <circle cx="8.6" cy="8.6" r="4.7" fill="#FFFFFF" />
      <path d="M8.6 5.6 L11.9 8.35 H5.3 Z" fill="#25B9B9" />
      <path d="M6.4 8.35 H10.8 V11.4 H6.4 Z" fill="#25B9B9" />
      <rect x="7.9" y="9.3" width="1.4" height="2.1" rx="0.3" fill="#FFFFFF" />
    </svg>
  );
}

/** 찐정책(gobang-jjinpolicy) — 검증 도장이 찍힌 공고 마크. */
export function JjinpolicyIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect width="20" height="20" rx="4.5" fill="#ffffff" />
      <rect x="2.9" y="2.1" width="10.6" height="13.8" rx="2.2" fill="#25b9b9" />
      <rect x="5.2" y="5.4" width="5.9" height="1.4" rx="0.7" fill="#ffffff" />
      <rect x="5.2" y="8.3" width="3.9" height="1.4" rx="0.7" fill="#ffffff" />
      <circle cx="13.6" cy="13.4" r="4.5" fill="#ffffff" />
      <circle cx="13.6" cy="13.4" r="3.6" fill="#1baa5a" />
      <path d="M11.85 13.1 11.13 13.82 13.03 15.72 16.07 12.68 15.35 11.96 13.03 14.28Z" fill="#ffffff" />
    </svg>
  );
}

/**
 * 청년이슈 픽(youthissue) — 주간 랭킹 상승을 뜻하는 3단 막대 마크.
 * 원본 SVG 소스가 없어(youthissue는 favicon.ico만 있음, icon.svg 없음) 새로 그렸다 —
 * 나중에 youthissue가 자체 icon.svg를 갖게 되면 그걸 기준으로 다시 맞출 것.
 */
export function YouthissueIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect width="20" height="20" rx="4.5" fill="#ffffff" />
      <rect x="3" y="11" width="3.6" height="6" rx="1.1" fill="#25b9b9" />
      <rect x="8.2" y="7" width="3.6" height="10" rx="1.1" fill="#25b9b9" />
      <rect x="13.4" y="3" width="3.6" height="14" rx="1.1" fill="#1baa5a" />
    </svg>
  );
}
