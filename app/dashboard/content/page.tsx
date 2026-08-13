'use client';

import { useEffect, useState } from 'react';
import { IS_DEMO, MOCK_CONTENT } from '@/lib/demo';
import { createClient } from '@/lib/supabase';
import { Save, ExternalLink, Loader2, CheckCircle } from 'lucide-react';

const FIELDS: Array<{ key: string; label: string; hint: string; multiline?: boolean }> = [
  { key: 'wifi_ssid',           label: 'Wi-Fi — Nome da rede (SSID)', hint: 'O nome que aparece na lista de redes.' },
  { key: 'wifi_pass',           label: 'Wi-Fi — Password', hint: 'Deixa em branco se não tiver password.' },
  { key: 'checkin_instructions', label: 'Instruções de check-in', hint: 'Como chegar, caixa de chaves, código…', multiline: true },
  { key: 'checkout_instructions', label: 'Instruções de check-out', hint: 'Onde deixar as chaves, o que fazer antes de sair…', multiline: true },
  { key: 'breakfast',           label: 'Pequeno-almoço', hint: 'Incluído ou sugestões de cafés próximos.', multiline: true },
  { key: 'tips',                label: 'Dicas da zona', hint: 'Miradouros, restaurantes, caminhadas favoritas…', multiline: true },
  { key: 'parking',             label: 'Estacionamento', hint: 'Onde estacionar, se é pago ou gratuito.' },
];

type ContentMap = Record<string, string>;

export default function ContentPage() {
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
      setError('Erro ao guardar. Por favor tente novamente.');
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
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">Concierge digital</h1>
        <p className="text-sm text-[#888] mt-1">
          Edita as informações que os hóspedes veem no telemóvel. Guarda e as mudanças ficam imediatas.
        </p>
        <p className="text-xs text-[#888] mt-1">
          Base de conhecimento central para automatizar respostas e reduzir tarefas repetitivas.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#888] text-sm">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          A carregar…
        </div>
      ) : (
        <div className="space-y-6">
          {FIELDS.map(({ key, label, hint, multiline }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-1">
                {label}
              </label>
              <p className="text-xs text-[#888] mb-2">{hint}</p>
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
                <><Loader2 size={15} className="animate-spin" aria-hidden /> A guardar…</>
              ) : saved ? (
                <><CheckCircle size={15} aria-hidden /> Guardado!</>
              ) : (
                <><Save size={15} aria-hidden /> Guardar alterações</>
              )}
            </button>

            <a
              href="/concierge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#888] hover:text-[#4A4A4A] transition-colors focus:outline-none focus-visible:underline"
            >
              <ExternalLink size={14} aria-hidden />
              Pré-visualizar página do hóspede
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
