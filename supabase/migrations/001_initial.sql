-- Casa da Judiaria — Dashboard MVP
-- Run this in the Supabase SQL editor.

-- ─── guests ──────────────────────────────────────────────────────────────────
create table if not exists guests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  nationality text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── reservations ────────────────────────────────────────────────────────────
create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid references guests(id) on delete set null,
  room        text not null default 'Quarto 1',
  check_in    date not null,
  check_out   date not null,
  channel     text not null default 'direct'
              check (channel in ('airbnb','booking','direct')),
  status      text not null default 'confirmed'
              check (status in ('confirmed','pending','cancelled','checked_in','checked_out')),
  total_eur   numeric(10,2),
  external_id text unique,
  created_at  timestamptz not null default now()
);

create index if not exists idx_reservations_check_in  on reservations(check_in);
create index if not exists idx_reservations_guest_id  on reservations(guest_id);
create index if not exists idx_reservations_external  on reservations(external_id);

-- ─── messages ────────────────────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid references reservations(id) on delete set null,
  guest_id        uuid references guests(id) on delete set null,
  body            text not null,
  role            text not null default 'guest'
                  check (role in ('guest','ai','owner')),
  handled         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_reservation on messages(reservation_id);
create index if not exists idx_messages_handled     on messages(handled);

-- ─── concierge_content ───────────────────────────────────────────────────────
create table if not exists concierge_content (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- Seed default keys so the editor always has something to show
insert into concierge_content (key, value) values
  ('wifi_ssid',              'CasaJudiaria'),
  ('wifi_pass',              'password123'),
  ('checkin_instructions',   'A chave está na caixa junto à porta principal. Código: 1234.'),
  ('checkout_instructions',  'Deixe as chaves no mesmo local. Obrigado pela visita!'),
  ('breakfast',              'Não incluído. Recomendamos o Café Central, a 5 min a pé.'),
  ('tips',                   'Miradouro de São Roque, Piscinas naturais de Belver, Mercado de sábado.'),
  ('parking',                'Estacionamento gratuito na Rua do Convento.')
on conflict (key) do nothing;

-- ─── email_campaigns ─────────────────────────────────────────────────────────
create table if not exists email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  body             text not null,
  sent_at          timestamptz,
  recipient_count  int not null default 0
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- All tables are private: only the authenticated owner can read/write.
alter table guests              enable row level security;
alter table reservations        enable row level security;
alter table messages            enable row level security;
alter table concierge_content   enable row level security;
alter table email_campaigns     enable row level security;

-- Policy: authenticated users (the single owner account) have full access
create policy "owner_all" on guests
  for all using (auth.role() = 'authenticated');

create policy "owner_all" on reservations
  for all using (auth.role() = 'authenticated');

create policy "owner_all" on messages
  for all using (auth.role() = 'authenticated');

create policy "owner_all" on concierge_content
  for all using (auth.role() = 'authenticated');

create policy "owner_all" on email_campaigns
  for all using (auth.role() = 'authenticated');

-- concierge_content is also readable by anonymous (for the guest-facing page)
create policy "public_read_concierge" on concierge_content
  for select using (true);
