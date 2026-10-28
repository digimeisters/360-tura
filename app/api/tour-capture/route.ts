import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { overDailyBudget } from '@/app/lib/dailyBudget';
import { CONTACT, SITE_URL } from '@/app/lib/site';
import { getShowcaseTours } from '@/app/lib/showcaseTours';
import { fetchFloorplanImage } from '@/app/lib/floorplanImage';
import { tourContactEmail, type TourContactEmail } from '@/app/lib/emails/tourContact';
import { visitorLinkPlanEmail } from '@/app/lib/emails/visitorLinkPlan';

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
 * Telegram kopiju. Ako je kontakt mejl adresa, posetilac odmah dobija link i
 * tlocrt (emails/visitorLinkPlan.ts); za broj telefona link šalje agent.
 * Javna ruta, isto ograničenje kao ostale forme ture.
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
    .select('slug, title, title_i18n, category, agency_name, agent_name, agent_email, agent_phone, floorplan_url, published, status')
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

  const contactIsEmail = looksLikeEmail(contact);
  // Naslov, slika, sobe i tlocrt ture na jeziku posetioca (isti izvor kao sajt).
  const shown = (await getShowcaseTours(lang).catch(() => null))?.find((t) => t.slug === slug) ?? null;

  // Posetilac koji je ostavio mejl dobija link i tlocrt odmah (visitorLinkPlan.ts).
  // Preko dnevne granice ne - adresu je mogao da upiše bilo ko.
  let visitorEmailed = false;
  let visitorStatus = '';
  if (contactIsEmail) {
    if (await overDailyBudget('visitorEmail')) {
      visitorStatus = '⚠️ Mejl posetiocu NIJE poslat - dnevna granica (moguća zloupotreba).';
    } else {
      const plan = await fetchFloorplanImage(tour.floorplan_url, slug);
      const visitor = visitorLinkPlanEmail({
        lang,
        title: shown?.title || title,
        tourUrl,
        coverUrl: shown?.coverUrl ?? null,
        roomCount: shown?.roomCount ?? 0,
        planImageUrl: plan?.url ?? null,
        planIsSchematic: Boolean(tour.floorplan_url?.includes('/floorplan-schematic.')),
        agentName: tour.agent_name,
        agency: tour.agency_name,
        agentPhone: tour.agent_phone
      });
      const sent = await sendEmail({
        to: contact,
        ...visitor,
        // Odgovor posetioca ide agentu, a bez agentovog mejla na info@.
        replyTo: looksLikeEmail(tour.agent_email) ? tour.agent_email.trim() : CONTACT.email,
        attachments: plan ? [{ filename: plan.filename, content: plan.base64 }] : undefined
      });
      visitorEmailed = sent.ok;
      visitorStatus = sent.ok
        ? `📨 Posetiocu je poslat link${plan ? ' i tlocrt' : ''}.`
        : '📨 Mejl posetiocu nije prošao - agent mu šalje link.';
    }
  }

  // Preko dnevne granice kontakt ostaje u bazi i na Telegramu, bez mejla agentu.
  const emailStatus = (await overDailyBudget('agentEmail'))
    ? '⚠️ Mejl agentu NIJE poslat - dnevna granica mejlova (moguća zloupotreba). Proslediti ručno ako je pravi kontakt.'
    : await emailAgent(tour.agent_email, {
        agentName: tour.agent_name,
        title,
        tourUrl,
        coverUrl: shown?.coverUrl ?? null,
        areaSqm: shown?.areaSqm ?? null,
        roomCount: shown?.roomCount ?? 0,
        contact,
        contactIsEmail,
        where,
        lang,
        visitorEmailed,
        hasPlan: Boolean(tour.floorplan_url)
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
    emailStatus,
    ...(visitorStatus ? [visitorStatus] : [])
  ];
  await sendTelegramMessage(lines.join('\n'));

  // `emailed` kaže turi koju poruku da prikaže: "poslali smo vam" ili "agent će vam poslati".
  return NextResponse.json({ success: true, emailed: visitorEmailed });
}

/** Mejl agentu (emails/tourContact.ts); vraća red za Telegram. */
async function emailAgent(to: string | null, data: TourContactEmail): Promise<string> {
  if (!looksLikeEmail(to)) return '📧 Agent nema email u turi - prosledite mu kontakt.';

  const result = await sendEmail({ to: to.trim(), ...tourContactEmail(data) });
  if (result.ok) return `📧 Email je poslat agentu (${escapeHtml(to.trim())}).`;
  return result.reason === 'not-configured'
    ? '📧 Email agentu nije podešen (RESEND_API_KEY) - prosledite mu kontakt.'
    : '📧 Email agentu nije prošao - prosledite mu kontakt.';
}
