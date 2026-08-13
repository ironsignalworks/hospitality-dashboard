'use client';

import { useState } from 'react';
import { GuestPanel } from './guest-panel';

interface GuestPanelTriggerProps {
  guestId: string | null;
  guestName?: string;
  /** Abre o painel com notas de estadia (mesma reserva). */
  reservationId?: string | null;
  className?: string;
  children: React.ReactNode;
}

export function GuestPanelTrigger({ guestId, guestName, reservationId, className, children }: GuestPanelTriggerProps) {
  const [open, setOpen] = useState(false);

  if (!guestId) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        className={`text-left hover:underline hover:text-[#DAA520] transition-colors focus:outline-none focus-visible:underline ${className ?? ''}`}
      >
        {children}
      </button>
      {open && (
        <GuestPanel
          guestId={guestId}
          guestName={guestName}
          reservationId={reservationId ?? undefined}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
