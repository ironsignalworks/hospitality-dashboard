import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies HMAC-SHA256(rawBody, secret) against typical webhook header formats:
 * hex digest, `sha256=<hex>`, `v1=<hex>`, comma-separated pairs, or raw base64 digest.
 */
export function verifyWebhookHmacSha256(
  rawBody: string,
  secret: string,
  signatureHeader: string | null | undefined
): boolean {
  if (!signatureHeader?.trim()) return false;

  const macHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const macB64 = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

  const segments = signatureHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const hexCandidates = segments.flatMap((seg) => {
    const eq = seg.indexOf('=');
    const value = eq >= 0 ? seg.slice(eq + 1).trim() : seg;
    const stripped = value.replace(/^sha256=/i, '').replace(/^v\d+=/i, '').trim();
    return [stripped, value];
  });

  for (const cand of hexCandidates) {
    if (!/^[0-9a-f]+$/i.test(cand)) continue;
    if (cand.length !== macHex.length) continue;
    try {
      const a = Buffer.from(macHex, 'hex');
      const b = Buffer.from(cand.toLowerCase(), 'hex');
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* invalid hex */
    }
  }

  const hdr = signatureHeader.trim();
  if (hdr === macB64) return true;

  try {
    const a = Buffer.from(macB64);
    const b = Buffer.from(hdr);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* ignore */
  }

  return false;
}

export function pickHeader(headers: Headers, names: readonly string[]): string | null {
  for (const name of names) {
    const v = headers.get(name);
    if (v?.trim()) return v;
  }
  return null;
}
