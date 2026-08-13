'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { IS_DEMO } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquare,
  FileEdit,
  LogOut,
  Menu,
  X,
  BarChart2,
  Settings,
  Bell,
  CircleHelp,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSettings } from '@/lib/hooks/use-settings';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { GuestAlert } from '@/lib/types';

const NAV = [
  { href: '/dashboard',                     label: 'Hoje',       icon: LayoutDashboard, mobileBottom: true },
  { href: '/dashboard/reservations',        label: 'Reservas',   icon: CalendarDays,    mobileBottom: true },
  { href: '/dashboard/historico-ocupacao',  label: 'Ocupação',   icon: BarChart2,       mobileBottom: true },
  { href: '/dashboard/guests',              label: 'Hóspedes',   icon: Users,           mobileBottom: true },
  { href: '/dashboard/messages',            label: 'Mensagens',  icon: MessageSquare,   mobileBottom: true },
  { href: '/dashboard/content',             label: 'Concierge',  icon: FileEdit,        mobileBottom: true },
  { href: '/dashboard/settings',            label: 'Definições', icon: Settings,        mobileBottom: false },
  { href: '/dashboard/about',               label: 'Sobre/FAQ',  icon: CircleHelp,      mobileBottom: false },
];

function formatAlertTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

function NotificationBell({ alerts, dueAlerts, dismiss }: {
  alerts: GuestAlert[];
  dueAlerts: GuestAlert[];
  dismiss: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    function update() {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const panelW = Math.min(320, window.innerWidth - 32);
      let left = r.left;
      if (left + panelW > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - panelW - 16);
      }
      setPanelPos({ top: r.bottom + 8, left });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const unread = dueAlerts.length;

  const panel = open && mounted && panelPos && (
    <div
      ref={panelRef}
      id="dashboard-lembretes-panel"
      role="dialog"
      aria-label="Lembretes"
      className="fixed z-[200] w-[min(20rem,calc(100vw-2rem))] max-h-[min(28rem,60svh)] flex flex-col rounded-xl border border-[#E0DBCF] bg-white shadow-xl"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
          <div className="px-4 py-3 border-b border-[#E0DBCF] flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold text-[#4A4A4A]">Lembretes</p>
            {alerts.length > 0 && (
              <span className="text-xs text-[#888]">{alerts.length} activo(s)</span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#888]">
                Nenhum lembrete activo.
              </div>
            ) : (
              <div className="divide-y divide-[#F0EDE6]">
                {alerts.map((a) => {
                  const isDue = new Date(a.notify_at) <= new Date() && !a.delivered_at;
                  return (
                    <div
                      key={a.id}
                      className={`px-4 py-3 flex items-start gap-3 ${isDue ? 'bg-amber-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        {a.guest?.name && (
                          <p className="text-xs font-semibold text-[#4A4A4A] truncate">{a.guest.name}</p>
                        )}
                        <p className="text-xs text-[#555] leading-snug mt-0.5 line-clamp-3">{a.message}</p>
                        <p className={`text-[11px] mt-1 ${isDue ? 'text-amber-600 font-medium' : 'text-[#AAA]'}`}>
                          {isDue ? '⚠ ' : ''}{formatAlertTime(a.notify_at)}
                          {a.delivered_at ? ' · Enviado' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => dismiss(a.id)}
                        className="shrink-0 mt-0.5 text-[11px] px-2 py-1 rounded-md border border-[#E0DBCF] text-[#888] hover:bg-[#F0EDE6] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DAA520]"
                      >
                        OK
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="dialog"
        aria-controls={open ? 'dashboard-lembretes-panel' : undefined}
        aria-label={`Lembretes${unread > 0 ? ` — ${unread} por ver` : ''}`}
        className="relative p-1.5 rounded-lg text-[#888] hover:bg-[#F0EDE6] hover:text-[#4A4A4A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
      >
        <Bell size={17} aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const { alerts, dueAlerts, dismiss } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    if (IS_DEMO) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/dashboard/login');
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-[#E0DBCF]">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-7 h-7 bg-[#DAA520] rounded-sm shadow-sm shrink-0" aria-hidden />
            <span className="font-serif text-lg font-bold text-[#4A4A4A] leading-tight">
              {settings.property_name}
            </span>
          </Link>
          <NotificationBell alerts={alerts} dueAlerts={dueAlerts} dismiss={dismiss} />
        </div>
        <p className="text-xs text-[#888] mt-1 ml-9">Painel de gestão</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegação principal">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] ${
                active
                  ? 'bg-[#DAA520]/10 text-[#B8860B]'
                  : 'text-[#666] hover:bg-[#F0EDE6] hover:text-[#4A4A4A]'
              }`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#E0DBCF]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#666] hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <LogOut size={18} aria-hidden />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fill dashboard shell height; scroll inside if nav is taller than viewport */}
      <aside className="hidden lg:flex lg:h-full lg:max-h-full lg:min-h-0 flex-col w-56 shrink-0 overflow-x-hidden overflow-y-auto border-r border-[#E0DBCF] bg-white [scrollbar-gutter:stable]">
        <SidebarContent />
      </aside>

      {/* Mobile top bar — above drawer so menu/close stay usable */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-[#E0DBCF] supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
          >
            <span className="w-6 h-6 shrink-0 bg-[#DAA520] rounded-sm shadow-sm" aria-hidden />
            <span className="font-serif font-bold text-[#4A4A4A] text-base truncate">
              {settings.property_name}
            </span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell alerts={alerts} dueAlerts={dueAlerts} dismiss={dismiss} />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen ? 'true' : 'false'}
              aria-controls="dashboard-mobile-drawer"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-lg p-2 text-[#666] hover:bg-[#F8F9FA] hover:text-[#333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            >
              {mobileOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay + panel */}
      <div className="lg:hidden" aria-hidden={mobileOpen ? undefined : true}>
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          className={`fixed inset-0 z-[85] bg-black/45 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
        <aside
          id="dashboard-mobile-drawer"
          inert={!mobileOpen ? true : undefined}
          className={`fixed left-0 top-[calc(4.25rem+env(safe-area-inset-top,0px))] z-[90] flex h-[calc(100svh-4.25rem-env(safe-area-inset-top,0px))] w-[min(17.5rem,88vw)] flex-col border-r border-[#E8E4DA] bg-white shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [scrollbar-gutter:stable]">
            <SidebarContent />
          </div>
        </aside>
      </div>

      {/* Mobile bottom navigation — keep below drawer + overlay (same z-50 caused Chrome to paint nav over menu) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E0DBCF] bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(74,74,74,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
        aria-label="Navegação rápida"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-1">
          {NAV.filter((n) => n.mobileBottom !== false).map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    active ? 'text-[#B8860B]' : 'text-[#888] hover:text-[#4A4A4A]'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      active ? 'bg-[#DAA520]/15 text-[#B8860B]' : 'text-[#666]'
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
                  </span>
                  <span className="truncate px-0.5 text-center">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
