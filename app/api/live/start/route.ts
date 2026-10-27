import { NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { isLiveGuideToken, newLiveCode } from '@/app/lib/liveGuide';

/**
 * Razgledanje uživo: proverava agentov link (?agent=<token>) i daje kod za
 * jedno gledanje. Jedini poziv našeg servera - posle toga agent i kupac
 * razgovaraju direktno preko Supabase Realtime kanala. Ništa se ne upisuje.
 */

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_SLUG_LENGTH = 200;

export async function POST(req: Request) {
  const limit = rateLimit(req, 'live-start', RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSec, 'Previše pokretanja u kratkom roku. Pokušajte ponovo kasnije.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan zahtev.' }, { status: 400 });
  }
  const { slug, token } = (body ?? {}) as { slug?: unknown; token?: unknown };
  if (typeof slug !== 'string' || !slug || slug.length > MAX_SLUG_LENGTH || typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Neispravan zahtev.' }, { status: 400 });
  }

  if (!isLiveGuideToken(slug, token)) {
    return NextResponse.json({ error: 'Link za vođenje ne važi.' }, { status: 403 });
  }

  return NextResponse.json({ code: newLiveCode() }, { headers: { 'Cache-Control': 'no-store' } });
}
