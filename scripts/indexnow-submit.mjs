// Šalje SVE adrese iz živog sitemap-a na IndexNow (Bing, Yandex...).
// Pokrenuti posle push-a koji donosi nov ili izmenjen sadržaj (blog tekst,
// nova strana) - kad Vercel završi deploy:
//
//   npm run indexnow
//
// Ture se javljaju same, iz admina, kad se objave ili im se promeni stanje
// (app/lib/indexNow.ts). Ključ se čita iz public/<ključ>.txt.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://kvadrat360.com';
const publicDir = join(import.meta.dirname, '..', 'public');
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('Nema IndexNow ključa u public/');
const key = readFileSync(join(publicDir, keyFile), 'utf8').trim();

const sitemap = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) throw new Error('Sitemap je prazan');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList: urls })
});
console.log(`IndexNow: ${urls.length} adresa, odgovor ${res.status} ${res.statusText}`);
if (!res.ok) process.exitCode = 1;
