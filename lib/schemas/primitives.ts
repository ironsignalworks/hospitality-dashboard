import { z } from 'zod';

export const isoDate = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split('T')[0] ?? value)
  .pipe(z.iso.date());

export const channelSchema = z.enum(['airbnb', 'booking', 'direct']);
export const reservationStatusSchema = z.enum([
  'confirmed',
  'pending',
  'cancelled',
  'checked_in',
  'checked_out',
]);
export const messageRoleSchema = z.enum(['guest', 'ai', 'owner']);

export const emailValue = z
  .union([z.email(), z.literal(''), z.null()])
  .transform((value) => (value ? value : null));

export const optionalEmail = emailValue.optional();

export const nullableText = z.union([z.string(), z.null()]).transform((value) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
});

export const optionalNullableText = nullableText.optional();

export const money = z.union([z.number(), z.string(), z.null()]).transform((value, ctx) => {
  if (value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: 'custom', message: 'Invalid amount' });
    return z.NEVER;
  }
  return n;
});

export const optionalMoney = money.optional();

export const idQuerySchema = z.object({
  id: z.string().min(1),
});

/** Trimmed room label. Empty/whitespace-only values fail. */
export const roomKeySchema = z.string().trim().min(1);
