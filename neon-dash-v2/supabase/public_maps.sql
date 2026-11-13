-- Neon Dash V2 cloud public maps (Supabase PostgreSQL)
-- Run in a DEDICATED Neon Dash project. Do not run inside unrelated projects.
-- Enable Authentication > Providers > Anonymous Sign-Ins before publishing.
create table if not exists public.neon_dash_public_maps (
 id uuid primary key default gen_random_uuid(),
 owner_uid uuid not null references auth.users(id) on delete cascade,
 source_id text not null check (char_length(source_id) between 1 and 120),
 name text not null check (char_length(name) between 1 and 40),
 author text not null check (char_length(author) between 1 and 25),
 map_code text not null check (char_length(map_code) between 5 and 240000 and map_code like 'ND1:%'),
 length_cells integer not null check (length_cells between 40 and 2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (owner_uid,source_id)
);
create index if not exists neon_dash_public_maps_recent_idx
 on public.neon_dash_public_maps(updated_at desc);
alter table public.neon_dash_public_maps enable row level security;
drop policy if exists "neon_dash_gallery_read" on public.neon_dash_public_maps;
create policy "neon_dash_gallery_read"
 on public.neon_dash_public_maps for select to anon,authenticated using (true);
drop policy if exists "neon_dash_gallery_insert_own" on public.neon_dash_public_maps;
create policy "neon_dash_gallery_insert_own"
 on public.neon_dash_public_maps for insert to authenticated
 with check (auth.uid()=owner_uid);
drop policy if exists "neon_dash_gallery_update_own" on public.neon_dash_public_maps;
create policy "neon_dash_gallery_update_own"
 on public.neon_dash_public_maps for update to authenticated
 using (auth.uid()=owner_uid) with check (auth.uid()=owner_uid);
drop policy if exists "neon_dash_gallery_delete_own" on public.neon_dash_public_maps;
create policy "neon_dash_gallery_delete_own"
 on public.neon_dash_public_maps for delete to authenticated
 using (auth.uid()=owner_uid);
grant select on public.neon_dash_public_maps to anon,authenticated;
grant insert,update,delete on public.neon_dash_public_maps to authenticated;
-- Client-only clear proof is insufficient for a trustworthy leaderboard,
-- so this schema does NOT claim to validate clears server-side.
