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
import { formatDate, stripTZ } from '@/lib/dashboard-date-helpers';
import { useLocale, tChannel, displayRoomLabel } from '@/lib/i18n';

type ModalId = 'checkin' | 'checkout' | 'staying' | 'messages' | null;

const CHANNEL_COLOR: Record<string, string> = {
  airbnb: 'bg-dash-airbnb text-white',
  booking: 'bg-[#003580] text-white',
  direct: 'bg-dash-olive text-white',
};

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
  const { t } = useLocale();
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
          onClick={() => setOpen('checkin')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label={t('today.checkins')}
            value={checkIns.length}
            icon={<CalendarCheck size={20} className="text-dash-olive" aria-hidden />}
            accent="border-dash-olive"
          />
          <span className="sr-only">{t('today.openList')}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen('checkout')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label={t('today.checkouts')}
            value={checkOuts.length}
            icon={<CalendarX size={20} className="text-dash-checkout" aria-hidden />}
            accent="border-dash-checkout"
          />
          <span className="sr-only">{t('today.openList')}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen('staying')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label={t('today.staying')}
            value={staying.length}
            icon={<BedDouble size={20} className="text-dash-accent" aria-hidden />}
            accent="border-[#DAA520]"
          />
          <span className="sr-only">{t('today.openList')}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen('messages')}
          className="text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-2xl"
        >
          <StatCard
            label={t('today.newMessages')}
            value={unreadCount}
            icon={<MessageSquare size={20} className="text-[#4A4A4A]" aria-hidden />}
            accent={unreadCount > 0 ? 'border-red-700' : 'border-[#4A4A4A]'}
            highlight={unreadCount > 0}
          />
          <span className="sr-only">{t('today.openOptions')}</span>
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
                  {open === 'checkin' && t('today.checkins')}
                  {open === 'checkout' && t('today.checkouts')}
                  {open === 'staying' && t('today.stayingTitle')}
                  {open === 'messages' && t('nav.messages')}
                </h2>
                {open === 'checkin' && (
                  <p className="text-sm text-[#666] mt-0.5">
                    {checkIns.length === 0
                      ? t('today.noCheckins')
                      : t('today.someCheckins', { n: checkIns.length })}
                  </p>
                )}
                {open === 'checkout' && (
                  <p className="text-sm text-[#666] mt-0.5">
                    {checkOuts.length === 0
                      ? t('today.noCheckouts')
                      : t('today.someCheckouts', { n: checkOuts.length })}
                  </p>
                )}
                {open === 'staying' && (
                  <p className="text-sm text-[#666] mt-0.5">
                    {staying.length === 0
                      ? t('today.noStaying')
                      : t('today.someStaying', { n: staying.length })}
                  </p>
                )}
                {open === 'messages' && (
                  <p className="text-sm text-[#666] mt-0.5">
                    {unreadCount === 0
                      ? t('today.noUnread')
                      : t('today.someUnread', { n: unreadCount })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-dash-muted hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label={t('common.close')}
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {open === 'checkin' && (
                <ReservationListModal
                  list={checkIns}
                  empty={t('today.emptyCheckinList')}
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'checkout' && (
                <ReservationListModal
                  list={checkOuts}
                  empty={t('today.emptyCheckoutList')}
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'staying' && (
                <ReservationListModal
                  list={staying}
                  empty={t('today.emptyStayingList')}
                  onOpenDossie={openDossieForReservation}
                />
              )}
              {open === 'messages' && (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-[#666]">{t('today.replyInMessages')}</p>
                  <Link
                    href="/dashboard/messages"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 w-full min-h-11 rounded-xl bg-[#DAA520] hover:bg-[#B8860B] text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                  >
                    {t('today.goToInbox')}
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
      <p className="text-[11px] font-medium leading-snug text-dash-muted sm:text-xs">{label}</p>
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
  const { locale, t } = useLocale();
  if (list.length === 0) {
    return <p className="py-6 text-center text-sm text-dash-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {list.map((r) => {
        const guest = r.guest as { id?: string; name?: string } | null;
        const name = guest?.name ?? t('common.unnamedGuest');
        const canOpen = Boolean(r.guest_id);
        const dates = `${displayRoomLabel(r.room, t)} · ${formatDate(stripTZ(r.check_in), locale)} → ${formatDate(stripTZ(r.check_out), locale)}`;
        return (
          <li key={r.id}>
            {canOpen ? (
              <button
                type="button"
                onClick={() => onOpenDossie(r)}
                className="group flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-xl border border-[#E0DBCF] bg-[#FFFCF6] px-4 py-3 text-left transition-colors hover:border-[#DAA520]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A] underline-offset-2 group-hover:underline">
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-dash-muted">
                    {dates}
                    <span className="text-dash-accent"> · {t('today.dossier')}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    CHANNEL_COLOR[r.channel] ?? 'bg-dash-muted text-white'
                  }`}
                >
                  <ChannelIcon channel={r.channel} size={10} />
                  {tChannel(t, r.channel)}
                </span>
              </button>
            ) : (
              <div
                className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-[#E0DBCF] border-dashed bg-[#F8F8F8] px-4 py-3 opacity-90"
                title={t('today.noGuestFile')}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#4A4A4A]">{name}</p>
                  <p className="mt-0.5 text-xs text-dash-muted">
                    {dates}
                    {' · '}
                    <span className="text-[#999]">{t('common.noGuest')}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    CHANNEL_COLOR[r.channel] ?? 'bg-dash-muted text-white'
                  }`}
                >
                  <ChannelIcon channel={r.channel} size={10} />
                  {tChannel(t, r.channel)}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
