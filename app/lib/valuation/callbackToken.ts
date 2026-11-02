import { checkLinkSignature, signLink } from '../signedLink.ts';

/**
 * Potpis za "Pozovite me za snimanje" posle procene: pregledač dobija leadId
 * i ovaj kod, pa samo onaj ko je dobio procenu može da zatraži poziv za taj
 * zahtev (ne može se pogađati tuđi id). Ključ: VALUATION_LINK_SECRET, a dok
 * ga nema - isti izvor kao link izveštaja agencije.
 */

const options = () => ({ length: 32, preferredKey: process.env.VALUATION_LINK_SECRET });

export function callbackToken(leadId: string): string {
  return signLink(`valuation-callback:${leadId}`, options());
}

export function verifyCallbackToken(leadId: string, token: string): boolean {
  return checkLinkSignature(`valuation-callback:${leadId}`, token, options());
}
