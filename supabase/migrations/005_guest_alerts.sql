-- Timed reminders attached to a guest. Created by the owner via the guest detail panel.
-- Delivered by /api/internal/flush-scheduled (runs every ~5 min via Netlify cron).
-- delivered_at = set when the cron fires and the notification is sent.
-- dismissed_at = set when the owner clicks "OK" in the notification bell.

create table if not exists guest_alerts (
  id           uuid        primary key default gen_random_uuid(),
  guest_id     uuid        not null references guests(id) on delete cascade,
  message      text        not null,
  notify_at    timestamptz not null,
  delivered_at timestamptz,
  dismissed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_guest_alerts_pending
  on guest_alerts (notify_at)
  where delivered_at is null and dismissed_at is null;

create index if not exists idx_guest_alerts_guest
  on guest_alerts (guest_id);
