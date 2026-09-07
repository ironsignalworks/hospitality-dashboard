'use client';

import { useT } from '@/lib/i18n';

export default function AboutFaqPage() {
  const t = useT();
  return (
    <div className="p-6 lg:p-8 pb-20 max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">{t('about.title')}</h1>
        <p className="text-sm text-[#666] leading-relaxed">{t('about.intro')}</p>
      </header>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">{t('about.principle')}</h2>
        <p className="text-sm text-[#4A4A4A] leading-relaxed">{t('about.principleBody')}</p>
      </section>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">{t('about.faq')}</h2>
        <div className="space-y-3 text-sm text-[#4A4A4A]">
          <div>
            <p className="font-semibold">{t('about.qCal')}</p>
            <p className="text-[#666]">{t('about.aCal')}</p>
          </div>
          <div>
            <p className="font-semibold">{t('about.qEmail')}</p>
            <p className="text-[#666]">{t('about.aEmail')}</p>
          </div>
          <div>
            <p className="font-semibold">{t('about.qPms')}</p>
            <p className="text-[#666]">{t('about.aPms')}</p>
          </div>
          <div>
            <p className="font-semibold">{t('about.qMulti')}</p>
            <p className="text-[#666]">{t('about.aMulti')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
