import { ImageResponse } from 'next/og';

// Kartica koja se vidi kad se početna podeli (Viber, WhatsApp, Facebook,
// LinkedIn). Isti izgled za obe jezičke verzije, samo drugi tekst.
export const HOME_OG_SIZE = { width: 1200, height: 630 };

export function renderHomeOgImage({ title, subtitle }: { title: string; subtitle: string }) {
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '68px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1.5px'
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: '30px', color: '#D3E3F7', lineHeight: 1.4 }}>
            {subtitle}
          </div>
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
          <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700 }}>kvadrat360.com</div>
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
    HOME_OG_SIZE
  );
}
