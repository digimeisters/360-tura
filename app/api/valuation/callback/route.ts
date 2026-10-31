import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { verifyCallbackToken } from '@/app/lib/valuation/callbackToken';
import { leadEstimate, leadProperty } from '@/app/lib/valuationLeadLabels';

export const dynamic = 'force-dynamic';

/**
 * POST /api/valuation/callback { leadId, token }
 *
 * "Da, pozovite me za snimanje ture" ispod rezultata procene: vlasnik ništa
 * ne kuca ponovo - telefon i nekretnina su već u zahtevu. Upisuje
 * callback_requested_at (migracija 043; admin "Procene" ga stavlja na vrh)
 * i odmah javlja vlasniku sajta na Telegram. Token je HMAC od leadId, pa se
 * ne može tražiti poziv za tuđi zahtev.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const limit = rateLimit(req, 'valuation-callback', 5, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec, 'Previše zahteva - pokušajte ponovo za nekoliko minuta.');

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = typeof body.leadId === 'string' && UUID_RE.test(body.leadId) ? body.leadId : null;
  const token = typeof body.token === 'string' ? body.token.slice(0, 64) : '';
  if (!leadId || !token || !verifyCallbackToken(leadId, token)) {
    return NextResponse.json({ success: false, error: 'Zahtev nije pronađen. Pozovite nas ili pišite preko kontakt forme.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ success: false, error: 'Nedostaje konfiguracija.' }, { status: 500 });
  const db = createClient(url, key);

  const { data: lead } = await db
    .from('property_valuation_leads')
    .select('id, contact_name, contact_phone, contact_email, property_type, neighborhood, city, estimated_low, estimated_high, listing_type, callback_requested_at')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ success: false, error: 'Zahtev nije pronađen.' }, { status: 404 });

  // Ponovljen klik ne šalje novu poruku.
  if (lead.callback_requested_at) return NextResponse.json({ success: true, already: true });

  const { error } = await db.from('property_valuation_leads').update({ callback_requested_at: new Date().toISOString() }).eq('id', leadId);
  if (error) return NextResponse.json({ success: false, error: 'Zahtev nije sačuvan. Pokušajte ponovo.' }, { status: 500 });

  const estimate = leadEstimate(lead);
  const notified = await sendTelegramMessage(
    [
      '🔥 <b>Vlasnik traži poziv za snimanje ture</b>',
      `${escapeHtml(lead.contact_name ?? 'Bez imena')} · ${escapeHtml(lead.contact_phone ?? lead.contact_email ?? '')}`,
      `${escapeHtml(leadProperty(lead))}${estimate ? ` · procena ${escapeHtml(estimate)}` : ''}`,
      'Admin → Procene'
    ].join('\n')
  );
  if (!notified) console.error('[api/valuation/callback] Telegram nije javio zahtev za poziv, lead:', leadId);

  return NextResponse.json({ success: true });
}
