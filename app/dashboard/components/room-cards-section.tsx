'use client';

import { useEffect, useRef, useState } from 'react';
import { BedDouble, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChannelIcon } from './channel-icon';
import { GuestPanel } from './guest-panel';
import { QuickReservationModal } from './quick-reservation-modal';

export type RoomCardData = {
  room: string;
  occupied: boolean;
  guestId: string | null;
  reservationId: string | null;
  guestName: string | null;
  isCheckinToday: boolean;
  isCheckoutToday: boolean;
  nightsLeft: number;
  channel: string;
  checkOut: string;
};

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

export function RoomCardsSection({ cards }: { cards: RoomCardData[] }) {
  const router = useRouter();
  const [panelGuestId, setPanelGuestId] = useState<string | null>(null);
  const [panelGuestName, setPanelGuestName] = useState<string | null>(null);
  const [panelReservationId, setPanelReservationId] = useState<string | null>(null);
  const [newResRoom, setNewResRoom] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  function showFlash(type: 'success' | 'error', text: string) {
    setFlash({ type, text });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 4000);
  }

  return (
    <>
      {flash && (
        <div
          role="status"
          className={`mb-3 rounded-xl border px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          if (!card.occupied) {
            return (
              <button
                key={card.room}
                type="button"
                onClick={() => setNewResRoom(card.room)}
                className="rounded-2xl p-5 border bg-white text-[#4A4A4A] border-[#E0DBCF] text-left w-full hover:border-[#DAA520]/60 hover:bg-[#FFFCF6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] focus-visible:ring-offset-2 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{card.room}</span>
                  <BedDouble size={18} className="text-[#CCC] group-hover:text-[#DAA520]/60 transition-colors" aria-hidden />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm opacity-50">Livre</p>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-[#DAA520] font-medium">
                    <Plus size={11} aria-hidden />
                    Reservar
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={card.room}
              type="button"
              onClick={() => {
                setPanelGuestId(card.guestId);
                setPanelGuestName(card.guestName);
                setPanelReservationId(card.reservationId);
              }}
              className="rounded-2xl p-5 border bg-[#4A4A4A] text-white border-[#4A4A4A] text-left w-full hover:bg-[#3A3A3A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{card.room}</span>
                <BedDouble size={18} className="text-[#DAA520]" aria-hidden />
              </div>

              {(card.isCheckinToday || card.isCheckoutToday) && (
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {card.isCheckinToday && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#708238] text-white font-semibold">
                      Check-in hoje
                    </span>
                  )}
                  {card.isCheckoutToday && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#BC6C25] text-white font-semibold">
                      Check-out hoje
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm font-medium truncate">{card.guestName ?? 'Hóspede'}</p>
              <p className="text-xs opacity-70 mt-0.5">
                {card.nightsLeft === 0
                  ? 'Última noite'
                  : card.nightsLeft === 1
                    ? '1 noite restante'
                    : `${card.nightsLeft} noites restantes`}
                {' · '}até {card.checkOut}
              </p>
              <span className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full ${CHANNEL_COLOR[card.channel] ?? 'bg-[#888] text-white'}`}>
                <ChannelIcon channel={card.channel} size={10} />
                {CHANNEL_LABEL[card.channel] ?? card.channel}
              </span>
            </button>
          );
        })}
      </div>

      {panelGuestId && (
        <GuestPanel
          guestId={panelGuestId}
          guestName={panelGuestName ?? undefined}
          reservationId={panelReservationId ?? undefined}
          onClose={() => {
            setPanelGuestId(null);
            setPanelGuestName(null);
            setPanelReservationId(null);
          }}
        />
      )}

      {newResRoom && (
        <QuickReservationModal
          initialRoom={newResRoom}
          onClose={() => setNewResRoom(null)}
          onSaved={(result) => {
            showFlash(result.ok ? 'success' : 'error', result.message);
            if (result.ok) {
              router.refresh();
              if (result.guestId) {
                setPanelGuestId(result.guestId);
                setPanelGuestName(result.guestName ?? null);
                setPanelReservationId(result.reservationId);
              }
            }
          }}
        />
      )}
    </>
  );
}
