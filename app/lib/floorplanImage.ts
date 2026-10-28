/**
 * Tlocrt ture kao slika za mejl. Gmail i Outlook ne prikazuju SVG, pa
 * šematski plan (<slug>/floorplan-schematic.svg) ima PNG blizanca koji
 * pravi editor plana pri čuvanju (app/admin/plan/[slug]). Pravi tlocrt
 * (JPG/PNG/WebP koji je vlasnik otpremio) ide kakav jeste.
 *
 * Slika se preuzima pri slanju: tako znamo da postoji (stari planovi
 * sačuvani pre PNG-a ga nemaju) i imamo bajtove za prilog.
 */

const MAX_BYTES = 3_000_000;
const RASTER = /\.(png|jpe?g|webp)(\?|$)/i;

export type FloorplanImage = {
  /** Javni URL slike (za <img> u mejlu). */
  url: string;
  /** Sadržaj za prilog, base64. */
  base64: string;
  filename: string;
};

/** URL slike koju mejl može da prikaže, ili null (SVG bez PNG blizanca). */
export function floorplanImageUrl(floorplanUrl: string | null | undefined): string | null {
  if (!floorplanUrl) return null;
  if (floorplanUrl.includes('/floorplan-schematic.svg')) return floorplanUrl.replace('/floorplan-schematic.svg', '/floorplan-schematic.png');
  return RASTER.test(floorplanUrl) ? floorplanUrl : null;
}

export async function fetchFloorplanImage(floorplanUrl: string | null | undefined, slug: string): Promise<FloorplanImage | null> {
  const url = floorplanImageUrl(floorplanUrl);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    return { url, base64: bytes.toString('base64'), filename: `tlocrt-${slug}.${ext}` };
  } catch {
    return null;
  }
}
