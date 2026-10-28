"""승인할 때 글 맨 끝에 CTA 상자를 붙인다.

사람이 승인 창에서 링크(CTA 관리의 키)를 고르면 모델이 본문에 맞춘 문구를 제안하고,
사람이 고친 문구로 확정한다. 모양은 `services/blocks.cta_html`(민트 상자 + H3 링크)이 정한다.
붙이는 자리는 원본(gobang.kr) 산출물의 `meta['body_html']` 하나다 — 네이버 원고(`services/derive.py`)가 이 본문을 그대로 재사용하므로 따로 붙이지 않는다.

링크 주소는 `{리다이렉트}/go/{key}?src=r{글 번호}`다. `src`가 있어야 CTA 관리 화면의 클릭
통계가 "어느 글에서 눌렀는지"를 가른다. 리퍼러만으로는 안 된다 — 브라우저 기본 정책이
다른 사이트로 넘어갈 때 주소의 경로를 떼고 도메인만 보낸다.

**한 글에 CTA 줄은 하나다.** 다시 승인하거나 링크를 바꾸면 이전 줄을 지우고 새로 붙인다.
"""
import html
import re

from ledger.store import Ledger
from services import blocks, cta_links, llm, writer
from services.cta_links import CtaLinkError

PROMPT_PATH = writer.PROMPT_PATH.parent / 'cta.md'
SUGGEST_TIMEOUT_SEC = 120
MAX_TEXT = 60

# 본문 끝의 CTA — 지금 모양(`blocks.cta_html`의 상자)과 상자 전 모양(링크 하나만 담은 문단)
# 둘 다 찾는다. 예전 모양으로 붙은 글을 다시 승인해도 CTA가 둘이 되지 않는다.
_CTA_BLOCK = re.compile(r'\s*<div data-cta="1"[^>]*>.*?</h3>\s*</div>\s*$', re.S | re.I)
_CTA_LINE = re.compile(
    r'\s*<p[^>]*>\s*<a\b[^>]*href="[^"]*/go/[^"]*"[^>]*>.*?</a>\s*</p>\s*$', re.S | re.I)


def src_of(run_id: int) -> str:
    return f'r{run_id}'


def link_url(key: str, run_id: int) -> str:
    base = cta_links.redirect_url(key)
    if not base:
        raise CtaLinkError('CTA_REDIRECT_BASE_URL이 비어 있어 링크를 걸 수 없습니다')
    return f'{base}?src={src_of(run_id)}'


def clean_text(text: str) -> str:
    """한 줄로 접고 끝의 화살표·따옴표를 뗀다. `>`는 붙일 때 코드가 넣는다."""
    line = ' '.join((text or '').split())
    line = line.strip('"\'“”‘’ ')
    line = re.sub(r'\s*(>|→|›|»)+\s*$', '', line)
    return line[:MAX_TEXT].strip()


def strip_cta(body_html: str) -> str:
    return _CTA_LINE.sub('', _CTA_BLOCK.sub('', body_html or ''))


def apply_cta(body_html: str, text: str, url: str) -> str:
    return f'{strip_cta(body_html).rstrip()}\n{blocks.cta_html(clean_text(text), url)}'


def _origin_asset(ledger: Ledger, run_id: int):
    for pub in ledger.publications_for_run(run_id):
        if pub.channel.startswith('gobang_'):
            return pub, ledger.get_asset(pub.asset_id)
    raise CtaLinkError(f'글 #{run_id}에 gobang.kr 원고가 없습니다')


def _find_link(key: str) -> dict:
    for link in cta_links.list_links():
        if link['key'] == key:
            if not link.get('active'):
                raise CtaLinkError(f'중지된 링크입니다: {key}')
            return link
    raise CtaLinkError(f'CTA 링크를 찾을 수 없습니다: {key}')


def current(ledger: Ledger, run_id: int) -> dict | None:
    _, asset = _origin_asset(ledger, run_id)
    return (asset.meta or {}).get('cta') or None


def _ending(body_html: str, limit: int = 900) -> str:
    text = re.sub(r'<[^>]+>', ' ', strip_cta(body_html))
    text = ' '.join(html.unescape(text).split())
    return text[-limit:]


def suggest_text(ledger: Ledger, run_id: int, key: str) -> str:
    """본문 끝과 링크 목적지를 보고 문구 한 줄을 제안받는다. 사람이 고친다."""
    link = _find_link(key)
    _, asset = _origin_asset(ledger, run_id)
    template = writer.load_template(PROMPT_PATH)
    prompt = (template
              .replace('{{title}}', asset.title or '')
              .replace('{{ending}}', _ending((asset.meta or {}).get('body_html') or ''))
              .replace('{{link_label}}', link.get('label') or key)
              .replace('{{link_url}}', link.get('destination_url') or ''))
    try:
        done = llm.complete(prompt, timeout_sec=SUGGEST_TIMEOUT_SEC)
    except llm.LLMError as exc:
        raise CtaLinkError(f'문구를 만들지 못했습니다: {exc}') from None
    lines = [ln for ln in (done.text or '').splitlines() if ln.strip()]
    text = clean_text(lines[-1] if lines else '')
    if not text:
        raise CtaLinkError('문구를 만들지 못했습니다: 빈 응답')
    return text


def attach(ledger: Ledger, run_id: int, key: str, text: str) -> dict | None:
    """고른 링크를 본문 끝에 붙인다. `key`가 비면 붙어 있던 CTA 줄을 뗀다(링크 없이 승인)."""
    pub, asset = _origin_asset(ledger, run_id)
    if pub.status == 'published':
        raise CtaLinkError('이미 발행된 글이라 CTA를 바꿀 수 없습니다')
    body = (asset.meta or {}).get('body_html') or ''
    key = (key or '').strip()
    if not key:
        ledger.update_asset(asset.id, meta={'body_html': strip_cta(body), 'cta': None})
        return None
    text = clean_text(text)
    if not text:
        raise CtaLinkError('CTA 문구가 비어 있습니다')
    _find_link(key)
    url = link_url(key, run_id)
    cta = {'key': key, 'text': text, 'url': url}
    ledger.update_asset(asset.id, meta={'body_html': apply_cta(body, text, url), 'cta': cta})
    return cta
