# tommy-process

고방 마케팅 개발 프로세스 스킬 패키지.

## 포함 스킬

| 스킬 | 설명 |
|------|------|
| `icon-design` | TOSSFACE 스타일 플랫 SVG 아이콘 가이드 |

## 설치

```bash
npx skills add gobangMkt/tommy-process -g
```

## 팀 전체 세팅 (3단계)

```bash
# 1. 프로젝트 클론 (CLAUDE.md 자동 적용)
git clone https://github.com/gobangMkt/my-claude-project

# 2. 커스텀 스킬 설치
npx skills add gobangMkt/tommy-process -g

# 3. ui-ux-pro-max 설치
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -g
```

이후 Claude Code `/plugin`에서 GitHub · Figma · Playwright MCP 서버 설치 (개인 API 키 필요).
