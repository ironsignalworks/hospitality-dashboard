'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IS_DEMO } from '@/lib/demo';
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/services/settings-service';
import { readDemoAppSettingsFromStorage } from '@/lib/demo-app-settings';
import {
  Home,
  BedDouble,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { PropertyMap, type PropertyLocation } from '@/app/dashboard/components/PropertyMap';
import { useT } from '@/lib/i18n';

// ── types ─────────────────────────────────────────────────────────────────────

interface PropertyConfig {
  id: string;
  name: string;
  rooms: string[];
  checkin_time: string;
  checkout_time: string;
  location?: PropertyLocation;
}

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_ROOMS = 6;
const STORAGE_KEY = 'white_label_dashboard_v1_properties';

// ── utilities ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultProperty(name = DEFAULT_SETTINGS.property_name): PropertyConfig {
  return {
    id: uid(),
    name,
    rooms: [...DEFAULT_SETTINGS.room_names],
    checkin_time: DEFAULT_SETTINGS.checkin_time,
    checkout_time: DEFAULT_SETTINGS.checkout_time,
  };
}

function fromSettings(s: AppSettings): PropertyConfig {
  return {
    id: 'primary',
    name: s.property_name,
    rooms: [...s.room_names],
    checkin_time: s.checkin_time,
    checkout_time: s.checkout_time,
  };
}

function toSettings(p: PropertyConfig): AppSettings {
  return {
    room_count: p.rooms.length,
    room_names: [...p.rooms],
    property_name: p.name,
    checkin_time: p.checkin_time,
    checkout_time: p.checkout_time,
  };
}

function loadStorage(): PropertyConfig[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) && data.length > 0 ? (data as PropertyConfig[]) : null;
  } catch { return null; }
}

function writeStorage(props: PropertyConfig[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(props)); } catch {}
}

async function saveToApi(prop: PropertyConfig): Promise<'save' | 'network' | null> {
  if (IS_DEMO) {
    await new Promise((r) => setTimeout(r, 80));
    return null;
  }
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSettings(prop)),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    return json.ok ? null : 'save';
  } catch { return 'network'; }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useT();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const latestProps = useRef<PropertyConfig[]>([]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const newCardRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync — timer callbacks read this instead of closure values
  useEffect(() => { latestProps.current = properties; }, [properties]);

  // ── initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      if (IS_DEMO) {
        const stored = loadStorage();
        if (stored) { setProperties(stored); setLoading(false); return; }
        const legacy = readDemoAppSettingsFromStorage();
        setProperties([fromSettings(legacy ?? DEFAULT_SETTINGS)]);
        setLoading(false);
        return;
      }
      // Production: primary from API, location + extras from localStorage
      try {
        const res = await fetch('/api/settings');
        const data = await res.json() as AppSettings;
        const primary = fromSettings(data);
        const stored = loadStorage();
        const storedPrimary = stored?.find((p) => p.id === 'primary');
        const extras = stored ? stored.filter((p) => p.id !== 'primary') : [];
        // Location is localStorage-only; carry it over so it isn't lost on reload
        const primaryWithLocation: PropertyConfig = storedPrimary?.location
          ? { ...primary, location: storedPrimary.location }
          : primary;
        setProperties([primaryWithLocation, ...extras]);
      } catch {
        setProperties([defaultProperty()]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── save ────────────────────────────────────────────────────────────────────

  function schedulePropertySave(propId: string) {
    if (saveTimers.current[propId]) clearTimeout(saveTimers.current[propId]);
    setSavedIds((s) => { const n = new Set(s); n.delete(propId); return n; });
    setErrors((e) => ({ ...e, [propId]: '' }));

    saveTimers.current[propId] = setTimeout(async () => {
      const all = latestProps.current;
      const prop = all.find((p) => p.id === propId);
      if (!prop) return;

      writeStorage(all);

      if (prop.id !== 'primary') {
        // Extra properties: localStorage only
        setSavedIds((s) => new Set(s).add(propId));
        setTimeout(() => setSavedIds((s) => { const n = new Set(s); n.delete(propId); return n; }), 2500);
        return;
      }

      setSavingIds((s) => new Set(s).add(propId));
      const err = await saveToApi(prop);
      setSavingIds((s) => { const n = new Set(s); n.delete(propId); return n; });

      if (err) {
        setErrors((e) => ({
          ...e,
          [propId]: err === 'network' ? t('common.networkError') : t('common.saveError'),
        }));
      } else {
        setSavedIds((s) => new Set(s).add(propId));
        setTimeout(() => setSavedIds((s) => { const n = new Set(s); n.delete(propId); return n; }), 2500);
        router.refresh();
      }
    }, 800);
  }

  // ── property operations ─────────────────────────────────────────────────────

  function updateProperty(id: string, changes: Partial<PropertyConfig>) {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
    schedulePropertySave(id);
  }

  function addProperty() {
    const newProp = defaultProperty(t('settings.propertyDefaultName', { n: properties.length + 1 }));
    setProperties((prev) => {
      const next = [...prev, newProp];
      writeStorage(next);
      return next;
    });
    setTimeout(() => newCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function deleteProperty(id: string) {
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeStorage(next);
      return next;
    });
    setDeleteConfirm(null);
  }

  // ── room operations ─────────────────────────────────────────────────────────

  function addRoom(propId: string) {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propId || p.rooms.length >= MAX_ROOMS) return p;
        return { ...p, rooms: [...p.rooms, t('room.defaultName', { n: p.rooms.length + 1 })] };
      })
    );
    schedulePropertySave(propId);
  }

  function removeRoom(propId: string, roomIdx: number) {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propId || p.rooms.length <= 1) return p;
        return { ...p, rooms: p.rooms.filter((_, i) => i !== roomIdx) };
      })
    );
    schedulePropertySave(propId);
  }

  function updateRoom(propId: string, roomIdx: number, value: string) {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propId) return p;
        return { ...p, rooms: p.rooms.map((r, i) => (i === roomIdx ? value : r)) };
      })
    );
    schedulePropertySave(propId);
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[#888]">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 pb-24 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">{t('settings.title')}</h1>
        <p className="text-sm text-[#888] mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-5">
        {properties.map((prop, propIdx) => {
          const isSaving = savingIds.has(prop.id);
          const isSaved = savedIds.has(prop.id);
          const err = errors[prop.id];
          const isLastCard = propIdx === properties.length - 1 && propIdx > 0;
          const isDeleteConfirming = deleteConfirm === prop.id;

          return (
            <section
              key={prop.id}
              ref={isLastCard ? newCardRef : undefined}
              className="rounded-2xl border border-[#E0DBCF] bg-white overflow-hidden"
            >
              {/* ── Card header ── */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E0DBCF] bg-[#FDFCF8]">
                <Home size={15} className="text-[#DAA520] shrink-0" aria-hidden />

                <input
                  type="text"
                  value={prop.name}
                  onChange={(e) => updateProperty(prop.id, { name: e.target.value })}
                  className="flex-1 min-w-0 font-semibold text-sm text-[#4A4A4A] bg-transparent border-b border-transparent hover:border-[#E0DBCF] focus:border-[#DAA520] focus:outline-none pb-0.5 transition-colors placeholder:text-[#BBB]"
                  placeholder={t('settings.propertyName')}
                  maxLength={80}
                />

                {/* Per-property save indicator */}
                <span className="shrink-0 flex items-center gap-1 text-[11px]">
                  {isSaving && (
                    <span className="flex items-center gap-1 text-[#AAA]">
                      <Loader2 size={11} className="animate-spin text-[#DAA520]" aria-hidden />
                      {t('common.saving')}
                    </span>
                  )}
                  {isSaved && !isSaving && (
                    <span className="flex items-center gap-1 text-[#708238]">
                      <CheckCircle size={11} aria-hidden />
                      {t('common.saved')}
                    </span>
                  )}
                  {err && <span className="text-red-500 text-[11px]">{err}</span>}
                </span>

                {/* Delete property — only for non-first cards */}
                {propIdx > 0 && (
                  <div className="shrink-0 ml-1">
                    {isDeleteConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#888]">{t('settings.deleteConfirm')}</span>
                        <button
                          type="button"
                          onClick={() => deleteProperty(prop.id)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors focus:outline-none"
                        >
                          {t('common.yes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] px-2 py-0.5 rounded-md border border-[#E0DBCF] text-[#666] hover:bg-[#F0EDE6] transition-colors focus:outline-none"
                        >
                          {t('common.no')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(prop.id)}
                        className="p-1.5 rounded-lg text-[#CCC] hover:text-red-400 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                        aria-label={t('settings.deleteProperty')}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Card body ── */}
              <div className="p-5 space-y-6">

                {/* Rooms */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BedDouble size={14} className="text-[#DAA520]" aria-hidden />
                    <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('settings.rooms')}</p>
                    <span className="text-xs text-[#CCC]">{prop.rooms.length} / {MAX_ROOMS}</span>
                  </div>

                  <div className="space-y-2">
                    {prop.rooms.map((room, roomIdx) => (
                      <div key={roomIdx} className="flex items-center gap-2.5">
                        <span className="w-5 shrink-0 text-right text-[11px] font-semibold text-[#CCC] select-none">
                          {roomIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={room}
                          onChange={(e) => updateRoom(prop.id, roomIdx, e.target.value)}
                          placeholder={t('room.defaultName', { n: roomIdx + 1 })}
                          maxLength={40}
                          className="flex-1 min-w-0 rounded-xl border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeRoom(prop.id, roomIdx)}
                          disabled={prop.rooms.length <= 1}
                          className="shrink-0 p-1.5 rounded-lg text-[#CCC] hover:text-red-400 hover:bg-red-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                          aria-label={t('settings.removeRoom', { room })}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>

                  {prop.rooms.length < MAX_ROOMS && (
                    <button
                      type="button"
                      onClick={() => addRoom(prop.id)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#DAA520] hover:text-[#B8860B] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DAA520] rounded px-0.5"
                    >
                      <Plus size={13} aria-hidden />
                      {t('settings.addRoom')}
                    </button>
                  )}
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-[#DAA520]" aria-hidden />
                    <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('settings.location')}</p>
                    {prop.location?.address && (
                      <span className="text-xs text-[#CCC] truncate max-w-[160px]">{prop.location.address}</span>
                    )}
                  </div>
                  <PropertyMap
                    location={prop.location}
                    onLocationChange={(loc) => updateProperty(prop.id, { location: loc })}
                  />
                </div>

                {/* Times */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-[#DAA520]" aria-hidden />
                    <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">{t('settings.hours')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#888] mb-1.5">{t('settings.checkIn')}</label>
                      <input
                        type="time"
                        value={prop.checkin_time}
                        onChange={(e) => updateProperty(prop.id, { checkin_time: e.target.value })}
                        className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#888] mb-1.5">{t('settings.checkOut')}</label>
                      <input
                        type="time"
                        value={prop.checkout_time}
                        onChange={(e) => updateProperty(prop.id, { checkout_time: e.target.value })}
                        className="w-full rounded-xl border border-[#E0DBCF] px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* Add property */}
        <button
          type="button"
          onClick={addProperty}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E0DBCF] py-5 text-sm font-medium text-[#AAA] hover:border-[#DAA520] hover:text-[#DAA520] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
        >
          <Plus size={16} aria-hidden />
          {t('settings.addProperty')}
        </button>
      </div>
    </div>
  );
}
