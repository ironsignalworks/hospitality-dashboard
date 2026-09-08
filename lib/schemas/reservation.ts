import { DEFAULT_ROOM } from '@/lib/config/rooms';
import { z } from 'zod';
import {
  channelSchema,
  isoDate,
  optionalEmail,
  optionalMoney,
  optionalNullableText,
  reservationStatusSchema,
  roomKeySchema,
} from './primitives';

export const reservationListQuerySchema = z.object({
  room: roomKeySchema.optional(),
  status: reservationStatusSchema.optional(),
  guest_id: z.string().min(1).optional(),
});

export const createReservationBodySchema = z.object({
  guest_id: z.string().min(1).nullable().optional(),
  guest_name: z.string().trim().min(1),
  guest_email: optionalEmail,
  room: roomKeySchema.default(DEFAULT_ROOM),
  check_in: isoDate,
  check_out: isoDate,
  channel: channelSchema.optional(),
  status: reservationStatusSchema.optional(),
  total_eur: optionalMoney,
  external_id: optionalNullableText,
  internal_notes: optionalNullableText,
});

export const patchReservationBodySchema = z.object({
  id: z.string().min(1),
  guest_name: z.string().trim().min(1).optional(),
  guest_email: optionalEmail,
  room: roomKeySchema.optional(),
  check_in: isoDate.optional(),
  check_out: isoDate.optional(),
  channel: channelSchema.optional(),
  status: reservationStatusSchema.optional(),
  total_eur: optionalMoney,
  internal_notes: optionalNullableText,
});

export type CreateReservationBody = z.infer<typeof createReservationBodySchema>;
export type PatchReservationBody = z.infer<typeof patchReservationBodySchema>;
