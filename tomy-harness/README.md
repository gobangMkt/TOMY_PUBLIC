# tomy-harness — 개발 하네스

`CLAUDE.md`를 프로젝트에 넣고 스킬을 설치하면, 해당 폴더에서 Claude Code로 작업할 때마다 아래 4단계 개발 프로세스가 자동으로 강제 적용됩니다.

1. **기획 확정** — 코딩 전 스펙 인터뷰 필수
2. **디자인 시스템 고정** — UI 테마/컬러 컨펌 후 진행
3. **이슈 분할** — 수직 슬라이스로 개발 단위 분해
4. **TDD + 디자인 구현** — 테스트 우선 개발

아래 스킬 목록은 예시입니다. 본인 입맛에 맞게 교체하거나 추가해도 됩니다.

---

## 설치 방법

### 0. 명령어 실행 방법
Claude Code 채팅창에서 `!`를 앞에 붙이면 터미널 명령어를 바로 실행할 수 있습니다.
```
! npx skills add ...
```
따로 터미널을 열 필요 없이, 아래 명령어들을 그대로 복사해서 Claude Code에 입력하면 됩니다.

### 1. CLAUDE.md 프로젝트에 넣기
이 폴더의 `CLAUDE.md`를 작업할 프로젝트 루트에 복사합니다.

### 2. 스킬 설치
명령어 끝에 `-g`를 붙이면 **내 컴퓨터 전체**, 붙이지 않으면 **현재 폴더 프로젝트에만** 설치됩니다.
```
! npx skills add ... -g   ← 어느 프로젝트에서든 사용 가능
! npx skills add ...      ← 지금 이 프로젝트에서만 사용 가능
```

#### grill-me
```
! npx skills add https://github.com/mattpocock/skills --skill grill-me
```

#### ui-ux-pro-max
터미널에서 아래 명령어 실행 후 목록에서 `ui-ux-pro-max` 선택
```
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```

#### to-issues
```
! npx skills add https://github.com/mattpocock/skills --skill to-issues
```

#### tdd
```
! npx skills add https://github.com/mattpocock/skills --skill tdd
```

#### frontend-design
```
! npx skills add https://github.com/anthropics/skills --skill frontend-design
```

#### icon-design (이 레포 전용 커스텀 스킬)
```
! npx skills add gobangMkt/TOMY_PUBLIC --skill icon-design
```

#### qa-full-cycle (이 레포 전용 커스텀 스킬)
```
! npx skills add gobangMkt/TOMY_PUBLIC --skill qa-full-cycle
```

#### service-master — 디자인팀장 · 개발팀장 (이 레포 전용 커스텀 스킬)
```
! npx skills add gobangMkt/TOMY_PUBLIC --skill service-master
```
사내에서 실제로 굴러본 UI/UX 판단 기준과 개발 원칙이 들어 있습니다. 설치하면 Claude에게 두 명의 팀장을 불러 리뷰를 받을 수 있습니다.

| 이렇게 부르면 | 이런 걸 봅니다 |
|---|---|
| `디자인팀장 호출` (= UX팀장·디자인가이드, 같은 사람) | 화면 평가, 시선 흐름·인지부하·어포던스, 컨트롤 어휘 일관성, 다크패턴 경계 |
| `개발팀장 호출` | 코드·아키텍처·성능, 외부연동/데이터 정합(결제·알림톡·웹훅), LLM 기능 설계, 알림·관측 |

- 예시: `이 화면 디자인팀장 호출해서 평가받아줘` / `개발팀장 관점에서 이 코드 봐줘`
- 평가·진단만 하고 코드는 바로 안 고칩니다. 수정은 안을 제시받고 컨펌한 뒤 진행됩니다.
- 두 팀장은 **별개 인격**입니다. 디자인과 구현이 동시에 걸린 문제면 둘 다 호출해 각자 판단을 받으세요.

#### superpowers
Claude Code에서 `/plugin` 입력 → `superpowers` 선택 후 설치

### 3. 설치 확인
```
/skills
```
Claude Code에서 `/skills`를 입력하면 현재 설치된 스킬 목록을 볼 수 있습니다.
