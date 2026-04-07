-- One-shot migration: replaces the older saved_draws table (uuid + cards jsonb)
-- with the flat-column + save_code layout. Export old data first if you need it.

drop policy if exists "saved_draws_anon_insert" on public.saved_draws;
drop policy if exists "saved_draws_anon_no_select" on public.saved_draws;
drop table if exists public.saved_draws;

create table public.saved_draws (
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

create index saved_draws_created_at_idx on public.saved_draws (created_at desc);
create index saved_draws_source_idx on public.saved_draws (source);

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
