import DashboardSidebar from './sidebar';
import { getBrand } from '@/lib/brand';

export const metadata = {
  title: `Painel · ${getBrand().name}`,
};

/** Auth for `/dashboard/*` is enforced in `proxy.ts` (middleware). Demo mode skips login there. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        'dashboard-surface flex min-h-0 w-full min-w-0 flex-col bg-[#F8F9FA] ' +
        /* Mobile: svh + fixed shell */
        'max-lg:fixed max-lg:inset-0 max-lg:h-[100svh] max-lg:max-h-[100svh] max-lg:overflow-hidden max-lg:overscroll-none ' +
        /* Desktop: lock row to one viewport — stops Chrome clipping when h-auto let main grow past the scrollport */
        'lg:static lg:flex-row lg:h-screen lg:max-h-screen lg:overflow-hidden lg:overscroll-none'
      }
    >
      <DashboardSidebar />
      <main
        className={
          'min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain ' +
          '[scrollbar-gutter:stable] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] ' +
          'lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto lg:pt-0 lg:pb-10'
        }
      >
        {children}
      </main>
    </div>
  );
}
