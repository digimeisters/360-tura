import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const EVENT_TYPES = new Set(['open', 'start', 'room_view', 'share', 'contact']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const body = await req.json();

    const eventType = String(body.eventType || '');
    const tourSlug = String(body.tourSlug || '').slice(0, 200);
    const sessionId = String(body.sessionId || '').slice(0, 64);

    if (!EVENT_TYPES.has(eventType) || !tourSlug || !sessionId) {
      return NextResponse.json({ success: false, error: 'Neispravan događaj.' }, { status: 400 });
    }

    const roomId = typeof body.roomId === 'string' && UUID_RE.test(body.roomId) ? body.roomId : null;

    let durationMs: number | null = null;
    if (typeof body.durationMs === 'number' && Number.isFinite(body.durationMs)) {
      durationMs = Math.min(Math.max(Math.round(body.durationMs), 0), MAX_DURATION_MS);
    }

    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 5) : null;

    const supabase = createClient(supabaseUrl, supabaseKey);
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
