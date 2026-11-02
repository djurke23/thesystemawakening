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

-- No public policies: only the backend talks to this table, using the SECRET key
-- (sb_secret_... / service_role), which bypasses RLS. The publishable/anon key gets nothing.
--
-- MIGRATION for existing projects (run AFTER setting SUPABASE_KEY on Vercel to the secret key
-- and redeploying, otherwise the site stops saving applications):
--   drop policy if exists "Allow service access" on applications;
