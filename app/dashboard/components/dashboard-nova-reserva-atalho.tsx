'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { QuickReservationModal } from './quick-reservation-modal';
import { useSettings } from '@/lib/hooks/use-settings';
import { useT } from '@/lib/i18n';

const BTN =
  'inline-flex min-h-[3rem] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#E0DBCF] bg-white px-3 py-3 text-sm font-semibold text-[#4A4A4A] shadow-sm transition-colors hover:border-[#DAA520] hover:text-dash-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] sm:min-h-0 sm:px-4';

/**
 * "Nova reserva" in Atalhos: opens the same quick modal as the empty room cards.
 */
export function DashboardNovaReservaAtalho() {
  const router = useRouter();
  const settings = useSettings();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full min-w-0 sm:w-auto">
      <button type="button" onClick={() => setOpen(true)} className={BTN}>
        <Plus size={18} className="shrink-0 text-[#708238]" aria-hidden />
        {t('today.newReservation')}
      </button>
      {open && (
        <QuickReservationModal
          initialRoom={settings.room_names[0] ?? t('room.defaultName', { n: 1 })}
          onClose={() => setOpen(false)}
          onSaved={(r) => {
            if (r.ok) {
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}
