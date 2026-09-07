'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { ChannelIcon } from './channel-icon';
import { GuestPanel } from './guest-panel';
import type { Reservation } from '@/lib/types';
import { formatDate, stripTZ } from '@/lib/dashboard-date-helpers';
import { useLocale, tChannel, displayRoomLabel } from '@/lib/i18n';

const CHANNEL_COLOR: Record<string, string> = {
  airbnb: 'bg-dash-airbnb text-white',
  booking: 'bg-[#003580] text-white',
  direct: 'bg-dash-olive text-white',
};

export function ProximasChegadasSection({ today, reservations }: { today: string; reservations: Reservation[] }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [panel, setPanel] = useState<{ id: string; name?: string; reservationId: string } | null>(null);

  const arrivals = reservations
    .filter((r) => stripTZ(r.check_in) >= today)
    .slice(0, 5);

  if (arrivals.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dash-muted uppercase tracking-wide">{t('today.upcomingArrivals')}</h2>
        <Link
          href="/dashboard/reservations"
          className="text-xs font-semibold text-dash-accent hover:underline flex items-center gap-1"
        >
          {t('today.viewAll')} <ArrowRight size={12} aria-hidden />
        </Link>
      </div>
      <ul className="space-y-2">
        {arrivals.map((r) => {
          const guest = r.guest as { id?: string; name?: string } | null;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  if (r.guest_id) {
                    setPanel({ id: r.guest_id, name: guest?.name, reservationId: r.id });
                  } else {
                    router.push('/dashboard/reservations');
                  }
                }}
                className="flex w-full min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-[#E0DBCF] bg-white px-4 py-3 text-left transition-colors hover:border-[#DAA520]/60 hover:bg-[#FFFCF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] focus-visible:ring-offset-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A]">
                    {guest?.name ?? t('common.unnamedGuest')}
                  </p>
                  <p className="mt-0.5 text-xs text-dash-muted">
                    {displayRoomLabel(r.room, t)} · {formatDate(r.check_in, locale, { weekday: 'short', day: 'numeric', month: '2-digit' })} → {formatDate(r.check_out, locale, { weekday: 'short', day: 'numeric', month: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      CHANNEL_COLOR[r.channel] ?? 'bg-dash-muted text-white'
                    }`}
                  >
                    <ChannelIcon channel={r.channel} size={10} />
                    {tChannel(t, r.channel)}
                  </span>
                  <span className="text-[#CCC] pointer-events-none" aria-hidden>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {panel && (
        <GuestPanel
          key={`${panel.id}-${panel.reservationId}`}
          guestId={panel.id}
          guestName={panel.name}
          reservationId={panel.reservationId}
          onClose={() => setPanel(null)}
        />
      )}
    </section>
  );
}
