'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect, useId } from 'react';
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  MessageSquare,
  X,
  ArrowRight,
} from 'lucide-react';
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

type ModalId = 'checkin' | 'checkout' | 'staying' | 'messages' | null;

function formatDatePT(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function stripTZ(dateStr: string) {
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
}

export function DashboardTodayKpis({
  checkIns,
  checkOuts,
  staying,
  unreadCount,
}: {
  checkIns: Reservation[];
  checkOuts: Reservation[];
  staying: Reservation[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState<ModalId>(null);
  const [dossie, setDossie] = useState<{
    guestId: string;
    guestName?: string;
    reservationId: string;
  } | null>(null);
  const baseId = useId();

  const onClose = useCallback(() => setOpen(null), []);

  const openDossieForReservation = useCallback((r: Reservation) => {
    if (!r.guest_id) return;
    setOpen(null);
    const g = r.guest as { name?: string } | null;
    setDossie({
      guestId: r.guest_id,
      guestName: g?.name,
      reservationId: r.id,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <button
          type="button"
          aria-label={`Check-ins hoje, ${checkIns.length} reservas. Abrir lista.`}
          onClick={() => setOpen('checkin')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label="Check-ins hoje"
            value={checkIns.length}
            icon={<CalendarCheck size={20} className="text-[#708238]" />}
            accent="border-[#708238]"
          />
        </button>
        <button
          type="button"
          aria-label={`Check-outs hoje, ${checkOuts.length} reservas. Abrir lista.`}
          onClick={() => setOpen('checkout')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label="Check-outs hoje"
            value={checkOuts.length}
            icon={<CalendarX size={20} className="text-[#BC6C25]" />}
            accent="border-[#BC6C25]"
          />
        </button>
        <button
          type="button"
          aria-label={`A ficar hoje, ${staying.length} hóspedes. Abrir lista.`}
          onClick={() => setOpen('staying')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label="A ficar"
            value={staying.length}
            icon={<BedDouble size={20} className="text-[#DAA520]" />}
            accent="border-[#DAA520]"
          />
        </button>
        <button
          type="button"
          aria-label={`Mensagens novas, ${unreadCount} por ler. Abrir opções.`}
          onClick={() => setOpen('messages')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label="Mensagens novas"
            value={unreadCount}
            icon={<MessageSquare size={20} className="text-[#4A4A4A]" />}
            accent={unreadCount > 0 ? 'border-red-400' : 'border-[#4A4A4A]'}
            highlight={unreadCount > 0}
          />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-title`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-md cursor-default flex flex-col rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#E0DBCF]">
              <div>
                <h2 id={`${baseId}-title`} className="font-serif font-bold text-lg text-[#4A4A4A]">
                  {open === 'checkin' && 'Check-ins hoje'}
                  {open === 'checkout' && 'Check-outs hoje'}
                  {open === 'staying' && 'Hóspedes a ficar hoje'}
                  {open === 'messages' && 'Mensagens'}
                </h2>
                {open === 'checkin' && (
                  <p className="text-sm text-[#888] mt-0.5">
                    {checkIns.length === 0
                      ? 'Ninguém com chegada prevista hoje.'
                      : `${checkIns.length} chegada${checkIns.length > 1 ? 's' : ''} prevista${
                          checkIns.length > 1 ? 's' : ''
                        } para hoje.`}
                  </p>
                )}
                {open === 'checkout' && (
                  <p className="text-sm text-[#888] mt-0.5">
                    {checkOuts.length === 0
                      ? 'Ninguém com partida hoje.'
                      : `${checkOuts.length} partida${checkOuts.length > 1 ? 's' : ''} hoje.`}
                  </p>
                )}
                {open === 'staying' && (
                  <p className="text-sm text-[#888] mt-0.5">
                    {staying.length === 0
                      ? 'Nenhum hóspede a ocupar a casa entre a noite passada e a próxima.'
                      : `${staying.length} hóspede${staying.length > 1 ? 's' : ''} a ficar em casa hoje (check-in feito, check-out a seguir).`}
                  </p>
                )}
                {open === 'messages' && (
                  <p className="text-sm text-[#888] mt-0.5">
                    {unreadCount === 0
                      ? 'Nenhuma mensagem por ler.'
                      : `${unreadCount} conversa${unreadCount > 1 ? 's' : ''} com mensagem nova do hóspede.`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {open === 'checkin' && (
                <ReservationListModal
                  list={checkIns}
                  empty="Ninguém com check-in agendado para hoje."
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'checkout' && (
                <ReservationListModal
                  list={checkOuts}
                  empty="Ninguém com check-out hoje."
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'staying' && (
                <ReservationListModal
                  list={staying}
                  empty="Nenhum hóspede a ficar neste momento (entre check-in e check-out)."
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'messages' && (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-[#666]">Responde no separador de mensagens.</p>
                  <Link
                    href="/dashboard/messages"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 w-full min-h-11 rounded-xl bg-[#DAA520] hover:bg-[#B8860B] text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                  >
                    Abrir mensagens
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dossie && (
        <GuestPanel
          key={`${dossie.guestId}-${dossie.reservationId}`}
          guestId={dossie.guestId}
          guestName={dossie.guestName}
          reservationId={dossie.reservationId}
          onClose={() => setDossie(null)}
        />
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`min-h-[5.5rem] rounded-2xl border border-[#E0DBCF] border-b-4 bg-white p-4 shadow-sm sm:min-h-0 sm:p-5 ${accent} ${
        highlight ? 'ring-1 ring-red-300' : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3">
        <span className="shrink-0 pt-0.5">{icon}</span>
        <span className="text-2xl font-bold tabular-nums text-[#4A4A4A] sm:text-3xl">{value}</span>
      </div>
      <p className="text-[11px] font-medium leading-snug text-[#888] sm:text-xs">{label}</p>
    </div>
  );
}

function ReservationListModal({
  list,
  empty,
  onOpenDossie,
}: {
  list: Reservation[];
  empty: string;
  onOpenDossie: (r: Reservation) => void;
}) {
  if (list.length === 0) {
    return <p className="py-6 text-center text-sm text-[#888]">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {list.map((r) => {
        const guest = r.guest as { id?: string; name?: string } | null;
        const name = guest?.name ?? 'Hóspede sem nome';
        const canOpen = Boolean(r.guest_id);
        return (
          <li key={r.id}>
            {canOpen ? (
              <button
                type="button"
                onClick={() => onOpenDossie(r)}
                className="group flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-xl border border-[#E0DBCF] bg-[#FFFCF6] px-4 py-3 text-left transition-colors hover:border-[#DAA520]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label={`Abrir dossié da reserva: ${r.room}, ${name}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A] underline-offset-2 group-hover:underline">
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {r.room} · {formatDatePT(stripTZ(r.check_in))} → {formatDatePT(stripTZ(r.check_out))}
                    <span className="text-[#DAA520]"> · Dossié</span>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                  }`}
                >
                  <ChannelIcon channel={r.channel} size={10} />
                  {CHANNEL_LABEL[r.channel] ?? r.channel}
                </span>
              </button>
            ) : (
              <div
                className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-[#E0DBCF] border-dashed bg-[#F8F8F8] px-4 py-3 opacity-90"
                title="Reserva sem ficha de hóspede. Edita na agenda de reservas."
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A]">{name}</p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {r.room} · {formatDatePT(stripTZ(r.check_in))} → {formatDatePT(stripTZ(r.check_out))}
                    {' · '}
                    <span className="text-[#999]">Sem hóspede</span>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                  }`}
                >
                  <ChannelIcon channel={r.channel} size={10} />
                  {CHANNEL_LABEL[r.channel] ?? r.channel}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
