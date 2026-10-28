  on owned_publication_metric (publication_id, name, measured_at);

-- ───── CTA 링크 · 클릭 ─────
-- 라이브에 이미 있던 두 표의 실제 구조를 2026-10-28 information_schema·pg_constraint·pg_indexes로 읽어 기록한다.
-- 저장소 어디에도 생성 DDL이 없었다. 이미 있으므로 아래 문장은 라이브에서 아무것도 바꾸지 않는다.
-- 302 리다이렉트는 공개 앱 for_Release/미니앱/gobang-cta-redirect가 같은 표로 낸다(링크 목적지를 바꾸면 이미 나간 글이 즉시 바뀐다).
create table if not exists cta_links (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  destination_url text not null,
  utm_source text,
  utm_campaign text,
  utm_content text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cta_clicks (
  id bigint generated always as identity primary key,
  key text not null,
  -- 클릭이 난 자리. 미디어허브 글이면 'r'||run_id (owned_group_contents.run_id와 잇는다)
  src text,
  clicked_at timestamptz not null default now(),
  referer text,
  referer_host text,
  device text,
  visitor text,
  country text,
  is_bot boolean not null default false
);

create index if not exists cta_clicks_key_time on cta_clicks (key, clicked_at desc);
create index if not exists cta_clicks_time on cta_clicks (clicked_at desc);

alter table public.owned_insight_query enable row level security;
alter table public.owned_insight_page enable row level security;
alter table public.owned_insight_pair enable row level security;
alter table public.owned_insight_daily enable row level security;
alter table public.owned_insight_total enable row level security;
alter table public.owned_insight_title enable row level security;
alter table public.owned_insight_index enable row level security;
alter table public.owned_insight_improve enable row level security;
alter table public.owned_publication_metric enable row level security;
-- cta_links · cta_clicks의 RLS는 라이브에서 이미 on이다(2026-10-28 pg_class.relrowsecurity 확인, 정책 0).
-- 기존 표를 ALTER하지 않는다는 규칙 때문에 여기서 다시 켜지 않는다.
