import Link from 'next/link';
import type { HomeCopy } from '../app/lib/homeCopy';
import { accent } from '../app/lib/accent';
import { PlanPrice, SaleSticker } from './PromoPrice';

/**
 * Cena ukratko na srpskoj početnoj (vlasnik, 3. 11. 2026): umesto celog
 * cenovnika (2,7 ekrana na telefonu) dva paketa jednim redom i link na
 * /cenovnik, gde su tabela po obimu, "samo tura / samo fotografije" i
 * pitanja o ceni. Iznosi dolaze iz PlanPrice (lib/pricing.ts), pa prate
 * promociju isto kao pune kartice.
 *
 * Id #cenovnik ostaje ovde - stari linkovi (/#cenovnik iz bloga i mejlova)
 * i dalje vode na cenu. Ista sekcija stoji i na /za-vlasnike (id "cena",
 * klikovi owner_price_*).
 */
const STYLES = `
  .ps{display:flex; flex-direction:column; align-items:center; text-align:center;}
  .ps .section-head{align-items:center; text-align:center; margin-bottom:clamp(1.6rem,3vw,2.2rem);}
  .ps-plans{display:grid; grid-template-columns:repeat(2,minmax(0,18rem)); gap:1rem; justify-content:center; width:100%;}
  @media (max-width:640px){ .ps-plans{grid-template-columns:1fr;} }
  .ps-plan{position:relative; text-align:left; padding:1.3rem 1.5rem; display:flex; flex-direction:column; gap:.35rem; box-shadow:none;}
  .ps-plan h3{font-size:1.25rem;}
  .ps-plan .price-value b{font-size:2.1rem;}
  .ps-plan small{color:var(--ink-faint); font-size:.88rem; line-height:1.45;}
  .ps-plan .price-sale{transform:scale(.8); transform-origin:top right;}
  .ps-ctas{display:flex; flex-wrap:wrap; justify-content:center; gap:.7rem; margin-top:clamp(1.4rem,3vw,2rem);}
`;

export default function PricingShort({
  copy,
  id = 'cenovnik',
  track = 'home'
}: {
  copy: NonNullable<HomeCopy['pricingShort']>;
  id?: string;
  /** Početak naziva klika u analitici: home -> cta:home_price_book. */
  track?: 'home' | 'owner';
}) {
  return (
    <section className="band" id={id}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="wrap ps">
        <div className="section-head">
          <span className="eyebrow" data-reveal="up">{copy.eyebrow}</span>
          <h2 data-reveal="blur">{accent(copy.title)}</h2>
          <p className="note" data-reveal="up">{copy.note}</p>
        </div>
        <div className="ps-plans">
          {copy.plans.map((plan) => (
            <div key={plan.packageType} className="card ps-plan" data-reveal="up">
              <SaleSticker />
              <h3>{plan.title}</h3>
              <PlanPrice packageType={plan.packageType} unit="/ nekretnina" lang="sr" />
              <small>{plan.note}</small>
            </div>
          ))}
        </div>
        <div className="ps-ctas" data-reveal="up">
          <a
            className="btn btn-primary"
            href="#kontakt"
            data-track={`cta:${track}_price_book`}
          >
            {copy.book}
          </a>
          <Link className="btn btn-secondary" href="/cenovnik" data-track={`cta:${track}_price_more`}>
            {copy.more}
          </Link>
        </div>
      </div>
    </section>
  );
}
