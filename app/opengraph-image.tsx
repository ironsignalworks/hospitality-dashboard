import { ImageResponse } from 'next/og';
import { getBrand } from '@/lib/brand';

export const alt = 'Dashboard';

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

/** Social preview card — gold mark + brand name. */
export default function Image() {
  const brand = getBrand();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#F8F9FA',
          padding: 72,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              backgroundColor: '#DAA520',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(74,74,74,0.15)',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.05,
                color: '#4A4A4A',
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              {brand.name}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: '#666',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
              }}
            >
              Dashboard
            </div>
            <div
              style={{
                fontSize: 24,
                color: '#888',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
              }}
            >
              {brand.tagline ? brand.tagline : 'Operações · reservas · hóspedes · mensagens'}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
