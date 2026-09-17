'use client';

import type { HomeLang, RateAmount } from '../app/lib/homeCopy';
import {
  PRICE_TIERS,
  hdrPrice,
  packageDiscountPercent,
  packagePrice,
  tourPrice,
  type PackageType
} from '../app/lib/pricing';
import { usePromoActive } from './usePromoActive';

/**
 * Cena na kartici paketa i nalepnica sa popustom, dok traje promocija.
 *
 * Zašto klijentski, a ne odmah u tekstu kartice (homeCopy): tekst kartica se
 * računa jednom, pri učitavanju modula, pa bi promo cena ostala na strani i
 * posle isteka kampanje - do sledećeg deploy-a. Vidi usePromoActive.
 */

/**
 * Okrugla nalepnica u uglu kartice, kao u prospektu. Procenat se računa PO
 * PAKETU (count + packageType), a ne piše se paušalno "−30%": HDR fotografije
 * ne idu u popust (vidi hdrPrice), pa paket koji ih sadrži padne manje od
 * 30% - koliko manje zavisi od odnosa cene ture i HDR-a u datom stepenu.
 */
export function SaleSticker({
  count,
  packageType = 'basic',
  label
}: {
  count: number;
  packageType?: PackageType;
  label?: string;
}) {
  const active = usePromoActive();
  if (!active) return null;
  const percent = packageDiscountPercent(count, packageType);
  const text = `−${percent}%`;
  return (
    <span className="price-sale" aria-label={label ?? text}>
      {text}
    </span>
  );
}

/**
 * Cena jedne stavke cenovnika, za jednu nekretninu (prvi stepen obima).
 * Za više nekretnina mesečno cena pada - to pokazuju kartice paketa i
 * kalkulator ispod njih.
 */
function rateAmount(amount: RateAmount, promoActive: boolean): number {
  const tier = PRICE_TIERS[0];
  if (amount === 'hdr') return hdrPrice(tier, promoActive);
  return tourPrice(tier, amount === 'tourPremium' ? 'premium' : 'basic', promoActive);
}

/** Iznos u redu cenovnika - isto ponašanje kao PlanPrice, samo manji. */
export function ItemPrice({
  amount,
  unit,
  lang
}: {
  amount: RateAmount;
  unit: string;
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const eur = (n: number) => (lang === 'sr' ? `${n} €` : `€${n}`);

  const regular = rateAmount(amount, false);
  const promo = rateAmount(amount, true);
  // HDR se ne menja pod promocijom - regular === promo, pa nema šta da se
  // precrta. Precrtana ista cena pored sebe bi samo zbunila.
  const discounted = active && promo !== regular;

  return (
    <p className="rate-price">
      <b>{eur(discounted ? promo : regular)}</b>
      {discounted && (
        <s className="price-was" aria-label={lang === 'sr' ? 'redovna cena' : 'regular price'}>
          {eur(regular)}
        </s>
      )}
      <span>{unit}</span>
    </p>
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
