/**
 * Video link stana ili projekta (migracija 040): YouTube, Vimeo ili https .mp4.
 * Isti pomoćnik proverava link u adminu i pravi adresu za prikaz, pa u iframe
 * nikad ne ide nešto što nije jedan od ova tri oblika.
 */
export type VideoEmbed = { kind: 'youtube' | 'vimeo' | 'file'; src: string };

export function parseVideo(url: string | null | undefined): VideoEmbed | null {
  if (!url || url.length > 600) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');

  let yt: string | null = null;
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') yt = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);
      yt = m ? m[1] : null;
    }
  }
  if (yt !== null) return /^[A-Za-z0-9_-]{6,20}$/.test(yt) ? { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0` } : null;

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(?:^|\/)(\d{5,12})(?:\/|$)/);
    return m ? { kind: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}` } : null;
  }

  if (/\.mp4$/i.test(u.pathname)) return { kind: 'file', src: u.toString() };
  return null;
}
