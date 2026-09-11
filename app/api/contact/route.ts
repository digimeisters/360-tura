import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Čovek koji šalje upit pošalje jedan, eventualno dva ako pogreši. Pet u deset
// minuta je široko za njega, a usko za skript koji puni tabelu i Telegram.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Gornje granice po polju - forma je javna, pa se dužine seku pre upisa da
// jedan zlonameran POST ne može da napuni tabelu megabajtima teksta.
const LIMITS: Record<string, number> = {
  name: 120,
  contact: 160,
  package: 80,
  agency: 160,
  listing_type: 80,
  size: 40,
  message: 4000
};

function clean(value: unknown, field: string): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, LIMITS[field] ?? 200);
}

/**
 * ============================================================
 * POST /api/contact
 * ============================================================
 * Prima upit sa landing forme (kvadrat360.com) i upisuje ga u
 * public.contact_requests. Zahteva RLS insert policy za anon rolu -
 * vidi supabase/migrations/001_contact_requests.sql.
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, 'contact', RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.ok) {
      return tooManyRequests(
        limit.retryAfterSec,
        'Previše upita u kratkom roku. Pokušajte ponovo za nekoliko minuta.'
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Nedostaju Supabase environment varijable.' },
        { status: 500 }
      );
    }

    const body = await req.json();

    const name = clean(body.name, 'name');
    const contact = clean(body.contact, 'contact');

    if (!name || !contact) {
      return NextResponse.json(
        { success: false, error: 'Ime i kontakt su obavezni.' },
        { status: 400 }
      );
    }

    const pkg = clean(body.package, 'package');
    const agency = clean(body.agency, 'agency');
    const listingType = clean(body.type, 'listing_type');
    const size = clean(body.size, 'size');
    const message = clean(body.message, 'message');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('contact_requests').insert({
      name,
      contact,
      package: pkg || null,
      agency: agency || null,
      listing_type: listingType || null,
      size: size || null,
      message: message || null,
      source: 'landing'
    });

    if (error) {
      console.error('[api/contact] insert failed:', error);
      return NextResponse.json(
        { success: false, error: 'Upit nije sačuvan. Pokušajte ponovo ili nas pozovite.' },
        { status: 500 }
      );
    }

    // Upit je već u bazi - notifikacija je dodatak, njen neuspeh se ne
    // prosleđuje korisniku.
    const lines = [
      '🔔 <b>Novi upit — Kvadrat360</b>',
      '',
      `👤 <b>${escapeHtml(name)}</b>`,
      `📞 ${escapeHtml(contact)}`
    ];
    if (agency) lines.push(`🏢 ${escapeHtml(agency)}`);
    if (pkg) lines.push(`📦 ${escapeHtml(pkg)}`);
    if (listingType) lines.push(`🏷️ ${escapeHtml(listingType)}`);
    if (size) lines.push(`📐 ${escapeHtml(size)} m²`);
    if (message) lines.push('', `💬 ${escapeHtml(message)}`);

    await sendTelegramMessage(lines.join('\n'));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/contact] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Neočekivana greška. Pokušajte ponovo.' },
      { status: 500 }
    );
  }
}
