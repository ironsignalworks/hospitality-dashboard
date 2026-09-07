import type { Channel, Guest, Message, Reservation, ReservationStatus } from './types';
import { MOCK_GUESTS, MOCK_MESSAGES, MOCK_RESERVATIONS } from './demo';

export type ReservationFilters = {
  room?: string;
  status?: string;
  guest_id?: string;
};

export type MessageFilters = {
  reservation_id?: string;
  guest_id?: string;
};

function cloneGuest(g: Guest): Guest {
  return { ...g };
}

function cloneReservation(r: Reservation): Reservation {
  const { guest: _guest, ...rest } = r;
  return { ...rest };
}

function cloneMessage(m: Message): Message {
  const { guest: _g, reservation: _r, ...rest } = m;
  return { ...rest, scheduled_at: m.scheduled_at ?? null };
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class MockStorage {
  private reservations = new Map<string, Reservation>();
  private guests = new Map<string, Guest>();
  private messages = new Map<string, Message>();

  constructor() {
    this.seedData();
  }

  private seedData() {
    for (const g of MOCK_GUESTS) this.guests.set(g.id, cloneGuest(g));
    for (const r of MOCK_RESERVATIONS) this.reservations.set(r.id, cloneReservation(r));
    for (const m of MOCK_MESSAGES) this.messages.set(m.id, cloneMessage(m as Message));
  }

  private withGuest(r: Reservation): Reservation {
    const guest = r.guest_id ? (this.guests.get(r.guest_id) ?? null) : null;
    return { ...r, guest };
  }

  private withMessageRelations(m: Message): Message {
    const guest = m.guest_id ? (this.guests.get(m.guest_id) ?? null) : null;
    const reservation = m.reservation_id ? this.reservations.get(m.reservation_id) : null;
    return {
      ...m,
      guest: guest ? { ...guest } : null,
      reservation: reservation
        ? {
            ...this.withGuest(reservation),
          }
        : null,
    };
  }

  getReservations(filters?: ReservationFilters): Reservation[] {
    let all = Array.from(this.reservations.values()).map((r) => this.withGuest(r));
    if (!filters) return all;
    return all.filter((r) => {
      if (filters.room && r.room !== filters.room) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.guest_id && r.guest_id !== filters.guest_id) return false;
      return true;
    });
  }

  getReservation(id: string): Reservation | null {
    const row = this.reservations.get(id);
    return row ? this.withGuest(row) : null;
  }

  createReservation(data: Omit<Reservation, 'id' | 'created_at' | 'guest'>): Reservation {
    const id = makeId('r');
    const reservation: Reservation = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.reservations.set(id, reservation);
    return this.withGuest(reservation);
  }

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const existing = this.reservations.get(id);
    if (!existing) return null;
    const { guest: _g, id: _id, created_at: _c, ...rest } = updates;
    const updated: Reservation = { ...existing, ...rest, id, created_at: existing.created_at };
    this.reservations.set(id, updated);
    return this.withGuest(updated);
  }

  deleteReservation(id: string): boolean {
    return this.reservations.delete(id);
  }

  getGuests(search?: string): Guest[] {
    const q = search?.trim().toLowerCase();
    const all = Array.from(this.guests.values()).map(cloneGuest);
    if (!q) return all;
    return all.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.phone ?? '').toLowerCase().includes(q)
    );
  }

  getGuest(id: string): Guest | null {
    const g = this.guests.get(id);
    return g ? cloneGuest(g) : null;
  }

  createGuest(data: Omit<Guest, 'id' | 'created_at'>): Guest {
    const id = makeId('g');
    const guest: Guest = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.guests.set(id, guest);
    return cloneGuest(guest);
  }

  updateGuest(id: string, updates: Partial<Guest>): Guest | null {
    const existing = this.guests.get(id);
    if (!existing) return null;
    const { id: _id, created_at: _c, ...rest } = updates;
    const updated: Guest = { ...existing, ...rest, id, created_at: existing.created_at };
    this.guests.set(id, updated);
    return cloneGuest(updated);
  }

  getMessages(filters?: MessageFilters): Message[] {
    let all = Array.from(this.messages.values()).map((m) => this.withMessageRelations(m));
    if (!filters) return all;
    return all.filter((m) => {
      if (filters.reservation_id && m.reservation_id !== filters.reservation_id) return false;
      if (filters.guest_id && m.guest_id !== filters.guest_id) return false;
      return true;
    });
  }

  createMessage(data: Omit<Message, 'id' | 'created_at' | 'guest' | 'reservation'>): Message {
    const id = makeId('m');
    const message: Message = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.messages.set(id, message);
    return this.withMessageRelations(message);
  }

  updateMessage(id: string, updates: Partial<Message>): Message | null {
    const existing = this.messages.get(id);
    if (!existing) return null;
    const { guest: _g, reservation: _r, id: _id, created_at: _c, ...rest } = updates;
    const updated: Message = { ...existing, ...rest, id, created_at: existing.created_at };
    this.messages.set(id, updated);
    return this.withMessageRelations(updated);
  }

  deleteMessage(id: string): boolean {
    return this.messages.delete(id);
  }
}

const g = globalThis as typeof globalThis & { __hdMockStorage?: MockStorage };
export const mockStorage = g.__hdMockStorage ?? new MockStorage();
g.__hdMockStorage = mockStorage;

export function parseChannel(raw: unknown): Channel {
  return raw === 'airbnb' || raw === 'booking' || raw === 'direct' ? raw : 'direct';
}

export function parseStatus(raw: unknown): ReservationStatus {
  return raw === 'confirmed' ||
    raw === 'pending' ||
    raw === 'cancelled' ||
    raw === 'checked_in' ||
    raw === 'checked_out'
    ? raw
    : 'confirmed';
}
