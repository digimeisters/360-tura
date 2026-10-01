import type { HomeCopy, HomeLang } from '../app/lib/homeCopy';
import { CONTACT_PACKAGES } from '../app/lib/pricing';
import { PlanItemList, PlanPrice, PlanSplit, SaleSticker, SingleItems, VolumeTable } from './PromoPrice';
import VolumeDetails from './VolumeDetails';

/**
 * Cenovnik - isti na početnoj (SR i EN) i na /za-agencije, da se ne
 * razdvoje. Tri dela, redom kojim kupac odlučuje:
 *   1. dva paketa (Osnovni / Premium), cena za jednu nekretninu;
 *   2. tabela: više nekretnina mesečno, niža cena (umesto kalkulatora) -
 *      na telefonu sklopljena (VolumeDetails);
 *   3. jedan red za turu bez fotografija i fotografije bez ture.
 * Iznosi se računaju u PromoPrice.tsx iz lib/pricing.ts, pa prate promociju.
 *
 * `trackPrefix`: "agency_" na /za-agencije, da se u analitici vidi sa koje
 * strane je kliknuto (cta:agency_price_basic).
 */
export default function Pricing({
  copy,
  lang,
  trackPrefix
}: {
  copy: HomeCopy['pricing'];
  lang: HomeLang;
  trackPrefix: '' | 'agency_';
}) {
  return (
    <>
      <div className="price-grid n-2">
        {copy.plans.map((plan) => (
          <div key={plan.track} className={`card price-card${plan.packageType === 'premium' ? ' featured' : ''}`}>
            {plan.badge && <span className="price-badge">{plan.badge}</span>}
            <SaleSticker />
            <span className="price-audience">{plan.audience}</span>
            <h3>{plan.title}</h3>
            <div>
              <PlanPrice packageType={plan.packageType} unit={plan.unit} lang={lang} />
              <PlanSplit packageType={plan.packageType} labels={copy.labels} lang={lang} />
            </div>
            <PlanItemList items={plan.items} lang={lang} />
            <a
              className="btn btn-primary price-cta"
              href="#kontakt"
              data-track={`cta:${trackPrefix}${plan.track}`}
              // ContactForm čita ovo pri kliku i bira isti paket u formi.
              data-package={CONTACT_PACKAGES[plan.packageType === 'premium' ? 1 : 0]}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Na telefonu sklopljeno - vidi VolumeDetails. */}
      <VolumeDetails title={copy.volume.title}>
        <p className="note">{copy.volume.note}</p>
        <VolumeTable copy={copy.volume} lang={lang} />
      </VolumeDetails>
      <SingleItems copy={copy.single} lang={lang} />
      <p className="fine-print">{copy.fine}</p>
    </>
  );
}
