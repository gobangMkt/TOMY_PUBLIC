"""CTA 상자 HTML — 고방미디어허브 services/blocks.py에서 CTA에 필요한 부분만 뽑은 것."""
import html as _html

MINT = '#10A6A6'
INK = '#161B20'
MINT_BG = '#E7F6F6'

def _esc(text: str) -> str:
    return _html.escape(str(text or ''), quote=True)


def cta_html(text: str, url: str) -> str:
    """글 맨 끝 CTA 상자 — 민트 면 + H3 링크 한 줄(2026-10-14 지정: H3로 넣고 더 잘 보이게).

    본문 문단 링크 한 줄이었을 때는 마지막 문장과 같은 크기라 눈에 안 걸렸다. 다른 고정 블록과
    같은 이유로 모양은 여기서 정한다 — 문구만 사람이 승인 창에서 고친다. `data-cta`는 이 앱
    원장 본문에서 다시 붙일 때 이전 상자를 찾는 표시다(gobang.kr이 지워도 상관없다).
    """
    return (f'<div data-cta="1" style="background:{MINT_BG};border-radius:12px;'
            f'padding:18px 20px;margin:32px 0 8px;">'
            f'<h3 style="margin:0;font-size:19px;line-height:1.45;">'
            f'<a href="{_esc(url)}" style="color:{INK};text-decoration:none;">{_esc(text)} '
            f'<span style="color:{MINT};">&gt;</span></a></h3></div>')
