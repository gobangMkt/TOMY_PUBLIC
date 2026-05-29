# tomy-process

고방 마케팅 AI 개발 프로세스 패키지.

---

## 세팅 방법

### 1. CLAUDE.md 프로젝트에 넣기

전달받은 `CLAUDE.md`를 작업할 프로젝트 루트에 복사합니다.

### 2. 스킬 설치

```bash
npx skills add gobangMkt/tomy-process --all -g
```

| 스킬 | 역할 |
|------|------|
| `grill-me` | 1단계 — 스펙 확정 인터뷰 |
| `to-issues` | 3단계 — 수직 슬라이스 이슈 분할 |
| `tdd` | 4단계 — TDD 루프 |
| `frontend-design` | 4단계 — 프론트엔드 디자인 구현 |
| `ui-ux-pro-max` | 2단계 — UI 테마/디자인 시스템 |
| `icon-design` | 아이콘/SVG 작업 가이드 |

### 3. 플러그인 설치

Claude Code에서 `/plugin` 실행 후 설치:
- `superpowers` — 4단계 서브에이전트 기반 개발
