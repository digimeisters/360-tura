import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { getShowcaseTours, HERO_TOUR_SLUG } from '@/app/lib/showcaseTours';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { ownerTourOfferEmail, ownerTourOfferViber } from '@/app/lib/emails/ownerTourOffer';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { CONTACT, SITE_URL } from '@/app/lib/site';
import { PRICE_TIERS, displayPerProperty, formatAmount, isPromoActive } from '@/app/lib/pricing';
import { LEAD_STATUSES, leadEstimate, leadProperty, type LeadStatus, type ValuationLead } from '@/app/lib/valuationLeadLabels';

export const dynamic = 'force-dynamic';

/**
 * Admin "Procene": zahtevi za procenu vrednosti (property_valuation_leads,
 * migracija 029) - spisak, status i beleška, i "Pošalji ponudu za turu".
 *
 *  GET                         - poslednjih 500 zahteva
 *  PATCH { id, status?, note? } - status i beleška
 *  POST  { id, channel }       - ponuda za turu: 'email' šalje mejl (Resend),
 *                                'viber' vraća gotovu poruku za Viber;
 *                                u oba slučaja status postaje "Ponuđena tura"
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS =
  'id, created_at, city, neighborhood, property_type, sqm, rooms, floor_number, has_elevator, build_year, condition, has_parking, has_terrace, contact_name, contact_phone, contact_email, estimated_low, estimated_high, price_per_sqm_used_low, price_per_sqm_used_high, baseline_source, status, agent_note, source, utm_campaign, listing_type, furnishing, callback_requested_at';

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { data, error } = await ctx.supabase
    .from('property_valuation_leads')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ success: false, error: 'Zahtevi nisu učitani.' }, { status: 500 });
  return NextResponse.json({ success: true, leads: data ?? [] });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ success: false, error: 'Nedostaje zahtev.' }, { status: 400 });
  const changes: { status?: LeadStatus; agent_note?: string | null } = {};
  if (LEAD_STATUSES.includes(body.status as LeadStatus)) changes.status = body.status as LeadStatus;
  if (typeof body.note === 'string') changes.agent_note = body.note.trim().slice(0, 2000) || null;
  if (!Object.keys(changes).length) return NextResponse.json({ success: false, error: 'Nema izmena.' }, { status: 400 });
  const { data, error } = await ctx.supabase.from('property_valuation_leads').update(changes).eq('id', id).select(COLUMNS).single();
  if (error) return NextResponse.json({ success: false, error: 'Izmena nije sačuvana.' }, { status: 500 });
  return NextResponse.json({ success: true, lead: data });
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  const channel = body.channel === 'viber' ? 'viber' : 'email';
  if (!id) return NextResponse.json({ success: false, error: 'Nedostaje zahtev.' }, { status: 400 });

  const { data: row } = await ctx.supabase.from('property_valuation_leads').select(COLUMNS).eq('id', id).maybeSingle();
  const lead = row as ValuationLead | null;
  if (!lead) return NextResponse.json({ success: false, error: 'Zahtev nije pronađen.' }, { status: 404 });

  const tours = await getShowcaseTours('sr').catch(() => null);
  const tour = tours?.find((t) => t.slug === HERO_TOUR_SLUG) ?? tours?.[0];
  if (!tour) return NextResponse.json({ success: false, error: 'Baza trenutno ne odgovara - pokušajte ponovo za minut.' }, { status: 503 });

  const offer = {
    name: lead.contact_name?.trim().split(/\s+/)[0] || null,
    listingType: lead.listing_type === 'rent' ? ('rent' as const) : ('sale' as const),
    property: leadProperty(lead),
    estimate: leadEstimate(lead),
    tourTitle: tour.title,
    tourUrl: `${SITE_URL}/tour/${tour.slug}?utm_source=ponuda-vlasniku`,
    coverUrl: tour.coverUrl,
    roomCount: tour.roomCount
  };

  let viberText: string | null = null;
  if (channel === 'email') {
    if (!looksLikeEmail(lead.contact_email)) {
      return NextResponse.json({ success: false, error: 'Vlasnik nije ostavio mejl - pošaljite ponudu Viberom.' }, { status: 400 });
    }
    const result = await sendEmail({ to: lead.contact_email.trim(), ...ownerTourOfferEmail(offer), replyTo: CONTACT.email });
    if (!result.ok) {
      const error =
        result.reason === 'not-configured' ? 'Slanje mejlova nije podešeno na serveru (RESEND_API_KEY).' : 'Mejl nije prošao kroz Resend - pokušajte ponovo za minut.';
      return NextResponse.json({ success: false, error }, { status: 502 });
    }
  } else {
    const price = formatAmount(displayPerProperty(PRICE_TIERS[0], 'basic', 'sr', isPromoActive()), 'sr');
    viberText = ownerTourOfferViber(offer, price);
  }

  const { data: updated } = await ctx.supabase
    .from('property_valuation_leads')
    .update({ status: 'tour_offered' })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  await sendTelegramMessage(
    [`✉️ <b>Ponuda za turu vlasniku</b> (${channel === 'email' ? 'mejl' : 'Viber'})`, `${escapeHtml(lead.contact_name ?? '')} · ${escapeHtml(offer.property)}`].join('\n')
  ).catch(() => false);

  return NextResponse.json({ success: true, lead: updated ?? lead, viberText });
}
