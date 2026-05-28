# tomy-process

고방 마케팅 AI 개발 프로세스 패키지.
클론 + 3단계 설치로 팀 전체가 동일한 개발 파이프라인을 사용할 수 있습니다.

---

## 세팅 방법

### 1. 이 레포 클론

```bash
git clone https://github.com/gobangMkt/tommy-process
```

클론한 폴더에서 Claude Code를 열면 `CLAUDE.md`가 자동으로 적용됩니다.

### 2. 번들 스킬 설치 (이 레포에 포함된 것)

```bash
npx skills add gobangMkt/tommy-process --all -g
```

| 스킬 | 역할 |
|------|------|
| `grill-me` | 1단계 — 스펙 확정 인터뷰 |
| `to-issues` | 3단계 — 수직 슬라이스 이슈 분할 |
| `tdd` | 4단계 — TDD 루프 |
| `icon-design` | 아이콘/SVG 작업 가이드 |

### 3. 외부 스킬 설치

`ui-ux-pro-max`는 Python 스크립트와 데이터 파일을 포함한 복잡한 구조라 원본 패키지에서 설치합니다.

```bash
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -g
```

### 4. 추가 스킬 설치

```bash
# 4단계 프론트엔드 디자인
npx skills add anthropics/skills --skill frontend-design -g

# 4단계 서브에이전트 기반 개발 (superpowers 전체 설치)
npx skills add obra/superpowers -g
```

### 5. 플러그인 설치

Claude Code에서 `/plugin` 실행 후 설치 (개인 API 키 필요):
- `github` / `playwright` / `figma` — MCP 연동

---

## 포함된 것

```
tomy-process/
├── CLAUDE.md              ← 4단계 개발 파이프라인 규칙
├── grill-me/SKILL.md
├── tdd/SKILL.md
├── to-issues/SKILL.md
└── icon-design/
    ├── SKILL.md
    └── references/icon-style.md
```
