-- Durable job queue for sync engine (service role from workers; not exposed to anon key in app).
create table if not exists sync_jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  payload       jsonb not null default '{}',
  status        text not null default 'pending'
    check (status in ('pending','running','done','failed')),
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_sync_jobs_status_created on sync_jobs (status, created_at);

-- Optional: notify worker via Supabase Realtime / edge function; wire `notify_sync()` in a later migration.
