import { createClient } from '@/lib/supabase/server';
import { getBrand } from '@/lib/brand';
import { getServerT } from '@/lib/i18n/server';
import { Wifi, MapPin, Coffee, MessageSquare, Car, LogIn, LogOut } from 'lucide-react';

type ContentMap = Record<string, string>;

async function getContent(): Promise<ContentMap> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('concierge_content').select('key, value');
    const map: ContentMap = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

function Section({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  if (!body) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E0DBCF] p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[#DAA520]">{icon}</span>
        <h2 className="font-bold text-[#4A4A4A] text-base">{title}</h2>
      </div>
      <p className="text-sm text-[#666] leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export default async function ConciergePage() {
  const content = await getContent();
  const brand = getBrand();
  const { t } = await getServerT();

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="w-8 h-8 bg-[#DAA520] rounded-sm shadow-sm" aria-hidden />
          <span className="font-serif text-2xl font-bold text-[#4A4A4A]">
            {brand.name}
          </span>
        </div>
        <p className="text-sm text-[#888]">{brand.tagline ? `${brand.tagline} · ` : ''}{t('conciergePublic.welcome')}</p>
      </div>

      <div className="space-y-4">
        {content.wifi_ssid && (
          <div className="bg-white rounded-2xl border border-[#E0DBCF] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Wifi className="text-[#DAA520]" size={20} aria-hidden />
              <h2 className="font-bold text-[#4A4A4A] text-base">{t('conciergePublic.wifi')}</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#F8F9FA] rounded-lg px-3 py-2">
                <span className="text-xs text-[#888]">{t('conciergePublic.network')}</span>
                <span className="font-mono font-semibold text-sm text-[#4A4A4A]">{content.wifi_ssid}</span>
              </div>
              {content.wifi_pass && (
                <div className="flex items-center justify-between bg-[#F8F9FA] rounded-lg px-3 py-2">
                  <span className="text-xs text-[#888]">{t('conciergePublic.password')}</span>
                  <span className="font-mono font-semibold text-sm text-[#4A4A4A]">{content.wifi_pass}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Section
          icon={<LogIn size={20} aria-hidden />}
          title={t('conciergePublic.checkin')}
          body={content.checkin_instructions ?? ''}
        />

        <Section
          icon={<LogOut size={20} aria-hidden />}
          title={t('conciergePublic.checkout')}
          body={content.checkout_instructions ?? ''}
        />

        <Section
          icon={<Coffee size={20} aria-hidden />}
          title={t('conciergePublic.breakfast')}
          body={content.breakfast ?? ''}
        />

        <Section
          icon={<MapPin size={20} aria-hidden />}
          title={t('conciergePublic.tips')}
          body={content.tips ?? ''}
        />

        <Section
          icon={<Car size={20} aria-hidden />}
          title={t('conciergePublic.parking')}
          body={content.parking ?? ''}
        />

        <div className="bg-[#4A4A4A] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={20} className="text-[#DAA520]" aria-hidden />
            <h2 className="font-bold text-base">{t('conciergePublic.helpTitle')}</h2>
          </div>
          <p className="text-sm text-[#BBB] leading-relaxed">
            {t('conciergePublic.helpBody')}
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-[#CCC] mt-8">
        {t('conciergePublic.madeFor', { name: brand.name })}
      </p>
    </div>
  );
}
