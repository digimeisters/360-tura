import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { rateLimit } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Jedna prava poseta pošalje otvaranje, pokretanje, pa po jedan događaj za
// svaku posećenu prostoriju - realno do 40-50 u minutu kod brzog klikanja.
// Sto dvadeset ostavlja prostora, a zaustavlja punjenje tabele u petlji.
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60 * 1000;

// Slugovi postojećih tura, da izmišljen slug ne bi pravio redove koje posle
// niko ne može da poveže ni sa čim. Kešira se, jer bi upit po događaju bio
// skuplji od samog upisa.
const SLUG_CACHE_MS = 5 * 60 * 1000;
let slugCache: { slugs: Set<string>; expiresAt: number } | null = null;

async function isKnownTour(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const now = Date.now();

  if (!slugCache || slugCache.expiresAt <= now) {
    const { data, error } = await supabase.from('tours').select('slug');
    if (error) {
      // Ako spisak ne stigne, ne odbacujemo događaj - bolje zabeležiti nego
      // izgubiti podatak zbog trenutne greške u čitanju.
      console.error('[api/track] slug list failed:', error.message);
      return true;
    }
    slugCache = {
      slugs: new Set((data ?? []).map((t) => String(t.slug))),
      expiresAt: now + SLUG_CACHE_MS
    };
  }

  return slugCache.slugs.has(slug);
}

const EVENT_TYPES = new Set(['open', 'start', 'room_view', 'share', 'contact']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Događaji sa početne strane (migracija 008). Cilj klika i izvor posete su
// kratke oznake, pa se sve što ne liči na oznaku odbacuje umesto da se upiše.
const SITE_EVENT_TYPES = new Set(['page_view', 'cta_click', 'contact_click', 'form_submit']);
const SITE_TARGET_RE = /^[a-z0-9_:-]{1,80}$/;
const SITE_SOURCE_RE = /^[a-z0-9._-]{1,100}$/;

async function recordSiteEvent(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
  sessionId: string
): Promise<NextResponse> {
  const eventType = String(body.eventType || '');
  if (!SITE_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ success: false, error: 'Neispravan događaj.' }, { status: 400 });
  }

  const target =
    typeof body.target === 'string' && SITE_TARGET_RE.test(body.target) ? body.target : null;
  const device = body.device === 'mobile' || body.device === 'desktop' ? body.device : null;
  const source =
    typeof body.source === 'string' && SITE_SOURCE_RE.test(body.source) ? body.source : null;

  const { error } = await supabase.from('site_events').insert({
    event_type: eventType,
    target,
    session_id: sessionId,
    device,
    source
  });

  if (error) {
    console.error('[api/track] site insert failed:', error.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// Gornja granica za jedan boravak u prostoriji (2h). Bez ovoga bi zaboravljen
// otvoren tab preko noći ubacio desetine sati i pomerio svaki prosek.
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;

// Crawler-i i preview botovi (Facebook, WhatsApp, Slack...) otvaraju stranicu
// pri generisanju preview-a; ne smeju da se broje kao posete.
const BOT_RE = /bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|bingpreview|whatsapp|telegram|discord|lighthouse|headless/i;

export async function POST(req: Request) {
  try {
    if (BOT_RE.test(req.headers.get('user-agent') || '')) {
      return NextResponse.json({ success: true, skipped: 'bot' });
    }

    // Tiho odbacivanje: analitika ne sme da se vidi kao greška u turi, a i
    // 429 bi skriptu rekao gde je granica.
    const limit = rateLimit(req, 'track', RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.ok) {
      return NextResponse.json({ success: true, skipped: 'rate' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const body = await req.json();
    const sessionId = String(body.sessionId || '').slice(0, 64);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Neispravan događaj.' }, { status: 400 });
    }

    if (body.scope === 'site') {
      return recordSiteEvent(createClient(supabaseUrl, supabaseKey), body, sessionId);
    }

    const eventType = String(body.eventType || '');
    const tourSlug = String(body.tourSlug || '').slice(0, 200);

    if (!EVENT_TYPES.has(eventType) || !tourSlug) {
      return NextResponse.json({ success: false, error: 'Neispravan događaj.' }, { status: 400 });
    }

    const roomId = typeof body.roomId === 'string' && UUID_RE.test(body.roomId) ? body.roomId : null;

    let durationMs: number | null = null;
    if (typeof body.durationMs === 'number' && Number.isFinite(body.durationMs)) {
      durationMs = Math.min(Math.max(Math.round(body.durationMs), 0), MAX_DURATION_MS);
    }

    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 5) : null;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!(await isKnownTour(supabase, tourSlug))) {
      return NextResponse.json({ success: true, skipped: 'unknown-tour' });
    }

    const { error } = await supabase.from('tour_events').insert({
      tour_slug: tourSlug,
      room_id: roomId,
      event_type: eventType,
      session_id: sessionId,
      duration_ms: durationMs,
      lang
    });

    if (error) {
      console.error('[api/track] insert failed:', error.message);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    // Analitika nikad ne sme da bude vidljiva korisniku kao greška.
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
