import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { describeSlot } from '@/app/lib/shootSlot';
import { SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * POST /api/viewing-request
 * ============================================================
 * "Zakaži razgledanje" iz ture: posetilac ostavi ime, telefon i željeni
 * termin. Upis ide u public.contact_requests (source = "tour:<slug>"), a
 * vlasniku stiže Telegram poruka sa podacima ture i agenta, da je
 * prosledi agentu. Termin je želja, ne rezervacija - potvrđuje se pozivom.
 *
 * Javna ruta, isto ograničenje kao /api/contact.
 */

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const LANGS = new Set(['sr', 'en', 'de', 'ru']);
const LANG_NAMES: Record<string, string> = { en: 'engleskom', de: 'nemačkom', ru: 'ruskom' };
const CATEGORY_LABELS: Record<string, string> = { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Stan na dan' };

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function pickSr(value: unknown): string {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, string>;
    return rec.sr || Object.values(rec)[0] || '';
  }
  return '';
}

export async function POST(req: Request) {
  const limit = rateLimit(req, 'viewing', RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSec, 'Previše zahteva u kratkom roku. Pokušajte ponovo za nekoliko minuta.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[api/viewing-request] nedostaju Supabase promenljive');
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'invalid' }, { status: 400 });
  }

  const slug = clean(body.slug, 120);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 60);
  const message = clean(body.message, 1000);
  const lang = LANGS.has(body.lang) ? String(body.lang) : 'sr';

  // Telefon mora imati bar 6 cifara - "abc" ili prazno nije broj za poziv.
  if (!slug || !name || (phone.match(/\d/g) ?? []).length < 6) {
    return NextResponse.json({ success: false, error: 'invalid' }, { status: 400 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey);

  // Samo objavljena, aktivna tura - izmišljen ili skinut slug se odbija.
  const { data: tour } = await supabase
    .from('tours')
    .select('slug, title, title_i18n, category, agency_name, agent_name, agent_phone, published, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!tour || !tour.published || (tour.status && tour.status !== 'active')) {
    return NextResponse.json({ success: false, error: 'tour' }, { status: 404 });
  }

  const title = pickSr(tour.title_i18n) || tour.title || slug;
  const slot = describeSlot(body.slotDate, body.slotWindow);
  const tourUrl = `${SITE_URL}/tour/${slug}`;
  const storedMessage = [
    `Razgledanje: ${title} (${tourUrl})`,
    slot ? `Željeni termin: ${slot}` : 'Termin nije izabran - dogovara se pozivom.',
    lang !== 'sr' ? `Jezik posetioca: ${lang.toUpperCase()}` : null,
    message ? `\n${message}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await supabase.from('contact_requests').insert({
    name,
    contact: phone,
    agency: tour.agency_name,
    listing_type: tour.category ? CATEGORY_LABELS[tour.category] ?? tour.category : null,
    message: storedMessage,
    source: `tour:${slug}`
  });

  if (error) {
    console.error('[api/viewing-request] insert failed:', error.message);
    return NextResponse.json({ success: false, error: 'save' }, { status: 500 });
  }

  // Zahtev je već u bazi - poruka je dodatak, njen neuspeh se ne vraća posetiocu.
  const lines = [
    '🏠 <b>Zahtev za razgledanje</b>',
    `<a href="${escapeHtml(tourUrl)}">${escapeHtml(title)}</a>`,
    '',
    `👤 <b>${escapeHtml(name)}</b>`,
    `📞 ${escapeHtml(phone)}`,
    slot ? `🗓 ${escapeHtml(slot)}` : '🗓 Termin nije izabran — dogovor pozivom',
    ...(lang !== 'sr' ? [`🌐 Posetilac je gledao turu na ${LANG_NAMES[lang] ?? lang} - odgovoriti na tom jeziku`] : []),
    ...(message ? ['', `💬 ${escapeHtml(message)}`] : []),
    '',
    `Agent: ${escapeHtml([tour.agent_name, tour.agent_phone, tour.agency_name].filter(Boolean).join(' · ') || '—')}`
  ];
  await sendTelegramMessage(lines.join('\n'));

  return NextResponse.json({ success: true });
}
