import { Fragment, type ReactNode } from 'react';

/**
 * Naglašen deo naslova: tekst između zvezdica ide u <em>, koji sajt crta
 * kurzivom sa serifima u akcentnoj boji (SITE_STYLES). U tekstovima
 * (homeCopy, agencyCopy...) zato piše npr. "Prošetajte kroz *pravu turu*".
 *
 * Za mesta gde naslov mora da bude čist tekst (metapodaci, JSON-LD) služi
 * plainAccent - samo skida zvezdice.
 */
export function accent(text: string): ReactNode {
  const parts = text.split('*');
  if (parts.length < 3) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
  );
}

export function plainAccent(text: string): string {
  return text.replace(/\*/g, '');
}
