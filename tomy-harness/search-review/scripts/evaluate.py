"""검색 인사이트 앱이 내보낸 JSON을 읽어 글·검색어마다 평가를 하나씩 붙인다.

평가는 증상 x 규모(노출)로 가르고 되찾을 클릭은 기준이 아니다. 한 건이 평가를 정확히 하나 받고,
평가 건수를 더하면 대상 전체와 같다(빠지는 건이 없다).

  시급        이번 주 안에 전부 처리
  나중        이번 달 안에 처리
  관찰        손대지 않고 다음 갱신에서 또 걸리는지 본다
  문제 없음   할 일 없음

문턱값은 JSON의 `rules`에서 읽는다(앱이 정본). 이 스크립트에는 숫자를 박지 않는다.

  python evaluate.py 검색인사이트_20261018.json                 # 요약 + 상위 건
  python evaluate.py export.json --show urgent,later --top 30  # 보여줄 평가와 건수
  python evaluate.py export.json --out 평가결과.json            # 전체 결과를 파일로
"""
import argparse
import json
import sys

RATING = {'urgent': '시급', 'later': '나중', 'watch': '관찰', 'ok': '문제 없음'}
ORDER = list(RATING)
SLOT_LABEL = {
    'a:title': '제목 문제', 'a:drop': '글 노출 하락', 'k:drop': '검색어 노출 하락',
    'k:near': '2페이지 근처', 'k:split': '글이 갈림', 'a:stale': '색인 지연',
    'a:excluded': '색인 제외', 'a:unknown': '색인 미확인', 'a:waiting': '색인 전',
    'a:dormant': '노출 미미', 'a:ok': '문제 없음',
}


def expected_ctr(position, curve):
    """그 순위에서 기대하는 클릭률. 곡선의 `8+`가 바닥값이다."""
    rank = max(1, round(position or 0))
    return curve.get(str(rank), curve.get('8+', 0.0))


def _size(r):
    return max(r.get('impressions', 0), r.get('prev_impressions', 0))


def _crashed(r, rules):
    prev = r.get('prev_impressions', 0)
    return (prev >= rules['crash_min_prev']
            and r.get('impressions', 0) <= prev * (1 - rules['crash_ratio']))


def _by_size(r, rules, big, mid, small):
    size = _size(r)
    if size >= rules['big_impressions']:
        return big
    return mid if size >= rules['mid_impressions'] else small


def slot_of(target, r, rules):
    """항목이 놓이는 칸. 글은 규칙에 안 걸려도 칸이 있다 — 빠지는 글이 없어야 한다."""
    if target == 'keyword':
        return f'k:{r["kind"]}'
    kind = r.get('kind', '')
    if kind in ('title', 'drop', 'stale', 'excluded', 'unknown', 'waiting'):
        return f'a:{kind}'
    if r.get('impressions', 0) < rules['dormant_max'] and r.get('prev_impressions', 0) < rules['dormant_max']:
        return 'a:dormant'
    return 'a:ok'


def rating_of(slot, r, rules):
    """(평가 키, 그 평가인 이유 한 줄). 위에서부터 먼저 맞는 것 하나."""
    noun, subj = ('글', '글이') if slot.startswith('a:') else ('검색어', '검색어가')
    if slot in ('a:stale', 'a:excluded'):
        return 'urgent', '우리가 낸 글이 검색에 없습니다'
    if slot == 'a:unknown':
        return 'later', '구글에 아직 물어보지 않았습니다. 색인 확인이 필요합니다'
    if slot == 'a:waiting':
        return 'watch', '구글이 넣을 때까지 기다리는 중입니다'
    if slot == 'a:dormant':
        return 'watch', '노출이 거의 없습니다. 분기마다 통합·삭제를 묶어서 검토합니다'
    if slot == 'a:ok':
        return 'ok', '걸린 문제가 없습니다'
    if slot in ('a:title', 'a:drop', 'k:drop') and _crashed(r, rules):
        return (_by_size(r, rules, 'urgent', 'later', 'watch'),
                _by_size(r, rules, f'큰 {subj} 검색에서 사라지는 중입니다',
                         f'중간 규모 {noun}의 노출이 크게 줄었습니다',
                         f'작은 {noun}의 노출이 크게 줄었습니다'))
    if slot == 'k:split':
        return (_by_size(r, rules, 'urgent', 'later', 'watch'),
                '한 검색어에 우리 글이 몰려 순위를 나눠 가집니다')
    lead = {'a:title': '노출은 있는데 클릭이 안 됩니다', 'a:drop': '노출이 줄고 있습니다',
            'k:drop': '노출이 줄고 있습니다', 'k:near': '1페이지 문턱에 있습니다'}[slot]
    return ('later' if _size(r) >= rules['big_impressions'] else 'watch'), lead


def numbers(slot, r, rules):
    """이유 칸의 숫자. 규칙이 본 것을 숫자로만 말한다."""
    imp, pos = r.get('impressions', 0), r.get('position', 0)
    ctr = (r.get('clicks', 0) / imp) if imp else 0
    if slot == 'a:title':
        return (f'{pos:.1f}위인데 클릭률 {ctr:.1%} · 같은 순위 평균 '
                f'{expected_ctr(pos, rules["ctr_curve"]):.1%}')
    if slot in ('a:drop', 'k:drop'):
        prev = r.get('prev_impressions', 0)
        change = (imp - prev) / prev if prev else 0
        return f'노출 {prev:,} → {imp:,} ({change:+.0%})'
    if slot == 'k:near':
        return f'{pos:.1f}위 · 1페이지까지 {max(0, pos - 10):.1f}위'
    if slot == 'k:split':
        return f'우리 글 {r.get("content_pages", 0)}개'
    if slot == 'a:dormant':
        return f'노출 직전 {r.get("prev_impressions", 0):,} → 지금 {imp:,}'
    if slot == 'a:ok':
        return f'노출 {imp:,} · {pos:.1f}위' if imp else '노출 없음'
    return ''


def evaluate(data):
    """내보내기 JSON → 평가 붙은 항목 목록(평가 순, 같은 평가 안에서는 잃은 노출이 큰 순)."""
    rules = data['rules']
    items = []
    for target, rows in (('article', data.get('articles', [])), ('keyword', data.get('keywords', []))):
        for r in rows:
            slot = slot_of(target, r, rules)
            if slot not in SLOT_LABEL:
                continue   # 급상승 같은 문제가 아닌 검색어는 평가 대상이 아니다
            rating, lead = rating_of(slot, r, rules)
            shown = 'a:drop' if slot == 'a:title' and _crashed(r, rules) else slot
            detail = numbers(shown, r, rules)
            items.append({
                'rating': rating, 'rating_label': RATING[rating], 'slot': slot,
                'slot_label': SLOT_LABEL[slot], 'target': target,
                'name': r.get('title') or r.get('page') or r.get('query'),
                'page': r.get('page', ''), 'query': r.get('query', ''),
                'why': f'{lead} · {detail}' if detail else lead,
                'impressions': r.get('impressions', 0), 'clicks': r.get('clicks', 0),
                'position': r.get('position', 0), 'prev_impressions': r.get('prev_impressions', 0),
                'prev_clicks': r.get('prev_clicks', 0), 'prev_position': r.get('prev_position', 0),
                'related': (r.get('queries') if target == 'article' else r.get('pages')) or [],
            })
    items.sort(key=lambda i: (ORDER.index(i['rating']),
                              -max(i['prev_impressions'] - i['impressions'], 0), -i['impressions']))
    return items


def summary(items):
    counts = {k: 0 for k in ORDER}
    for i in items:
        counts[i['rating']] += 1
    return counts


def render(items, show, top, window):
    counts = summary(items)
    out = []
    if window:
        out.append(f'기간 {window.get("start", "")} ~ {window.get("end", "")} ({window.get("days", "")}일)\n')
    out.append('| 평가 | 건수 |\n|---|---|')
    for k in ORDER:
        out.append(f'| {RATING[k]} | {counts[k]} |')
    out.append(f'| 합계 | {len(items)} |\n')
    shown = [i for i in items if i['rating'] in show][:top]
    out.append(f'### 상위 {len(shown)}건 ({", ".join(RATING[k] for k in show)})\n')
    out.append('| 평가 | 구분 | 대상 | 문제 | 이유 |\n|---|---|---|---|---|')
    for i in shown:
        name = (i['name'] or '').replace('|', '/')[:60]
        kind = '글' if i['target'] == 'article' else '검색어'
        out.append(f'| {i["rating_label"]} | {kind} | {name} | {i["slot_label"]} | {i["why"]} |')
    return '\n'.join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description='검색 인사이트 내보내기 JSON 평가')
    ap.add_argument('path')
    ap.add_argument('--show', default='urgent,later', help='보여줄 평가(쉼표). 기본 urgent,later')
    ap.add_argument('--top', type=int, default=30)
    ap.add_argument('--out', help='전체 결과 JSON 파일')
    args = ap.parse_args(argv)
    with open(args.path, encoding='utf-8') as fh:
        data = json.load(fh)
    if data.get('schema') != 1 or 'rules' not in data:
        sys.exit('지원하지 않는 파일입니다. 검색 인사이트 앱의 `데이터 내보내기`로 받은 JSON(schema 1)을 주세요')
    show = [s.strip() for s in args.show.split(',') if s.strip() in RATING]
    items = evaluate(data)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as fh:
            json.dump({'window': data.get('window', {}), 'counts': summary(items), 'items': items},
                      fh, ensure_ascii=False, indent=1)
    sys.stdout.reconfigure(encoding='utf-8')
    print(render(items, show or ['urgent', 'later'], args.top, data.get('window')))


if __name__ == '__main__':
    main()
