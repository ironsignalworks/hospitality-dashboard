'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IS_DEMO } from '@/lib/demo';
import { fetchApiJson } from '@/lib/api-client';
import { createClient } from '@/lib/supabase';
import { X, Mail, Phone, Loader2 } from 'lucide-react';
import { ChannelIcon } from './channel-icon';
import type { Guest, Reservation } from '@/lib/types';
import { useLocale, tChannel, displayRoomLabel } from '@/lib/i18n';
import { formatDate, stripTZ } from '@/lib/dashboard-date-helpers';

const CHANNEL_COLOR: Record<string, string> = {
  airbnb: 'bg-[#FF5A5F] text-white',
  booking: 'bg-[#003580] text-white',
  direct: 'bg-[#708238] text-white',
};

const DATE_NUM: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

interface GuestPanelProps {
  guestId: string | null;
  guestName?: string;
  /** Reserva cujo painel de notas de estadia deve ser editado (e.g. clique numa reserva concreta). */
  reservationId?: string | null;
  onClose: () => void;
}

export function GuestPanel({ guestId, guestName, reservationId, onClose }: GuestPanelProps) {
  const { locale, t } = useLocale();
  const supabase = useMemo(() => (IS_DEMO ? null : createClient()), []);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [lastSavedNotes, setLastSavedNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [resNotesDraft, setResNotesDraft] = useState('');
  const [lastSavedResNotes, setLastSavedResNotes] = useState('');
  const [resNotesSaving, setResNotesSaving] = useState(false);
  const [resNotesError, setResNotesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const notesDirty = notesDraft !== lastSavedNotes;
  const resNotesDirty = resNotesDraft !== lastSavedResNotes;

  const applyLoadedGuest = useCallback(
    (g: Guest | null) => {
      const n = (g?.notes as string | null) ?? '';
      setNotesDraft(n);
      setLastSavedNotes(n);
    },
    []
  );

  useEffect(() => {
    if (!guestId) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      if (!reservationId) {
        setResNotesDraft('');
        setLastSavedResNotes('');
      }
      if (IS_DEMO) {
        try {
          const [gJson, rJson] = await Promise.all([
            fetchApiJson<{ data: Guest }>(`/api/guests?id=${encodeURIComponent(guestId!)}`),
            fetchApiJson<{ data: Reservation[] }>(
              `/api/reservations?guest_id=${encodeURIComponent(guestId!)}`
            ),
          ]);
          if (cancelled) return;
          const g = gJson.data ?? null;
          setGuest(g);
          applyLoadedGuest(g);
          setReservations(rJson.data);
          if (reservationId) {
            const row = rJson.data.find((x) => x.id === reservationId);
            if (row && row.guest_id === guestId) {
              const n = (row.internal_notes as string | null) ?? '';
              if (!cancelled) {
                setResNotesDraft(n);
                setLastSavedResNotes(n);
              }
            } else if (!cancelled) {
              setResNotesDraft('');
              setLastSavedResNotes('');
            }
          }
        } catch {
          if (!cancelled) {
            setGuest(null);
            setReservations([]);
          }
        }
        if (!cancelled) setLoading(false);
        return;
      }
      const [{ data: g }, { data: r }] = await Promise.all([
          supabase!.from('guests').select('*').eq('id', guestId).single(),
          supabase!.from('reservations').select('*').eq('guest_id', guestId).order('check_in', { ascending: false }),
        ]);
        if (cancelled) return;
        const row = g as Guest | null;
        setGuest(row);
        applyLoadedGuest(row);
        setReservations((r as Reservation[]) ?? []);
        if (reservationId) {
          const { data: one, error } = await supabase!
            .from('reservations')
            .select('internal_notes, guest_id')
            .eq('id', reservationId)
            .single();
          if (cancelled) return;
          if (!error && one && (one as { guest_id: string | null }).guest_id === guestId) {
            const n = ((one as { internal_notes: string | null }).internal_notes as string | null) ?? '';
            setResNotesDraft(n);
            setLastSavedResNotes(n);
          } else {
            setResNotesDraft('');
            setLastSavedResNotes('');
          }
        }
      if (cancelled) return;
      setNotesError(null);
      setResNotesError(null);
      setLoading(false);
    }
    setLoading(true);
    void load();
    return () => { cancelled = true; };
  }, [guestId, reservationId, supabase, applyLoadedGuest]);

  const anyNotesDirty = notesDirty || resNotesDirty;

  const requestClose = useCallback(() => {
    if (anyNotesDirty) {
      const leave = window.confirm(t('guestPanel.unsavedConfirm'));
      if (!leave) return;
    }
    onClose();
  }, [anyNotesDirty, onClose, t]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [requestClose]);

  async function handleSaveNotes() {
    if (!guestId) return;
    setNotesError(null);
    setNotesSaving(true);
    try {
      if (IS_DEMO) {
        const updated = await fetchApiJson<{ data: Guest }>('/api/guests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: guestId, notes: notesDraft || null }),
        });
        setGuest(updated.data);
        setLastSavedNotes(notesDraft);
      } else {
        const { error } = await supabase!.from('guests').update({ notes: notesDraft || null }).eq('id', guestId);
        if (error) throw new Error(error.message);
        if (guest) {
          setGuest({ ...guest, notes: notesDraft || null });
        }
        setLastSavedNotes(notesDraft);
      }
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : t('guestPanel.notesSaveFailed'));
    } finally {
      setNotesSaving(false);
    }
  }

  function handleCancelNotes() {
    setNotesError(null);
    setNotesDraft(lastSavedNotes);
  }

  async function handleSaveResNotes() {
    if (!guestId || !reservationId) return;
    setResNotesError(null);
    setResNotesSaving(true);
    const value = resNotesDraft;
    const stored = value.trim() || null;
    try {
      if (IS_DEMO) {
        const json = await fetchApiJson<{ data: Reservation }>('/api/reservations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: reservationId, internal_notes: stored }),
        });
        const updated = json.data;
        if (updated.guest_id !== guestId) throw new Error(t('guestPanel.resMismatch'));
        setReservations((prev) => prev.map((x) => (x.id === reservationId ? updated : x)));
        if (!stored) {
          setResNotesDraft('');
          setLastSavedResNotes('');
        } else {
          setLastSavedResNotes(value);
        }
      } else {
        const { error } = await supabase!
          .from('reservations')
          .update({ internal_notes: stored })
          .eq('id', reservationId)
          .eq('guest_id', guestId);
        if (error) throw new Error(error.message);
        setReservations((prev) => prev.map((x) => (x.id === reservationId ? { ...x, internal_notes: stored } : x)));
        if (!stored) {
          setResNotesDraft('');
          setLastSavedResNotes('');
        } else {
          setLastSavedResNotes(value);
        }
      }
    } catch (e) {
      setResNotesError(e instanceof Error ? e.message : t('guestPanel.resNotesSaveFailed'));
    } finally {
      setResNotesSaving(false);
    }
  }

  function handleCancelResNotes() {
    setResNotesError(null);
    setResNotesDraft(lastSavedResNotes);
  }

  function handleDeleteResNotes() {
    if (!reservationId || !guestId) return;
    if (!window.confirm(t('guestPanel.confirmDeleteNotes'))) return;
    setResNotesError(null);
    void (async () => {
      setResNotesSaving(true);
      try {
        if (IS_DEMO) {
          const json = await fetchApiJson<{ data: Reservation }>('/api/reservations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: reservationId, internal_notes: null }),
          });
          setReservations((prev) => prev.map((x) => (x.id === reservationId ? json.data : x)));
        } else {
          const { error } = await supabase!
            .from('reservations')
            .update({ internal_notes: null })
            .eq('id', reservationId)
            .eq('guest_id', guestId);
          if (error) throw new Error(error.message);
          setReservations((prev) => prev.map((x) => (x.id === reservationId ? { ...x, internal_notes: null } : x)));
        }
        setResNotesDraft('');
        setLastSavedResNotes('');
      } catch (e) {
        setResNotesError(e instanceof Error ? e.message : t('guestPanel.notesDeleteFailed'));
      } finally {
        setResNotesSaving(false);
      }
    })();
  }

  const canDeleteResNotes = !!reservationId && (lastSavedResNotes.trim() !== '' || resNotesDraft.trim() !== '');

  const displayName = guest?.name ?? guestName ?? t('common.guest');
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-pointer bg-black/30"
        onClick={requestClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={t('guestPanel.detailsOf', { name: displayName })}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm cursor-default flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E0DBCF]">
          <div className="w-10 h-10 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0">
            <span className="text-[#DAA520] font-bold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-[#4A4A4A] truncate">{displayName}</h2>
            {guest && (
              <p className="text-xs text-[#888] truncate">
                {guest.email ?? t('common.noEmail')}{guest.nationality ? ` · ${guest.nationality}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            aria-label={t('common.close')}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#DAA520]" aria-hidden />
            </div>
          ) : (
            <>
              {guest && (
                <section className="bg-[#FAFAF8] rounded-xl border border-[#E0DBCF] p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('guests.contact')}</h3>
                  {guest.email ? (
                    <a href={`mailto:${guest.email}`} className="flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#DAA520]">
                      <Mail size={13} aria-hidden /> {guest.email}
                    </a>
                  ) : null}
                  {guest.phone ? (
                    <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                      <Phone size={13} aria-hidden /> {guest.phone}
                    </div>
                  ) : null}
                  {!guest.email && !guest.phone && (
                    <p className="text-sm text-[#888]">{t('guests.noContact')}</p>
                  )}
                </section>
              )}

              {guestId && reservationId && (
                <section>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('guestPanel.stayNotes')}</h3>
                    {resNotesSaving && (
                      <span className="text-xs text-[#888] flex items-center gap-1 shrink-0">
                        <Loader2 size={11} className="animate-spin" aria-hidden /> {t('common.saving')}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={resNotesDraft}
                    onChange={(e) => { setResNotesDraft(e.target.value); setResNotesError(null); }}
                    rows={3}
                    id="reservation-stay-notes"
                    name="reservation_internal_notes"
                    placeholder={t('guestPanel.stayNotesPlaceholder')}
                    className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
                    disabled={!guest}
                    aria-describedby={resNotesError ? 'res-notes-error' : undefined}
                  />
                  {resNotesError && (
                    <p id="res-notes-error" role="alert" className="text-xs text-red-600 mt-1.5">
                      {resNotesError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleDeleteResNotes}
                      disabled={!canDeleteResNotes || resNotesSaving || !guest}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      {t('common.delete')}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={handleCancelResNotes}
                        disabled={!resNotesDirty || resNotesSaving}
                        className="px-3 py-1.5 text-sm font-medium text-[#666] rounded-lg border border-[#E0DBCF] bg-white hover:bg-[#F5F3ED] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleSaveResNotes(); }}
                        disabled={!resNotesDirty || resNotesSaving || !guest}
                        className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
                  {t('guests.stays', { n: reservations.length })}
                </h3>
                {reservations.length === 0 ? (
                  <p className="text-sm text-[#888]">{t('guests.noStays')}</p>
                ) : (
                  <div className="space-y-2">
                    {reservations.map((r) => (
                      <div key={r.id} className="bg-[#FAFAF8] rounded-xl border border-[#E0DBCF] px-3 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#4A4A4A]">{displayRoomLabel(r.room, t)}</p>
                          <p className="text-xs text-[#888]">
                            {formatDate(stripTZ(r.check_in), locale, DATE_NUM)} → {formatDate(stripTZ(r.check_out), locale, DATE_NUM)}
                            {r.total_eur != null ? ` · €${Number(r.total_eur).toFixed(0)}` : ''}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLOR[r.channel] ?? 'bg-[#888] text-white'}`}>
                          <ChannelIcon channel={r.channel} size={10} />
                          {tChannel(t, r.channel)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {guestId && (
                <section>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('guests.privateNotes')}</h3>
                    {notesSaving && (
                      <span className="text-xs text-[#888] flex items-center gap-1 shrink-0">
                        <Loader2 size={11} className="animate-spin" aria-hidden /> {t('common.saving')}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => { setNotesDraft(e.target.value); setNotesError(null); }}
                    rows={4}
                    id="guest-private-notes"
                    name="private_notes"
                    placeholder={t('guests.notesPlaceholder')}
                    className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
                    disabled={!guest}
                    aria-describedby={notesError ? 'notes-error' : undefined}
                  />
                  {notesError && (
                    <p id="notes-error" role="alert" className="text-xs text-red-600 mt-1.5">
                      {notesError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleCancelNotes}
                      disabled={!notesDirty || notesSaving}
                      className="px-3 py-1.5 text-sm font-medium text-[#666] rounded-lg border border-[#E0DBCF] bg-white hover:bg-[#F5F3ED] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSaveNotes(); }}
                      disabled={!notesDirty || notesSaving || !guest}
                      className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
