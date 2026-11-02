import { randomInt } from 'crypto';
import { checkLinkSignature, signLink } from './signedLink.ts';

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
 * se samo promenom ključa (lib/signedLink.ts), što poništava i sve linkove
 * izveštaja.
 */

// Bez slova koja se mešaju sa ciframa ili jedna sa drugim (I/1, L, O/0, U/V),
// da se kod lako pročita i izdiktira preko telefona.
export const LIVE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LIVE_CODE_LENGTH = 6;

export function liveGuideToken(slug: string): string {
  return signLink(`live-guide:${slug}`);
}

export function isLiveGuideToken(slug: string, token: string): boolean {
  if (!slug || !token) return false;
  return checkLinkSignature(`live-guide:${slug}`, token);
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
