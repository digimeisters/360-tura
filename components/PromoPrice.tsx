'use client';

import type { HomeLang, PlanItem, PlanLineAmount, PricingLabels, RateAmount } from '../app/lib/homeCopy';
import {
  PRICE_TIERS,
  displayHdrPrice,
  displayPackagePrice,
  displayPerProperty,
  displayPremiumExtra,
  displayTourPrice,
  formatAmount,
  inDisplayCurrency,
  packageDiscountPercent,
  standaloneHdrPrice,
  tierIndexFor,
  tierLabel,
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
 * PAKETU (count + packageType) i u valuti te strane, a ne piše se paušalno
 * "−30%": zbog zaokruživanja po stavci stvarni pad zna da odstupi.
 */
export function SaleSticker({
  count,
  packageType = 'basic',
  lang,
  label
}: {
  count: number;
  packageType?: PackageType;
  lang: HomeLang;
  label?: string;
}) {
  const active = usePromoActive();
  if (!active) return null;
  const percent = packageDiscountPercent(count, packageType, lang);
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
 *
 * HDR ovde je uvek standardna cena, bez popusta: ovaj red predstavlja
 * fotografije naručene SAME, ne kao deo paketa - vidi standaloneHdrPrice.
 */
function rateAmount(amount: RateAmount, lang: HomeLang, promoActive: boolean): number {
  const tier = PRICE_TIERS[0];
  if (amount === 'hdr') return inDisplayCurrency(standaloneHdrPrice(tier), lang);
  return displayTourPrice(tier, amount === 'tourPremium' ? 'premium' : 'basic', lang, promoActive);
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
  const price = (n: number) => formatAmount(n, lang);

  const regular = rateAmount(amount, lang, false);
  const promo = rateAmount(amount, lang, true);
  // HDR se ne menja pod promocijom - regular === promo, pa nema šta da se
  // precrta. Precrtana ista cena pored sebe bi samo zbunila.
  const discounted = active && promo !== regular;

  return (
    <p className="rate-price">
      <b>{price(discounted ? promo : regular)}</b>
      {discounted && (
        <s className="price-was" aria-label={lang === 'sr' ? 'redovna cena' : 'regular price'}>
          {price(regular)}
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
  count = 1,
  packageType,
  from,
  unit,
  lang
}: {
  count?: number;
  packageType: PackageType;
  /** "od" / "from" - izostavlja se kad je cena tačna, ne početna. */
  from?: string;
  /** "/ nekretnina" */
  unit: string;
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const price = (n: number) => formatAmount(n, lang);

  const regular = displayPackagePrice(count, packageType, lang);
  const promo = displayPackagePrice(count, packageType, lang, true);

  return (
    <div className="price-value">
      {from && `${from} `}<b>{price(active ? promo : regular)}</b>
      {active && (
        <s className="price-was" aria-label={lang === 'sr' ? 'redovna cena' : 'regular price'}>
          {price(regular)}
        </s>
      )}
      <span>{unit}</span>
    </div>
  );
}

/**
 * Iznos u stavci kartice paketa ("360° tura — X po turi"). Dok traje
 * promocija pokazuje promo cenu, kao i veliki broj iznad - inače bi stavke
 * pokazivale redovne cene, a zbir iznad sniženu, pa se ne bi sabirale.
 */
export function PlanLinePrice({
  amount,
  count,
  lang
}: {
  amount: PlanLineAmount;
  count: number;
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const tier = PRICE_TIERS[tierIndexFor(count)];
  const value =
    amount === 'tour'
      ? displayTourPrice(tier, 'basic', lang, active)
      : amount === 'hdr'
        ? displayHdrPrice(tier, lang, active)
        : displayPremiumExtra(tier, lang, active);
  return <>{`${amount === 'premiumExtra' ? '+' : ''}${formatAmount(value, lang)}`}</>;
}

/**
 * Red ispod velike cene na kartici paketa: od čega se cena sastoji
 * ("tura 6.000 + HDR fotografije 2.500"), a na Premium kartici i koliko je
 * skuplji od Osnovnog. Za jednu nekretninu, prati promociju kao i cena iznad.
 */
export function PlanSplit({
  packageType,
  labels,
  lang
}: {
  packageType: PackageType;
  labels: PricingLabels;
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const tier = PRICE_TIERS[0];
  const n = (value: number) => formatAmount(value, lang);
  return (
    <p className="price-split">
      {labels.tour} {n(displayTourPrice(tier, packageType, lang, active))} + {labels.hdr}{' '}
      {n(displayHdrPrice(tier, lang, active))}
      {packageType === 'premium' && (
        <>
          <br />
          <b>+{n(displayPremiumExtra(tier, lang, active))}</b> {labels.overBasic}
        </>
      )}
    </p>
  );
}

/**
 * Tabela obima: za svaki stepen (1-2, 3-4, 5-9, 10+ nekretnina mesečno)
 * cena po nekretnini u oba paketa. Zamenjuje kalkulator - isti brojevi,
 * vidljivi odjednom. Dok traje promocija, redovna cena stoji precrtana.
 */
export function VolumeTable({
  copy,
  lang
}: {
  copy: { count: string; basic: string; premium: string };
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const cell = (index: number, pkg: PackageType) => {
    const tier = PRICE_TIERS[index];
    const regular = displayPerProperty(tier, pkg, lang);
    const promo = displayPerProperty(tier, pkg, lang, true);
    return (
      <td>
        <b>{formatAmount(active ? promo : regular, lang)}</b>
        {active && <s className="price-was">{formatAmount(regular, lang)}</s>}
      </td>
    );
  };
  return (
    <div className="card vol-card">
      <table className="vol-table">
        <thead>
          <tr>
            <th scope="col">{copy.count}</th>
            <th scope="col">{copy.basic}</th>
            <th scope="col">{copy.premium}</th>
          </tr>
        </thead>
        <tbody>
          {PRICE_TIERS.map((tier, i) => (
            <tr key={tier.min}>
              <th scope="row">{tierLabel(i)}</th>
              {cell(i, 'basic')}
              {cell(i, 'premium')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Jedan red: tura bez fotografija i fotografije bez ture (HDR bez popusta). */
export function SingleItems({
  copy,
  lang
}: {
  copy: { lead: string; tour: string; hdr: string };
  lang: HomeLang;
}) {
  const active = usePromoActive();
  const tier = PRICE_TIERS[0];
  const n = (value: number) => formatAmount(value, lang);
  return (
    <p className="price-single">
      <b>{copy.lead}</b> {copy.tour} {n(displayTourPrice(tier, 'basic', lang, active))} ·{' '}
      {copy.hdr} {n(inDisplayCurrency(standaloneHdrPrice(tier), lang))}
    </p>
  );
}

/** Spisak stavki na kartici paketa (početna i /za-agencije). */
export function PlanItemList({ items, count = 1, lang }: { items: PlanItem[]; count?: number; lang: HomeLang }) {
  return (
    <ul className="price-list">
      {items.map((item) =>
        typeof item === 'string' ? (
          <li key={item}>{item}</li>
        ) : (
          <li key={item.label}>
            {item.label} — <PlanLinePrice amount={item.amount} count={count} lang={lang} />
            {item.suffix && ` ${item.suffix}`}
          </li>
        )
      )}
    </ul>
  );
}
