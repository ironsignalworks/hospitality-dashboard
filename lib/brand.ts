export type Brand = {
  /** Public-facing name shown in UI/metadata. */
  name: string;
  /** Optional short location/descriptor, e.g. "Lisboa" or "Guest portal". */
  tagline?: string;
};

export function getBrand(): Brand {
  // These default values keep the template usable without any env setup.
  const name = (process.env.NEXT_PUBLIC_BRAND_NAME ?? '').trim() || 'Your Property';
  const tagline = (process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? '').trim() || undefined;
  return { name, tagline };
}

