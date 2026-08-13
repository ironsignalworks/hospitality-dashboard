// Demo mode is active when Supabase env vars are not configured.
// Works both server-side and in the browser (NEXT_PUBLIC_ vars are inlined at build time).
import type { Guest, Reservation } from '@/lib/types';

export const IS_DEMO =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co';

// ── date helpers ─────────────────────────────────────────────────────────────
function rel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// ── mock guests ───────────────────────────────────────────────────────────────
export const MOCK_GUESTS: Guest[] = [
  {
    id: 'g1',
    name: 'João Costa',
    email: 'joao.costa@exemplo.pt',
    phone: '+351 912 345 678',
    nationality: 'PT',
    notes: 'Prefere quarto tranquilo. Gosta de café preto sem açúcar.',
    created_at: rel(-90),
  },
  {
    id: 'g2',
    name: 'Thomas Müller',
    email: 'thomas.mueller@web.de',
    phone: '+49 171 234 5678',
    nationality: 'DE',
    notes: 'Vegetariano. Viaja de mota. Pediu sugestões de trilhos.',
    created_at: rel(-60),
  },
  {
    id: 'g3',
    name: 'Sophie Martin',
    email: 'sophie.martin@gmail.com',
    phone: null,
    nationality: 'FR',
    notes: '',
    created_at: rel(-5),
  },
  {
    id: 'g4',
    name: 'Maria Ferreira',
    email: 'mferreira@sapo.pt',
    phone: '+351 965 432 100',
    nationality: 'PT',
    notes: 'Já ficou cá no verão passado. Adorou o silêncio.',
    created_at: rel(-120),
  },
];

// ── mock reservations ─────────────────────────────────────────────────────────
export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'r1',
    guest_id: 'g1',
    room: 'Quarto 1',
    check_in: rel(-3),
    check_out: rel(0),
    channel: 'direct' as const,
    status: 'checked_out' as const,
    total_eur: 180,
    external_id: null,
    internal_notes: null,
    created_at: rel(-10),
    guest: MOCK_GUESTS[0],
  },
  {
    id: 'r2',
    guest_id: 'g2',
    room: 'Quarto 2',
    check_in: rel(-2),
    check_out: rel(2),
    channel: 'booking' as const,
    status: 'checked_in' as const,
    total_eur: 240,
    external_id: 'BK-882341',
    internal_notes: null,
    created_at: rel(-7),
    guest: MOCK_GUESTS[1],
  },
  {
    id: 'r3',
    guest_id: 'g3',
    room: 'Quarto 3',
    check_in: rel(0),
    check_out: rel(4),
    channel: 'airbnb' as const,
    status: 'confirmed' as const,
    total_eur: 320,
    external_id: 'AIR-HM9XYZ',
    internal_notes: 'Pediu cama extra; chega a partir das 20h.',
    created_at: rel(-3),
    guest: MOCK_GUESTS[2],
  },
  {
    id: 'r4',
    guest_id: 'g4',
    room: 'Quarto 1',
    check_in: rel(3),
    check_out: rel(7),
    channel: 'direct' as const,
    status: 'confirmed' as const,
    total_eur: 260,
    external_id: null,
    internal_notes: null,
    created_at: rel(-1),
    guest: MOCK_GUESTS[3],
  },
  {
    id: 'r5',
    guest_id: 'g2',
    room: 'Quarto 2',
    check_in: rel(-35),
    check_out: rel(-32),
    channel: 'airbnb' as const,
    status: 'checked_out' as const,
    total_eur: 210,
    external_id: 'AIR-77ABC',
    internal_notes: null,
    created_at: rel(-40),
    guest: MOCK_GUESTS[1],
  },
  {
    id: 'r6',
    guest_id: 'g4',
    room: 'Quarto 3',
    check_in: rel(-90),
    check_out: rel(-86),
    channel: 'direct' as const,
    status: 'checked_out' as const,
    total_eur: 340,
    external_id: null,
    internal_notes: null,
    created_at: rel(-100),
    guest: MOCK_GUESTS[3],
  },
  {
    id: 'r7',
    guest_id: 'g1',
    room: 'Quarto 1',
    check_in: rel(-20),
    check_out: rel(-16),
    channel: 'booking' as const,
    status: 'cancelled' as const,
    total_eur: null,
    external_id: 'BK-991100',
    internal_notes: null,
    created_at: rel(-25),
    guest: MOCK_GUESTS[0],
  },
];

// ── mock messages ─────────────────────────────────────────────────────────────
export const MOCK_MESSAGES = [
  {
    id: 'm1',
    reservation_id: 'r2',
    guest_id: 'g2',
    body: 'Olá! Qual é a password do Wi-Fi? Não consigo ligar o telemóvel.',
    role: 'guest' as const,
    handled: false,
    created_at: ago(47),
    guest: { id: 'g2', name: 'Thomas Müller' },
    reservation: { room: 'Quarto 2', check_in: rel(-2) },
  },
  {
    id: 'm2',
    reservation_id: 'r2',
    guest_id: 'g2',
    body: 'Olá Thomas! A rede Wi-Fi chama-se GuestNetwork e a password é welcome1234. Qualquer dúvida, estamos ao dispor!',
    role: 'ai' as const,
    handled: false,
    created_at: ago(46),
    guest: { id: 'g2', name: 'Thomas Müller' },
    reservation: { room: 'Quarto 2', check_in: rel(-2) },
  },
  {
    id: 'm3',
    reservation_id: 'r3',
    guest_id: 'g3',
    body: 'Bonjour! Y a-t-il un parking gratuit à proximité?',
    role: 'guest' as const,
    handled: false,
    created_at: ago(12),
    guest: { id: 'g3', name: 'Sophie Martin' },
    reservation: { room: 'Quarto 3', check_in: rel(0) },
  },
];

// ── mock concierge content ────────────────────────────────────────────────────
export const MOCK_CONTENT: Record<string, string> = {
  wifi_ssid: 'GuestNetwork',
  wifi_pass: 'welcome1234',
  checkin_instructions:
    'A chave está na caixa de segurança junto à porta principal. Código: 4729. O quarto está indicado na sua confirmação.',
  checkout_instructions:
    'Deixe as chaves no mesmo local. Feche a janela do quarto e desligue o ar condicionado. Obrigado pela visita!',
  breakfast:
    'Não incluído. Recomendamos o Café Central na Praça Dom Pedro V — abre às 7h30, a 4 min a pé.',
  tips: 'Miradouro de São Roque (pôr do sol incrível), Piscinas naturais de Belver a 20 min, Mercado de sábado na praça.',
  parking:
    'Estacionamento gratuito na Rua do Convento, a 2 min a pé. À noite pode estacionar mesmo em frente.',
};
