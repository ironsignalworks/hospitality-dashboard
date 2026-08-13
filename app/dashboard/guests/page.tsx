'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IS_DEMO, MOCK_GUESTS, MOCK_RESERVATIONS } from '@/lib/demo';
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

const CHANNEL_LABEL: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  direct: 'Direto',
};

function formatDatePT(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDatetimePT(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

function stripTZ(d: string) {
  return d?.split('T')[0] ?? d;
}

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

  const fetchGuests = useCallback(async () => {
    if (IS_DEMO) {
      const withStats: GuestWithStats[] = MOCK_GUESTS.map((g) => {
        const gRes = MOCK_RESERVATIONS.filter((r) => r.guest_id === g.id);
        const last = gRes.reduce<string | null>(
          (acc, r) => (!acc || r.check_in > acc ? r.check_in : acc),
          null
        );
        return { ...g, reservation_count: gRes.length, last_stay: last };
      });
      setGuests(withStats);
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
      setFetchError('Erro ao carregar hóspedes.');
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
  }, [supabase]);

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
      setGuestReservations(
        MOCK_RESERVATIONS.filter((r) => r.guest_id === g.id) as unknown as Reservation[]
      );
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
      if (!IS_DEMO) {
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
    if (IS_DEMO) {
      await new Promise((r) => setTimeout(r, 800));
      setCampaignResult(`Demo: email simulado para ${withEmail} hóspede(s).`);
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
      setCampaignResult(`Enviado para ${json.sent} hóspede(s).`);
    } else {
      setCampaignResult(`Erro: ${json.error}`);
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
              Hóspedes
              <span className="ml-2 text-sm font-sans font-normal text-[#888]">({guests.length})</span>
            </h1>
            <button
              type="button"
              onClick={() => { setCampaignOpen(true); setCampaignResult(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] text-white text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
            >
              <Send size={12} aria-hidden />
              Email ({withEmail})
            </button>
          </div>
          <p className="text-xs text-[#888]">
            CRM operacional com historico, notas e campanhas para relacionamento direto com o hospede.
          </p>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" aria-hidden />
            <input
              type="search"
              placeholder="Pesquisar nome, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E0DBCF] text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
          {loading ? (
            <div className="p-6 text-center text-[#888] text-sm">A carregar…</div>
          ) : fetchError ? (
            <div className="p-6 text-center text-sm text-red-500">{fetchError}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-[#888] text-sm">Nenhum hóspede encontrado.</div>
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
                      <p className="text-xs text-[#888] truncate">{g.email ?? 'sem email'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <p className="text-xs text-[#888]">{g.reservation_count} estadia(s)</p>
                    {g.last_stay && (
                      <p className="text-xs text-[#CCC]">{formatDatePT(g.last_stay)}</p>
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
              aria-label="Voltar"
            >
              <ChevronRight size={18} className="rotate-180" aria-hidden />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#DAA520]/20 flex items-center justify-center shrink-0">
              <User size={18} className="text-[#DAA520]" aria-hidden />
            </div>
            <div>
              <h2 className="font-serif font-bold text-[#4A4A4A]">{selected.name}</h2>
              <p className="text-xs text-[#888]">
                {selected.email ?? 'sem email'} {selected.nationality ? `· ${selected.nationality}` : ''}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Contact info */}
            <section className="bg-white rounded-2xl border border-[#E0DBCF] p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">Contacto</h3>
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#DAA520]">
                  <Mail size={14} aria-hidden />
                  {selected.email}
                </a>
              )}
              {selected.phone && <p className="text-sm text-[#4A4A4A]">📞 {selected.phone}</p>}
              {!selected.email && !selected.phone && (
                <p className="text-sm text-[#888]">Sem dados de contacto</p>
              )}
            </section>

            {/* Stays */}
            <section>
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
                Estadias ({guestReservations.length})
              </h3>
              {guestReservations.length === 0 ? (
                <p className="text-sm text-[#888]">Nenhuma estadia registada.</p>
              ) : (
                <div className="space-y-2">
                  {guestReservations.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl border border-[#E0DBCF] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#4A4A4A]">{r.room}</p>
                          <p className="text-xs text-[#888]">
                            {formatDatePT(stripTZ(r.check_in))} → {formatDatePT(stripTZ(r.check_out))}
                            {r.total_eur != null ? ` · €${Number(r.total_eur).toFixed(0)}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.channel === 'airbnb' ? 'bg-[#FF5A5F] text-white' :
                          r.channel === 'booking' ? 'bg-[#003580] text-white' :
                          'bg-[#708238] text-white'
                        }`}>
                          {CHANNEL_LABEL[r.channel] ?? r.channel}
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
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide">Notas privadas</h3>
                {notesSaving && (
                  <span className="text-xs text-[#888] flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" aria-hidden /> A guardar…
                  </span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={4}
                placeholder="Preferências, alergias, animais de estimação…"
                className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
              />
            </section>

            {/* Alerts / Reminders */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wide flex items-center gap-1.5">
                  <Bell size={12} aria-hidden />
                  Lembretes
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
                  Novo
                </button>
              </div>

              {showAlertForm && (
                <div className="bg-white rounded-xl border border-[#E0DBCF] p-3 mb-3 space-y-2.5">
                  <textarea
                    value={newAlertMsg}
                    onChange={(e) => setNewAlertMsg(e.target.value)}
                    rows={2}
                    placeholder="O que devo lembrar?"
                    className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none bg-white"
                  />

                  {nextCheckIn && (
                    <div>
                      <p className="text-[10px] text-[#888] mb-1.5">Atalho — próximo check-in ({formatDatePT(nextCheckIn.toISOString().split('T')[0])}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Dia do check-in', days: 0 },
                          { label: '1 dia antes', days: 1 },
                          { label: '3 dias antes', days: 3 },
                          { label: '1 semana antes', days: 7 },
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
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={createAlert}
                      disabled={!newAlertMsg.trim() || !newAlertTime || alertSaving}
                      className="flex-1 py-2 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                    >
                      {alertSaving ? 'A guardar…' : 'Criar lembrete'}
                    </button>
                  </div>
                </div>
              )}

              {activeAlerts.length === 0 ? (
                <p className="text-sm text-[#888]">Nenhum lembrete para este hóspede.</p>
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
                              {formatDatetimePT(a.notify_at)}
                              {isDelivered ? ' · Enviado' : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteAlert(a.id)}
                            className="shrink-0 p-1 rounded-lg text-[#CCC] hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                            aria-label="Apagar lembrete"
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
            <p className="text-sm">Seleciona um hóspede para ver detalhes</p>
          </div>
        </div>
      )}

      {/* Campaign modal */}
      {campaignOpen && (
        <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md cursor-default rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#E0DBCF]">
              <h2 className="font-serif font-bold text-[#4A4A4A]">Enviar email a todos</h2>
              <button
                type="button"
                onClick={() => setCampaignOpen(false)}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6]"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#888]">
                Será enviado a todos os {withEmail} hóspede(s) com email registado.
              </p>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1">Assunto</label>
                <input
                  type="text"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
                  placeholder="Temos disponibilidade em março!"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666] mb-1">Mensagem</label>
                <textarea
                  value={campaignBody}
                  onChange={(e) => setCampaignBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none"
                  placeholder="Olá! Temos uma semana livre…"
                />
              </div>
              {campaignResult && (
                <p className={`text-sm rounded-lg px-3 py-2 ${campaignResult.startsWith('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
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
                  <><Loader2 size={14} className="animate-spin" aria-hidden /> A enviar…</>
                ) : (
                  <><Send size={14} aria-hidden /> Enviar campanha</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
