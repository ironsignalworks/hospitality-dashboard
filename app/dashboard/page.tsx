import { IS_DEMO, MOCK_RESERVATIONS, MOCK_MESSAGES } from '@/lib/demo';
import Link from 'next/link';
import { ArrowRight, BarChart2, MessageSquare, TrendingUp, FileEdit, Users } from 'lucide-react';
import { AppSettingsProvider } from './components/app-settings-provider';
import {
  HojeOccupationHeaderClient,
  HojeRoomCardsWithSettingsClient,
  HojeSevenDayGridClient,
} from './components/hoje-dashboard-parts-client';
import { DashboardTodayKpis } from './components/dashboard-today-kpis';
import { DashboardNovaReservaAtalho } from './components/dashboard-nova-reserva-atalho';
import { ProximasChegadasSection } from './components/proximas-chegadas-section';
import type { Reservation } from '@/lib/types';
import { DEFAULT_SETTINGS, parseSettings } from '@/lib/services/settings-service';
import { stripTZ } from '@/lib/dashboard-date-helpers';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default async function DashboardToday() {
  const today = todayStr();
  const in7 = addDays(today, 7);

  let reservations: Reservation[];
  let unreadCount: number;
  let appSettings = DEFAULT_SETTINGS;

  if (IS_DEMO) {
    reservations = MOCK_RESERVATIONS.filter(
      (r) => r.check_in <= in7 && r.check_out >= today
    ) as unknown as Reservation[];
    unreadCount = MOCK_MESSAGES.filter((m) => !m.handled && m.role === 'guest').length;
  } else {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const [resResult, msgResult, settingsResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, guest:guests(*)')
        .lte('check_in', in7)
        .gte('check_out', today)
        .neq('status', 'cancelled')
        .order('check_in', { ascending: true }),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('handled', false)
        .eq('role', 'guest'),
      supabase
        .from('concierge_content')
        .select('key, value')
        .like('key', 'setting_%'),
    ]);
    reservations = resResult.data ?? [];
    unreadCount = msgResult.count ?? 0;
    if (settingsResult.data?.length) appSettings = parseSettings(settingsResult.data);
  }

  const checkIns = reservations.filter((r) => stripTZ(r.check_in) === today);
  const checkOuts = reservations.filter((r) => stripTZ(r.check_out) === today);
  const staying = reservations.filter(
    (r) => stripTZ(r.check_in) < today && stripTZ(r.check_out) > today
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const hour = new Date().getHours();
  const salutation =
    hour < 5 || hour >= 22 ? 'Boa noite' : hour < 12 ? 'Bom dia' : 'Boa tarde';

  return (
    <AppSettingsProvider initial={appSettings} isDemo={IS_DEMO}>
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 lg:space-y-8">
      <HojeOccupationHeaderClient
        salutation={salutation}
        today={today}
        reservations={reservations}
      />
      <p className="text-xs text-[#888] -mt-3">
        Centro de operacoes: monitorizacao diaria, atalhos e contexto em tempo real num unico painel.
      </p>

      {/* Quick actions — thumb-friendly on mobile */}
      <section aria-label="Atalhos">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#888]">
          Atalhos
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <DashboardNovaReservaAtalho />
          <Link
            href="/dashboard/historico-ocupacao"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-[#E0DBCF] bg-white px-3 py-3 text-sm font-semibold text-[#4A4A4A] shadow-sm transition-colors hover:border-[#DAA520] hover:text-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] sm:min-h-0 sm:px-4"
          >
            <BarChart2 size={18} className="shrink-0 text-[#708238]" aria-hidden />
            Ocupação
          </Link>
          <Link
            href="/dashboard/messages"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-[#E0DBCF] bg-white px-3 py-3 text-sm font-semibold text-[#4A4A4A] shadow-sm transition-colors hover:border-[#DAA520] hover:text-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] sm:min-h-0 sm:px-4"
          >
            <MessageSquare size={18} className="shrink-0 text-[#4A4A4A]" aria-hidden />
            Mensagens
            {unreadCount > 0 ? (
              <span className="ml-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/dashboard/content"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-[#E0DBCF] bg-white px-3 py-3 text-sm font-semibold text-[#4A4A4A] shadow-sm transition-colors hover:border-[#DAA520] hover:text-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] sm:min-h-0 sm:px-4"
          >
            <FileEdit size={18} className="shrink-0 text-[#BC6C25]" aria-hidden />
            Concierge
          </Link>
          <Link
            href="/dashboard/guests"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-[#E0DBCF] bg-white px-3 py-3 text-sm font-semibold text-[#4A4A4A] shadow-sm transition-colors hover:border-[#DAA520] hover:text-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] sm:min-h-0 sm:px-4"
          >
            <Users size={18} className="shrink-0 text-[#DAA520]" aria-hidden />
            Hóspedes
          </Link>
        </div>
      </section>

      <DashboardTodayKpis
        checkIns={checkIns}
        checkOuts={checkOuts}
        staying={staying}
        unreadCount={unreadCount}
      />

      {/* Room occupancy */}
      <section>
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-3">
          Quartos — estado atual
        </h2>
        <HojeRoomCardsWithSettingsClient today={today} reservations={reservations} />
      </section>

      {/* 7-day strip — horizontal scroll + snap on narrow screens */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">
            Próximos 7 dias
          </h2>
          <p className="text-xs text-[#AAA] sm:hidden">Deslize para ver todos os dias</p>
        </div>
        <div className="-mx-1">
          <HojeSevenDayGridClient today={today} days={days} reservations={reservations} />
        </div>
      </section>

      <ProximasChegadasSection today={today} reservations={reservations} />

      {reservations.length === 0 && (
        <div className="text-center py-16 text-[#888]">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" aria-hidden />
          <p className="font-medium">Sem reservas nos próximos 7 dias</p>
          <Link
            href="/dashboard/reservations"
            className="mt-3 inline-block text-sm text-[#DAA520] hover:underline"
          >
            Adicionar reserva manual
          </Link>
        </div>
      )}
    </div>
    </AppSettingsProvider>
  );
}
