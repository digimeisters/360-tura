'use client';

import { useEffect, useState } from 'react';
import type { HomeLang } from '../app/lib/homeCopy';
import { PROMO, isPromoActive, packagePrice, type PackageType } from '../app/lib/pricing';

/**
 * Cena na kartici paketa i nalepnica sa popustom, dok traje promocija.
 *
 * Zašto klijentski, a ne odmah u tekstu kartice (homeCopy): tekst kartica se
 * računa jednom, pri učitavanju modula, pa bi promo cena ostala na strani i
 * posle isteka kampanje - do sledećeg deploy-a. Ovako stranu koja stigne sa
 * servera uvek prati REDOVNA cena, a promo se uključi tek pošto klijent
 * proveri datum - pa se sam i isključi kad kampanja prođe.
 */

function usePromoActive(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(isPromoActive()), []);
  return active;
}

const DISCOUNT_LABEL = `−${Math.round(PROMO.discount * 100)}%`;

/** Okrugla nalepnica u uglu kartice, kao u prospektu. */
export function SaleSticker({ label }: { label?: string }) {
  const active = usePromoActive();
  if (!active) return null;
  return (
    <span className="price-sale" aria-label={label ?? DISCOUNT_LABEL}>
      {DISCOUNT_LABEL}
    </span>
  );
}

/**
 * Iznos na kartici: dok traje promocija veliki broj je snižena cena, a
 * redovna stoji precrtana pored - da se vidi i ušteda i prava vrednost.
 */
export function PlanPrice({
  count,
  packageType,
  from,
  unit,
  lang
}: {
  count: number;
  packageType: PackageType;
  /** "od" / "from" */
  from: string;
  /** "/ nekretnina", "/ mesečno (3 ture)" */
  unit: string;
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  const regular = packagePrice(count, packageType);
  const promo = packagePrice(count, packageType, true);

  return (
    <div className="price-value">
      {from} <b>{eur(active ? promo : regular)}</b>
      {active && (
        <s className="price-was" aria-label={lang === 'sr' ? 'redovna cena' : 'regular price'}>
          {eur(regular)}
        </s>
      )}
      <span>{unit}</span>
    </div>
  );
}
