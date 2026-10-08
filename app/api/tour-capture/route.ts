import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * POST /api/tour-capture
 * ============================================================
 * "Pošaljite sebi link i tlocrt" (TourCapture.tsx): niži prag od "Zakaži
 * razgledanje" - samo jedan kontakt, bez termina, bez imena. Pojavljuje se
 * najviše jednom po poseti (useTourCaptureOffer, sessionStorage), na prvo
 * od tri mesta: Plan, Info ili pokušaj izlaska iz ture (vlasnik, 7. 10. 2026).
 *
 * Upis ide u istu tabelu kao "Zakaži razgledanje" (contact_requests,
 * source = "tour-capture:<slug>"), agent dobija email (ako ga ima), vlasnik
 * Telegram kopiju. Javna ruta, isto ograničenje kao ostale forme ture.
 */

const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const LANGS = new Set(['sr', 'en', 'de', 'ru']);
const LANG_NAMES: Record<string, string> = { en: 'engleskom', de: 'nemačkom', ru: 'ruskom' };
const CATEGORY_LABELS: Record<string, string> = { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Stan na dan' };
const WHERE_LABELS: Record<string, string> = { plan: 'tlocrtu', info: 'Info modulu', exit: 'izlasku iz ture' };

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

/** Isto pravilo kao na klijentu (TourCapture.tsx looksUsable): email ili bar 6 cifara. */
function looksLikeContact(value: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  return (value.match(/\d/g) ?? []).length >= 6;
}

export async function POST(req: Request) {
  const limit = rateLimit(req, 'tour-capture', RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSec, 'Previše zahteva u kratkom roku. Pokušajte ponovo za nekoliko minuta.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[api/tour-capture] nedostaju Supabase promenljive');
    return NextResponse.json({ success: false, error: 'server' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'invalid' }, { status: 400 });
  }

  const slug = clean(body.slug, 120);
  const contact = clean(body.contact, 160);
  const where = ['plan', 'info', 'exit'].includes(body.where) ? String(body.where) : 'plan';
  const lang = LANGS.has(body.lang) ? String(body.lang) : 'sr';

  if (!slug || !looksLikeContact(contact)) {
    return NextResponse.json({ success: false, error: 'invalid' }, { status: 400 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey);

  const { data: tour } = await supabase
    .from('tours')
    .select('slug, title, title_i18n, category, agency_name, agent_name, agent_email, published, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!tour || !tour.published || (tour.status && tour.status !== 'active')) {
    return NextResponse.json({ success: false, error: 'tour' }, { status: 404 });
  }

  const title = pickSr(tour.title_i18n) || tour.title || slug;
  const tourUrl = `${SITE_URL}/tour/${slug}`;
  const whereLabel = WHERE_LABELS[where] ?? where;
  const storedMessage = [
    `Ostavio kontakt u ${whereLabel}: ${title} (${tourUrl})`,
    lang !== 'sr' ? `Jezik posetioca: ${lang.toUpperCase()}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await supabase.from('contact_requests').insert({
    name: '—',
    contact,
    agency: tour.agency_name,
    listing_type: tour.category ? CATEGORY_LABELS[tour.category] ?? tour.category : null,
    message: storedMessage,
    source: `tour-capture:${slug}`
  });

  if (error) {
    console.error('[api/tour-capture] insert failed:', error.message);
    return NextResponse.json({ success: false, error: 'save' }, { status: 500 });
  }

  const emailStatus = await emailAgent({
    to: tour.agent_email,
    agentName: tour.agent_name,
    title,
    tourUrl,
    contact,
    whereLabel,
    lang
  });

  const lines = [
    '📩 <b>Ostavljen kontakt u turi</b>',
    `<a href="${escapeHtml(tourUrl)}">${escapeHtml(title)}</a>`,
    '',
    `Kontakt: <b>${escapeHtml(contact)}</b>`,
    `Mesto: ${escapeHtml(whereLabel)}`,
    ...(lang !== 'sr' ? [`🌐 Posetilac je gledao turu na ${LANG_NAMES[lang] ?? lang} - odgovoriti na tom jeziku`] : []),
    '',
    `Agent: ${escapeHtml([tour.agent_name, tour.agency_name].filter(Boolean).join(' · ') || '—')}`,
    emailStatus
  ];
  await sendTelegramMessage(lines.join('\n'));

  return NextResponse.json({ success: true });
}

/** Email agentu, kraća verzija od /api/viewing-request (bez termina). */
async function emailAgent(req: {
  to: string | null;
  agentName: string | null;
  title: string;
  tourUrl: string;
  contact: string;
  whereLabel: string;
  lang: string;
}): Promise<string> {
  if (!looksLikeEmail(req.to)) return '📧 Agent nema email u turi - prosledite mu kontakt.';

  const langText = req.lang !== 'sr' ? `Posetilac je gledao turu na ${LANG_NAMES[req.lang] ?? req.lang} - odgovorite na tom jeziku.` : '';
  const greeting = req.agentName ? `Zdravo, ${req.agentName}!` : 'Zdravo!';
  const e = escapeHtml;

  const text = [
    greeting,
    `Posetilac je ostavio kontakt u ${req.whereLabel}: ${req.title}`,
    '',
    `Kontakt: ${req.contact}`,
    ...(langText ? [langText] : []),
    '',
    `Tura: ${req.tourUrl}`,
    '',
    'Kvadrat360'
  ].join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:520px">
  <p style="margin:0 0 12px">${e(greeting)}</p>
  <p style="margin:0 0 4px;color:#1E5AA8;font-weight:700;letter-spacing:.04em;font-size:12px">OSTAVLJEN KONTAKT U TURI</p>
  <h2 style="margin:0 0 16px;font-size:20px"><a href="${e(req.tourUrl)}" style="color:#0f172a">${e(req.title)}</a></h2>
  <p style="margin:0 0 4px"><b>${e(req.contact)}</b></p>
  <p style="margin:0 0 4px;color:#64748b;font-size:13px">Ostavljeno u: ${e(req.whereLabel)}</p>
  ${langText ? `<p style="margin:8px 0 0">${e(langText)}</p>` : ''}
  <p style="margin:20px 0 0;font-size:13px;color:#64748b">Posetilac nije tražio termin - samo je ostavio kontakt da sačuva link i tlocrt. Javite mu se kad vam odgovara.</p>
</div>`;

  const result = await sendEmail({
    to: req.to.trim(),
    subject: `Kontakt iz ture: ${req.title}`,
    html,
    text
  });
  if (result.ok) return `📧 Email je poslat agentu (${escapeHtml(req.to.trim())}).`;
  return result.reason === 'not-configured'
    ? '📧 Email agentu nije podešen (RESEND_API_KEY) - prosledite mu kontakt.'
    : '📧 Email agentu nije prošao - prosledite mu kontakt.';
}
