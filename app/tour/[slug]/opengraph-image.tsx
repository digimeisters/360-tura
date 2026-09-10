import { ImageResponse } from 'next/og';
import { getTourMeta } from './getTourMeta';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '360° virtuelna tura — Kvadrat360';

// Preview se povlači unapred i ugrađuje kao data URI umesto da se prepusti
// Satori-ju: ako CDN zakaže usred renderovanja, cela OG slika pukne i link
// ostane bez preview-a. Ovako neuspeh samo znači brendiranu karticu.
async function loadPreview(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await getTourMeta(slug);

  const title = tour?.title || 'Virtuelna tura';
  const agency = tour?.agencyName || '';
  const address = tour?.address || '';
  const photo = await loadPreview(tour?.previewUrl ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #17447E 0%, #1E5AA8 55%, #2E6FC4 100%)',
          fontFamily: 'sans-serif'
        }}
      >
        {photo ? (
          <img
            src={photo}
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' }}
          />
        ) : null}

        {/* Zatamnjenje da beli tekst ostane čitljiv i na svetloj fotografiji */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            display: 'flex',
            background: photo
              ? 'linear-gradient(180deg, rgba(9,20,38,0.42) 0%, rgba(9,20,38,0.08) 28%, rgba(9,20,38,0.58) 56%, rgba(9,20,38,0.93) 100%)'
              : 'linear-gradient(180deg, rgba(9,20,38,0) 0%, rgba(9,20,38,0.10) 100%)'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 64px',
            color: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '13px',
                background: '#FFFFFF',
                color: '#1E5AA8',
                fontSize: '27px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              K
            </div>
            <div style={{ display: 'flex', fontSize: '27px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#FFFFFF' }}>Kvadrat</span>
              <span style={{ color: '#A9CBF2' }}>360</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                padding: '7px 16px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '2px',
                color: '#FFFFFF'
              }}
            >
              360° VIRTUELNA TURA
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: title.length > 46 ? '54px' : '66px',
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: '-1.5px',
                textShadow: photo ? '0 2px 12px rgba(9, 20, 38, 0.75)' : 'none'
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px'
              }}
            >
              <div style={{ display: 'flex', fontSize: '25px', color: '#E3EDF9', fontWeight: 600 }}>
                {[agency, address].filter(Boolean).join(' · ')}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['SR', 'EN', 'DE', 'RU'].map((l) => (
                  <div
                    key={l}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '5px 13px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#E3EDF9'
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
