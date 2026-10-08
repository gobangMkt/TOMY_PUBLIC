import json, sys, datetime
d = json.load(open(sys.argv[1], encoding='utf-8'))
ts = d.get('timestamp')
day = datetime.datetime.fromtimestamp(ts, datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d') if ts else '미제공'
out = [f"id: {d.get('id')}", f"account: {d.get('channel') or d.get('uploader_id') or d.get('uploader')}",
  f"uploader: {d.get('uploader')}", f"posted_kst: {day}", f"duration: {d.get('duration')}",
  f"like_count: {d.get('like_count')}", f"comment_count: {d.get('comment_count')}", f"view_count: {d.get('view_count')}",
  '--- caption ---', d.get('description') or '', '--- comments(first 15) ---']
for c in (d.get('comments') or [])[:15]:
  out.append(f"- {c.get('author')}: {c.get('text')} (likes {c.get('like_count')})")
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out))
print(d.get('duration'))
