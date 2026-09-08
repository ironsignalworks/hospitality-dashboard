import { getBrand } from '@/lib/brand';

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_ALT =
  'Hospitality operations dashboard — reservations, guests, messaging, and occupancy';

export const OG_CONTENT_TYPE = 'image/png';

const SITE = 'hospitality-dashboard-theta.vercel.app';

/** Satori/ImageResponse tree — flexbox only, inline styles. */
export function OgShareCard() {
  const brand = getBrand();
  const chips = ['Reservations', 'Guests', 'Messages', 'Occupancy'];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#F8F9FA',
        color: '#4A4A4A',
      }}
    >
      <div style={{ width: 16, height: '100%', background: '#DAA520' }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px 56px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 36,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: '#DAA520',
                borderRadius: 6,
              }}
            />
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#B8860B',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Hospitality ops
            </div>
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              fontFamily: 'Georgia, Times New Roman, serif',
              maxWidth: 980,
            }}
          >
            {brand.name}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 32,
              lineHeight: 1.35,
              color: '#666',
              fontFamily: 'system-ui, sans-serif',
              maxWidth: 900,
            }}
          >
            {brand.tagline ??
              'Reservations, guests, messages, and occupancy — one dashboard.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {chips.map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: '1px solid #E0DBCF',
                  background: '#FFFFFF',
                  fontSize: 22,
                  color: '#4A4A4A',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#888',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {SITE}
          </div>
        </div>
      </div>
    </div>
  );
}
