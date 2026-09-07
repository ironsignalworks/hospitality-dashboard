export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-[#EDE8DC]" />
      ))}
    </div>
  );
}
