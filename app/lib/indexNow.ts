import { SITE_URL } from './site';

/**
 * IndexNow: javlja Bing-u (a preko njega i ChatGPT/Copilot pretrazi, i
 * Yandex-u) da je stranica nova ili promenjena, umesto da čekamo da je
 * sam pronađe. Google IndexNow ne koristi - za njega je sitemap.
 *
 * Ključ nije tajna: mora da bude javno dostupan na
 * /<ključ>.txt (public/1589acc0c066de110538bb3ac2d3ac8f.txt), da Bing
 * proveri da adrese šalje vlasnik sajta. Isti fajl čita i
 * scripts/indexnow-submit.mjs.
 */
export const INDEXNOW_KEY = '1589acc0c066de110538bb3ac2d3ac8f';

/**
 * Šalje adrese na IndexNow. Nikad ne baca grešku i ne radi ništa van
 * produkcije (lokalno i na preview deploy-u adrese nisu kvadrat360.com).
 * Pozivati iz `after()`, da admin ne čeka odgovor.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production' || paths.length === 0) return;
  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: paths.map((p) => `${SITE_URL}${p}`)
      }),
      signal: AbortSignal.timeout(8000)
    });
    // 200 i 202 su uspeh (202 = primljeno, ključ se još proverava).
    if (!res.ok) console.error('[indexnow] odbijeno:', res.status);
  } catch (err) {
    console.error('[indexnow] nije poslato:', err instanceof Error ? err.message : err);
  }
}
