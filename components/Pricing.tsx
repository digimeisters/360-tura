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
 *
 * `compact` (početna i /za-agencije, vlasnik 3. 11. 2026): kartice samo sa
 * glavnom cenom, bez reda "tura + HDR"; tabela i "samo tura / samo
 * fotografije" sklopljeni iza "Prikaži više" na svakoj širini.
 *
 * `volumeOpen` (/cenovnik): tabela po obimu otvorena i na telefonu.
 */
export default function Pricing({
  copy,
  lang,
  trackPrefix,
  compact = false,
  volumeOpen = false
}: {
  copy: HomeCopy['pricing'];
  lang: HomeLang;
  trackPrefix: '' | 'agency_' | 'pricing_';
  compact?: boolean;
  volumeOpen?: boolean;
}) {
  return (
    <>
      <div className="price-grid n-2">
        {copy.plans.map((plan) => (
          <div key={plan.track} className={`card price-card${plan.packageType === 'premium' ? ' featured' : ''}`} data-reveal="scale">
            {plan.badge && <span className="price-badge">{plan.badge}</span>}
            <SaleSticker />
            <span className="price-audience">{plan.audience}</span>
            <h3>{plan.title}</h3>
            <div>
              <PlanPrice packageType={plan.packageType} unit={plan.unit} lang={lang} />
              {!compact && <PlanSplit packageType={plan.packageType} labels={copy.labels} lang={lang} />}
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

      {/* Na telefonu sklopljeno - vidi VolumeDetails; na početnoj (compact) uvek. */}
      <VolumeDetails
        title={copy.volume.title}
        open={volumeOpen}
        toggle={compact ? { more: copy.volume.showMore, less: copy.volume.showLess } : undefined}
      >
        <p className="note">{copy.volume.note}</p>
        <VolumeTable copy={copy.volume} lang={lang} />
        {compact && <SingleItems copy={copy.single} lang={lang} />}
      </VolumeDetails>
      {!compact && <SingleItems copy={copy.single} lang={lang} />}
      <p className="fine-print">{copy.fine}</p>
    </>
  );
}
