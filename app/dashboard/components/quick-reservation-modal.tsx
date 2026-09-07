'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { IS_DEMO, MOCK_GUESTS, MOCK_RESERVATIONS } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import type { Channel, Guest, Reservation, ReservationStatus } from '@/lib/types';
import { useSettings } from '@/lib/hooks/use-settings';
import { useT, tChannel, tStatus, displayRoomLabel } from '@/lib/i18n';

const INPUT = 'w-full rounded-lg border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#666] mb-1">{label}</label>
      {children}
    </div>
  );
}

interface QuickReservationModalProps {
  initialRoom: string;
  onClose: () => void;
  onSaved?: (result: {
    ok: boolean;
    message: string;
    guestId: string | null;
    guestName: string;
    reservationId: string | null;
  }) => void;
}

export function QuickReservationModal({ initialRoom, onClose, onSaved }: QuickReservationModalProps) {
  const t = useT();
  const supabase = IS_DEMO ? null : createClient();
  const settings = useSettings();

  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    room: initialRoom,
    check_in: todayStr,
    check_out: '',
    channel: 'direct' as Channel,
    status: 'confirmed' as ReservationStatus,
    total_eur: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.check_in || !form.check_out || !form.guest_name) {
      setFormError(t('reservations.required'));
      return;
    }
    if (form.check_in >= form.check_out) {
      setFormError(t('reservations.checkoutAfter'));
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      if (IS_DEMO) {
        const res = await fetch('/api/demo/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_name: form.guest_name,
            guest_email: form.guest_email,
            room: form.room,
            check_in: form.check_in,
            check_out: form.check_out,
            channel: form.channel,
            status: form.status,
            total_eur: form.total_eur,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          throw new Error(String(json.error ?? t('reservations.saveFailed')));
        }

        const guestId = (json.guest?.id as string | undefined) ?? null;
        const guestName = (json.guest?.name as string | undefined) ?? form.guest_name;
        const reservationId = (json.reservation?.id as string | undefined) ?? null;

        // Keep the browser demo store in sync so the GuestPanel can render immediately.
        const demoEmail =
          (json.guest?.email as string | null | undefined) ?? (form.guest_email.trim() || null);
        let demoGuest: Guest | null = null;
        if (guestId) {
          const existingG = MOCK_GUESTS.some((g) => g.id === guestId);
          if (!existingG) {
            const g: Guest = {
              id: guestId,
              name: guestName,
              email: demoEmail,
              phone: null,
              nationality: null,
              notes: '',
              created_at: new Date().toISOString(),
            };
            MOCK_GUESTS.push(g);
            demoGuest = g;
          } else {
            demoGuest = MOCK_GUESTS.find((g) => g.id === guestId) ?? null;
          }
        }
        if (reservationId && guestId) {
          const existingR = MOCK_RESERVATIONS.some((r) => r.id === reservationId);
          if (!existingR) {
            const r: Reservation = {
              id: reservationId,
              guest_id: guestId,
              room: form.room,
              check_in: form.check_in,
              check_out: form.check_out,
              channel: form.channel,
              status: form.status,
              total_eur: form.total_eur ? parseFloat(form.total_eur) : null,
              external_id: null,
              internal_notes: null,
              created_at: new Date().toISOString(),
              guest:
                demoGuest ??
                ({
                  id: guestId,
                  name: guestName,
                  email: demoEmail,
                  phone: null,
                  nationality: null,
                  notes: '',
                  created_at: new Date().toISOString(),
                } satisfies Guest),
            };
            MOCK_RESERVATIONS.push(r);
          }
        }

        setSaving(false);
        onSaved?.({
          ok: true,
          message: t('reservations.created'),
          guestId,
          guestName,
          reservationId,
        });
        onClose();
        return;
      }

      let guestId: string | null = null;

      const email = form.guest_email.trim();
      if (email) {
        const { data: existing, error: existingErr } = await supabase!
          .from('guests')
          .select('id, name')
          .eq('email', email)
          .maybeSingle();
        if (existingErr) throw new Error(existingErr.message);
        if (existing?.id) {
          guestId = existing.id as string;
          if (existing.name !== form.guest_name) {
            const { error: updErr } = await supabase!
              .from('guests')
              .update({ name: form.guest_name })
              .eq('id', guestId);
            if (updErr) throw new Error(updErr.message);
          }
        }
      }

      if (!guestId) {
        const { data: g, error: guestErr } = await supabase!
          .from('guests')
          .insert({ name: form.guest_name, email: email || null })
          .select('id')
          .single();
        if (guestErr) throw new Error(guestErr.message);
        guestId = (g as { id: string } | null)?.id ?? null;
      }

      const { data: r, error: resErr } = await supabase!
        .from('reservations')
        .insert({
          guest_id: guestId,
          room: form.room,
          check_in: form.check_in,
          check_out: form.check_out,
          channel: form.channel,
          status: form.status,
          total_eur: form.total_eur ? parseFloat(form.total_eur) : null,
        })
        .select('id')
        .single();
      if (resErr) throw new Error(resErr.message);

      setSaving(false);
      onSaved?.({
        ok: true,
        message: t('reservations.created'),
        guestId,
        guestName: form.guest_name,
        reservationId: (r as { id: string } | null)?.id ?? null,
      });
      onClose();
    } catch (e) {
      setSaving(false);
      const msg = e instanceof Error ? e.message : t('reservations.saveFailed');
      setFormError(msg);
      onSaved?.({
        ok: false,
        message: msg,
        guestId: null,
        guestName: form.guest_name,
        reservationId: null,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md cursor-default overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#E0DBCF]">
          <div>
            <h2 className="font-serif font-bold text-[#4A4A4A]">{t('reservations.newTitle')}</h2>
            <p className="text-xs text-[#888] mt-0.5">{initialRoom}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            aria-label={t('common.close')}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label={t('reservations.guestName')}>
            <input
              type="text"
              value={form.guest_name}
              onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              className={INPUT}
              placeholder="Maria Silva"
              autoFocus
            />
          </Field>
          <Field label={t('reservations.guestEmail')}>
            <input
              type="email"
              value={form.guest_email}
              onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
              className={INPUT}
              placeholder="maria@exemplo.pt"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('reservations.labelCheckIn')}>
              <input
                type="date"
                value={form.check_in}
                onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label={t('reservations.labelCheckOut')}>
              <input
                type="date"
                value={form.check_out}
                onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                className={INPUT}
              />
            </Field>
          </div>
          <Field label={t('reservations.room')}>
            <select
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              className={INPUT}
            >
              {settings.room_names.map((r) => (
                <option key={r} value={r}>
                  {displayRoomLabel(r, t)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('reservations.channel')}>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}
                className={INPUT}
              >
                <option value="direct">{tChannel(t, 'direct')}</option>
                <option value="airbnb">{tChannel(t, 'airbnb')}</option>
                <option value="booking">{t('channel.bookingCom')}</option>
              </select>
            </Field>
            <Field label={t('reservations.status')}>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })}
                className={INPUT}
              >
                <option value="confirmed">{tStatus(t, 'confirmed')}</option>
                <option value="pending">{tStatus(t, 'pending')}</option>
                <option value="checked_in">{tStatus(t, 'checked_in')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('reservations.totalEur')}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.total_eur}
              onChange={(e) => setForm({ ...form, total_eur: e.target.value })}
              className={INPUT}
              placeholder="150.00"
            />
          </Field>
          {formError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
          >
            {saving ? t('common.saving') : t('reservations.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
