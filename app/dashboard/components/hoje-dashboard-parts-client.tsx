'use client';

import Link from 'next/link';
import { useAppSettings } from './app-settings-provider';
import { RoomCardsSection, type RoomCardData } from './room-cards-section';
import type { Reservation } from '@/lib/types';
import { formatDatePT, stripTZ } from '@/lib/dashboard-date-helpers';

export function HojeOccupationHeaderClient({
  salutation,
  today,
  reservations,
}: {
  salutation: string;
  today: string;
  reservations: Reservation[];
}) {
  const appSettings = useAppSettings();

  const occupiedRooms = new Set(
    reservations
      .filter((r) => stripTZ(r.check_in) <= today && stripTZ(r.check_out) > today)
      .map((r) => r.room)
  );
  const occupiedCount = occupiedRooms.size;
  const occupancyPct = Math.round(
    (occupiedCount / Math.max(1, appSettings.room_count)) * 100
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dash-accent">
          {salutation}
        </p>
        <h1 className="mt-1 text-2xl font-bold font-serif text-[#4A4A4A] sm:text-3xl">
          Hoje, {formatDatePT(today)}
        </h1>
        <p className="mt-1 text-sm text-dash-muted">
          {appSettings.property_name} · {occupiedCount}/{appSettings.room_count} quartos ocupados
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-[#E8E4DA] bg-white px-4 py-3 shadow-sm sm:max-w-xs sm:shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-dash-muted">Ocupação agora</p>
          <p className="text-lg font-bold tabular-nums text-[#4A4A4A]">{occupancyPct}%</p>
        </div>
        <div
          className="h-2 w-24 overflow-hidden rounded-full bg-[#EEE] sm:w-28"
          role="img"
          aria-label={`${occupancyPct} por cento de ocupação`}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r from-[#DAA520] to-[#B8860B] transition-all duration-500 ${
              occupancyPct === 0 ? 'w-0' : occupancyPct <= 34 ? 'w-1/3' : occupancyPct <= 67 ? 'w-2/3' : 'w-full'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export function HojeRoomCardsWithSettingsClient({
  today,
  reservations,
}: {
  today: string;
  reservations: Reservation[];
}) {
  const appSettings = useAppSettings();

  const cards: RoomCardData[] = appSettings.room_names.map((room) => {
    const res = reservations.find(
      (r) => r.room === room && stripTZ(r.check_in) <= today && stripTZ(r.check_out) > today
    );
    const guest = res ? (res.guest as { id?: string; name?: string } | null) : null;
    return {
      room,
      occupied: !!res,
      guestId: guest?.id ?? res?.guest_id ?? null,
      reservationId: res?.id ?? null,
      guestName: guest?.name ?? null,
      isCheckinToday: res ? stripTZ(res.check_in) === today : false,
      isCheckoutToday: res ? stripTZ(res.check_out) === today : false,
      nightsLeft: res
        ? Math.round(
            (new Date(stripTZ(res.check_out)).getTime() - new Date(today).getTime()) / 86400000
          )
        : 0,
      channel: res?.channel ?? 'direct',
      checkOut: res ? formatDatePT(stripTZ(res.check_out)) : '',
    };
  });

  return <RoomCardsSection cards={cards} />;
}

/** Only the scroll/grid of day cells (uses room_count from settings). */
export function HojeSevenDayGridClient({
  today,
  days,
  reservations,
}: {
  today: string;
  days: string[];
  reservations: Reservation[];
}) {
  const appSettings = useAppSettings();

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden px-1 pb-2 [scrollbar-width:thin] sm:grid sm:min-w-0 sm:snap-none sm:grid-cols-7 sm:overflow-visible sm:pb-0">
      {days.map((day) => {
        const dayReservations = reservations.filter(
          (r) => stripTZ(r.check_in) <= day && stripTZ(r.check_out) > day
        );
        const isToday = day === today;
        return (
          <Link
            key={day}
            href="/dashboard/reservations"
            className={`w-[4.5rem] shrink-0 snap-center rounded-xl border p-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] focus-visible:ring-offset-1 sm:w-auto sm:snap-normal ${
              isToday
                ? 'border-dash-accent bg-[#DAA520] text-[#1A1500] shadow-md ring-2 ring-[#DAA520]/40 hover:bg-[#C9961C]'
                : 'border-[#E0DBCF] bg-white text-[#4A4A4A] shadow-sm hover:border-[#DAA520]/60 hover:bg-[#FFFCF6]'
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase leading-tight sm:text-xs ${
                isToday ? 'text-[#3D2E00]' : 'text-dash-muted'
              }`}
            >
              {new Date(day + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short' })}
            </p>
            <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums">
              {new Date(day + 'T00:00:00').getDate()}
            </p>
            <p
              className={`mt-1 text-[11px] font-semibold tabular-nums sm:text-xs ${
                isToday
                  ? 'text-[#3D2E00]'
                  : dayReservations.length > 0
                    ? 'text-dash-olive'
                    : 'text-dash-muted'
              }`}
            >
              {dayReservations.length}/{appSettings.room_count}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
