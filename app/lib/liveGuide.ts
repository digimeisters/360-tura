import { createHmac, randomInt, timingSafeEqual } from 'crypto';

/**
 * Razgledanje uživo (tura sa ?agent=<token>). SAMO SERVER.
 *
 * Agent nema nalog - dobija tajni link za turu, isti obrazac kao link
 * mesečnog izveštaja (lib/agencyReport.ts). Token je potpis (HMAC) nad
 * imenom ture, pa se ne može pogoditi niti prepraviti na tuđu turu. Prefiks
 * "live-guide:" drži ove potpise odvojenim od linkova izveštaja, iako dele
 * isti ključ.
 *
 * Link je stalan za turu: agent ga čuva i koristi za svako gledanje. Opoziva
 * se samo promenom ključa (REPORT_LINK_SECRET), što poništava i sve linkove
 * izveštaja.
 */

const TOKEN_SIG_LENGTH = 24;

// Bez slova koja se mešaju sa ciframa ili jedna sa drugim (I/1, L, O/0, U/V),
// da se kod lako pročita i izdiktira preko telefona.
export const LIVE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LIVE_CODE_LENGTH = 6;

function signingKey(): string {
  const key = process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Nema ključa za potpis linka za vođenje.');
  return key;
}

export function liveGuideToken(slug: string): string {
  return createHmac('sha256', signingKey())
    .update(`live-guide:${slug}`)
    .digest('base64url')
    .slice(0, TOKEN_SIG_LENGTH);
}

export function isLiveGuideToken(slug: string, token: string): boolean {
  if (!slug || !token) return false;
  const expected = Buffer.from(liveGuideToken(slug));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Kod jednog gledanja (deo kupčevog linka i imena Realtime kanala). Ne
 * upisuje se nigde - važi dok su agent i kupac na kanalu.
 */
export function newLiveCode(): string {
  let code = '';
  for (let i = 0; i < LIVE_CODE_LENGTH; i++) code += LIVE_CODE_ALPHABET[randomInt(LIVE_CODE_ALPHABET.length)];
  return code;
}
