# dev-share — CTA 생성기 · 대시보드 화면 틀

마케팅팀이 직접 개발해서 쓰도록 내놓는 **소스 코드 참고본**입니다. 데이터·키·주소는 뺐습니다.
그대로 실행되는 앱이 아니라 가져다 고쳐 쓰는 재료입니다.

## 1. cta-generator — 콘텐츠 하단 CTA와 리다이렉트
글 끝에 CTA 상자를 붙이고, 링크는 `/go/{key}` 한 종류만 박아 두면 목적지를 나중에 바꿔도
이미 나간 글이 새 목적지로 넘어갑니다. 클릭도 기록합니다.

| 폴더 | 무엇 |
|---|---|
| `hub/services/cta_html.py` | CTA 상자 HTML(민트 면 + H3 링크). 글 끝에 붙는 모양 |
| `hub/services/cta_links.py` | 링크 만들기·고치기, 클릭 집계 |
| `hub/services/cta_attach.py` | 글 본문 끝에 CTA를 붙이는 처리 |
| `hub/routers/cta_api.py` | 링크 관리 API 계약 |
| `hub/prompts/cta.md` | 본문에 맞는 CTA 문구를 모델이 제안하게 하는 지침 |
| `redirect/` | `/go/{key}` 302를 내는 Vercel 함수(의존성 없음) |
| `adpilot/` | 링크 관리 화면(`CtaWorkspace`: 링크 표·클릭 통계·만들기/고치기), 관리 API, 저장 계층. Next.js, 화면 부품(`ui/`)과 보조 코드 포함 |
| `sql/cta_tables.sql` | `cta_links`, `cta_clicks` 테이블 정의 |

본인 Supabase에 `sql/cta_tables.sql`을 적용하고, `redirect/`를 본인 Vercel에 올리면 됩니다.
필요한 환경변수: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CTA_VISITOR_SALT`(선택),
`CTA_REDIRECT_BASE_URL`(리다이렉트 배포 주소), 관리 화면 쪽은 `ADMIN_API_TOKEN`. 값은 본인 것을 씁니다.
관리 API는 관리자 확인(`adminAuth.ts`)을 거쳐 쓰는 구조입니다. 본인 환경의 로그인 방식에 맞게 바꿉니다.
`mediaWorker.ts`는 우리 쪽 글쓰기 일꾼과 연결하는 코드라 필요 없으면 걷어냅니다.
`hub/`는 Python(FastAPI)이고 `adpilot/`는 Next.js라, 쓰는 쪽 스택에 맞는 한쪽만 참고해도 됩니다.

## 2. dashboard-frame — 주간·전년 비교, 상세보기, 필터 화면 틀
Next.js 15 / React 19 / Tailwind 4 / Recharts. 화면이 데이터를 읽는 계층과 그리는 계층이 나뉘어 있어,
읽는 계층(`src/app/api/*`, `src/lib/traffic.ts`, `src/lib/gas-fetch.ts`)을 본인 DB 조회로 바꾸면 됩니다.

| 보고 싶은 것 | 시작 파일 |
|---|---|
| 주간 비교 | `src/components/gobang/weekly-view.tsx`, `src/lib/weekly.ts` |
| 전년 비교 | `src/components/dashboard/compare-view.tsx` |
| 기간·필터 | `date-range-picker.tsx`, `multi-select.tsx`, `src/lib/period.ts` |
| 트래픽 표 | `traffic-table.tsx`, `stream-table.tsx`, `src/lib/traffic.ts` |
| 범위 조회 API | `src/app/api/traffic/route.ts` (기본 400일, 전년 비교용) |
| 지표 정의 | `metrics-definitions.md` (주는 일~토, 활성 사용자 등. 숫자는 뺐음) |

- 시트 ID·계정 ID·노션 링크는 `YOUR_...`로 바꿔 두었습니다.
- `src/data/revenue-*.ts`는 빈 배열입니다. 실제 매출 데이터는 뺐습니다.
- 일부 import가 이 폴더에 없는 파일을 가리킬 수 있습니다(참고용으로 필요한 범위만 골랐습니다).

## Claude에게 이렇게 말하세요
**CTA**
```
tomy-harness/dev-share/cta-generator 폴더와 README를 읽고, 우리 콘텐츠 하단에 붙일 CTA 도구를 만들어줘.
Supabase 테이블(sql/cta_tables.sql)과 리다이렉트(redirect/)부터 세우고, 링크 관리 화면은
adpilot/ 코드를 참고해 우리 스택에 맞게 만들어줘. 필요한 키와 주소는 나한테 물어봐.
```
**대시보드**
```
tomy-harness/dev-share/dashboard-frame 폴더와 README를 읽고, 주간 비교·전년 비교·필터가 있는
대시보드를 우리 DB에 맞게 만들어줘. 데이터를 읽는 부분(src/app/api, src/lib/traffic.ts)은
내 DB 구조에 맞게 새로 짜고, 화면 틀은 최대한 재사용해줘. 내 DB 구조는 이렇게 생겼어: (여기에 테이블·컬럼 설명)
```
