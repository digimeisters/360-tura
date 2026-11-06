import Link from 'next/link';
import type { ReactNode } from 'react';
import type { HomeCopy } from '../app/lib/homeCopy';
import { accent } from '../app/lib/accent';
import { PlanPrice, SaleSticker } from './PromoPrice';

/**
 * Cena ukratko na srpskoj početnoj (vlasnik, 3. 11. 2026): umesto celog
 * cenovnika (2,7 ekrana na telefonu) dva paketa i link na /cenovnik, gde su
 * tabela po obimu, "samo tura / samo fotografije" i pitanja o ceni. Iznosi
 * dolaze iz PlanPrice (lib/pricing.ts), pa prate promociju isto kao pune
 * kartice.
 *
 * Raspored (vlasnik, 4. 11. 2026, maketa public/mockup/CenaPocetna.html):
 * na računaru naslov, opis i dugmad levo, dva paketa desno (Premium tamna
 * kartica, sadržaj kao lista sa kvačicama). Na telefonu redom: naslov,
 * paketi, dugmad, a sadržaj paketa je jedan red sa tačkicama, kao ranije.
 *
 * Id #cenovnik ostaje ovde - stari linkovi (/#cenovnik iz bloga i mejlova)
 * i dalje vode na cenu. Ista sekcija stoji i na /za-vlasnike (id "cena",
 * klikovi owner_price_*).
 */
const CHECK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M4.5 8.3l2.4 2.4 4.6-4.9' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";

const STYLES = `
  .ps{display:grid; grid-template-areas:"head" "plans" "ctas"; justify-items:center; text-align:center;}
  .ps .section-head{grid-area:head; align-items:center; text-align:center; margin-bottom:clamp(1.6rem,3vw,2.2rem);}
  .ps-plans{grid-area:plans; display:grid; grid-template-columns:repeat(2,minmax(0,18rem)); gap:1rem; justify-content:center; width:100%;}
  @media (max-width:640px){ .ps-plans{grid-template-columns:1fr;} }
  .ps-plan{position:relative; text-align:left; padding:1.3rem 1.5rem; display:flex; flex-direction:column; gap:.35rem; box-shadow:none;}
  .ps-plan h3{font-size:1.25rem;}
  .ps-plan .price-value b{font-size:2.1rem;}
  .ps-plan .price-sale{transform:scale(.8); transform-origin:top right;}
  /* Telefon: sadržaj paketa u jednom redu, stavke odvojene tačkicom. */
  .ps-points{list-style:none; margin:0; padding:0; color:var(--ink-faint); font-size:.88rem; line-height:1.45;}
  .ps-points li{display:inline;}
  .ps-points li > i{display:none;}
  .ps-points li + li::before{content:" · ";}
  .ps-ctas{grid-area:ctas; display:flex; flex-wrap:wrap; justify-content:center; gap:.7rem; margin-top:clamp(1.4rem,3vw,2rem);}
  .ps-extra{grid-column:1 / -1; width:100%; text-align:left;}

  /* Računar: tekst levo, paketi desno, da sekcija ne visi prazna. */
  @media (min-width:960px){
    .ps{grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr); grid-template-areas:"head plans" "ctas plans"; grid-template-rows:auto 1fr;
      column-gap:clamp(2.5rem,5vw,4.5rem); justify-items:start; align-items:center; text-align:left;}
    .ps .section-head{align-items:flex-start; text-align:left; align-self:end; margin-bottom:0;}
    .ps .section-head h2{max-width:12ch;}
    .ps .section-head .note{max-width:34ch;}
    .ps-ctas{align-self:start; justify-content:flex-start; margin-top:1.8rem;}
    .ps-plans{grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.2rem;}
    .ps-plan{padding:2rem 1.8rem 1.9rem; gap:.9rem;}
    .ps-plan h3{font-size:1.5rem;}
    .ps-plan .price-value b{font-size:2.6rem;}
    .ps-plan .price-sale{transform:rotate(9deg);}
    .ps-plan.is-dark{border:0; box-shadow:0 30px 60px -22px rgba(17,17,19,.5);}
    .ps-points{display:flex; flex-direction:column; gap:.55rem; padding-top:1rem; border-top:1px solid var(--line); color:var(--ink); font-size:.96rem;}
    .ps-points li{display:flex; align-items:flex-start; gap:.6rem;}
    .ps-points li + li::before{content:none;}
    /* Kvačica: krug u boji sajta, znak iscrtan maskom (prati svetlu i tamnu karticu). */
    .ps-points li > i{display:grid; place-items:center; flex:none; width:18px; height:18px; margin-top:2px; border-radius:50%; background:var(--accent-soft);}
    .ps-points li > i::before{content:""; width:14px; height:14px; background:var(--accent);
      -webkit-mask:${CHECK} center/14px no-repeat; mask:${CHECK} center/14px no-repeat;}
  }
`;

export default function PricingShort({
  copy,
  id = 'cenovnik',
  track = 'home',
  children
}: {
  copy: NonNullable<HomeCopy['pricingShort']>;
  id?: string;
  /** Početak naziva klika u analitici: home -> cta:home_price_book. */
  track?: 'home' | 'owner' | 'agency';
  /** Ispod paketa i dugmadi, preko cele širine (npr. ponude za agencije). */
  children?: ReactNode;
}) {
  return (
    <section className="band" id={id}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="wrap ps">
        {/* .left: bez dvostubačne glave iz siteStyles (naslov levo, opis desno). */}
        <div className="section-head left">
          <span className="eyebrow" data-reveal="up">{copy.eyebrow}</span>
          <h2 data-reveal="blur">{accent(copy.title)}</h2>
          <p className="note" data-reveal="up">{copy.note}</p>
        </div>
        <div className="ps-plans">
          {copy.plans.map((plan) => (
            <div
              key={plan.packageType}
              className={`card ps-plan${plan.packageType === 'premium' ? ' is-dark' : ''}`}
              data-reveal="up"
            >
              <SaleSticker />
              <h3>{plan.title}</h3>
              <PlanPrice packageType={plan.packageType} unit="/ nekretnina" lang="sr" />
              <ul className="ps-points">
                {plan.points.map((p) => (
                  <li key={p}>
                    <i aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
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
        {children && <div className="ps-extra">{children}</div>}
      </div>
    </section>
  );
}
