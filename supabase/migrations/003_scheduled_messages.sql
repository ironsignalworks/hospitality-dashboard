-- Scheduled message delivery: allows owner messages to be queued for future sending.
-- scheduled_at IS NULL  → sent immediately (existing behaviour)
-- scheduled_at > now()  → pending, shown in thread with clock badge; not yet delivered
-- scheduled_at <= now() → flushed by /api/internal/flush-scheduled; treated as delivered

alter table messages
  add column if not exists scheduled_at timestamptz;

create index if not exists idx_messages_scheduled
  on messages (scheduled_at)
  where scheduled_at is not null;
