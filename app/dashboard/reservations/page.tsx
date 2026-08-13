'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IS_DEMO, MOCK_GUESTS, MOCK_RESERVATIONS } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  FileText,
  Copy,
  Printer,
} from 'lucide-react';
import { ChannelIcon } from '../components/channel-icon';
import { GuestPanel } from '../components/guest-panel';
import type { Reservation, Guest, Channel, ReservationStatus } from '@/lib/types';
import { useSettings } from '@/lib/hooks/use-settings';
import { ROOMS } from '@/lib/config/rooms';

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

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  checked_in: 'Check-in feito',
  checked_out: 'Check-out feito',
};


function stripTZ(d: string) { return d?.split('T')[0] ?? d; }

function formatDatePT(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatDayLong(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function nights(checkIn: string, checkOut: string) {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

function buildReservationSummaryText(r: Reservation, propertyName: string) {
  const g = r.guest as Guest | null;
  const n = nights(stripTZ(r.check_in), stripTZ(r.check_out));
  const lines = [
    `${propertyName} — resumo informativo (interno)`,
    '',
    `Hóspede: ${g?.name ?? '—'}`,
    g?.email ? `E-mail: ${g.email}` : null,
    g?.phone ? `Telefone: ${g.phone}` : null,
    `Quarto: ${r.room}`,
    `Check-in: ${formatDatePT(stripTZ(r.check_in))}  |  Check-out: ${formatDatePT(stripTZ(r.check_out))}  |  Noites: ${n}`,
    `Canal: ${CHANNEL_LABEL[r.channel] ?? r.channel}${
      r.external_id != null && String(r.external_id) !== '' ? `  (ref. ${r.external_id})` : ''
    }`,
    `Estado: ${STATUS_LABEL[r.status] ?? r.status}`,
    r.total_eur != null
      ? `Total indicativo: €${Number(r.total_eur).toFixed(2)} (preços por canal: ver extrato OTA; directo: validar IVA) `
      : 'Total: não preenchido',
    '',
    `ID reserva: ${r.id}`,
    '—',
    'Este resumo destina-se a ficheiro interno, cópia para fatura de serviço ou e-mail. Não constitui documento fiscal emitido pelo PMS se não estiver a usar software certificado.',
  ];
  return lines.filter((x) => x != null).join('\n');
}

type ReservationFormState = {
  guest_name: string;
  guest_email: string;
  room: string;
  check_in: string;
  check_out: string;
  channel: Channel;
  status: ReservationStatus;
  total_eur: string;
};

const EMPTY_FORM: ReservationFormState = {
  guest_name: '',
  guest_email: '',
  room: '',
  check_in: '',
  check_out: '',
  channel: 'direct',
  status: 'confirmed',
  total_eur: '',
};

export default function ReservationsPage() {
  const supabase = IS_DEMO ? null : createClient();
  const settings = useSettings();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [form, setForm] = useState<ReservationFormState>(() => ({
    ...EMPTY_FORM,
    room: ROOMS[0],
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [panelGuestId, setPanelGuestId] = useState<string | null>(null);
  const [panelGuestName, setPanelGuestName] = useState<string | undefined>(undefined);
  const [panelReservationId, setPanelReservationId] = useState<string | null>(null);
  const [summaryFor, setSummaryFor] = useState<Reservation | null>(null);
  const [listTab, setListTab] = useState<'upcoming' | 'history'>('upcoming');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function showNotice(type: 'success' | 'error', text: string) {
    setNotice({ type, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }

  const fetchReservations = useCallback(async () => {
    if (IS_DEMO) {
      setReservations(MOCK_RESERVATIONS as unknown as Reservation[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase!
      .from('reservations')
      .select('*, guest:guests(*)')
      .order('check_in', { ascending: true });
    if (error) showNotice('error', 'Erro ao carregar reservas.');
    setReservations(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  useEffect(() => {
    if (!selectedDay) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedDay(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedDay]);

  useEffect(() => {
    if (!summaryFor) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSummaryFor(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [summaryFor]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  function openGuestPanel(r: Reservation) {
    const g = r.guest as Guest | null;
    setPanelGuestId(r.guest_id);
    setPanelGuestName(g?.name);
    setPanelReservationId(r.id);
  }

  /** Dossiê do hóspede: painel se existir guest_id; senão ficha de reserva (editar). */
  function openGuestFileOrEdit(r: Reservation) {
    if (r.guest_id) {
      openGuestPanel(r);
    } else {
      setSelectedDay(null);
      openEdit(r);
    }
  }

  async function handleSync() {
    if (IS_DEMO) { alert('Modo demo: sincronização iCal desativada.'); return; }
    setSyncing(true);
    await fetch('/api/sync-ical', { method: 'POST' });
    await fetchReservations();
    setSyncing(false);
  }

  function openAdd(prefillDate?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, room: settings.room_names[0] ?? ROOMS[0], check_in: prefillDate ?? todayStr });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(r: Reservation) {
    const g = r.guest as Guest | null;
    setEditing(r);
    setForm({
      guest_name: g?.name ?? '',
      guest_email: g?.email ?? '',
      room: r.room,
      check_in: stripTZ(r.check_in),
      check_out: stripTZ(r.check_out),
      channel: r.channel,
      status: r.status,
      total_eur: r.total_eur != null ? String(r.total_eur) : '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.check_in || !form.check_out || !form.guest_name) {
      setFormError('Nome do hóspede, check-in e check-out são obrigatórios.');
      return;
    }
    if (form.check_in >= form.check_out) {
      setFormError('Check-out tem de ser depois do check-in.');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      if (IS_DEMO) {
        const guestId =
          editing?.guest_id ?? `g-demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const reservationId =
          editing?.id ?? `r-demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const nowIso = new Date().toISOString();
        const email = form.guest_email.trim() || null;

        let demoGuest: Guest;
        if (editing?.guest_id) {
          const gi = MOCK_GUESTS.findIndex((g) => g.id === editing.guest_id);
          if (gi >= 0) {
            demoGuest = { ...MOCK_GUESTS[gi], name: form.guest_name, email };
            MOCK_GUESTS[gi] = demoGuest;
          } else {
            demoGuest = {
              id: guestId,
              name: form.guest_name,
              email,
              phone: null,
              nationality: null,
              notes: '',
              created_at: nowIso,
            };
            MOCK_GUESTS.push(demoGuest);
          }
        } else {
          demoGuest = {
            id: guestId,
            name: form.guest_name,
            email,
            phone: null,
            nationality: null,
            notes: '',
            created_at: nowIso,
          };
          MOCK_GUESTS.push(demoGuest);
        }

        const demoRes: Reservation = {
          id: reservationId,
          guest_id: guestId,
          room: form.room,
          check_in: form.check_in,
          check_out: form.check_out,
          channel: form.channel,
          status: form.status,
          total_eur: form.total_eur ? parseFloat(form.total_eur) : null,
          external_id: null,
          internal_notes: (editing?.internal_notes as string | null | undefined) ?? null,
          created_at: nowIso,
          guest: demoGuest,
        };

        const ri = MOCK_RESERVATIONS.findIndex((r) => r.id === reservationId);
        if (ri >= 0) {
          MOCK_RESERVATIONS[ri] = demoRes;
        } else {
          MOCK_RESERVATIONS.push(demoRes);
        }

        await fetchReservations();
        setModalOpen(false);
        setSaving(false);
        showNotice('success', editing ? 'Reserva atualizada.' : 'Reserva criada.');
        return;
      }

      let guestId: string | null = null;
      if (form.guest_name) {
        if (editing?.guest_id) {
          const { error: updErr } = await supabase!
            .from('guests')
            .update({ name: form.guest_name, email: form.guest_email.trim() || null })
            .eq('id', editing.guest_id);
          if (updErr) throw new Error(updErr.message);
          guestId = editing.guest_id;
        } else {
          const { data: g, error: guestErr } = await supabase!
            .from('guests')
            .insert({ name: form.guest_name, email: form.guest_email.trim() || null })
            .select('id')
            .single();
          if (guestErr) throw new Error(guestErr.message);
          guestId = (g as { id: string } | null)?.id ?? null;
        }
      }

      const payload = {
        guest_id: guestId,
        room: form.room,
        check_in: form.check_in,
        check_out: form.check_out,
        channel: form.channel,
        status: form.status,
        total_eur: form.total_eur ? parseFloat(form.total_eur) : null,
      };

      if (editing) {
        const { error } = await supabase!.from('reservations').update(payload).eq('id', editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase!.from('reservations').insert(payload);
        if (error) throw new Error(error.message);
      }

      await fetchReservations();
      setModalOpen(false);
      setSaving(false);
      showNotice('success', editing ? 'Reserva atualizada.' : 'Reserva criada.');
    } catch (e) {
      setSaving(false);
      const msg = e instanceof Error ? e.message : 'Não foi possível guardar a reserva.';
      setFormError(msg);
      showNotice('error', msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta reserva?')) return;
    try {
      if (IS_DEMO) {
        const idx = MOCK_RESERVATIONS.findIndex((r) => r.id === id);
        if (idx >= 0) MOCK_RESERVATIONS.splice(idx, 1);
        setReservations((prev) => prev.filter((r) => r.id !== id));
        showNotice('success', 'Reserva eliminada.');
        return;
      }
      const { error } = await supabase!.from('reservations').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await fetchReservations();
      showNotice('success', 'Reserva eliminada.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível eliminar a reserva.';
      showNotice('error', msg);
    }
  }

  // Calendar — week starts Monday (Mon=0 … Sun=6)
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  const firstDOW = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const calCells = Array.from({ length: Math.ceil((firstDOW + daysInMonth) / 7) * 7 }, (_, i) => {
    const dayN = i - firstDOW + 1;
    if (dayN < 1 || dayN > daysInMonth) return null;
    return new Date(viewYear, viewMonth, dayN).toISOString().split('T')[0];
  });

  function reservationsOnDay(day: string) {
    return reservations.filter(
      (r) => r.status !== 'cancelled' && stripTZ(r.check_in) <= day && stripTZ(r.check_out) > day
    );
  }
  function hasCheckIn(day: string) {
    return reservations.some((r) => r.status !== 'cancelled' && stripTZ(r.check_in) === day);
  }
  function hasCheckOut(day: string) {
    return reservations.some((r) => r.status !== 'cancelled' && stripTZ(r.check_out) === day);
  }

  // Occupancy today (for header indicator)
  const todayOccupiedRooms = new Set(
    reservations
      .filter((r) => r.status !== 'cancelled' && stripTZ(r.check_in) <= todayStr && stripTZ(r.check_out) > todayStr)
      .map((r) => r.room)
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function goToday() { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }

  const upcoming = reservations.filter(
    (r) => r.status !== 'cancelled' && stripTZ(r.check_in) >= todayStr
  );

  const pastReservations = useMemo(() => {
    return reservations
      .filter((r) => {
        const co = stripTZ(r.check_out);
        const ci = stripTZ(r.check_in);
        if (r.status === 'cancelled' && ci < todayStr) return true;
        return co < todayStr;
      })
      .sort(
        (a, b) =>
          stripTZ(b.check_out).localeCompare(stripTZ(a.check_out)) ||
          stripTZ(b.check_in).localeCompare(stripTZ(a.check_in))
      );
  }, [reservations, todayStr]);

  const selectedDayRes = selectedDay ? reservationsOnDay(selectedDay) : [];

  return (
    <div className="p-6 lg:p-8 space-y-8 pb-16">
      {notice && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">Reservas</h1>
          <p className="text-sm text-[#888] mt-1">
            Calendario operacional (custom calendar ou integracao Google Calendar) + lista de reservas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E0DBCF] text-sm text-[#666] hover:bg-[#F0EDE6] transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} aria-hidden />
            {syncing ? 'A sincronizar…' : 'Sincronizar iCal'}
          </button>
          <button
            type="button"
            onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
          >
            <Plus size={15} aria-hidden />
            Nova reserva
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-[#E0DBCF] shadow-sm overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0DBCF]">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-[#F0EDE6] text-[#666] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif font-bold text-[#4A4A4A] capitalize">{monthLabel}</h2>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
                className="text-xs px-2 py-0.5 rounded-full border border-[#E0DBCF] text-[#888] hover:bg-[#F0EDE6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
              >
                Hoje
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-[#F0EDE6] text-[#666] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>

        {/* Occupancy indicator + legend — current month only */}
        {isCurrentMonth && (
          <div className="px-5 py-2 border-b border-[#F0EDE6] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[#888]">
            <span>
              Hoje: <span className="font-semibold text-[#4A4A4A]">{todayOccupiedRooms.size}/{settings.room_count}</span> quartos ocupados
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#708238] shrink-0" aria-hidden />
                check-in
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#BC6C25] shrink-0" aria-hidden />
                check-out
              </span>
            </span>
          </div>
        )}

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 text-center">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="py-2 text-xs font-semibold text-[#888]">{d}</div>
          ))}

          {/* Calendar cells */}
          {calCells.map((day, i) => {
            if (!day) return <div key={i} className="border-t border-[#F0EDE6] min-h-[96px]" />;
            const dayRes = reservationsOnDay(day);
            const isToday = day === todayStr;
            const checkIn = hasCheckIn(day);
            const checkOut = hasCheckOut(day);
            return (
              <div
                key={day}
                className="border-t border-[#F0EDE6] py-2 px-1 min-h-[96px] relative text-left w-full"
              >
                <button
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="w-full text-left rounded-lg py-0.5 px-0.5 -mx-0.5 hover:bg-[#FAFAF8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#DAA520]"
                >
                  <div className="flex items-start justify-between gap-1 pr-0.5">
                    <span
                      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-[#DAA520] text-white' : 'text-[#4A4A4A]'
                      }`}
                    >
                      {new Date(day + 'T00:00:00').getDate()}
                    </span>
                    {(checkIn || checkOut) && (
                      <span className="flex flex-col gap-0.5 pt-0.5 shrink-0" aria-hidden>
                        {checkIn && <span className="w-1.5 h-1.5 rounded-full bg-[#708238]" title="Check-in" />}
                        {checkOut && <span className="w-1.5 h-1.5 rounded-full bg-[#BC6C25]" title="Check-out" />}
                      </span>
                    )}
                  </div>
                </button>

                {dayRes.length > 0 && (
                  <div className="mt-0.5 space-y-0.5 pr-0.5">
                    {dayRes.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGuestFileOrEdit(r);
                        }}
                        className={`w-full text-left text-[10px] px-1 rounded flex items-center gap-0.5 ${
                          CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                        } hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A] focus-visible:ring-offset-1 truncate`}
                        title="Abrir dossiê do hóspede"
                      >
                        <ChannelIcon channel={r.channel} size={8} className="shrink-0 opacity-90" />
                        <span className="truncate">
                          {(r.guest as { name?: string } | null)?.name?.split(' ')[0] ?? r.room}
                        </span>
                      </button>
                    ))}
                    {dayRes.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="w-full text-left text-[10px] text-[#888] pl-1 hover:underline"
                      >
                        +{dayRes.length - 3} mais
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDay(null); }}
        >
          <div
            className="flex max-h-[80dvh] w-full max-w-md cursor-default flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-[#E0DBCF]">
              <div>
                <h2 className="font-serif font-bold text-[#4A4A4A] capitalize">{formatDayLong(selectedDay)}</h2>
                <p className="text-xs text-[#888] mt-0.5">
                  {selectedDayRes.length === 0
                    ? 'Sem reservas'
                    : `${selectedDayRes.length} reserva${selectedDayRes.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setSelectedDay(null); openAdd(selectedDay); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] text-white text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                >
                  <Plus size={12} aria-hidden />
                  Nova reserva
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                  aria-label="Fechar"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {selectedDayRes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays size={32} className="text-[#D0C9BC] mb-2" aria-hidden />
                  <p className="text-sm text-[#888]">Nenhuma reserva neste dia.</p>
                  <button
                    type="button"
                    onClick={() => { setSelectedDay(null); openAdd(selectedDay); }}
                    className="mt-3 text-sm text-[#DAA520] hover:underline font-medium"
                  >
                    + Criar reserva para este dia
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayRes.map((r) => {
                    const g = r.guest as Guest | null;
                    return (
                      <div
                        key={r.id}
                        tabIndex={0}
                        onClick={() => openGuestFileOrEdit(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openGuestFileOrEdit(r);
                          }
                        }}
                        className="bg-[#FAFAF8] rounded-xl border border-[#E0DBCF] p-3 flex items-start justify-between gap-3 cursor-pointer text-left transition-colors hover:border-[#DAA520]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                        aria-label={`Abrir dossiê de ${(r.guest as Guest | null)?.name ?? 'hóspede'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm text-[#4A4A4A]">
                              {g?.name ?? (r.guest_id ? '—' : 'Sem ficha de hóspede (editar)')}
                            </span>
                            <span
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                              }`}
                            >
                              <ChannelIcon channel={r.channel} size={10} />
                              {CHANNEL_LABEL[r.channel] ?? r.channel}
                            </span>
                          </div>
                          <p className="text-xs text-[#888]">{r.room}</p>
                          <p className="text-xs text-[#888]">
                            {formatDatePT(stripTZ(r.check_in))} → {formatDatePT(stripTZ(r.check_out))}
                            {' · '}{nights(stripTZ(r.check_in), stripTZ(r.check_out))} noites
                            {r.total_eur != null ? ` · €${Number(r.total_eur).toFixed(0)}` : ''}
                          </p>
                          <p className="text-xs text-[#888] mt-0.5">{STATUS_LABEL[r.status] ?? r.status}</p>
                        </div>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => { setSelectedDay(null); openEdit(r); }}
                            className="p-1.5 rounded-lg text-[#888] hover:bg-white hover:text-[#4A4A4A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                            aria-label="Editar reserva"
                          >
                            <Pencil size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg text-[#888] hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Próximas + histórico — abas no mesmo painel */}
      <section
        className="rounded-2xl border border-[#E0DBCF] bg-white shadow-sm overflow-hidden"
        aria-label="Listas de reservas"
      >
        <div className="border-b border-[#E0DBCF] bg-[#FDFCF9] px-1 pt-1 sm:px-2 sm:pt-1.5">
          <h2 className="sr-only">Reservas em lista</h2>
          <div
            role="tablist"
            aria-label="Próximas reservas ou histórico"
            className="flex gap-0.5 p-0.5 rounded-xl bg-[#E8E4DA]/50"
          >
            <button
              type="button"
              id="reservations-tab-upcoming"
              role="tab"
              aria-selected={listTab === 'upcoming'}
              aria-controls="reservations-panel-upcoming"
              onClick={() => setListTab('upcoming')}
              className={`min-h-[2.75rem] flex-1 sm:flex-initial sm:px-5 rounded-lg px-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] ${
                listTab === 'upcoming'
                  ? 'bg-white text-[#4A4A4A] shadow-sm ring-1 ring-[#E0DBCF]/80'
                  : 'text-[#888] hover:text-[#4A4A4A] hover:bg-white/60'
              }`}
            >
              Próximas
              <span
                className="ml-1.5 tabular-nums text-xs font-bold opacity-80"
                aria-hidden
              >({upcoming.length})</span>
            </button>
            <button
              type="button"
              id="reservations-tab-history"
              role="tab"
              aria-selected={listTab === 'history'}
              aria-controls="reservations-panel-history"
              onClick={() => setListTab('history')}
              className={`min-h-[2.75rem] flex-1 sm:flex-initial sm:px-5 rounded-lg px-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] ${
                listTab === 'history'
                  ? 'bg-white text-[#4A4A4A] shadow-sm ring-1 ring-[#E0DBCF]/80'
                  : 'text-[#888] hover:text-[#4A4A4A] hover:bg-white/60'
              }`}
            >
              Histórico
              <span
                className="ml-1.5 tabular-nums text-xs font-bold opacity-80"
                aria-hidden
              >({pastReservations.length})</span>
            </button>
          </div>
        </div>

        {listTab === 'upcoming' && (
          <div
            id="reservations-panel-upcoming"
            role="tabpanel"
            aria-labelledby="reservations-tab-upcoming"
            className="p-3 sm:p-4"
          >
            {loading ? (
              <p className="text-sm text-[#888]">A carregar…</p>
            ) : (
              <div className="max-h-[min(28rem,50vh)] overflow-y-auto -mx-0.5 px-0.5">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-[#888] py-4 text-center sm:text-left">Nenhuma reserva futura.</p>
                ) : (
                  <div className="space-y-2 pr-0.5">
                    {upcoming.map((r) => {
                      const g = r.guest as Guest | null;
                      return (
                        <div
                          key={r.id}
                          tabIndex={0}
                          onClick={() => openGuestFileOrEdit(r)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openGuestFileOrEdit(r);
                            }
                          }}
                          className="bg-white rounded-xl border border-[#E0DBCF] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer text-left transition-colors hover:border-[#DAA520]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                          aria-label={`Abrir dossiê de ${(g as Guest | null)?.name ?? 'hóspede'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-[#4A4A4A]">
                                {g?.name ?? (r.guest_id ? '—' : 'Sem ficha de hóspede')}
                              </span>
                              <span
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                  CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                                }`}
                              >
                                <ChannelIcon channel={r.channel} size={10} />
                                {CHANNEL_LABEL[r.channel] ?? r.channel}
                              </span>
                            </div>
                            <p className="text-xs text-[#888] mt-0.5">
                              {r.room} · {formatDatePT(stripTZ(r.check_in))} → {formatDatePT(stripTZ(r.check_out))} ·{' '}
                              {nights(stripTZ(r.check_in), stripTZ(r.check_out))} noites
                              {r.total_eur != null ? ` · €${Number(r.total_eur).toFixed(0)}` : ''}
                            </p>
                            <p className="text-xs mt-0.5 text-[#888]">{STATUS_LABEL[r.status] ?? r.status}</p>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] hover:text-[#4A4A4A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                              aria-label="Editar"
                            >
                              <Pencil size={15} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-lg text-[#888] hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={15} aria-hidden />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {listTab === 'history' && (
          <div
            id="reservations-panel-history"
            role="tabpanel"
            aria-labelledby="reservations-tab-history"
            className="p-3 sm:p-4"
          >
            <p className="text-xs text-[#999] mb-3 max-w-2xl">
              Estadias terminadas ou reservas canceladas no passado. Linha: dossié.{' '}
              <span className="whitespace-nowrap">«Fatura / resumo»</span> para copiar textos informativos; não dispensa
              fatura no software certificado, se aplicável.
            </p>
            {loading ? (
              <p className="text-sm text-[#888]">A carregar…</p>
            ) : pastReservations.length === 0 ? (
              <p className="text-sm text-[#888]">Ainda sem estadias concluídas no histórico.</p>
            ) : (
              <div className="max-h-[min(28rem,50vh)] overflow-y-auto pr-0.5 rounded-lg border border-[#E0DBCF]/80 bg-[#FDFCF9] p-1.5 -mx-0.5 sm:mx-0">
                <div className="space-y-1.5 pr-0.5">
                  {pastReservations.map((r) => {
                    const g = r.guest as Guest | null;
                    const cancelled = r.status === 'cancelled';
                    return (
                      <div
                        key={r.id}
                        className={`rounded-lg border border-[#E8E4DA] bg-white px-3 py-2.5 sm:px-4 sm:py-3 ${
                          cancelled ? 'opacity-80' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
                          <button
                            type="button"
                            onClick={() => openGuestFileOrEdit(r)}
                            className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded-lg -m-0.5 p-0.5 border-0 bg-transparent w-full"
                            aria-label={`Abrir dossié de ${g?.name ?? 'hóspede'}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-medium text-sm ${cancelled ? 'line-through text-[#888]' : 'text-[#4A4A4A]'}`}
                              >
                                {g?.name ?? '—'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                  CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'
                                }`}
                              >
                                <ChannelIcon channel={r.channel} size={10} />
                                {CHANNEL_LABEL[r.channel] ?? r.channel}
                              </span>
                              {cancelled && (
                                <span className="text-[10px] font-semibold uppercase text-red-600/90">Cancelada</span>
                              )}
                            </div>
                            <p className="text-xs text-[#888] mt-0.5">
                              {r.room} · {formatDatePT(stripTZ(r.check_in))} — {formatDatePT(stripTZ(r.check_out))} ·{' '}
                              {nights(stripTZ(r.check_in), stripTZ(r.check_out))} noites
                            </p>
                            <p className="text-xs text-[#4A4A4A] mt-0.5">
                              {r.total_eur != null ? `€${Number(r.total_eur).toFixed(0)}` : 'Total não registado'}
                              {r.external_id != null && String(r.external_id) !== '' && (
                                <span className="text-[#888]"> · ref. {r.external_id}</span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#AAA] mt-0.5">{STATUS_LABEL[r.status] ?? r.status}</p>
                          </button>
                          <div
                            className="flex items-center justify-end gap-1 shrink-0 -mr-0.5"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSummaryFor(r)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DBCF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4A4A4A] hover:bg-[#FFFCF6] hover:border-[#DAA520]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                              title="Fatura, resumo e detalhes para copiar"
                            >
                              <FileText size={14} aria-hidden />
                              <span className="hidden sm:inline">Fatura / resumo</span>
                              <span className="sm:hidden">Resumo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                              aria-label="Editar reserva"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-lg text-[#888] hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              aria-label="Eliminar reserva do histórico"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-md cursor-default overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#E0DBCF]">
              <h2 className="font-serif font-bold text-[#4A4A4A]">
                {editing ? 'Editar reserva' : 'Nova reserva'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Nome do hóspede *">
                <input type="text" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className={INPUT} placeholder="Maria Silva" />
              </Field>
              <Field label="Email do hóspede">
                <input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className={INPUT} placeholder="maria@exemplo.pt" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in *">
                  <input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} className={INPUT} />
                </Field>
                <Field label="Check-out *">
                  <input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} className={INPUT} />
                </Field>
              </div>
              <Field label="Quarto">
                <select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={INPUT}>
                  {settings.room_names.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Canal">
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })} className={INPUT}>
                    <option value="direct">Direto</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking.com</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })} className={INPUT}>
                    <option value="confirmed">Confirmada</option>
                    <option value="pending">Pendente</option>
                    <option value="checked_in">Check-in feito</option>
                    <option value="checked_out">Check-out feito</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </Field>
              </div>
              <Field label="Total (€)">
                <input type="number" min="0" step="0.01" value={form.total_eur} onChange={(e) => setForm({ ...form, total_eur: e.target.value })} className={INPUT} placeholder="150.00" />
              </Field>
              {formError && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
              >
                {saving ? 'A guardar…' : editing ? 'Guardar alterações' : 'Criar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fatura / resumo — texto para cópia ou impressão */}
      {summaryFor && (
        <div
          className="fixed inset-0 z-[60] flex cursor-pointer items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setSummaryFor(null)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-lg cursor-default flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E0DBCF]">
              <h2 className="font-serif font-bold text-[#4A4A4A] pr-2">Fatura / resumo informativo</h2>
              <button
                type="button"
                onClick={() => setSummaryFor(null)}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
              <pre className="text-xs sm:text-sm text-[#4A4A4A] whitespace-pre-wrap break-words bg-[#FAFAF8] border border-[#E8E4DA] rounded-lg p-3 max-h-[min(22rem,45dvh)] overflow-y-auto">
                {buildReservationSummaryText(summaryFor, settings.property_name)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(buildReservationSummaryText(summaryFor, settings.property_name));
                      showNotice('success', 'Texto copiado para a área de transferência.');
                    } catch {
                      showNotice('error', 'Não foi possível copiar.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DBCF] bg-white px-3 py-2 text-sm font-medium text-[#4A4A4A] hover:bg-[#FFFCF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                >
                  <Copy size={16} aria-hidden />
                  Copiar texto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = buildReservationSummaryText(summaryFor, settings.property_name);
                    const w = window.open('', '_blank');
                    if (!w) {
                      showNotice('error', 'Permite janela emergente para imprimir, ou usa Copiar.');
                      return;
                    }
                    w.document.write(
                      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumo reserva</title><style>body{font-family:system-ui,sans-serif;padding:1.25rem;max-width:40rem;margin:0 auto;}</style></head><body><pre style="white-space:pre-wrap;word-wrap:break-word;margin:0;">` +
                        t
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;') +
                        `</pre></body></html>`
                    );
                    w.document.close();
                    w.focus();
                    w.print();
                    w.addEventListener('afterprint', () => w.close());
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DBCF] bg-white px-3 py-2 text-sm font-medium text-[#4A4A4A] hover:bg-[#FFFCF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                >
                  <Printer size={16} aria-hidden />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const r = summaryFor;
                    setSummaryFor(null);
                    if (r) openGuestFileOrEdit(r);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#708238] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                >
                  Dossiê hóspede
                </button>
              </div>
              <p className="text-[10px] text-[#999]">
                IVA e números de fatura: conforme a tua contabilidade e, para OTAs, os extratos da plataforma
                (Airbnb, Booking, etc.). Este ecrã é apoio administrativo, não gera fatura certificada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Guest detail slide-over */}
      {panelGuestId && (
        <GuestPanel
          guestId={panelGuestId}
          guestName={panelGuestName}
          reservationId={panelReservationId ?? undefined}
          onClose={() => {
            setPanelGuestId(null);
            setPanelGuestName(undefined);
            setPanelReservationId(null);
          }}
        />
      )}
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#666] mb-1">{label}</label>
      {children}
    </div>
  );
}
