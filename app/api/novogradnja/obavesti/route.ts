import { NextResponse } from 'next/server';
import { looksLikeEmail } from '@/app/lib/email';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { serviceClient } from '@/app/lib/salesAccess';
import { subscribe } from '@/app/lib/unitWatch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/novogradnja/obavesti
 *
 * "Obavesti me" sa kartice rezervisanog ili prodatog stana (migracija 045):
 * kupac ostavi mejl, a kad se stan ili sličan oslobodi, mejl mu ode sam
 * (lib/unitWatch.ts). Javna forma - ograničena po IP adresi.
 *
 * Telo: { unitId, email, phone?, similar?, lang?, embedded? }
 */

const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const limit = rateLimit(req, 'unit-watch', RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec, 'Previše prijava u kratkom roku. Pokušajte ponovo za nekoliko minuta.');

  const db = serviceClient();
  if (!db) return NextResponse.json({ success: false, error: 'Nedostaje konfiguracija.' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const unitId = typeof body?.unitId === 'string' && /^[0-9a-f-]{36}$/i.test(body.unitId) ? body.unitId : '';
  const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 160) : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 40) || null : null;
  if (!unitId) return NextResponse.json({ success: false, error: 'Neispravan zahtev.' }, { status: 400 });
  if (!looksLikeEmail(email)) return NextResponse.json({ success: false, error: 'Upišite ispravnu mejl adresu.' }, { status: 400 });

  const result = await subscribe(db, {
    unitId,
    email,
    phone,
    orSimilar: body?.similar === true,
    lang: body?.lang === 'en' ? 'en' : 'sr',
    embedded: body?.embedded === true
  });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
