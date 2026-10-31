import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Potpis za "Pozovite me za snimanje" posle procene: pregledač dobija leadId
 * i ovaj kod, pa samo onaj ko je dobio procenu može da zatraži poziv za taj
 * zahtev (ne može se pogađati tuđi id). Ključ: VALUATION_LINK_SECRET, a dok
 * ga nema - isti izvor kao link izveštaja agencije.
 */

function key(): string {
  const k = process.env.VALUATION_LINK_SECRET || process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('Nema ključa za potpis.');
  return k;
}

export function callbackToken(leadId: string): string {
  return createHmac('sha256', key()).update(`valuation-callback:${leadId}`).digest('base64url').slice(0, 32);
}

export function verifyCallbackToken(leadId: string, token: string): boolean {
  const expected = Buffer.from(callbackToken(leadId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
