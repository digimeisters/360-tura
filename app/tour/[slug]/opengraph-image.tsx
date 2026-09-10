import { ImageResponse } from 'next/og';
import { getTourMeta } from './getTourMeta';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '360° virtuelna tura — Kvadrat360';

// Brendirana kartica umesto same panorame: equirectangular panorame su
// 5-8MB i vidno izobličene kad se seku na 1.91:1, pa bi i sporo generisale
// i loše izgledale u preview-u. Kad budemo pravili male preview slike pri
// uploadu, ovde se dodaje kao pozadinski sloj.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await getTourMeta(slug);

  const title = tour?.title || 'Virtuelna tura';
  const agency = tour?.agencyName || '';
  const address = tour?.address || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #17447E 0%, #1E5AA8 55%, #2E6FC4 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: '#FFFFFF',
              color: '#1E5AA8',
              fontSize: '30px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            K
          </div>
          <div style={{ display: 'flex', fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#FFFFFF' }}>Kvadrat</span>
            <span style={{ color: '#A9CBF2' }}>360</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '3px',
              color: '#A9CBF2'
            }}
          >
            360° VIRTUELNA TURA
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 46 ? '58px' : '72px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1.5px'
            }}
          >
            {title}
          </div>
          {address ? (
            <div style={{ display: 'flex', fontSize: '28px', color: '#D3E3F7' }}>{address}</div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            paddingTop: '28px'
          }}
        >
          <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: '#FFFFFF' }}>
            {agency}
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            {['SR', 'EN', 'DE', 'RU'].map((l) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#D3E3F7'
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
