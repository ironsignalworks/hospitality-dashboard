import { ROOMS } from './rooms';

/** iCal fallbacks (Beds24 / PMS) — env-driven; used by sync-ical. */
export const ICAL_SOURCES: Array<{ url: string; room: string }> = [
  { url: process.env.ICAL_URL_ROOM1 ?? '', room: ROOMS[0] },
  { url: process.env.ICAL_URL_ROOM2 ?? '', room: ROOMS[1] },
  { url: process.env.ICAL_URL_ROOM3 ?? '', room: ROOMS[2] },
];
