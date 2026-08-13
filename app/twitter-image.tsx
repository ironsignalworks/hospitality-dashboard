import { ImageResponse } from 'next/og';
import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgShareCard,
} from '@/lib/og-share-card';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Explicit X/Twitter card (same art as Open Graph). */
export default function Image() {
  return new ImageResponse(<OgShareCard />, { ...OG_SIZE });
}
