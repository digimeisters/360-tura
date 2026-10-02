import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { describeSlot } from '@/app/lib/shootSlot';

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
    // Upit sa engleske početne (/en) - da se zna na kom jeziku odgovoriti.
    const fromEnglish = body.lang === 'en';
    // Forma sa /za-agencije (ContactForm variant="agency"): u "paketu" je broj
    // nekretnina mesečno, pa se u bazi i na Telegramu vidi da je upit agencije.
    const fromAgencyPage = body.from === 'agency';
    // Forma sa /za-investitore (variant="investor"): u "paketu" je broj stanova u projektu.
    const fromInvestorPage = body.from === 'investor';
    // Upit za konkretan stan sa strane projekta (/novogradnja/[slug]):
    // u "agenciji" je naziv projekta, u "paketu" oznaka stana i sprat.
    const fromProjectPage = body.from === 'project';
    // Željeni termin iz forme; tabela nema posebnu kolonu, pa se u bazi
    // čuva kao prvi red poruke, a na Telegramu ide u svoj red.
    const slot = describeSlot(body.slotDate, body.slotWindow);
    const storedMessage = slot
      ? `Željeni termin: ${slot}${message ? `\n\n${message}` : ''}`
      : message;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('contact_requests').insert({
      name,
      contact,
      package: pkg || null,
      agency: agency || null,
      listing_type: listingType || null,
      size: size || null,
      message: storedMessage || null,
      // Projekat pre jezika: upit sa engleske strane projekta je i dalje upit za stan.
      source: fromProjectPage ? 'novogradnja' : fromEnglish ? 'landing_en' : fromAgencyPage ? 'agencije' : fromInvestorPage ? 'investitori' : 'landing'
    });

    if (error) {
      console.error('[api/contact] insert failed:', error);
      return NextResponse.json(
        { success: false, error: 'Upit nije sačuvan. Pokušajte ponovo ili nas pozovite.' },
        { status: 500 }
      );
    }

    // Upit za stan ide i prodaji investitora: vidi ga na svojoj strani
    // (/prodaja/<kod>, migracija 021). Projekat i oznaka se čitaju iz baze po
    // unitId - ne veruje se nazivu koji šalje pregledač.
    let projectInquiry = false;
    if (fromProjectPage && typeof body.unitId === 'string' && /^[0-9a-f-]{36}$/i.test(body.unitId)) {
      const { data: unitRow } = await supabase.from('project_units').select('id, code, project_id').eq('id', body.unitId).maybeSingle();
      if (unitRow) {
        const { error: inqError } = await supabase.from('project_inquiries').insert({
          project_id: unitRow.project_id,
          unit_id: unitRow.id,
          unit_code: unitRow.code,
          name,
          contact,
          message: message || null,
          embedded: body.embedded === true,
          lang: fromEnglish ? 'en' : 'sr'
        });
        if (inqError) console.error('[api/contact] project inquiry failed:', inqError.message);
        else projectInquiry = true;
      }
    }

    // Upit je već u bazi - notifikacija je dodatak, njen neuspeh se ne
    // prosleđuje korisniku.
    const lines = [
      '🔔 <b>Novi upit — Kvadrat360</b>',
      '',
      `👤 <b>${escapeHtml(name)}</b>`,
      `📞 ${escapeHtml(contact)}`
    ];
    if (fromEnglish) lines.push('🌐 Sa engleske strane — odgovoriti na engleskom');
    if (fromAgencyPage) lines.push('🏢 Sa strane za agencije');
    if (fromInvestorPage) lines.push('🏗️ Sa strane za investitore');
    if (fromProjectPage) {
      lines.push(
        projectInquiry
          ? '🏢 Upit za stan u novogradnji - prodaja investitora ga vidi na svojoj strani'
          : '🏢 Upit za stan u novogradnji - proslediti prodaji investitora'
      );
    }
    if (fromProjectPage && body.embedded === true) lines.push('🌐 Poslato sa sajta investitora (ugrađeni izbor stana)');
    if (agency) lines.push(`🏢 ${escapeHtml(agency)}`);
    if (pkg) lines.push(`📦 ${escapeHtml(pkg)}`);
    if (listingType) lines.push(`🏷️ ${escapeHtml(listingType)}`);
    if (size) lines.push(`📐 ${escapeHtml(size)} m²`);
    if (slot) lines.push(`🗓 ${escapeHtml(slot)}`);
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
