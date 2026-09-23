'use client';

import { PRICE_TIERS, displayPerProperty, formatAmount, tierIndexFor, type PackageType, type PriceLang } from '../app/lib/pricing';
import { usePromoActive } from './usePromoActive';

/**
 * "od X din." - cena jedne nekretnine (tura + HDR) za dati broj nekretnina
 * mesečno. Dok traje promocija prikazuje sniženu cenu, posle redovnu -
 * datum se proverava na klijentu (usePromoActive), pa naslov ne ostane sa
 * starom cenom kad kampanja istekne.
 */
export default function FromPrice({
  count,
  pkg = 'basic',
  lang = 'sr',
  prefix
}: {
  count: number;
  pkg?: PackageType;
  lang?: PriceLang;
  prefix: string;
}) {
  const promo = usePromoActive();
  const tier = PRICE_TIERS[tierIndexFor(count)];
  return (
    <>
      {prefix}
      {formatAmount(displayPerProperty(tier, pkg, lang, promo), lang)}
    </>
  );
}
