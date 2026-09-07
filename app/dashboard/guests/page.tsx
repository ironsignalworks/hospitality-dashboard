'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IS_DEMO } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import {
  Search,
  X,
  ChevronRight,
  Mail,
  User,
  Send,
  Loader2,
  Plus,
  Bell,
} from 'lucide-react';
import type { Guest, GuestAlert, Reservation } from '@/lib/types';
import { useLocale, tChannel, displayRoomLabel } from '@/lib/i18n';
import { formatDate, formatDateTime, stripTZ } from '@/lib/dashboard-date-helpers';
import { fetchApiJson } from '@/lib/api-client';

const DATE_NUM: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getNextCheckIn(reservations: Reservation[]): Date | null {
  const today = new Date();
  const upcoming = reservations
    .filter((r) => new Date(r.check_in + 'T12:00:00') > today && r.status !== 'cancelled')
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
  if (upcoming.length === 0) return null;
  const d = new Date(upcoming[0].check_in + 'T09:00:00');
  return d;
}

type GuestWithStats = Guest & {
  reservation_count: number;
  last_stay: string | null;
};

export default function GuestsPage() {
  const { locale, t } = useLocale();
  const supabase = IS_DEMO ? null : createClient();
  const [guests, setGuests] = useState<GuestWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GuestWithStats | null>(null);
  const [guestReservations, setGuestReservations] = useState<Reservation[]>([]);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Alerts state
  const [guestAlerts, setGuestAlerts] = useState<GuestAlert[]>([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertTime, setNewAlertTime] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);

  // Campaign modal
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState<string | null>(null);
  const [campaignFailed, setCampaignFailed] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (IS_DEMO) {
      try {
        const [gJson, rJson] = await Promise.all([
          fetchApiJson<{ data: Guest[] }>('/api/guests'),
          fetchApiJson<{ data: Reservation[] }>('/api/reservations'),
        ]);
        const withStats: GuestWithStats[] = gJson.data.map((g) => {
          const gRes = rJson.data.filter((r) => r.guest_id === g.id);
          const last = gRes.reduce<string | null>(
            (acc, r) => (!acc || r.check_in > acc ? r.check_in : acc),
            null
          );
          return { ...g, reservation_count: gRes.length, last_stay: last };
        });
        setGuests(withStats);
      } catch {
        setFetchError(t('guests.loadError'));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: reservations, error: resError } = await supabase!
      .from('reservations')
      .select('guest_id, check_in, check_out')
      .neq('status', 'cancelled');

    const { data: rawGuests, error: guestError } = await supabase!
      .from('guests')
      .select('*')
      .order('name', { ascending: true });

    if (resError || guestError) {
      setFetchError(t('guests.loadError'));
      setLoading(false);
      return;
    }
    if (!rawGuests) { setLoading(false); return; }

    const statsMap: Record<string, { count: number; last: string | null }> = {};
    for (const r of reservations ?? []) {
      if (!r.guest_id) continue;
      if (!statsMap[r.guest_id]) statsMap[r.guest_id] = { count: 0, last: null };
      statsMap[r.guest_id].count++;
      const ci = stripTZ(r.check_in);
      if (!statsMap[r.guest_id].last || ci > statsMap[r.guest_id].last!) {
        statsMap[r.guest_id].last = ci;
      }
    }

    const withStats: GuestWithStats[] = rawGuests.map((g) => ({
      ...g,
      reservation_count: statsMap[g.id]?.count ?? 0,
      last_stay: statsMap[g.id]?.last ?? null,
    }));

    setGuests(withStats);
    setLoading(false);
  }, [supabase, t]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  async function loadGuestAlerts(guestId: string) {
    if (IS_DEMO) return;
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) return;
      const data: GuestAlert[] = await res.json();
      setGuestAlerts(Array.isArray(data) ? data.filter((a) => a.guest_id === guestId) : []);
    } catch {}
  }

  async function openGuest(g: GuestWithStats) {
    setSelected(g);
    setNotes(g.notes ?? '');
    setGuestAlerts([]);
    setShowAlertForm(false);
    setNewAlertMsg('');
    setNewAlertTime('');
    loadGuestAlerts(g.id);
    if (IS_DEMO) {
      try {
        const json = await fetchApiJson<{ data: Reservation[] }>(
          `/api/reservations?guest_id=${encodeURIComponent(g.id)}`
        );
        setGuestReservations(json.data);
      } catch {
        setGuestReservations([]);
      }
      return;
    }
    const { data } = await supabase!
      .from('reservations')
      .select('*')
      .eq('guest_id', g.id)
      .order('check_in', { ascending: false });
    setGuestReservations(data ?? []);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!selected) return;
      setNotesSaving(true);
      if (IS_DEMO) {
        await fetchApiJson('/api/guests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selected.id, notes: value }),
        }).catch(() => {});
      } else {
        await supabase!.from('guests').update({ notes: value }).eq('id', selected.id);
      }
      setNotesSaving(false);
    }, 800);
  }

  function applyPreset(daysOffset: number) {
    const nextCheckIn = getNextCheckIn(guestReservations);
    if (!nextCheckIn) return;
    const d = new Date(nextCheckIn);
    d.setDate(d.getDate() - daysOffset);
    d.setHours(9, 0, 0, 0);
    setNewAlertTime(toDatetimeLocal(d));
  }

  async function createAlert() {
    if (!selected || !newAlertMsg.trim() || !newAlertTime) return;
    setAlertSaving(true);
    const notify_at = new Date(newAlertTime).toISOString();

    if (IS_DEMO) {
      setGuestAlerts((prev) => [
        ...prev,
        {
          id: 'demo-' + Date.now(),
          guest_id: selected.id,
          message: newAlertMsg.trim(),
          notify_at,
          delivered_at: null,
          dismissed_at: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      try {
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_id: selected.id, message: newAlertMsg.trim(), notify_at }),
        });
        const json = await res.json();
        if (json.ok && json.alert) {
          setGuestAlerts((prev) => [...prev, json.alert]);
        }
      } catch {}
    }

    setNewAlertMsg('');
    setNewAlertTime('');
    setShowAlertForm(false);
    setAlertSaving(false);
  }

  async function deleteAlert(id: string) {
    setGuestAlerts((prev) => prev.filter((a) => a.id !== id));
    if (IS_DEMO) return;
    await fetch('/api/alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function sendCampaign() {
    if (!campaignSubject || !campaignBody) return;
    setCampaignSending(true);
    setCampaignResult(null);
    setCampaignFailed(false);
    if (IS_DEMO) {
      await new Promise((r) => setTimeout(r, 800));
      setCampaignResult(t('guests.campaignDemo', { n: withEmail }));
      setCampaignSending(false);
      return;
    }
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: campaignSubject, body: campaignBody }),
    });
    const json = await res.json();
    if (json.ok) {
      setCampaignResult(t('guests.campaignSent', { n: json.sent }));
    } else {
      setCampaignFailed(true);
      setCampaignResult(
        typeof json.error === 'string' && json.error.includes('No guests with email')
          ? t('guests.campaignNoEmail')
          : t('guests.campaignError', { error: json.error ?? t('common.networkError') })
      );
    }
    setCampaignSending(false);
  }

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.email ?? '').toLowerCase().includes(q) ||
      (g.nationality ?? '').toLowerCase().includes(q)
    );
  });

  const withEmail = guests.filter((g) => g.email).length;
  const nextCheckIn = selected ? getNextCheckIn(guestReservations) : null;
  const activeAlerts = guestAlerts.filter((a) => !a.dismissed_at);

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className={`flex flex-col ${selected ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r border-[#E0DBCF] bg-white`}>
        <div className="p-4 border-b border-[#E0DBCF] space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-serif font-bold text-[#4A4A4A]">
              {t('guests.title')}
              <span className="ml-2 text-sm font-sans font-normal text-[#888]">({guests.length})</span>
            </h1>
            <button
              type="button"
              onClick={() => { setCampaignOpen(true); setCampaignResult(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] text-white text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
            >
              <Send size={12} aria-hidden />
              {t('guests.emailAll', { n: withEmail })}
            </button>
          </div>
          <p className="text-xs text-[#888]">
            {t('guests.subtitle')}
          </p>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" aria-hidden />
            <input
              type="search"
              placeholder={t('guests.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E0DBCF] text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
          {loading ? (
            <div className="p-6 text-center text-[#888] text-sm">{t('common.loading')}</div>
          ) : fetchError ? (
            <div className="p-6 text-center text-sm text-red-500">{fetchError}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-[#888] text-sm">{t('guests.empty')}</div>
          ) : (
            filtered.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => openGuest(g)}
                className={`w-full text-left px-4 py-3 hover:bg-[#FAFAF8] transition-colors focus:outline-none focus-visible:bg-[#FAFAF8] ${
                  selected?.id === g.id ? 'bg-[#FDF8EE]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0">
                      <User size={14} className="text-[#DAA520]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#4A4A4A] truncate">{g.name}</p>
                      <p className="text-xs text-[#888] truncate">{g.email ?? t('common.noEmail')}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <p className="text-xs text-[#888]">
                      {g.reservation_count === 1
                        ? t('guests.staysCountOne')
                        : t('guests.staysCountMany', { n: g.reservation_count })}
                    </p>
                    {g.last_stay && (
                      <p className="text-xs text-[#CCC]">{formatDate(g.last_stay, locale, DATE_NUM)}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-[#CCC] shrink-0" aria-hidden />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
          <div className="sticky top-0 bg-white border-b border-[#E0DBCF] px-5 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="lg:hidden p-1 rounded-lg text-[#888] hover:text-[#333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
              aria-label={t('common.back')}
            >
              <ChevronRight size={18} className="rotate-180" aria-hidden />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0">
              <User size={18} className="text-[#DAA520]" aria-hidden />
            </div>
            <div>
              <h2 className="font-serif font-bold text-[#4A4A4A]">{selected.name}</h2>
              <p className="text-xs text-[#888]">
                {selected.email ?? t('common.noEmail')} {selected.nationality ? `· ${selected.nationality}` : ''}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Contact info */}
            <section className="bg-white rounded-2xl border border-[#E0DBCF] p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('guests.contact')}</h3>
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#DAA520]">
                  <Mail size={14} aria-hidden />
                  {selected.email}
                </a>
              )}
              {selected.phone && <p className="text-sm text-[#4A4A4A]">📞 {selected.phone}</p>}
              {!selected.email && !selected.phone && (
                <p className="text-sm text-[#888]">{t('guests.noContact')}</p>
              )}
            </section>

            {/* Stays */}
            <section>
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
                {t('guests.stays', { n: guestReservations.length })}
              </h3>
              {guestReservations.length === 0 ? (
                <p className="text-sm text-[#888]">{t('guests.noStays')}</p>
              ) : (
                <div className="space-y-2">
                  {guestReservations.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl border border-[#E0DBCF] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#4A4A4A]">{displayRoomLabel(r.room, t)}</p>
                          <p className="text-xs text-[#888]">
                            {formatDate(stripTZ(r.check_in), locale, DATE_NUM)} → {formatDate(stripTZ(r.check_out), locale, DATE_NUM)}
                            {r.total_eur != null ? ` · €${Number(r.total_eur).toFixed(0)}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.channel === 'airbnb' ? 'bg-[#FF5A5F] text-white' :
                          r.channel === 'booking' ? 'bg-[#003580] text-white' :
                          'bg-[#708238] text-white'
                        }`}>
                          {tChannel(t, r.channel)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('guests.privateNotes')}</h3>
                {notesSaving && (
                  <span className="text-xs text-[#888] flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" aria-hidden /> {t('common.saving')}
                  </span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={4}
                placeholder={t('guests.notesPlaceholder')}
                className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
              />
            </section>

            {/* Alerts / Reminders */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide flex items-center gap-1.5">
                  <Bell size={12} aria-hidden />
                  {t('guests.reminders')}
                  {activeAlerts.length > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#DAA520] text-white text-[10px] font-bold leading-none">
                      {activeAlerts.length}
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAlertForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-[#DAA520] hover:text-[#B8860B] font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DAA520] rounded"
                >
                  <Plus size={13} aria-hidden />
                  {t('guests.newShort')}
                </button>
              </div>

              {showAlertForm && (
                <div className="bg-white rounded-xl border border-[#E0DBCF] p-3 mb-3 space-y-2.5">
                  <textarea
                    value={newAlertMsg}
                    onChange={(e) => setNewAlertMsg(e.target.value)}
                    rows={2}
                    placeholder={t('guests.reminderPlaceholder')}
                    className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
                  />

                  {nextCheckIn && (
                    <div>
                      <p className="text-[10px] text-[#888] mb-1.5">{t('guests.shortcutNextCheckin', { date: formatDate(nextCheckIn.toISOString().split('T')[0], locale, DATE_NUM) })}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: t('guests.presetCheckinDay'), days: 0 },
                          { label: t('guests.preset1Day'), days: 1 },
                          { label: t('guests.preset3Days'), days: 3 },
                          { label: t('guests.preset1Week'), days: 7 },
                        ].map(({ label, days }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => applyPreset(days)}
                            className="text-[11px] px-2 py-1 rounded-md border border-[#E0DBCF] text-[#666] hover:bg-[#F0EDE6] hover:border-[#DAA520] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DAA520]"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="datetime-local"
                    value={newAlertTime}
                    onChange={(e) => setNewAlertTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAlertForm(false); setNewAlertMsg(''); setNewAlertTime(''); }}
                      className="flex-1 py-2 rounded-lg border border-[#E0DBCF] text-sm text-[#666] hover:bg-[#F0EDE6] transition-colors focus:outline-none"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={createAlert}
                      disabled={!newAlertMsg.trim() || !newAlertTime || alertSaving}
                      className="flex-1 py-2 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                    >
                      {alertSaving ? t('common.saving') : t('guests.createReminder')}
                    </button>
                  </div>
                </div>
              )}

              {activeAlerts.length === 0 ? (
                <p className="text-sm text-[#888]">{t('guests.noReminders')}</p>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map((a) => {
                    const isDue = new Date(a.notify_at) <= new Date() && !a.delivered_at;
                    const isDelivered = !!a.delivered_at;
                    return (
                      <div
                        key={a.id}
                        className={`bg-white rounded-xl border px-4 py-3 ${
                          isDue ? 'border-amber-300 bg-amber-50' : 'border-[#E0DBCF]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#4A4A4A] leading-snug">{a.message}</p>
                            <p className={`text-xs mt-0.5 ${isDue ? 'text-amber-600 font-medium' : 'text-[#888]'}`}>
                              {isDue ? '⚠ ' : isDelivered ? '✓ ' : ''}
                              {formatDateTime(a.notify_at, locale)}
                              {isDelivered ? ` · ${t('guests.sent')}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteAlert(a.id)}
                            className="shrink-0 p-1 rounded-lg text-[#CCC] hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                            aria-label={t('guests.deleteReminder')}
                          >
                            <X size={14} aria-hidden />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[#888]">
          <div className="text-center">
            <User size={40} className="mx-auto mb-3 opacity-20" aria-hidden />
            <p className="text-sm">{t('guests.pickGuest')}</p>
          </div>
        </div>
      )}

      {/* Campaign modal */}
      {campaignOpen && (
        <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md cursor-default rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#E0DBCF]">
              <h2 className="font-serif font-bold text-[#4A4A4A]">{t('guests.campaignTitle')}</h2>
              <button
                type="button"
                onClick={() => setCampaignOpen(false)}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6]"
                aria-label={t('common.close')}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#888]">
                {t('guests.campaignHint', { n: withEmail })}
              </p>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1">{t('guests.subject')}</label>
                <input
                  type="text"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
                  placeholder={t('guests.campaignSubjectPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1">{t('guests.body')}</label>
                <textarea
                  value={campaignBody}
                  onChange={(e) => setCampaignBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none"
                  placeholder={t('guests.campaignBodyPlaceholder')}
                />
              </div>
              {campaignResult && (
                <p className={`text-sm rounded-lg px-3 py-2 ${campaignFailed ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {campaignResult}
                </p>
              )}
              <button
                type="button"
                onClick={sendCampaign}
                disabled={campaignSending || !campaignSubject || !campaignBody}
                className="w-full flex items-center justify-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
              >
                {campaignSending ? (
                  <><Loader2 size={14} className="animate-spin" aria-hidden /> {t('guests.sending')}</>
                ) : (
                  <><Send size={14} aria-hidden /> {t('guests.sendCampaign')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
