/**
 * Nazivi za admin stranu "Procene" (zahtevi sa /alati/procena-vrednosti) i
 * mejl ponude vlasniku. Bez serverskih uvoza - koristi ih i pregledač.
 */

export type LeadStatus = 'new' | 'contacted' | 'tour_offered' | 'converted' | 'lost';
export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'tour_offered', 'converted', 'lost'];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novi',
  contacted: 'Pozvan',
  tour_offered: 'Ponuđena tura',
  converted: 'Dogovoreno',
  lost: 'Odustao'
};

export const TYPE_LABELS: Record<string, string> = { apartment: 'Stan', house: 'Kuća', commercial: 'Poslovni prostor' };
export const CONDITION_LABELS: Record<string, string> = {
  needs_renovation: 'za renoviranje',
  maintained: 'održavano',
  renovated: 'renovirano',
  new_build: 'novogradnja'
};
export const FURNISHING_LABELS: Record<string, string> = { furnished: 'namešteno', semi_furnished: 'polunamešteno', unfurnished: 'prazno' };

export type ValuationLead = {
  id: string;
  created_at: string;
  city: string | null;
  neighborhood: string | null;
  property_type: string | null;
  sqm: number | null;
  rooms: number | null;
  floor_number: number | null;
  has_elevator: boolean | null;
  build_year: number | null;
  condition: string | null;
  has_parking: boolean | null;
  has_terrace: boolean | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  estimated_low: number | null;
  estimated_high: number | null;
  price_per_sqm_used_low: number | null;
  price_per_sqm_used_high: number | null;
  baseline_source: string | null;
  status: LeadStatus;
  agent_note: string | null;
  source: string | null;
  utm_campaign: string | null;
  listing_type: string | null;
  furnishing: string | null;
  /** Vlasnik je posle procene kliknuo "Da, pozovite me za snimanje" (migracija 043). */
  callback_requested_at: string | null;
};

const eur = (n: number) => `${Math.round(n).toLocaleString('sr-RS')} €`;

/** "Stan · Bubanj" */
export function leadProperty(l: Pick<ValuationLead, 'property_type' | 'neighborhood' | 'city'>): string {
  return [TYPE_LABELS[l.property_type ?? ''] ?? 'Nekretnina', l.neighborhood || l.city].filter(Boolean).join(' · ');
}

/** "78.000 – 86.000 €" (prodaja) ili "300 – 350 € mesečno" (izdavanje); null bez procene. */
export function leadEstimate(l: Pick<ValuationLead, 'estimated_low' | 'estimated_high' | 'listing_type'>): string | null {
  if (l.estimated_low == null || l.estimated_high == null) return null;
  const range = `${Math.round(Number(l.estimated_low)).toLocaleString('sr-RS')} – ${eur(Number(l.estimated_high))}`;
  return l.listing_type === 'rent' ? `${range} mesečno` : range;
}
