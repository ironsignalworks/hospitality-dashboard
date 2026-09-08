import { z } from 'zod';
import { messageRoleSchema } from './primitives';

const optionalId = z.string().min(1).nullable().optional();

export const messageListQuerySchema = z.object({
  reservation_id: z.string().min(1).optional(),
  guest_id: z.string().min(1).optional(),
});

export const postMessageBodySchema = z
  .object({
    guestMessage: z.string().optional(),
    body: z.string().optional(),
    reservationId: optionalId,
    reservation_id: optionalId,
    guestId: optionalId,
    guest_id: optionalId,
    role: messageRoleSchema.optional(),
    scheduled_at: z.string().min(1).nullable().optional(),
  })
  .transform((value) => {
    const guestMessage = value.guestMessage?.trim() ?? '';
    const ownerBody = value.body?.trim() ?? '';
    return {
      guestMessage,
      body: ownerBody,
      reservation_id: value.reservation_id ?? value.reservationId ?? null,
      guest_id: value.guest_id ?? value.guestId ?? null,
      role: value.role,
      scheduled_at: value.scheduled_at ?? null,
    };
  })
  .refine((value) => value.guestMessage.length > 0 || value.body.length > 0, {
    message: 'Message is required',
  });

export const patchMessageBodySchema = z.object({
  id: z.string().min(1),
  handled: z.boolean().optional(),
});

export const patchMessageProdBodySchema = z.object({
  id: z.string().min(1),
  handled: z.boolean(),
});

export const postGuestMessageProdSchema = z.object({
  guestMessage: z.string().trim().min(1),
  reservationId: z.string().min(1).optional(),
  guestId: z.string().min(1).optional(),
});

export type PostMessageBody = z.infer<typeof postMessageBodySchema>;
