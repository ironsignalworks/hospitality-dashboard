'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IS_DEMO, MOCK_MESSAGES } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import {
  MessageSquare,
  CheckCheck,
  ChevronRight,
  Bot,
  User,
  Loader2,
  Plus,
  Send,
  X,
  Clock,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import type { Message } from '@/lib/types';

type MessageWithRelations = Message & {
  guest: { name: string; id: string } | null;
  reservation: { room: string; check_in: string; check_out: string } | null;
};

type Conversation = {
  key: string;
  guestName: string;
  guestId: string | null;
  reservationRoom: string | null;
  messages: MessageWithRelations[];
  hasUnread: boolean;
  latestAt: string;
};

function groupConversations(messages: MessageWithRelations[]): Conversation[] {
  const map = new Map<string, Conversation>();

  for (const m of messages) {
    const key = m.reservation_id ?? m.guest_id ?? `anon-${m.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        guestName: m.guest?.name ?? 'Hóspede desconhecido',
        guestId: m.guest_id,
        reservationRoom: m.reservation?.room ?? null,
        messages: [],
        hasUnread: false,
        latestAt: m.created_at,
      });
    }
    const conv = map.get(key)!;
    conv.messages.push(m);
    if (!m.handled && m.role === 'guest') conv.hasUnread = true;
    if (m.created_at > conv.latestAt) conv.latestAt = m.created_at;
  }

  return Array.from(map.values()).sort((a, b) =>
    b.latestAt.localeCompare(a.latestAt)
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagesPage() {
  const supabase = IS_DEMO ? null : createClient();
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (IS_DEMO) {
      setMessages(MOCK_MESSAGES as unknown as MessageWithRelations[]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase!
      .from('messages')
      .select('*, guest:guests(id,name), reservation:reservations(room,check_in,check_out)')
      .order('created_at', { ascending: true });
    if (error) setFetchError('Erro ao carregar mensagens.');
    setMessages((data as MessageWithRelations[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMessages();

    if (!IS_DEMO) {
      // Supabase Realtime subscription
      channelRef.current = supabase!
        .channel('messages-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchMessages();
        })
        .subscribe();
    }

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [fetchMessages, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, messages]);

  const conversations = groupConversations(messages);
  const unreadTotal = conversations.filter((c) => c.hasUnread).length;

  async function markHandled(msgIds: string[]) {
    if (IS_DEMO) {
      setMessages((prev) =>
        prev.map((m) => (msgIds.includes(m.id) ? { ...m, handled: true } : m))
      );
      return;
    }
    for (const id of msgIds) {
      await supabase!.from('messages').update({ handled: true }).eq('id', id);
    }
    await fetchMessages();
  }

  async function handleMarkConvHandled(conv: Conversation) {
    const unreadIds = conv.messages
      .filter((m) => !m.handled && m.role === 'guest')
      .map((m) => m.id);
    await markHandled(unreadIds);
    setSelected((prev) =>
      prev?.key === conv.key ? { ...prev, hasUnread: false } : prev
    );
  }

  async function sendOwnerReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    if (IS_DEMO) {
      const newMsg = {
        id: `demo-${Date.now()}`,
        reservation_id: selected.messages[0]?.reservation_id ?? null,
        guest_id: selected.guestId,
        body: replyText.trim(),
        role: 'owner' as const,
        handled: true,
        created_at: new Date().toISOString(),
        guest: selected.messages[0]?.guest ?? null,
        reservation: selected.messages[0]?.reservation ?? null,
      } as unknown as MessageWithRelations;
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setSending(false);
      return;
    }
    await supabase!.from('messages').insert({
      reservation_id: selected.messages[0]?.reservation_id ?? null,
      guest_id: selected.guestId,
      body: replyText.trim(),
      role: 'owner',
      handled: true,
    });
    setReplyText('');
    await fetchMessages();
    setSending(false);
  }

  async function sendScheduledMessage() {
    if (!replyText.trim() || !scheduleAt || !selected) return;
    setScheduling(true);
    const scheduledAtISO = new Date(scheduleAt).toISOString();

    if (IS_DEMO) {
      const newMsg = {
        id: `demo-${Date.now()}`,
        reservation_id: selected.messages[0]?.reservation_id ?? null,
        guest_id: selected.guestId,
        body: replyText.trim(),
        role: 'owner' as const,
        handled: true,
        scheduled_at: scheduledAtISO,
        created_at: scheduledAtISO,
        guest: selected.messages[0]?.guest ?? null,
        reservation: selected.messages[0]?.reservation ?? null,
      } as unknown as MessageWithRelations;
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setScheduleMode(false);
      setScheduleAt('');
      setScheduling(false);
      return;
    }

    await supabase!.from('messages').insert({
      reservation_id: selected.messages[0]?.reservation_id ?? null,
      guest_id: selected.guestId,
      body: replyText.trim(),
      role: 'owner',
      handled: true,
      scheduled_at: scheduledAtISO,
    });
    setReplyText('');
    setScheduleMode(false);
    setScheduleAt('');
    await fetchMessages();
    setScheduling(false);
  }

  async function cancelScheduled(msgId: string) {
    if (IS_DEMO) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      return;
    }
    await supabase!.from('messages').delete().eq('id', msgId);
    await fetchMessages();
  }

  async function submitNewMessage() {
    if (!newBody.trim()) return;
    setSubmitting(true);
    if (IS_DEMO) {
      const guestMsg = {
        id: `demo-${Date.now()}`,
        reservation_id: null,
        guest_id: null,
        body: newBody.trim(),
        role: 'guest' as const,
        handled: false,
        created_at: new Date().toISOString(),
        guest: null,
        reservation: null,
      } as unknown as MessageWithRelations;
      setMessages((prev) => [...prev, guestMsg]);
      setNewBody('');
      setNewMsgOpen(false);
      setSubmitting(false);
      return;
    }
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestMessage: newBody.trim() }),
    });
    setNewBody('');
    setNewMsgOpen(false);
    await fetchMessages();
    setSubmitting(false);
  }

  function useAiDraft(conv: Conversation) {
    const aiMsg = conv.messages.slice().reverse().find((m) => m.role === 'ai');
    if (aiMsg) setReplyText(aiMsg.body);
  }

  const selectedWithLatest = selected
    ? (conversations.find((c) => c.key === selected.key) ?? selected)
    : null;

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Conversation list */}
      <div className={`flex flex-col ${selectedWithLatest ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r border-[#E0DBCF] bg-white`}>
        <div className="p-4 border-b border-[#E0DBCF] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-[#4A4A4A]">Mensagens</h1>
            <p className="text-xs text-[#888] mt-0.5">
              Integracao com Gmail, Outlook ou qualquer provedor para comunicacao sem friccao.
            </p>
            {unreadTotal > 0 && (
              <p className="text-xs text-red-500 font-medium">{unreadTotal} conversa(s) por responder</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setNewMsgOpen(true)}
            className="p-1.5 rounded-lg bg-[#DAA520] text-white hover:bg-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
            aria-label="Nova mensagem simulada"
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
          {loading ? (
            <div className="p-6 text-center text-sm text-[#888]">A carregar…</div>
          ) : fetchError ? (
            <div className="p-6 text-center text-sm text-red-500">{fetchError}</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={32} className="mx-auto mb-2 text-[#DDD]" aria-hidden />
              <p className="text-sm text-[#888]">Nenhuma mensagem ainda.</p>
              <p className="text-xs text-[#AAA] mt-1">Usa o + para simular uma mensagem de hóspede.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.key}
                type="button"
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 hover:bg-[#FAFAF8] transition-colors focus:outline-none focus-visible:bg-[#FAFAF8] ${
                  selectedWithLatest?.key === conv.key ? 'bg-[#FDF8EE]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {conv.hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-label="Não lida" />
                      )}
                      <p className="font-semibold text-sm text-[#4A4A4A] truncate">{conv.guestName}</p>
                    </div>
                    {conv.reservationRoom && (
                      <p className="text-xs text-[#888]">{conv.reservationRoom}</p>
                    )}
                    <p className="text-xs text-[#AAA] truncate mt-0.5">
                      {conv.messages[conv.messages.length - 1]?.body ?? ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[#CCC] whitespace-nowrap">
                      {formatTime(conv.latestAt)}
                    </p>
                    <ChevronRight size={14} className="text-[#CCC] mt-1 ml-auto" aria-hidden />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation detail */}
      {selectedWithLatest ? (
        <div className="flex-1 flex flex-col bg-[#F8F9FA]">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-[#E0DBCF] px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="lg:hidden p-1 rounded-lg text-[#888] hover:text-[#333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
                aria-label="Voltar"
              >
                <ChevronRight size={18} className="rotate-180" aria-hidden />
              </button>
              <div>
                <p className="font-semibold text-sm text-[#4A4A4A]">{selectedWithLatest.guestName}</p>
                {selectedWithLatest.reservationRoom && (
                  <p className="text-xs text-[#888]">{selectedWithLatest.reservationRoom}</p>
                )}
              </div>
            </div>
            {selectedWithLatest.hasUnread && (
              <button
                type="button"
                onClick={() => handleMarkConvHandled(selectedWithLatest)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0DBCF] text-xs text-[#666] hover:bg-[#F0EDE6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
              >
                <CheckCheck size={13} aria-hidden />
                Marcar como tratado
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {selectedWithLatest.messages.map((m) => {
              const nowStr = new Date().toISOString();
              const isPendingScheduled = !!m.scheduled_at && m.scheduled_at > nowStr;

              if (isPendingScheduled) {
                return (
                  <div key={m.id} className="flex justify-end gap-2">
                    <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-[#FDF8EE] border border-[#DAA520]/40 text-[#4A4A4A] rounded-tr-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[#B8860B]">
                        <CalendarClock size={12} aria-hidden />
                        <span className="text-xs font-semibold">Agendada para {formatTime(m.scheduled_at!)}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap opacity-80">{m.body}</p>
                      <div className="flex items-center justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => cancelScheduled(m.id)}
                          className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors focus:outline-none focus-visible:underline"
                        >
                          <Trash2 size={10} aria-hidden />
                          Cancelar envio
                        </button>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-[#DAA520]/20">
                      <Clock size={13} className="text-[#DAA520]" aria-hidden />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === 'guest' ? 'justify-start' : 'justify-end'}`}
                >
                  {m.role === 'guest' && (
                    <div className="w-7 h-7 rounded-full bg-[#E0DBCF] flex items-center justify-center shrink-0 mt-1">
                      <User size={13} className="text-[#888]" aria-hidden />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'guest'
                        ? 'bg-white border border-[#E0DBCF] text-[#333] rounded-tl-sm'
                        : m.role === 'ai'
                        ? 'bg-[#F0EDE6] text-[#4A4A4A] rounded-tr-sm'
                        : 'bg-[#4A4A4A] text-white rounded-tr-sm'
                    }`}
                  >
                    {m.role === 'ai' && (
                      <div className="flex items-center gap-1 mb-1 opacity-60">
                        <Bot size={11} aria-hidden />
                        <span className="text-xs font-semibold">Rascunho IA</span>
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[10px] opacity-50 mt-1 text-right">{formatTime(m.created_at)}</p>
                  </div>
                  {m.role !== 'guest' && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      m.role === 'ai' ? 'bg-[#DAA520]/20' : 'bg-[#4A4A4A]'
                    }`}>
                      {m.role === 'ai'
                        ? <Bot size={13} className="text-[#DAA520]" aria-hidden />
                        : <User size={13} className="text-white" aria-hidden />
                      }
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="bg-white border-t border-[#E0DBCF] p-3 space-y-2">
            {selectedWithLatest.messages.some((m) => m.role === 'ai') && (
              <button
                type="button"
                onClick={() => useAiDraft(selectedWithLatest)}
                className="flex items-center gap-1.5 text-xs text-[#DAA520] hover:underline"
              >
                <Bot size={12} aria-hidden />
                Usar rascunho da IA
              </button>
            )}
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !scheduleMode) {
                    e.preventDefault();
                    sendOwnerReply();
                  }
                }}
                rows={2}
                placeholder={scheduleMode ? 'Mensagem a agendar…' : 'Escreve uma resposta… (Enter para enviar)'}
                className="flex-1 rounded-xl border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => { setScheduleMode(false); sendOwnerReply(); }}
                  disabled={!replyText.trim() || sending || scheduleMode}
                  className="px-3 py-2 rounded-xl bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-40 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                  aria-label="Enviar agora"
                  title="Enviar agora"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode((v) => !v)}
                  className={`px-3 py-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] ${
                    scheduleMode
                      ? 'border-[#DAA520] bg-[#FDF8EE] text-[#DAA520]'
                      : 'border-[#E0DBCF] text-[#888] hover:bg-[#F0EDE6]'
                  }`}
                  aria-label="Agendar mensagem"
                  title="Agendar mensagem"
                >
                  <Clock size={16} aria-hidden />
                </button>
              </div>
            </div>

            {/* Schedule panel */}
            {scheduleMode && (
              <div className="rounded-xl border border-[#DAA520]/30 bg-[#FDFBF5] p-3 space-y-2.5">
                <p className="text-xs font-semibold text-[#B8860B] flex items-center gap-1.5">
                  <CalendarClock size={13} aria-hidden />
                  Agendar envio
                </p>

                {/* Quick presets from reservation dates */}
                {(() => {
                  const res = selectedWithLatest.messages.find((m) => m.reservation)?.reservation;
                  if (!res) return null;
                  const checkIn = res.check_in?.split('T')[0];
                  const checkOut = res.check_out?.split('T')[0];
                  const presets: { label: string; value: string }[] = [];
                  if (checkIn) {
                    presets.push({ label: 'Dia check-in 14h', value: `${checkIn}T14:00` });
                  }
                  if (checkOut) {
                    const eve = new Date(checkOut + 'T00:00:00');
                    eve.setDate(eve.getDate() - 1);
                    const eveStr = eve.toISOString().split('T')[0];
                    presets.push({ label: 'Véspera check-out 20h', value: `${eveStr}T20:00` });
                    presets.push({ label: 'Dia check-out 9h', value: `${checkOut}T09:00` });
                  }
                  if (presets.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setScheduleAt(p.value)}
                          className={`text-[11px] px-2 py-1 rounded-lg border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DAA520] ${
                            scheduleAt === p.value
                              ? 'border-[#DAA520] bg-[#DAA520] text-white font-semibold'
                              : 'border-[#E0DBCF] text-[#666] hover:border-[#DAA520]/60'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    aria-label="Data e hora de envio"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="flex-1 rounded-lg border border-[#E0DBCF] px-2.5 py-1.5 text-xs text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] bg-white"
                  />
                  <button
                    type="button"
                    onClick={sendScheduledMessage}
                    disabled={!replyText.trim() || !scheduleAt || scheduling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-50 text-white text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
                  >
                    {scheduling
                      ? <><Loader2 size={12} className="animate-spin" aria-hidden /> A agendar…</>
                      : <><CalendarClock size={12} aria-hidden /> Agendar</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[#888]">
          <div className="text-center">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-20" aria-hidden />
            <p className="text-sm">Seleciona uma conversa</p>
          </div>
        </div>
      )}

      {/* New simulated guest message modal */}
      {newMsgOpen && (
        <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm cursor-default rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#E0DBCF]">
              <h2 className="font-serif font-bold text-[#4A4A4A]">Simular mensagem de hóspede</h2>
              <button
                type="button"
                onClick={() => setNewMsgOpen(false)}
                className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6]"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#888]">
                Simula o que um hóspede enviaria; a IA gera um rascunho de resposta.
              </p>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                placeholder="Olá! Qual é a password do Wi-Fi?"
                className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] resize-none"
              />
              <button
                type="button"
                onClick={submitNewMessage}
                disabled={submitting || !newBody.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" aria-hidden /> A processar…</> : 'Enviar e gerar rascunho IA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
