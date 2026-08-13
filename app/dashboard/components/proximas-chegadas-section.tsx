'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { ChannelIcon } from './channel-icon';
import { GuestPanel } from './guest-panel';
import type { Reservation } from '@/lib/types';

const CHANNEL_LABEL: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  direct: 'Direto',
};

const CHANNEL_COLOR: Record<string, string> = {
  airbnb: 'bg-[#FF5A5F] text-white',
  booking: 'bg-[#003580] text-white',
  direct: 'bg-[#708238] text-white',
};

function formatDatePT(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: '2-digit',
  });
}

function stripTZ(dateStr: string) {
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
}

export function ProximasChegadasSection({ today, reservations }: { today: string; reservations: Reservation[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<{ id: string; name?: string; reservationId: string } | null>(null);

  const arrivals = reservations
    .filter((r) => stripTZ(r.check_in) >= today)
    .slice(0, 5);

  if (arrivals.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide">Próximas chegadas</h2>
        <Link
          href="/dashboard/reservations"
          className="text-xs text-[#DAA520] hover:underline flex items-center gap-1"
        >
          Ver todas <ArrowRight size={12} aria-hidden />
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
                aria-label={
                  r.guest_id
                    ? `Abrir dossié de ${guest?.name ?? 'hóspede'}`
                    : 'Abrir reservas — reserva sem hóspede'
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A]">
                    {guest?.name ?? 'Hóspede sem nome'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {r.room} · {formatDatePT(r.check_in)} → {formatDatePT(r.check_out)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                    }`}
                  >
                    <ChannelIcon channel={r.channel} size={10} />
                    {CHANNEL_LABEL[r.channel] ?? r.channel}
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
