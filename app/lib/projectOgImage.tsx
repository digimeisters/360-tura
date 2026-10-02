import { ImageResponse } from 'next/og';
import { OgMark } from './ogMark';
import { getPublicProject } from './projectData';
import type { ProjectLang } from './projectI18n';

/**
 * Slika za deljenje strane projekta (Viber, WhatsApp, Facebook): fotografija
 * fasade, naziv, grad i broj slobodnih stanova. Isti obrazac kao OG slika
 * ture (app/tour/[slug]/opengraph-image.tsx): fotografija se povlači unapred,
 * pa ako CDN zakaže, ostaje brendirana kartica umesto pukle slike.
 *
 * Napomena: Viber/Facebook keširaju sliku - broj slobodnih stanova se na već
 * podeljenom linku ne menja sam.
 */

export const PROJECT_OG_SIZE = { width: 1200, height: 630 };

async function loadImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || 'image/jpeg';
    // Satori ne crta WebP pouzdano - takva slika ide bez fotografije.
    if (type.includes('webp')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function renderProjectOgImage(slug: string, lang: ProjectLang) {
  const data = await getPublicProject(slug);
  const title = (data && ((lang === 'en' && data.project.title_en?.trim()) || data.project.title)) || 'Kvadrat360';
  const free = data ? data.units.filter((u) => u.status === 'available').length : 0;
  const total = data ? data.units.length : 0;
  const city = data?.project.city || '';
  // Slika za deljenje: kompleks iz vazduha, inače prva fasada (migracija 025).
  const cover = data ? (data.views.find((v) => v.kind === 'site') ?? data.views.find((v) => v.kind === 'building'))?.imageUrl ?? null : null;
  const photo = await loadImage(cover ?? data?.project.facade_url ?? null);
  const badge = lang === 'en' ? 'NEW DEVELOPMENT' : 'NOVOGRADNJA';
  const freeText = lang === 'en' ? `${free} of ${total} apartments available` : `Slobodnih stanova: ${free} od ${total}`;
  const cta = lang === 'en' ? 'Choose your apartment →' : 'Izaberite stan →';

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
          // eslint-disable-next-line @next/next/no-img-element -- Satori (ImageResponse) crta običan <img>
          <img src={photo} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' }} />
        ) : null}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            display: 'flex',
            background: photo
              ? 'linear-gradient(180deg, rgba(9,20,38,0.45) 0%, rgba(9,20,38,0.05) 30%, rgba(9,20,38,0.55) 58%, rgba(9,20,38,0.94) 100%)'
              : 'linear-gradient(180deg, rgba(9,20,38,0) 0%, rgba(9,20,38,0.12) 100%)'
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
            <OgMark size={48} color="#A9CBF2" />
            <div style={{ display: 'flex', fontSize: '27px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#FFFFFF' }}>Kvadrat</span>
              <span style={{ color: '#A9CBF2' }}>360</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '7px 16px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '2px'
              }}
            >
              {city ? `${badge} · ${city.toUpperCase()}` : badge}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: title.length > 40 ? '56px' : '70px',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-1.5px',
                textShadow: photo ? '0 2px 12px rgba(9, 20, 38, 0.75)' : 'none'
              }}
            >
              {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              {total > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>
                  <div style={{ display: 'flex', width: '16px', height: '16px', borderRadius: '50%', background: '#4ADE80' }} />
                  {freeText}
                </div>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
              <div
                style={{
                  display: 'flex',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  color: '#1E5AA8',
                  fontSize: '24px',
                  fontWeight: 800
                }}
              >
                {cta}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    PROJECT_OG_SIZE
  );
}
