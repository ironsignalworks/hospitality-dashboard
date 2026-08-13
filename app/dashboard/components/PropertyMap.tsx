'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import { MapPin, Search, Loader2 } from 'lucide-react';

// ── shared types ───────────────────────────────────────────────────────────────

export interface PropertyLocation {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  location?: PropertyLocation;
  onLocationChange: (loc: PropertyLocation) => void;
}

// ── constants ──────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID    = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
const DEFAULT_CENTER = { lat: 38.7223, lng: -9.1393 }; // Lisbon fallback
// CARTO Positron — free, no key, clean minimal style
const LIBRE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// ── Nominatim (free OSM geocoding, used by MapLibre branch) ───────────────────

interface NominatimResult { place_id: number; lat: string; lon: string; display_name: string; }

async function nominatimSearch(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'pt,pt-PT;q=0.9,en;q=0.8' } },
    );
    return res.ok ? (await res.json() as NominatimResult[]) : [];
  } catch { return []; }
}

async function nominatimReverse(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'pt,pt-PT;q=0.9,en;q=0.8' } },
    );
    const data = await res.json() as { display_name?: string };
    return data.display_name ?? '';
  } catch { return ''; }
}

// ── shared map container ───────────────────────────────────────────────────────

function MapContainer({
  mapDivRef,
  mapReady,
  location,
  children,
}: {
  mapDivRef: React.RefObject<HTMLDivElement | null>;
  mapReady: boolean;
  location?: PropertyLocation;
  children: React.ReactNode; // search slot
}) {
  return (
    <div className="space-y-2.5">
      {children}
      <div className="relative h-[260px] overflow-hidden rounded-xl border border-[#E0DBCF]">
        <div ref={mapDivRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F8F9FA]">
            <Loader2 size={20} className="animate-spin text-[#DAA520]" aria-hidden />
          </div>
        )}
      </div>
      {location?.address && (
        <p className="flex items-start gap-1.5 text-xs text-[#888]">
          <MapPin size={11} className="mt-0.5 shrink-0 text-[#DAA520]" aria-hidden />
          {location.address}
        </p>
      )}
    </div>
  );
}

// ── Google Maps branch ─────────────────────────────────────────────────────────

function resolveLatLng(
  raw: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined,
): { lat: number; lng: number } | null {
  if (!raw) return null;
  if (typeof (raw as google.maps.LatLng).lat === 'function') {
    const ll = raw as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  return raw as google.maps.LatLngLiteral;
}

function GoogleMapsMap({ location, onLocationChange }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const markerRef  = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onChangeRef = useRef(onLocationChange);
  useEffect(() => { onChangeRef.current = onLocationChange; }, [onLocationChange]);

  useEffect(() => {
    if (!mapDivRef.current || !searchRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        setOptions({ key: GMAPS_KEY, v: 'weekly', libraries: ['places', 'geocoding', 'marker'] });
        const [{ Map }, { Geocoder }, { Autocomplete }, { AdvancedMarkerElement }] =
          await Promise.all([
            importLibrary('maps'),
            importLibrary('geocoding'),
            importLibrary('places'),
            importLibrary('marker'),
          ]);
        if (cancelled || !mapDivRef.current || !searchRef.current) return;

        const center = location ? { lat: location.lat, lng: location.lng } : DEFAULT_CENTER;
        const map = new Map(mapDivRef.current, {
          center, zoom: location ? 15 : 11, mapId: MAP_ID,
          disableDefaultUI: true, zoomControl: true,
          gestureHandling: 'cooperative', clickableIcons: false,
        });
        mapRef.current = map;
        const geocoder = new Geocoder();
        geocoderRef.current = geocoder;

        function makeMarker(pos: { lat: number; lng: number }) {
          const m = new AdvancedMarkerElement({ map, position: pos, gmpDraggable: true });
          m.addListener('gmp-dragend', () => {
            const resolved = resolveLatLng(
              m.position as google.maps.LatLng | google.maps.LatLngLiteral | null,
            );
            if (!resolved) return;
            geocoder.geocode({ location: resolved }, (results, status) => {
              const address = status === 'OK' ? (results?.[0]?.formatted_address ?? '') : '';
              onChangeRef.current({ ...resolved, address });
            });
          });
          return m;
        }

        if (location) markerRef.current = makeMarker(center);

        const autocomplete = new Autocomplete(searchRef.current!, {
          fields: ['geometry', 'formatted_address'],
        });
        autocomplete.bindTo('bounds', map);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address ?? '';
          map.setCenter({ lat, lng }); map.setZoom(15);
          if (markerRef.current) markerRef.current.position = { lat, lng };
          else markerRef.current = makeMarker({ lat, lng });
          onChangeRef.current({ lat, lng, address });
          if (searchRef.current) searchRef.current.value = '';
        });

        setMapReady(true);
      } catch (err) { console.error('[PropertyMap/google]', err); }
    })();

    return () => {
      cancelled = true;
      if (markerRef.current) { markerRef.current.map = null; markerRef.current = null; }
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    const pos = { lat: location.lat, lng: location.lng };
    map.setCenter(pos);
    if (markerRef.current) markerRef.current.position = pos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  return (
    <MapContainer mapDivRef={mapDivRef} mapReady={mapReady} location={location}>
      {/* Google Autocomplete owns this input — uncontrolled */}
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" aria-hidden />
        <input
          ref={searchRef}
          type="text"
          placeholder="Pesquisar endereço…"
          className="w-full rounded-xl border border-[#E0DBCF] bg-white pl-8 pr-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
        />
      </div>
    </MapContainer>
  );
}

// ── MapLibre branch (free fallback) ───────────────────────────────────────────

function goldMarkerEl() {
  const el = document.createElement('div');
  el.style.cssText =
    'width:18px;height:18px;border-radius:50%;background:#DAA520;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:grab;flex-shrink:0';
  return el;
}

function MapLibreMap({ location, onLocationChange }: Props) {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<MLMap | null>(null);
  const markerRef  = useRef<MLMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onLocationChange);
  useEffect(() => { onChangeRef.current = onLocationChange; }, [onLocationChange]);

  useEffect(() => {
    if (!mapDivRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const ml = await import('maplibre-gl');
        if (cancelled || !mapDivRef.current) return;

        const center: [number, number] = location
          ? [location.lng, location.lat]
          : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];

        const map = new ml.Map({
          container: mapDivRef.current,
          style: LIBRE_STYLE,
          center,
          zoom: location ? 14 : 10,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');

        // Reveal container immediately — don't wait for style tiles to load
        if (!cancelled) setMapReady(true);

        map.on('load', () => { map.resize(); });
        map.on('error', (e) => { console.error('[PropertyMap/libre]', e); });

        function addDraggableMarker(lat: number, lng: number) {
          const m = new ml.Marker({ element: goldMarkerEl(), draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);
          markerRef.current = m;
          m.on('dragend', async () => {
            const pos = m.getLngLat();
            const address = await nominatimReverse(pos.lat, pos.lng);
            onChangeRef.current({ lat: pos.lat, lng: pos.lng, address });
          });
        }

        if (location) addDraggableMarker(location.lat, location.lng);
      } catch (err) {
        console.error('[PropertyMap/libre]', err);
        if (!cancelled) setMapReady(true);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when location changes externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    map.setCenter([location.lng, location.lat]);
    markerRef.current?.setLngLat([location.lng, location.lat]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  function handleSearchChange(q: string) {
    setQuery(q);
    setResults([]);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const r = await nominatimSearch(q);
      setResults(r);
      setSearching(false);
    }, 450);
  }

  async function selectResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const address = r.display_name;
    setQuery(''); setResults([]);

    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 15 });

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const ml = await import('maplibre-gl');
      const m = new ml.Marker({ element: goldMarkerEl(), draggable: true })
        .setLngLat([lng, lat]).addTo(map);
      markerRef.current = m;
      m.on('dragend', async () => {
        const pos = m.getLngLat();
        const addr = await nominatimReverse(pos.lat, pos.lng);
        onChangeRef.current({ lat: pos.lat, lng: pos.lng, address: addr });
      });
    }
    onChangeRef.current({ lat, lng, address });
  }

  return (
    <MapContainer mapDivRef={mapDivRef} mapReady={mapReady} location={location}>
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          onBlur={() => setTimeout(() => setResults([]), 150)}
          placeholder="Pesquisar endereço…"
          className="w-full rounded-xl border border-[#E0DBCF] bg-white pl-8 pr-8 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]"
        />
        {searching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#888]" aria-hidden />
        )}
        {results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#E0DBCF] bg-white shadow-lg">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onMouseDown={() => selectResult(r)}
                  className="w-full truncate px-3 py-2.5 text-left text-xs text-[#333] transition-colors hover:bg-[#F0EDE6]"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MapContainer>
  );
}

// ── dispatcher ─────────────────────────────────────────────────────────────────

export function PropertyMap(props: Props) {
  return GMAPS_KEY ? <GoogleMapsMap {...props} /> : <MapLibreMap {...props} />;
}
