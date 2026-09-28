import { Fragment, type ReactNode } from 'react';

/**
 * Naglašen deo naslova: tekst između zvezdica ide u <em>, koji sajt crta
 * kurzivom sa serifima u akcentnoj boji (SITE_STYLES). U tekstovima
 * (homeCopy, agencyCopy...) zato piše npr. "Prošetajte kroz *pravu turu*".
 *
 * Za mesta gde naslov mora da bude čist tekst (metapodaci, JSON-LD) služi
 * plainAccent - samo skida zvezdice.
 */
// Naglašena fraza do ove dužine se ne lomi (klasa .keep u SITE_STYLES): ako
// ne staje u red, prelazi cela u sledeći - "već imaju brojke." ostaje zajedno
// umesto da "već" visi na kraju reda (vlasnik, 28. 9. 2026). Duža fraza se
// lomi normalno, da na uskom ekranu ne izađe van strane.
const KEEP_TOGETHER_MAX = 24;

export function accent(text: string): ReactNode {
  const parts = text.split('*');
  if (parts.length < 3) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className={part.length <= KEEP_TOGETHER_MAX ? 'keep' : undefined}>
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function plainAccent(text: string): string {
  return text.replace(/\*/g, '');
}
