-- Run this in Supabase → SQL Editor for a new project.
-- If you already had the old jsonb "cards" table, run supabase-schema-migrate-from-v1.sql instead.
-- Then: Settings → API → copy URL + anon key into supabase-config.js

create table if not exists public.saved_draws (
    save_code text primary key,
    created_at timestamptz not null default now(),
    saved_at timestamptz not null,
    source text,
    ways_to text not null,
    user_persona text not null,
    design_limit text not null,
    audience_limit text not null,
    constraints_plus text,
    constraints_plus_on boolean,
    chaos_included boolean
);

create index if not exists saved_draws_created_at_idx on public.saved_draws (created_at desc);
create index if not exists saved_draws_source_idx on public.saved_draws (source);

alter table public.saved_draws enable row level security;

grant usage on schema public to anon;
grant insert on public.saved_draws to anon;

create policy "saved_draws_anon_insert"
    on public.saved_draws
    for insert
    to anon
    with check (true);

create policy "saved_draws_anon_no_select"
    on public.saved_draws
    for select
    to anon
    using (false);
