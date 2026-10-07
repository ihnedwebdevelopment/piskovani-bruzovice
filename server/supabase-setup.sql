-- Server-only CMS. Anonymous visitors use /api/content, never privileged keys.
create table if not exists public.bruzovice_content (
  id text primary key check (id = 'main'),
  data jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.bruzovice_sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);
create index if not exists bruzovice_sessions_expiry on public.bruzovice_sessions(expires_at);
create table if not exists public.bruzovice_login_limits (
  key text primary key,
  count integer not null,
  window_start timestamptz not null
);
alter table public.bruzovice_content enable row level security;
alter table public.bruzovice_sessions enable row level security;
alter table public.bruzovice_login_limits enable row level security;
revoke all on public.bruzovice_content, public.bruzovice_sessions, public.bruzovice_login_limits from anon, authenticated;
grant all on public.bruzovice_content, public.bruzovice_sessions, public.bruzovice_login_limits to service_role;

create or replace function public.bruzovice_login_quota(client_key text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempts integer;
begin
  delete from public.bruzovice_sessions where expires_at < now();
  delete from public.bruzovice_login_limits where window_start < now() - interval '1 day';
  insert into public.bruzovice_login_limits(key,count,window_start)
  values(client_key,1,now())
  on conflict(key) do update set
    count = case when public.bruzovice_login_limits.window_start < now() - interval '15 minutes' then 1 else public.bruzovice_login_limits.count+1 end,
    window_start = case when public.bruzovice_login_limits.window_start < now() - interval '15 minutes' then now() else public.bruzovice_login_limits.window_start end
  returning count into attempts;
  return attempts <= 10;
end;
$$;
revoke all on function public.bruzovice_login_quota(text) from public, anon, authenticated;
grant execute on function public.bruzovice_login_quota(text) to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('bruzovice-media','bruzovice-media',true,3000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- No anonymous storage write policies. Uploads pass through the authenticated admin API.
