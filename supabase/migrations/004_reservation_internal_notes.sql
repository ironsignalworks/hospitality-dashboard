-- Private notes for a single stay (separate from guest.notes)
alter table reservations
  add column if not exists internal_notes text;
