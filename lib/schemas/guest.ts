import { z } from 'zod';
import { optionalEmail, optionalNullableText } from './primitives';

export const guestListQuerySchema = z.object({
  id: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});

export const createGuestBodySchema = z.object({
  name: z.string().trim().min(1),
  email: optionalEmail,
  phone: optionalNullableText,
  nationality: optionalNullableText,
  notes: z.string().optional(),
});

export const patchGuestBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  email: optionalEmail,
  phone: optionalNullableText,
  nationality: optionalNullableText,
  notes: z.union([z.string(), z.null()]).optional(),
});

export type CreateGuestBody = z.infer<typeof createGuestBodySchema>;
export type PatchGuestBody = z.infer<typeof patchGuestBodySchema>;
