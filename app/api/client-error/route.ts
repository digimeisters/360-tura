import { NextResponse } from 'next/server';
import { rateLimit } from '@/app/lib/rateLimit';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Greška iz pregledača posetioca -> Telegram vlasniku (+ Vercel log).
 * Klijentski deo je app/lib/reportError.ts.
 *
 * Javna ruta, pa: ograničenje po IP-u, skraćena polja, bez botova, i ista
 * greška se javlja najviše jednom na sat - pokvarena tura koju otvori
 * pedeset ljudi ne sme da pošalje pedeset poruka.
 */

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const REPEAT_WINDOW_MS = 60 * 60 * 1000;
const recentlySent = new Map<string, number>();

const SOURCES = new Set(['window', 'promise', 'boundary']);
const BOT_RE = /bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|lighthouse|headless/i;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** "iPhone · Safari" - dovoljno da se zna gde da se proba, bez celog UA. */
function describeDevice(ua: string): string {
  const device = /iPhone|iPad/.test(ua)
    ? 'iPhone/iPad'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : 'nepoznat uređaj';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Chrome\//.test(ua) || /CriOS/.test(ua)
        ? 'Chrome'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'nepoznat pregledač';
  return `${device} · ${browser}`;
}

export async function POST(req: Request) {
  const limit = rateLimit(req, 'client-error', RATE_LIMIT, RATE_WINDOW_MS);
  // Klijent ionako ne čeka odgovor (sendBeacon) - bez 429 poruke.
  if (!limit.ok) return NextResponse.json({ success: true, skipped: 'limit' });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const userAgent = text(body.userAgent, 200) || req.headers.get('user-agent') || '';
  if (BOT_RE.test(userAgent)) return NextResponse.json({ success: true, skipped: 'bot' });

  const message = text(body.message, 300);
  const source = SOURCES.has(body.source) ? String(body.source) : '';
  const path = text(body.path, 200);
  if (!message || !source || !path.startsWith('/')) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const stack = text(body.stack, 1500);
  const digest = text(body.digest, 80);

  console.error('[client-error]', { source, path, message, digest, userAgent, stack });

  // Ista poruka na istoj strani = ista greška (bez upita u adresi, jer
  // ?lang=en i ?vodic=1 ne menjaju kvar).
  const now = Date.now();
  const key = `${path.split('?')[0]}|${message}`;
  const last = recentlySent.get(key);
  if (last && now - last < REPEAT_WINDOW_MS) return NextResponse.json({ success: true, skipped: 'repeat' });
  recentlySent.set(key, now);
  if (recentlySent.size > 500) {
    for (const [k, t] of recentlySent) if (now - t >= REPEAT_WINDOW_MS) recentlySent.delete(k);
  }

  const where =
    source === 'boundary' ? 'Strana se srušila (ekran za grešku)' : source === 'promise' ? 'Greška u pozadini' : 'Greška u skripti';
  // Prva linija steka koja pokazuje na naš kod - dovoljno da se nađe mesto.
  const firstFrame = stack
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.includes('/_next/') || l.includes('.js:'));

  const lines = [
    '⚠️ <b>Greška na sajtu</b>',
    `<b>Strana:</b> ${escapeHtml(path)}`,
    `<b>Vrsta:</b> ${escapeHtml(where)}`,
    `<b>Poruka:</b> ${escapeHtml(message)}`,
    `<b>Uređaj:</b> ${escapeHtml(describeDevice(userAgent))}`,
    ...(firstFrame ? [`<b>Mesto:</b> <code>${escapeHtml(firstFrame.slice(0, 200))}</code>`] : []),
    ...(digest ? [`<b>Oznaka (Vercel log):</b> <code>${escapeHtml(digest)}</code>`] : []),
    '<i>Ista greška se na ovoj strani ne javlja ponovo narednih sat vremena.</i>'
  ];
  await sendTelegramMessage(lines.join('\n'));

  return NextResponse.json({ success: true });
}
