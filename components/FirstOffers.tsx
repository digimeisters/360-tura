'use client';

import { FIRST_AGENCIES, FIRST_TOUR_GUARANTEE, PROMO } from '../app/lib/pricing';
import { usePromoActive } from './usePromoActive';

/**
 * Dve ponude ispod cenovnika (vlasnik, 3. 11. 2026): cena za prve agencije
 * i garancija prve ture. Brojevi su u lib/pricing.ts.
 *
 * "Prve agencije" traje koliko i promocija, pa kartica nestaje sama kad
 * promocija istekne (usePromoActive proverava datum na klijentu, kao PromoNote).
 * Garancija ostaje uvek.
 */

const STYLES = `
  .fo-grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; margin-top:1.6rem;}
  .fo-grid.is-single{grid-template-columns:minmax(0,1fr); max-width:42rem; margin-inline:auto;}
  @media (max-width:820px){ .fo-grid{grid-template-columns:1fr;} }
  .fo-card{box-shadow:none;}
  .fo-card[hidden]{display:none;}
  .fo-card h3{font-size:1.15rem; margin-bottom:.4rem;}
  .fo-card p{color:var(--ink-soft); line-height:1.55;}
  .fo-card p + p{margin-top:.5rem;}
`;

export default function FirstOffers() {
  const promoActive = usePromoActive();
  const [, month, day] = PROMO.endDate.split('-').map(Number);
  const percent = Math.round(PROMO.discount * 100);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className={promoActive ? 'fo-grid' : 'fo-grid is-single'}>
        {/* Bez data-reveal: kartica se pojavljuje tek posle hidracije (promo se
            proverava na klijentu), pa je SiteReveal ne bi pouzdano otkrio i
            ostala bi providna. */}
        <div className="card fo-card" hidden={!promoActive}>
          <h3>Prvih {FIRST_AGENCIES.slots} agencija: uvodna cena ostaje</h3>
          <p>
            Agencije koje prvo snimanje zakažu do {day}. {month}. zadržavaju cenu −{percent}% na paket još{' '}
            {FIRST_AGENCIES.months} meseca od prvog snimanja, i kad promocija istekne.
          </p>
          <p>Ponuda važi za prvih {FIRST_AGENCIES.slots} agencija koje se jave.</p>
        </div>
        <div className="card fo-card" data-reveal="up">
          <h3>Garancija prve ture</h3>
          <p>
            Ako niste zadovoljni prvom turom, prostorije koje vam ne odgovaraju ponovo snimamo besplatno. Javite se u
            roku od {FIRST_TOUR_GUARANTEE.claimDays} dana od isporuke.
          </p>
          <p>Važi za svakog novog klijenta, agenciju ili vlasnika.</p>
        </div>
      </div>
    </>
  );
}
