import { z } from 'zod';
import { isoDate, optionalEmail, optionalMoney, roomKeySchema } from './primitives';

export const webhookEnvelopeSchema = z
  .object({
    type: z.string().optional(),
    event: z.string().optional(),
  })
  .passthrough();

export const webhookStaySchema = z
  .object({
    check_in: z.string().optional(),
    check_in_date: z.string().optional(),
    arrival: z.string().optional(),
    check_out: z.string().optional(),
    check_out_date: z.string().optional(),
    departure: z.string().optional(),
  })
  .passthrough()
  .refine(
    (value) =>
      Boolean(
        (value.check_in_date ?? value.check_in ?? value.arrival) &&
          (value.check_out_date ?? value.check_out ?? value.departure)
      ),
    { message: 'check-in and check-out are required' }
  );

export function unwrapWebhookReservation(body: Record<string, unknown>): Record<string, unknown> {
  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    const data = body.data as Record<string, unknown>;
    if (data.reservation && typeof data.reservation === 'object' && !Array.isArray(data.reservation)) {
      return data.reservation as Record<string, unknown>;
    }
  }
  if (body.reservation && typeof body.reservation === 'object' && !Array.isArray(body.reservation)) {
    return body.reservation as Record<string, unknown>;
  }
  return body;
}

export const simulateWebhookBodySchema = z.object({
  action: z.enum(['airbnb_booking', 'booking_com']),
  data: z.object({
    room: roomKeySchema.optional(),
    check_in: isoDate,
    check_out: isoDate,
    guest_name: z.string().trim().min(1).optional(),
    guest_email: optionalEmail,
    total_eur: optionalMoney,
    external_id: z.string().min(1).nullable().optional(),
  }),
});

export type SimulateWebhookBody = z.infer<typeof simulateWebhookBodySchema>;
