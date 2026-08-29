create extension if not exists pgcrypto;

create table if not exists public.obby_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  max_players smallint not null default 8 check (max_players between 2 and 8),
  version text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  current_map_id text not null default 'lobby' check (current_map_id in ('lobby', 'color', 'lava', 'sky')),
  map_transition_id uuid,
  map_start_at timestamptz
);

create table if not exists public.obby_room_members (
  room_id uuid not null references public.obby_rooms(id) on delete cascade,
  session_id uuid not null,
  nickname text not null check (char_length(nickname) between 2 and 12),
  member_token_hash text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, session_id)
);

create index if not exists obby_room_members_active_idx
  on public.obby_room_members(room_id, last_seen_at desc);

alter table public.obby_rooms enable row level security;
alter table public.obby_room_members enable row level security;

revoke all on public.obby_rooms from anon, authenticated;
revoke all on public.obby_room_members from anon, authenticated;

grant usage on schema public to anon, authenticated;

create or replace function public.obby_active_member_count(p_room_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.obby_room_members
  where room_id = p_room_id
    and last_seen_at >= now() - interval '45 seconds';
$$;

create or replace function public.obby_cleanup_room_members(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.obby_room_members
   where room_id = p_room_id
     and last_seen_at < now() - interval '45 seconds';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.obby_elected_host(p_room_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select session_id
  from public.obby_room_members
  where room_id = p_room_id
    and last_seen_at >= now() - interval '45 seconds'
  order by joined_at asc, session_id asc
  limit 1;
$$;

revoke execute on function public.obby_active_member_count(uuid) from public, anon, authenticated;
revoke execute on function public.obby_cleanup_room_members(uuid) from public, anon, authenticated;
revoke execute on function public.obby_elected_host(uuid) from public, anon, authenticated;
