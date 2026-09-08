'use client';

import { useEffect, useState } from 'react';
import { IS_DEMO, MOCK_CONTENT } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import { Save, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

const FIELD_KEYS: Array<{ key: string; labelKey: string; hintKey: string; multiline?: boolean }> = [
  { key: 'wifi_ssid', labelKey: 'content.wifiSsid', hintKey: 'content.wifiSsidHint' },
  { key: 'wifi_pass', labelKey: 'content.wifiPass', hintKey: 'content.wifiPassHint' },
  { key: 'checkin_instructions', labelKey: 'content.checkin', hintKey: 'content.checkinHint', multiline: true },
  { key: 'checkout_instructions', labelKey: 'content.checkout', hintKey: 'content.checkoutHint', multiline: true },
  { key: 'breakfast', labelKey: 'content.breakfast', hintKey: 'content.breakfastHint', multiline: true },
  { key: 'tips', labelKey: 'content.tips', hintKey: 'content.tipsHint', multiline: true },
  { key: 'parking', labelKey: 'content.parking', hintKey: 'content.parkingHint' },
];

type ContentMap = Record<string, string>;

export default function ContentPage() {
  const t = useT();
  const supabase = IS_DEMO ? null : createClient();
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (IS_DEMO) {
        setContent({ ...MOCK_CONTENT });
        setLoading(false);
        return;
      }
      const { data } = await supabase!.from('concierge_content').select('key, value');
      const map: ContentMap = {};
      for (const row of data ?? []) {
        map[row.key] = row.value;
      }
      setContent(map);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function handleChange(key: string, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    if (IS_DEMO) {
      await new Promise((r) => setTimeout(r, 400));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setSaving(false);
      return;
    }

    const upserts = Object.entries(content).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase!
      .from('concierge_content')
      .upsert(upserts, { onConflict: 'key' });

    if (upsertError) {
      setError(t('content.saveError'));
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const INPUT_BASE =
    'w-full rounded-xl border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent bg-white';

  return (
    <div className="p-6 lg:p-8 pb-16 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">{t('content.title')}</h1>
        <p className="text-sm text-[#888] mt-1">
          {t('content.subtitle')}
        </p>
        <p className="text-xs text-[#888] mt-1">
          {t('content.blurb')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#888] text-sm">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          {t('common.loading')}
        </div>
      ) : (
        <div className="space-y-6">
          {FIELD_KEYS.map(({ key, labelKey, hintKey, multiline }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-1">
                {t(labelKey)}
              </label>
              <p className="text-xs text-[#888] mb-2">{t(hintKey)}</p>
              {multiline ? (
                <textarea
                  value={content[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  rows={3}
                  className={`${INPUT_BASE} resize-y`}
                />
              ) : (
                <input
                  type="text"
                  value={content[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={INPUT_BASE}
                />
              )}
            </div>
          ))}

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A]"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" aria-hidden /> {t('common.saving')}</>
              ) : saved ? (
                <><CheckCircle size={15} aria-hidden /> {t('common.savedExclaim')}</>
              ) : (
                <><Save size={15} aria-hidden /> {t('content.saveChanges')}</>
              )}
            </button>

            <a
              href="/concierge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#4A4A4A] transition-colors focus:outline-none focus-visible:underline"
            >
              <ExternalLink size={14} aria-hidden />
              {t('content.preview')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
