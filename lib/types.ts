export type Channel = 'airbnb' | 'booking' | 'direct';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out';
export type MessageRole = 'guest' | 'ai' | 'owner';

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  guest_id: string | null;
  room: string;
  check_in: string;
  check_out: string;
  channel: Channel;
  status: ReservationStatus;
  total_eur: number | null;
  external_id: string | null;
  /** Notas internas do dono, específicas desta estadia (diferente de guests.notes). */
  internal_notes: string | null;
  created_at: string;
  guest?: Guest | null;
}

export interface Message {
  id: string;
  reservation_id: string | null;
  guest_id: string | null;
  body: string;
  role: MessageRole;
  handled: boolean;
  scheduled_at: string | null;
  created_at: string;
  reservation?: Reservation | null;
  guest?: Guest | null;
}

export interface ConciergeContent {
  key: string;
  value: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  recipient_count: number;
}

export interface GuestAlert {
  id: string;
  guest_id: string;
  message: string;
  notify_at: string;
  delivered_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  guest?: { id: string; name: string } | null;
}
