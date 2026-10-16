import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import {
  PRICE_MAX_AGE_DAYS,
  calculateEstimate,
  priceAgeDays,
  resolveBaseline,
  buildTypeFor
} from '@/app/lib/valuation/calculateEstimate';
import { getProjectAreaPrices } from '@/app/lib/valuation/projectPrices';
import {
  VALUATION_CONDITIONS,
  VALUATION_FURNISHING,
  VALUATION_LISTING_TYPES,
  VALUATION_PROPERTY_TYPES,
  VALUATION_SOURCES,
  type EstimateResponse,
  type EstimateResult,
  type PriceBaseline,
  type ValuationCondition,
  type ValuationFurnishing,
  type ValuationPropertyType,
  type ValuationSource
} from '@/app/lib/valuation/types';

export const dynamic = 'force-dynamic';

// Isto kao /api/contact: čovek pošalje jednu-dve procene, skript stotine.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const MIN_SQM = 10;
const MAX_SQM = 5000;
const CURRENT_YEAR = new Date().getFullYear();

const TYPE_LABEL: Record<ValuationPropertyType, string> = {
  apartment: 'Stan',
  house: 'Kuća',
  commercial: 'Poslovni prostor'
};

const CONDITION_LABEL: Record<ValuationCondition, string> = {
  needs_renovation: 'Za renoviranje',
  maintained: 'Održavano',
  renovated: 'Renovirano',
  new_build: 'Novogradnja'
};

const FURNISHING_LABEL: Record<ValuationFurnishing, string> = {
  furnished: 'Namešteno',
  semi_furnished: 'Polunamešteno',
  unfurnished: 'Prazno'
};

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

// Srpski i strani brojevi: cifre uz razmake, crtice, kose crte, zagrade i
// vodeći +. Dovoljno da se odbije "asdf", ne i da se potvrdi da broj postoji.
function looksLikePhone(value: string): boolean {
  if (!/^\+?[\d\s\-/().]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatEur(value: number): string {
  return `${value.toLocaleString('de-DE')} €`;
}

function fail(status: number, error: string) {
  return NextResponse.json<EstimateResponse>({ success: false, error }, { status });
}

/**
 * ============================================================
 * POST /api/valuation/estimate
 * ============================================================
 * Gruba procena vrednosti ili kirije sa /alati/procena-vrednosti. Računa
 * raspon iz zone_price_baselines, upisuje lead u property_valuation_leads
 * (sa upotrebljenim cenama po m², radi kasnije provere) i javlja ga na
 * Telegram.
 *
 * Kad za grad nema nijednog reda cena, lead se ipak čuva, a estimate je
 * null - stranica tada kaže da procenu šaljemo ručno, umesto da izmisli broj.
 *
 * Obe tabele su zatvorene RLS-om (migracija 029), pa ruta MORA da ima
 * SUPABASE_SERVICE_ROLE_KEY - anon ključ ovde namerno nije rezerva.
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, 'valuation', RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.ok) {
      return tooManyRequests(
        limit.retryAfterSec,
        'Previše zahteva u kratkom roku. Pokušajte ponovo za nekoliko minuta.'
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('[api/valuation] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return fail(500, 'Procena trenutno nije dostupna. Pozovite nas ili pokušajte kasnije.');
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail(400, 'Neispravan zahtev.');
    }

    // --- 1. Validacija ---
    const city = text(body.city, 80);
    const neighborhood = text(body.neighborhood, 120);
    const contactName = text(body.contactName, 120);
    const contactPhone = text(body.contactPhone, 40);
    const contactEmail = text(body.contactEmail, 160);
    const utmCampaign = text(body.utmCampaign, 120);

    // Stari klijent (pre izdavanja) ne šalje listingType - to je prodaja.
    const listingType = body.listingType === undefined ? 'sale' : body.listingType;
    if (!isOneOf(VALUATION_LISTING_TYPES, listingType)) return fail(400, 'Izaberite prodaju ili izdavanje.');
    // Nameštenost ima smisla samo za izdavanje; za prodaju se ne čuva.
    const furnishing: ValuationFurnishing | null =
      listingType === 'rent' && isOneOf(VALUATION_FURNISHING, body.furnishing) ? body.furnishing : null;

    if (!city || !neighborhood) return fail(400, 'Grad i naselje su obavezni.');
    if (!isOneOf(VALUATION_PROPERTY_TYPES, body.propertyType)) return fail(400, 'Izaberite tip nekretnine.');
    if (!isOneOf(VALUATION_CONDITIONS, body.condition)) return fail(400, 'Izaberite stanje nekretnine.');
    const propertyType = body.propertyType;
    const condition = body.condition;

    const sqm = optionalNumber(body.sqm);
    if (sqm === null || sqm < MIN_SQM || sqm > MAX_SQM) {
      return fail(400, `Kvadratura mora biti između ${MIN_SQM} i ${MAX_SQM} m².`);
    }

    const rooms = optionalNumber(body.rooms);
    if (rooms !== null && (rooms < 0 || rooms > 50)) return fail(400, 'Proverite broj soba.');

    // Sprat ima smisla samo za stan; za ostale se ne čuva ni ne računa.
    const floorRaw = propertyType === 'apartment' ? optionalNumber(body.floorNumber) : null;
    if (floorRaw !== null && (!Number.isInteger(floorRaw) || floorRaw < -2 || floorRaw > 60)) {
      return fail(400, 'Proverite sprat.');
    }
    const floorNumber = floorRaw;
    const hasElevator = propertyType === 'apartment' && typeof body.hasElevator === 'boolean' ? body.hasElevator : null;

    const buildYear = optionalNumber(body.buildYear);
    if (buildYear !== null && (!Number.isInteger(buildYear) || buildYear < 1800 || buildYear > CURRENT_YEAR + 5)) {
      return fail(400, 'Proverite godinu izgradnje.');
    }

    const hasParking = body.hasParking === true;
    const hasTerrace = body.hasTerrace === true;

    if (!contactName) return fail(400, 'Ime i prezime su obavezni.');
    if (!contactPhone || !looksLikePhone(contactPhone)) return fail(400, 'Unesite ispravan broj telefona.');
    if (contactEmail && !looksLikeEmail(contactEmail)) return fail(400, 'Proverite email adresu.');

    const source: ValuationSource = isOneOf(VALUATION_SOURCES, body.source) ? body.source : 'organic';

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- 2. Cene za grad (malo redova - filtriranje po naselju je u JS-u,
    //        da poređenje bude neosetljivo na velika/mala slova) ---
    const { data: baselineRows, error: baselineError } = await supabase
      .from('zone_price_baselines')
      .select('city, neighborhood, property_type, listing_type, build_type, price_per_sqm_low, price_per_sqm_high, updated_at')
      .eq('property_type', propertyType)
      .eq('listing_type', listingType)
      .ilike('city', city.replace(/[\\%_]/g, (ch) => `\\${ch}`));

    if (baselineError) {
      console.error('[api/valuation] baseline lookup failed:', baselineError.message);
    }

    // Stan na prodaju: cenovnici naših projekata (bar 2 u naselju) imaju
    // prednost nad oglasima za novogradnju - app/lib/valuation/projectPrices.ts.
    let rows = (baselineRows ?? []) as (PriceBaseline & { updated_at?: string | null })[];
    if (propertyType === 'apartment' && listingType === 'sale') {
      const fromProjects = await getProjectAreaPrices(supabase, city);
      if (fromProjects.length) {
        const own = new Set(fromProjects.map((p) => p.neighborhood.toLowerCase()));
        rows = [
          ...rows.filter((r) => !((r.build_type ?? 'any') === 'new' && own.has(r.neighborhood.toLowerCase()))),
          ...fromProjects.map((p) => ({
            city,
            neighborhood: p.neighborhood,
            property_type: 'apartment' as const,
            listing_type: 'sale' as const,
            build_type: 'new' as const,
            price_per_sqm_low: p.low,
            price_per_sqm_high: p.high,
            updated_at: p.updatedAt
          }))
        ];
      }
    }

    // --- 3. Raspon (stan na prodaju: cena novogradnje ili starogradnje) ---
    const baseline = resolveBaseline(
      rows,
      city,
      neighborhood,
      propertyType,
      listingType,
      buildTypeFor(propertyType, listingType, condition)
    );
    const estimate: EstimateResult | null = baseline
      ? calculateEstimate(baseline, {
          listingType,
          propertyType,
          furnishing,
          sqm,
          condition,
          floorNumber,
          hasElevator,
          hasParking,
          hasTerrace
        })
      : null;

    // --- 4. Lead ---
    const { data: lead, error: insertError } = await supabase
      .from('property_valuation_leads')
      .insert({
        listing_type: listingType,
        furnishing,
        city,
        neighborhood,
        property_type: propertyType,
        sqm,
        rooms,
        floor_number: floorNumber,
        has_elevator: hasElevator,
        build_year: buildYear,
        condition,
        has_parking: hasParking,
        has_terrace: hasTerrace,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail || null,
        estimated_low: estimate?.low ?? null,
        estimated_high: estimate?.high ?? null,
        // Dve decimale: kirija je par evra po m², ceo broj bi 6,5 zapisao kao 7.
        price_per_sqm_used_low: baseline ? Math.round(baseline.pricePerSqmLow * 100) / 100 : null,
        price_per_sqm_used_high: baseline ? Math.round(baseline.pricePerSqmHigh * 100) / 100 : null,
        baseline_source: baseline?.source ?? null,
        source,
        utm_campaign: utmCampaign || null
      })
      .select('id')
      .single();

    if (insertError || !lead) {
      console.error('[api/valuation] lead insert failed:', insertError?.message);
      return fail(500, 'Procena nije sačuvana. Pokušajte ponovo ili nas pozovite.');
    }

    // --- 5. Notifikacija (best effort, lead je već u bazi) ---
    const isRent = listingType === 'rent';
    const lines = [
      isRent
        ? '🔑 <b>Nova procena kirije (izdavanje) — Kvadrat360</b>'
        : '🏷️ <b>Nova procena vrednosti (prodaja) — Kvadrat360</b>',
      '',
      `👤 <b>${escapeHtml(contactName)}</b>`,
      `📞 ${escapeHtml(contactPhone)}`
    ];
    if (contactEmail) lines.push(`✉️ ${escapeHtml(contactEmail)}`);
    lines.push(
      '',
      `🏠 ${TYPE_LABEL[propertyType]}, ${escapeHtml(neighborhood)}, ${escapeHtml(city)}`,
      `📐 ${sqm} m²${rooms !== null ? ` · ${rooms} ${propertyType === 'commercial' ? 'prostorija' : 'sobe'}` : ''}${floorNumber !== null ? ` · sprat ${floorNumber}` : ''}`,
      `🔧 ${CONDITION_LABEL[condition]}${buildYear !== null ? ` · ${buildYear}.` : ''}${furnishing ? ` · ${FURNISHING_LABEL[furnishing]}` : ''}`,
      `🚗 Parking: ${hasParking ? 'da' : 'ne'} · 🌿 Terasa: ${hasTerrace ? 'da' : 'ne'}`,
      '',
      estimate
        ? `💶 ${isRent ? 'Kirija' : 'Procena'}: ${formatEur(estimate.low)} – ${formatEur(estimate.high)}${isRent ? ' mesečno' : ''}${baseline?.build === 'new' ? ' · cene novogradnje' : baseline?.build === 'old' ? ' · cene starogradnje' : ''}${baseline?.source === 'city_average' ? ' (prosek grada)' : ''}`
        : '⚠️ Nema cena za ovu lokaciju — procenu poslati ručno'
    );
    // Podsetnik za osvežavanje cena stiže tamo gde se i vidi - uz zahtev.
    const ageDays = priceAgeDays((baselineRows ?? []).map((row) => row.updated_at as string | null));
    if (ageDays !== null && ageDays > PRICE_MAX_AGE_DAYS) {
      lines.push(`⏰ Cene po m² su stare ${ageDays} dana (rok ${PRICE_MAX_AGE_DAYS}) — pokrenuti npm run prices:refresh`);
    }
    if (source !== 'organic' || utmCampaign) {
      lines.push(`📣 ${source}${utmCampaign ? ` / ${escapeHtml(utmCampaign)}` : ''}`);
    }
    await sendTelegramMessage(lines.join('\n'));

    // --- 6. Odgovor ---
    return NextResponse.json<EstimateResponse>({ success: true, estimate, leadId: lead.id });
  } catch (err) {
    console.error('[api/valuation] unexpected error:', err);
    return fail(500, 'Neočekivana greška. Pokušajte ponovo.');
  }
}
