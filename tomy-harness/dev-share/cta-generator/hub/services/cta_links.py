"""CTA 링크 관리 — Supabase Postgres(`cta_links`) 하나를 이 앱과 공개 리다이렉트가 함께 본다.

발행 콘텐츠 하단 CTA는 목적지 URL을 직접 박지 않고 `{CTA_REDIRECT_BASE_URL}/go/{key}`만 쓴다.
목적지를 바꾸고 싶으면 여기서 destination_url만 고치면 이미 나간 글도 그 순간부터 새
목적지로 넘어간다 — 글을 다시 손볼 필요가 없다.

리다이렉트 자체는 이 앱이 서빙하지 않는다. 이 앱은 로컬 전용(3025)이라 gobang.kr 독자가
붙을 수 없어서, 실제 302는 별도 공개 서비스(`프로젝트/for_Release/미니앱/gobang-cta-redirect`)가
같은 Supabase 프로젝트를 읽어서 낸다. 이 파일은 그 서비스 대신 관리 화면(CRUD)만 맡는다.
"""
from datetime import datetime, timezone

import requests

import config

_UPDATABLE = {'label', 'destination_url', 'utm_source', 'utm_campaign', 'utm_content', 'active'}


class CtaLinkError(RuntimeError):
    """CTA 링크 조회/저장 실패."""


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    key = config.require('SUPABASE_SERVICE_ROLE_KEY')
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    headers.update(extra or {})
    return headers


def _rest() -> str:
    return f"{config.require('SUPABASE_URL').rstrip('/')}/rest/v1/cta_links"


def redirect_base() -> str:
    return config.get('CTA_REDIRECT_BASE_URL').rstrip('/')


def redirect_url(key: str) -> str:
    base = redirect_base()
    return f'{base}/go/{key}' if base else ''


def _call(method: str, **kwargs) -> requests.Response:
    try:
        resp = requests.request(method, _rest(), timeout=10, **kwargs)
    except requests.RequestException as exc:
        raise CtaLinkError(f'CTA 링크 저장소 요청 실패 ({type(exc).__name__})') from None
    if resp.status_code >= 400:
        # Postgres 23505 = 유니크 제약 위반. 원문 JSON을 그대로 보여주면 사람이 못 읽는다 —
        # 이미 쓴 키로 다시 만들 때 나는 흔한 실수라 여기서 한 번 번역해 둔다.
        try:
            code = resp.json().get('code')
        except (ValueError, AttributeError):
            code = None
        if code == '23505':
            raise CtaLinkError('이미 있는 키다. 다른 키를 쓰거나 기존 링크를 수정하라') from None
        raise CtaLinkError(f'CTA 링크 저장소 오류 ({resp.status_code}): {(resp.text or "")[:300]}')
    return resp


def _with_redirect(row: dict) -> dict:
    row['redirect_url'] = redirect_url(row['key'])
    return row


def list_links() -> list[dict]:
    resp = _call('GET', headers=_headers(),
                 params={'select': '*', 'order': 'created_at.desc'})
    return [_with_redirect(row) for row in resp.json()]


def create_link(key: str, label: str, destination_url: str,
                 utm_source: str = '', utm_campaign: str = '', utm_content: str = '') -> dict:
    key = key.strip()
    if not (key and label.strip() and destination_url.strip()):
        raise CtaLinkError('키·라벨·목적지 URL은 모두 필요하다')
    body = {
        'key': key, 'label': label.strip(), 'destination_url': destination_url.strip(),
        'utm_source': utm_source.strip() or None,
        'utm_campaign': utm_campaign.strip() or None,
        'utm_content': utm_content.strip() or None,
    }
    resp = _call('POST', headers=_headers({'Prefer': 'return=representation'}), json=body)
    rows = resp.json()
    if not rows:
        raise CtaLinkError(f"이미 있는 키다: {key}")
    return _with_redirect(rows[0])


def update_link(key: str, **fields) -> dict:
    body = {k: v for k, v in fields.items() if k in _UPDATABLE}
    if not body:
        raise CtaLinkError('수정할 값이 없다')
    body['updated_at'] = datetime.now(timezone.utc).isoformat()
    resp = _call('PATCH', headers=_headers({'Prefer': 'return=representation'}),
                 params={'key': f'eq.{key}'}, json=body)
    rows = resp.json()
    if not rows:
        raise CtaLinkError(f'CTA 링크를 찾을 수 없다: {key}')
    return _with_redirect(rows[0])


def delete_link(key: str) -> None:
    _call('DELETE', headers=_headers(), params={'key': f'eq.{key}'})


# ─────────── 클릭 통계 ───────────
# 클릭 한 번마다 공개 리다이렉트가 `cta_clicks`에 한 줄 남긴다(IP 원문 없이 일 단위 해시만).
# 여기서는 기간만큼 읽어 링크별로 접는다. 봇(링크 미리보기)은 리다이렉트가 표시만 해 두고
# 여기서 뺀다 — 공유 한 번이 클릭 한 번으로 잡히면 숫자를 못 믿는다.

_CLICKS_PAGE = 1000
_CLICKS_MAX = 20000

# 유입 채널 — 축은 하나(리퍼러 호스트)다. 위에서부터 처음 맞는 것으로 정하고, 어디에도 안
# 맞으면 `기타 사이트`, 리퍼러 자체가 없으면 `알 수 없음`이다(앱 안 브라우저·주소 직접 입력).
CHANNELS = [
    ('gobang.kr', ('gobang.kr',)),
    ('네이버', ('naver.com', 'naver.net')),
    ('인스타그램', ('instagram.com',)),
    ('카카오', ('kakao.com', 'daum.net')),
    ('검색엔진', ('google.', 'bing.com')),
]
CHANNEL_OTHER = '기타 사이트'
CHANNEL_NONE = '알 수 없음'

DEVICE_LABEL = {'mobile': '모바일', 'desktop': 'PC', 'tablet': '태블릿', 'unknown': '알 수 없음'}


def channel_of(host: str | None) -> str:
    host = (host or '').lower()
    if not host:
        return CHANNEL_NONE
    for label, needles in CHANNELS:
        if any(host == n or host.endswith('.' + n) or (n.endswith('.') and n in host)
               for n in needles):
            return label
    return CHANNEL_OTHER


def _count(values) -> list[dict]:
    tally: dict[str, int] = {}
    for value in values:
        tally[value] = tally.get(value, 0) + 1
    return [{'label': k, 'clicks': v}
            for k, v in sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))]


def summarize(rows: list[dict], src_labels: dict[str, str] | None = None) -> dict[str, dict]:
    """클릭 행을 링크 키별로 접는다. 봇 행은 여기서 빠진다.

    `src_labels`는 `src` 값(`r12` 등)을 사람이 읽는 이름(`#12 글 제목`)으로 바꾸는 표다.
    표에 없는 src는 값 그대로, src가 없으면 `출처 표시 없음`으로 센다 — 승인 때 붙인 링크가
    아니라 CTA 관리 화면에서 주소를 복사해 손으로 건 자리다.
    """
    src_labels = src_labels or {}
    by_key: dict[str, list[dict]] = {}
    for row in rows:
        if row.get('is_bot'):
            continue
        by_key.setdefault(row.get('key') or '', []).append(row)

    out: dict[str, dict] = {}
    for key, items in by_key.items():
        items.sort(key=lambda r: r.get('clicked_at') or '', reverse=True)
        out[key] = {
            'clicks': len(items),
            'visitors': len({r.get('visitor') for r in items if r.get('visitor')}),
            'last_clicked_at': items[0].get('clicked_at') or '',
            'channels': _count(channel_of(r.get('referer_host')) for r in items),
            'sources': _count(
                src_labels.get(r.get('src') or '', r.get('src') or '출처 표시 없음')
                for r in items),
            'devices': _count(DEVICE_LABEL.get(r.get('device') or 'unknown', '알 수 없음')
                              for r in items),
            'recent': [{
                'clicked_at': r.get('clicked_at') or '',
                'channel': channel_of(r.get('referer_host')),
                'referer': r.get('referer') or '',
                'source': src_labels.get(r.get('src') or '', r.get('src') or ''),
                'device': DEVICE_LABEL.get(r.get('device') or 'unknown', '알 수 없음'),
            } for r in items[:10]],
        }
    return out


def _clicks_rest() -> str:
    return f"{config.require('SUPABASE_URL').rstrip('/')}/rest/v1/cta_clicks"


def fetch_clicks(since_iso: str | None) -> list[dict]:
    params = {'select': 'key,src,clicked_at,referer,referer_host,device,visitor,is_bot',
              'order': 'clicked_at.desc'}
    if since_iso:
        params['clicked_at'] = f'gte.{since_iso}'
    rows: list[dict] = []
    while len(rows) < _CLICKS_MAX:
        start = len(rows)
        try:
            resp = requests.get(_clicks_rest(), timeout=15, params=params, headers=_headers({
                'Range-Unit': 'items', 'Range': f'{start}-{start + _CLICKS_PAGE - 1}'}))
        except requests.RequestException as exc:
            raise CtaLinkError(f'클릭 기록 요청 실패 ({type(exc).__name__})') from None
        if resp.status_code >= 400:
            raise CtaLinkError(f'클릭 기록 오류 ({resp.status_code}): {(resp.text or "")[:300]}')
        page = resp.json()
        rows.extend(page)
        if len(page) < _CLICKS_PAGE:
            break
    return rows
