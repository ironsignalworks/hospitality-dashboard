import ical from 'ical.js';
import type { Channel } from '@/lib/types';

export interface ParsedEvent {
  externalId: string;
  summary: string;
  start: string;
  end: string;
  channel: Channel;
  guestName: string | null;
}

function detectChannel(summary: string, url: string): Channel {
  const lower = (summary + url).toLowerCase();
  if (lower.includes('airbnb')) return 'airbnb';
  if (lower.includes('booking')) return 'booking';
  return 'direct';
}

export async function fetchAndParseICal(url: string, channel?: Channel): Promise<ParsedEvent[]> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);

  const text = await res.text();
  const parsed = ical.parse(text);
  const comp = new ical.Component(parsed);
  const vevents = comp.getAllSubcomponents('vevent');

  return vevents.map((vevent) => {
    const ev = new ical.Event(vevent);
    const uid = ev.uid ?? String(Math.random());
    const summary = ev.summary ?? 'Reserva';
    const dtstart = ev.startDate?.toJSDate().toISOString().split('T')[0] ?? '';
    const dtend = ev.endDate?.toJSDate().toISOString().split('T')[0] ?? '';
    const detectedChannel = channel ?? detectChannel(summary, url);
    const guestName = summary.replace(/airbnb|booking|reserved|bloqueado/gi, '').trim() || null;

    return { externalId: uid, summary, start: dtstart, end: dtend, channel: detectedChannel, guestName };
  });
}
