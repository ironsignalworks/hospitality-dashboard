import { describe, expect, it } from 'vitest';
import { createReservationBodySchema, patchReservationBodySchema } from './reservation';
import { createGuestBodySchema } from './guest';
import { postMessageBodySchema } from './message';
import { simulateWebhookBodySchema, unwrapWebhookReservation, webhookStaySchema } from './webhooks';
import { parseSchema } from './parse';

describe('createReservationBodySchema', () => {
  it('accepts ISO datetime and string amounts', () => {
    const parsed = parseSchema(createReservationBodySchema, {
      guest_name: 'Ana',
      guest_email: '',
      room: 'Quarto 1',
      check_in: '2026-10-01T12:00:00',
      check_out: '2026-10-05',
      total_eur: '180.5',
      channel: 'direct',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.check_in).toBe('2026-10-01');
      expect(parsed.data.total_eur).toBe(180.5);
      expect(parsed.data.guest_email).toBeNull();
    }
  });

  it('rejects missing guest name', () => {
    const parsed = parseSchema(createReservationBodySchema, {
      check_in: '2026-10-01',
      check_out: '2026-10-05',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.issues.some((i) => i.path === 'guest_name')).toBe(true);
    }
  });

  it('trims room and rejects whitespace-only room', () => {
    const trimmed = parseSchema(createReservationBodySchema, {
      guest_name: 'Ana',
      check_in: '2026-10-01',
      check_out: '2026-10-05',
      room: '  Quarto 1  ',
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.room).toBe('Quarto 1');

    const blank = parseSchema(createReservationBodySchema, {
      guest_name: 'Ana',
      check_in: '2026-10-01',
      check_out: '2026-10-05',
      room: '   ',
    });
    expect(blank.success).toBe(false);
  });
});

describe('patchReservationBodySchema', () => {
  it('does not treat omitted total_eur as null', () => {
    const parsed = parseSchema(patchReservationBodySchema, { id: 'r1', status: 'checked_in' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.total_eur).toBeUndefined();
    }
  });
});

describe('createGuestBodySchema', () => {
  it('rejects invalid email', () => {
    const parsed = parseSchema(createGuestBodySchema, { name: 'Ana', email: 'not-an-email' });
    expect(parsed.success).toBe(false);
  });
});

describe('postMessageBodySchema', () => {
  it('accepts guestMessage or owner body', () => {
    expect(parseSchema(postMessageBodySchema, { guestMessage: 'Hi' }).success).toBe(true);
    expect(parseSchema(postMessageBodySchema, { body: 'Reply', role: 'owner' }).success).toBe(true);
    expect(parseSchema(postMessageBodySchema, {}).success).toBe(false);
  });
});

describe('simulateWebhookBodySchema', () => {
  it('requires action and dates', () => {
    expect(parseSchema(simulateWebhookBodySchema, { action: 'nope', data: {} }).success).toBe(
      false
    );
    const ok = parseSchema(simulateWebhookBodySchema, {
      action: 'airbnb_booking',
      data: { check_in: '2026-11-01', check_out: '2026-11-04' },
    });
    expect(ok.success).toBe(true);
  });
});

describe('webhookStaySchema', () => {
  it('accepts nested booking-style dates', () => {
    const body = {
      type: 'reservation.created',
      data: { reservation: { arrival: '2026-11-01', departure: '2026-11-03' } },
    };
    const inner = unwrapWebhookReservation(body);
    expect(parseSchema(webhookStaySchema, inner).success).toBe(true);
  });

  it('rejects a reservation event without dates', () => {
    expect(parseSchema(webhookStaySchema, { type: 'reservation.created' }).success).toBe(false);
  });
});
