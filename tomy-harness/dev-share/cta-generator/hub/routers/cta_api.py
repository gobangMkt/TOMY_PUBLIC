"""CTA 링크 관리 API — HTTP 계약만. 저장·리다이렉트 URL 조합은 `services/cta_links.py`.

2026-10-28(AdPilot 스펙 2-4): CTA 링크 쓰기(만들기·고치기·지우기)는 AdPilot 하나가 한다. cta_links는 공개
리다이렉트 목적지가 바로 바뀌는 표라, AdPilot은 관리자 게이트(adminAuth)를 거쳐 쓴다. 여기 옛 화면(인증 없음)이
같이 쓰면 게이트를 우회하는 길이 남고, 두 앱이 같은 표를 쓰면 한쪽이 낡은 값 위에 덮는다. 그래서 쓰기는 410으로
AdPilot 화면을 안내한다(검색어 묶음·개선 쓰기와 같은 방식). 읽기(목록·통계)와 글에 링크를 붙이는
`services/cta_attach.py`의 읽기는 그대로다.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import deps
from ledger.store import LedgerError
from services.cta_attach import src_of
from services.cta_links import CtaLinkError, fetch_clicks, list_links, summarize

router = APIRouter(prefix='/api/cta-links', tags=['cta-links'])

ADPILOT_CTA = 'http://localhost:3100/media/cta'


def _moved(what: str):
    raise HTTPException(status_code=410,
                        detail=f'{what}는 AdPilot 미디어허브 > CTA 관리 화면에서 합니다({ADPILOT_CTA})')


def _guard(fn):
    try:
        return fn()
    except CtaLinkError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None


class CreateIn(BaseModel):
    key: str
    label: str
    destination_url: str
    utm_source: str = ''
    utm_campaign: str = ''
    utm_content: str = ''


class UpdateIn(BaseModel):
    label: str | None = None
    destination_url: str | None = None
    utm_source: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    active: bool | None = None


@router.get('')
def list_cta_links():
    return _guard(list_links)


@router.get('/stats')
def cta_stats(days: int = 28):
    """링크별 클릭·방문자·유입(채널·글·기기)·최근 클릭. `days<=0`이면 전체 기간."""
    since = None
    if days > 0:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = _guard(lambda: fetch_clicks(since))
    ledger = deps.get_ledger()
    labels: dict[str, str] = {}
    for src in {r.get('src') for r in rows if r.get('src')}:
        if not src.startswith('r') or not src[1:].isdigit():
            continue
        run_id = int(src[1:])
        try:
            labels[src_of(run_id)] = f'#{run_id} {ledger.get_run(run_id).title}'
        except LedgerError:
            labels[src_of(run_id)] = f'#{run_id} (지운 글)'
    return {'days': days, 'links': summarize(rows, labels)}


@router.post('')
def create_cta_link(body: CreateIn):
    _moved('CTA 링크 만들기')


@router.put('/{key}')
def update_cta_link(key: str, body: UpdateIn):
    _moved('CTA 링크 고치기')


@router.delete('/{key}')
def delete_cta_link(key: str):
    _moved('CTA 링크 지우기')
