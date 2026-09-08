import { ListSkeleton } from './components/list-skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-[#EDE8DC]" />
      <ListSkeleton rows={6} />
    </div>
  );
}
