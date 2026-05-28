# tommy-process

고방 마케팅 AI 개발 프로세스 패키지.
클론 후 스킬 설치하면 팀 전체가 동일한 개발 파이프라인을 사용할 수 있습니다.

---

## 세팅 방법

### 1. 이 레포 클론 (CLAUDE.md 자동 적용)

```bash
git clone https://github.com/gobangMkt/tommy-process
```

클론한 폴더에서 Claude Code를 열면 CLAUDE.md가 자동으로 적용됩니다.

### 2. 포함된 스킬 설치

```bash
npx skills add gobangMkt/tommy-process --all -g
```

설치되는 스킬:

| 스킬 | 파이프라인 단계 |
|------|----------------|
| `grill-me` | 1단계 — 스펙 확정 |
| `to-issues` | 3단계 — 수직 분할 |
| `tdd` | 4단계 — TDD 구현 |
| `icon-design` | 아이콘/SVG 작업 |

### 3. 추가 스킬 설치 (별도 필요)

```bash
# 2단계 디자인 시스템
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -g

# 4단계 프론트엔드 디자인 + 서브에이전트
npx skills add anthropics/skills --skill frontend-design -g
npx skills add anthropics/skills --skill subagent-driven-development -g
```

### 4. MCP 플러그인 설치

Claude Code에서 `/plugin` 실행 후 아래 항목 설치 (개인 API 키 필요):
- GitHub
- Figma
- Playwright

---

## 포함된 것

- `CLAUDE.md` — 4단계 개발 파이프라인 규칙
- `grill-me/` — 스펙 인터뷰 스킬
- `tdd/` — TDD 루프 스킬
- `to-issues/` — 수직 슬라이스 이슈 분할 스킬
- `icon-design/` — TOSSFACE 스타일 SVG 아이콘 가이드
