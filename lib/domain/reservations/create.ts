/**
 * Domain entry points for creating reservations (Airbnb, Booking, manual, iCal).
 * API routes and workers should call services, which call these.
 */

// Reserved for: insert rules, validation, idempotency keys, domain events.
export type CreateReservationInput = {
  guestId: string | null;
  guestName?: string;
  room: string;
  checkIn: string;
  checkOut: string;
  channel: string;
  status: string;
  externalId?: string;
};

// Implement when a single write-path is required beyond iCal sync.
