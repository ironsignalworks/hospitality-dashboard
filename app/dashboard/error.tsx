'use client';

import { useT } from '@/lib/i18n';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto max-w-md space-y-3 p-8 text-center">
      <h1 className="text-lg font-semibold text-[#4A4A4A]">{t('error.pageTitle')}</h1>
      <p className="text-sm text-[#888]">{t('error.pageBody')}</p>
      {error.digest ? (
        <p className="text-xs text-[#AAA]">
          {t('error.digest', { digest: error.digest })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-[#DAA520] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B8860B]"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
