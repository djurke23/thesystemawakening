-- =======================================================
-- THE SYSTEM: AWAKENING - FOUNDER HUNTER DATABASE SCHEMA
-- Run this in your Supabase Dashboard -> SQL Editor -> Click 'Run'
-- =======================================================

create table if not exists applications (
  id text primary key,
  discord_username text not null,
  device text not null,
  hunter_path jsonb not null default '[]'::jsonb,
  activity text not null,
  report_bugs boolean not null default false,
  email text default '',
  source text not null,
  rank text default 'E-Rank Hunter',
  created_at timestamptz default now()
);

-- Fast query index
create index if not exists idx_applications_created_at on applications (created_at desc);

-- Row Level Security
alter table applications enable row level security;

-- Allow insert & select from our backend API
create policy "Allow service access" on applications for all using (true) with check (true);
