// 어드민 네비게이션 단일 소스: 사이드바 · 상단 브레드크럼 · 페이지 헤더 · 보드 탭이 모두 참조한다.
// 서비스(그룹) → 축(item). 축이 여러 화면을 가지면 tabs로 접어 사이드바엔 축만 노출하고
// 화면 상단 탭바로 tabs를 편다(예: 고방 핵심지표 > 매출 > [대시보드·상세·진행현황·목표]).
// tabs 없는 축은 기존처럼 사이드바에 그대로 노출(광고·분양).

import {
  DashboardIcon,
  BuildingIcon,
  ContentIcon,
  TargetIcon,
  CampaignsIcon,
  ColumnsIcon,
  CompareIcon,
  WonIcon,
  PhoneIcon,
  ReportsIcon,
  EyeIcon,
  SpeechIcon,
  UsersIcon,
} from '@/components/icons';
import { BunyangIcon, JjinpolicyIcon } from '@/components/service-icons';

export type IconComponent = (props: { size?: number; className?: string }) => React.ReactElement;

export type NavItem = {
  label: string;
  href: string;
  desc?: string; // 페이지 헤더 부제 기본값
  icon?: IconComponent; // 보드 아이콘(없으면 서비스 아이콘)
  soon?: boolean;
  tabs?: NavItem[]; // 있으면: 사이드바엔 이 축만, 화면 상단 탭으로 tabs를 편다
  external?: boolean; // 있으면: 내부 라우트가 아니라 외부 URL: 새 탭으로 연다(활성표시·탭 없음)
  /**
   * 활성 판정에 `href` 대신 쓰는 넓은 접두사(2026-08-27, 개별비교 신설로 추가).
   * `tabs`처럼 여러 목적지를 갖지만 그 목적지 목록이 정적이지 않은 축(예: 등록된 서비스 수만큼
   * 늘어나는 방문분석 개별비교)에 쓴다. 어느 서비스 화면에 있든 이 축이 사이드바·브레드크럼에서
   * 활성으로 잡힌다. 지정 안 하면 기존처럼 `href`로 판정.
   */
  activeBase?: string;
  /**
   * 이 축의 브레드크럼 3번째 칸을 정적 텍스트가 아니라 **드롭다운**으로 그리게 하는 표시.
   * 값은 그 드롭다운이 읽을 레지스트리 이름: 지금은 `visit-analytics` 하나뿐이다(`Breadcrumb`가
   * `lib/visit-analytics/registry.ts`를 직접 참조). 새 축에 같은 패턴이 필요해지면 여기 값을 늘리고
   * `Breadcrumb`에 분기를 추가한다.
   */
  serviceRegistry?: 'visit-analytics';
};

export type NavService = {
  label: string;
  icon: IconComponent;
  items: NavItem[];
};

export const NAV: NavService[] = [
  {
    label: '고방 핵심지표',
    icon: DashboardIcon,
    items: [
      {
        label: '통합',
        href: '/overview/weekly', // 축 진입 = 첫 탭(매주 여기서 마감한다)
        icon: DashboardIcon,
        desc: '전사 매출·지표 현황',
        // 리포트 축 폐지(2026-07-30) → **부활**(2026-07-31, 대시보드에서 다시 분리): 리포트가
        // 대시보드의 [리포트 만들기] 버튼이던 동안, 대시보드가 지금 보는 기간(계속 보기용)을
        // 그대로 리포트 기간(스냅샷 뜨기용)으로 써서 대시보드에서 기간을 옮기면 만들어 둔 리포트가
        // "다시 생성 필요"로 바뀌었다. 이제 리포트가 자기 기간을 갖는 별도 탭이다.
        // 🚨 **통합 대시보드 폐지(2026-08-03 사용자 판단)**: "통합대시보드랑 주간흐름·월간흐름이 별반
        // 차이가 없는 것 같은데? 월간흐름·주간흐름을 더 강화하고 통합대시보드 없애자." 실제로 그 화면의
        // 추이 차트는 두 흐름 화면의 차트와, 기간 비교표는 리포트와 같은 것을 보여주고 있었다. 그 화면이
        // 유일하게 갖고 있던 **고방/U사장님 스코프별 매출·목표 달성률**은 두 흐름 화면 상단으로 옮겼다
        // (`components/overview/scope-achievement.tsx`). 되살리지 말 것: 살리면 같은 숫자를 세 화면이
        // 각자 계산하는 상태로 돌아간다(고방·U사장님 대시보드를 없앤 것과 같은 이유).
        tabs: [
          // 주간이 먼저다. 매주 마감(동기화·매출 입력)이 이 화면에서 일어나고 월간은 월 1회다.
          { label: '주간 흐름', href: '/overview/weekly', icon: ColumnsIcon, desc: '주간 매출·지표 현황' },
          // 월간 흐름은 통합 축(2026-07-30 이동). 매출이 '고방 + U사장님 전 항목' 합이고
          // 조회·문의도 U사장님+U중개사 합이다. 고방 축에 두면 고방만의 숫자로 오독한다.
          { label: '월간 흐름', href: '/overview/monthly', icon: ColumnsIcon, desc: '2022년부터의 전사 월별 지표·전년동월 대비' },
          { label: 'OKR', href: '/overview/okr', icon: TargetIcon, desc: '목표 매트릭스·진행현황 개정' },
          { label: '리포트', href: '/overview/report', icon: ReportsIcon, desc: '기간을 정해 스냅샷 리포트를 만든다(고방+U사장님 한 문서)' },
        ],
      },
      // 축의 역할 분담(2026-08-03 사용자 확정): **통합 = 두 사업 합산·리포트 생성 / 고방·U사장님 =
      // 각자 상세 정보를 수집하는 곳.** 그래서 고방·U사장님의 '대시보드' 탭을 없앴다. 통합 대시보드가
      // 이미 두 사업의 추이(트래픽·매출·퍼널)와 기간 비교표를 다 갖고 있어 축소판 재탕이었고,
      // "현황을 어디서 보나"가 세 군데로 갈렸다. 구 경로는 /overview/dashboard로 redirect.
      {
        label: '고방',
        href: '/metrics/dashboard', // 축 진입 = 첫 탭
        icon: DashboardIcon,
        desc: '고방 트래픽·매출 상세',
        tabs: [
          // 'MAU' → '트래픽'(2026-07-30). 이 화면은 MAU만이 아니라 활성사용자·세션·신규·재방문과
          // 채널·스트림 구성을 다 본다. 구 '채널 유입' 화면도 이 아래 구역으로 흡수했다
          // (둘 다 채널별 유입을 보여줘 이름만으로 구분이 안 됐다. 지적 "둘이 합쳐").
          { label: '트래픽', href: '/metrics/dashboard', icon: EyeIcon, desc: 'GA4 유입 현황(스트림·채널) + 채널 목표·광고비' },
          { label: '매출', href: '/revenue/dashboard', icon: WonIcon, desc: 'BM별 매출·목표 대비 + 건별 거래 등록·수정·삭제' },
          // 앱(2026-10-16): 기토 주간 지표 5종(GA4 WAU 웹/앱·다운로드·스토어 활성·평점) 추이 차트 + 표.
          // 폐지된 고방 대시보드(흐름 화면 재탕)와 달리 흐름 화면에 없는 앱 전용 지표만 다룬다.
          { label: '앱', href: '/gobang/app', icon: PhoneIcon, desc: '스토어 신규 설치·활성·평점 + GA4 WAU 웹/앱 주별 추이' },
        ],
      },
      {
        label: 'U사장님',
        href: '/uboss/metrics', // 축 진입 = 첫 탭
        icon: SpeechIcon,
        desc: 'U사장님 조회·문의·매출 상세',
        tabs: [
          { label: '지표', href: '/uboss/metrics', icon: SpeechIcon, desc: 'U사장님·GA4 문의/조회' },
          { label: '매출', href: '/uboss/revenue', icon: WonIcon, desc: 'U사장님 매출·목표 대비' },
        ],
      },
    ],
  },
  {
    label: '고방 광고',
    icon: CampaignsIcon,
    items: [
      { label: '대시보드', href: '/ads/dashboard', icon: DashboardIcon, desc: 'ad_banner 노출·클릭·CTR 요약' },
      {
        label: '상세 리포트',
        href: '/ads/original', // 축 진입 = 첫 탭
        icon: ColumnsIcon,
        desc: '전 차원 필터·정렬 원본 탐색',
        // 2026-08-13 탭 재편: 대시보드의 "{차원}별 비교" 차트는 전체 배너를 다 보여주는 개요용이고,
        // 운영자가 고른 특정 소재(배너) 몇 개만 나란히 뜯어보는 화면이 없었다 → 소재비교 탭 신설.
        // 원본 탐색기(구 유일 콘텐츠)는 통합비교로 이름만 바꿔 그대로 첫 탭에 둔다.
        tabs: [
          { label: '통합비교', href: '/ads/original', icon: ColumnsIcon, desc: '전 차원 필터·정렬 원본 탐색' },
          { label: '소재비교', href: '/ads/compare', icon: CompareIcon, desc: '선택한 소재(배너) 여러 개를 나란히 비교' },
        ],
      },
      { label: '광고 신청함', href: '/ads/leads', icon: ReportsIcon, desc: '랜딩 리드 접수·상태 관리·소개서 발송' },
      { label: '캠페인', href: '/ads/campaigns', icon: CampaignsIcon, soon: true },
    ],
  },
  // 🚨🚨 **"서비스 관리" 그룹으로 묶었다**(2026-08-27, 지시: "찐정책이 하나 더 생기는 바람에
  // 사이드바가 너무 많아질 것 같은데, 서비스관리 하고 하위에 줍줍분양·찐정책 묶는 건 어때?").
  // 그전엔 [고방 분양]·[찐정책]이 각자 최상위 그룹이었다. 서비스가 늘 때마다 최상위가 계속
  // 늘어나는 구조였다. 지금은 **서비스 하나 = 이 그룹의 축(item) 하나**이고, 그 서비스의 화면
  // 여러 개는 `tabs`로 접는다(줍줍분양의 매물관리·콘텐츠관리가 사이드바 2줄 → 탭 2개로).
  // 새 서비스가 붙으면 이 배열에 축 하나만 추가한다(최상위 그룹은 안 늘어난다).
  {
    label: '서비스 관리',
    icon: DashboardIcon, // 여러 서비스를 한데 묶는 그룹이라 범용 그리드 아이콘(개별 서비스는 각자 로고를 쓴다)
    items: [
      {
        label: '줍줍분양',
        href: '/bunyang/properties', // 축 진입 = 첫 탭
        icon: BunyangIcon, // 실제 파비콘(2026-08-27 지시: "각 서비스가 쓰는 로고 쓰면 됨")
        desc: '분양 매물·콘텐츠 운영',
        tabs: [
          { label: '매물 관리', href: '/bunyang/properties', icon: BuildingIcon, desc: '분양 매물 등록·수정·삭제' },
          { label: '콘텐츠 관리', href: '/bunyang/content', icon: ContentIcon, desc: '분양 콘텐츠 작성·발행' },
        ],
      },
      {
        label: '찐정책',
        href: '/jjinpolicy/data', // 축 진입 = 첫 탭
        icon: JjinpolicyIcon, // 실제 파비콘(위 줍줍분양과 같은 이유)
        desc: '찐정책 공고·사용자 데이터',
        // 🚨 정본이 Sheet가 아니라 배치 캐시 JSON이라(찐정책 CLAUDE.md 코어보호 §4) 분양처럼
        // GAS 프록시로 쓰기를 하지 않는다. `/api/jjinpolicy/*`가 찐정책 앱 자체의 `/api/admin/*`를
        // 프록시한다(GAS 아님). 단 **완전 읽기 전용은 아니다**(2026-08-27). "재수집 버튼도 없이
        // 데이터관리를 왜 둬?" 지적으로 [공고관리] 탭에 "지금 재수집"(온통청년 재수집 트리거)을
        // 붙였다. 정책 데이터 자체를 편집하는 쓰기는 여전히 없다(오분류 제외·태그 수정 등).
        // 2026-08-28 라벨 재정리(지시): '데이터 관리'→'공고관리'(이 탭이 다루는 게 온통청년
        // 공고 원본이라는 걸 이름이 말하게), '사용자 활동'→'사용자 데이터'(행동 지표는 방문
        // 분석 › 개별비교로 옮겨서 여기 남는 건 맞춤찾기 응답 '데이터'뿐이다).
        tabs: [
          { label: '공고관리', href: '/jjinpolicy/data', icon: ColumnsIcon, desc: '동기화 현황·원본 정책 검색 + 지금 재수집' },
          // 🚨 맞춤찾기 제출 조건 분포: visitorId와 연결하지 않는다(개인 활동 추적은 지금 동의
          // 문구가 약속한 범위 밖, activity-view.tsx 주석 참고). 정책조회·신청클릭 등 행동 지표는
          // 여기 없다. 방문 분석 › 개별비교 › 찐정책(visit-view.tsx)이 갖는다.
          { label: '사용자 데이터', href: '/jjinpolicy/activity', icon: UsersIcon, desc: '맞춤찾기 제출 조건 분포(익명, 개인별 연결 없음)' },
        ],
      },
    ],
  },
  // 🚨 **최상위 그룹으로 승격**(2026-08-26). 그전엔 [고방 분양] 하위 "방문 분석" 항목 하나였는데,
  // gobang-admin의 장기 목표가 "고방 전 서비스의 통합 운영 백엔드"라 앞으로 서비스마다(jjin정책 등)
  // Clarity 방문 분석이 계속 붙는다. 서비스 종속 항목으로 두면 늘어날 때마다 각 서비스 그룹 아래
  // 흩어진다. 축 2개로 가른다(고방 핵심지표의 통합/개별 원칙과 같은 결): **개별비교**=서비스별 상세
  // 수집(지금은 줍줍분양 그대로 이식), **통합비교**=서비스 간 교차 비교. 등록 서비스 목록 정본은
  // `lib/visit-analytics/registry.ts` 한 곳: 새 서비스가 붙으면 그 파일에 한 줄, nav는 안 건드린다.
  {
    label: '방문 분석',
    icon: EyeIcon,
    items: [
      {
        label: '개별비교',
        href: '/visits/services/bunyang', // 축 진입 = 등록된 첫 서비스(레지스트리 순서)
        icon: EyeIcon,
        desc: '서비스별 방문자 행동(Clarity) 상세: 줍줍분양·찐정책·청년이슈 픽 등록',
        // 🚨 2026-08-27: 서비스별 화면이 각자 다른 href(/visits/services/{id})라 기본 href만으로는
        // 이 축이 활성으로 안 잡힌다(줍줍분양 화면에서 벗어나면 사이드바·브레드크럼이 꺼졌다).
        // 어느 서비스에 있든 이 축이 활성이도록 넓은 접두사로 판정한다.
        activeBase: '/visits/services',
        // 브레드크럼 3번째 칸을 서비스 드롭다운으로 그린다(지시: "최상단에 서비스 드롭다운으로
        // 선택하여 화면변경 가능하게"). 등록된 서비스 목록 정본은 여전히 registry.ts 하나.
        serviceRegistry: 'visit-analytics',
      },
      // 🚨 **통합비교는 아직 만들지 않는다. `soon`**(2026-08-26). 등록 서비스는 2개가 됐지만
      // `summary` 어댑터(registry.ts)를 아직 어느 서비스도 채우지 않았다. 둘 다 데이터 훅이
      // 클라이언트 전용이라 서버에서 공통 지표를 낼 방법이 없다. 화면을 만들어도 값이 없다.
      // 어댑터를 붙이는 순간(별도 작업) `soon`을 뗀다.
      {
        label: '통합비교',
        href: '/visits/compare',
        icon: CompareIcon,
        desc: '서비스 간 방문 지표 비교(서비스 2개 이상 등록되면 제공)',
        soon: true,
      },
    ],
  },
];

/**
 * 어드민을 처음 열었을 때(루트 `/`·로그인 직후) 가는 화면 = **통합 축의 첫 탭**.
 *
 * 🚨 2026-08-12 사용자 지정 "어드민 처음 켜면 홈이 현재 고방인데, 통합으로 가게 해". 그전엔 세 곳
 * (`app/page.tsx`·`app/login/page.tsx`·`login/login-form.tsx`)이 각자 `/revenue`로 보냈고 그건
 * 고방 › 매출이다. 사이드바 첫 그룹의 첫 축은 **통합**인데 홈만 딴 데로 갔다. 목적지를 여기 한
 * 곳에 두는 이유: 세 곳에 문자열을 복붙해 두면 하나만 고쳐지고 나머지가 남는다(이 프로젝트가
 * 반복해서 겪은 사고 유형: 그래서 IA는 이 파일이 단일 소스다).
 *
 * 통합 축의 첫 탭이 곧 홈이다(지금은 주간 흐름: 매주 마감이 거기서 일어난다). 탭 순서를 바꾸면
 * 홈도 따라 바뀌는 게 맞다.
 */
export const HOME_HREF: string = NAV[0].items[0].tabs?.[0].href ?? NAV[0].items[0].href;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

// 축(사이드바 항목)이 현재 활성인가. tabs가 있으면 어느 탭이든 활성이면 활성.
// activeBase가 있으면 href 대신 그 접두사로 판정한다(개별비교처럼 목적지가 정적이지 않은 축).
export function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.soon || item.external) return false;
  if (item.tabs) return item.tabs.some((t) => isActive(pathname, t.href));
  return isActive(pathname, item.activeBase ?? item.href);
}

export type NavLocation = { service: NavService; item: NavItem; tab?: NavItem };

// 현재 경로가 속한 서비스 › 축 › (탭)을 찾는다. 없으면 null.
export function findLocation(pathname: string): NavLocation | null {
  for (const service of NAV) {
    for (const item of service.items) {
      if (item.tabs) {
        for (const tab of item.tabs) {
          if (isActive(pathname, tab.href)) return { service, item, tab };
        }
      } else if (isActive(pathname, item.activeBase ?? item.href)) {
        return { service, item };
      }
    }
  }
  return null;
}

/**
 * 브라우저 탭 제목: **위치를 앞에, 서비스명을 뒤에** 둔다.
 *
 * 🚨 순서가 핵심이다(2026-09-07 지적 "지금은 다 그냥 고방 어드민이라 뭐가 뭔지 모름"). 구 형식은
 * `고방어드민-통합·리포트`였는데, 탭을 여러 개 열면 브라우저가 앞부터 잘라 보여줘 전부
 * "고방어드민-…"으로 읽혔다. 구분하라고 붙인 위치가 정작 안 보이는 자리에 있었다.
 *
 * `serviceLabel` = 목적지가 레지스트리로 갈리는 축(개별비교)에서 지금 보는 서비스 이름.
 * 안 넘기면 그 축의 탭 두 개가 같은 제목이 된다(호출부가 레지스트리를 읽어 넘긴다).
 */
export const APP_NAME = '고방어드민';

export function pageTitle(pathname: string, serviceLabel?: string): string {
  const loc = findLocation(pathname);
  if (!loc) return APP_NAME;
  const leaf = loc.tab?.label ?? serviceLabel;
  const where = leaf ? `${loc.item.label}·${leaf}` : loc.item.label;
  return `${where} - ${APP_NAME}`;
}
