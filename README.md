# tomy-process
토미 프로덕트 개발 하네스.

---

## 이게 뭔가요?

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

---

### 1. CLAUDE.md 프로젝트에 넣기
이 레포의 `CLAUDE.md`를 작업할 프로젝트 루트에 복사합니다.
---

### 2. 스킬 설치
#### 설치 위치 선택

명령어 끝에 `-g`를 붙이면 **내 컴퓨터 전체**에 설치되고, 붙이지 않으면 **현재 폴더 프로젝트에만** 설치됩니다.
-g 설치를 하면, 어떤 폴더에서든 해당 스킬을 쓸 수 있고, 현재 폴더에 설치하면 현재 폴더가 소속된 부모폴더 하위 폴더에서만 쓸 수 있습니다.

```
! npx skills add ... -g   ← 어느 프로젝트에서든 사용 가능
! npx skills add ...      ← 지금 이 프로젝트에서만 사용 가능
```
어느 쪽이든 기능은 동일합니다. 용도에 맞게 선택하세요.

---

#### grill-me
! npx skills add https://github.com/mattpocock/skills --skill grill-me
```

#### ui-ux-pro-max

터미널에서 아래 명령어 실행 후 목록에서 `ui-ux-pro-max` 선택

```
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```

#### to-issues
! npx skills add https://github.com/mattpocock/skills --skill to-issues
```

#### tdd
! npx skills add https://github.com/mattpocock/skills --skill tdd
```

#### frontend-design
! npx skills add https://github.com/anthropics/skills --skill frontend-design
```

#### icon-design (이 레포 전용 커스텀 스킬)
! npx skills add gobangMkt/tomy-process --skill icon-design
```

#### superpowers
Claude Code에서 `/plugin` 입력 → `superpowers` 선택 후 설치

---

### 3. 설치 확인
/skills
```

Claude Code에서 `/skills`를 입력하면 현재 설치된 스킬 목록을 볼 수 있습니다.
