import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Zajednički potpis za tajne linkove bez prijave. SAMO SERVER.
 *
 * Koriste ga: izveštaj agencije i investitora, link za vođenje uživo,
 * pregled projekta pre objave, odjava od "Obavesti me" i "Pozovite me"
 * posle procene. Svaki pozivalac dodaje svoj prefiks poruci
 * ("agency-report:", "live-guide:"...), pa potpis jednog linka ne važi za
 * drugu vrstu, iako svi dele ključ.
 *
 * Ključ: REPORT_LINK_SECRET, a dok ga nema, service-role ključ (jednosmerno -
 * iz potpisa se ključ ne može saznati). Promena ključa poništava sve poslate
 * linkove, pa se postavlja jednom i ne dira.
 */

const DEFAULT_LENGTH = 24;

type SignOptions = {
  /** Dužina potpisa u base64url znakovima. */
  length?: number;
  /** Poseban ključ jedne vrste linka; bez njega važi zajednički. */
  preferredKey?: string;
};

function signingKey(preferredKey?: string): string {
  const key = preferredKey || process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Nema ključa za potpis linka.');
  return key;
}

export function signLink(message: string, { length = DEFAULT_LENGTH, preferredKey }: SignOptions = {}): string {
  return createHmac('sha256', signingKey(preferredKey)).update(message).digest('base64url').slice(0, length);
}

/** Poređenje u stalnom vremenu, da se potpis ne može pogađati znak po znak. */
export function checkLinkSignature(message: string, signature: string, options?: SignOptions): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signLink(message, options));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
