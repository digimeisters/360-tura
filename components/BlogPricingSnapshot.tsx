import Link from 'next/link';
import { ItemPrice } from './PromoPrice';

/**
 * Kratak, uvek-tačan pregled cena unutar bloga - povlači iste komponente i
 * istu logiku (lib/pricing.ts) kao početna strana, pa nikad ne zaostane za
 * pravom cenom ili aktivnom promocijom. Vidi rate-grid stilove iz globals.css
 * (isti kao "Cena po stavci" na početnoj).
 */
export function BlogPricingSnapshot() {
  return (
    <div className="rate-grid">
      <div className="card rate-card">
        <h4>360° tura — Osnovna</h4>
        <ItemPrice amount="tourBasic" unit="/ nekretnina" lang="sr" />
      </div>
      <div className="card rate-card">
        <h4>360° tura — Premium</h4>
        <ItemPrice amount="tourPremium" unit="/ nekretnina" lang="sr" />
      </div>
      <div className="card rate-card">
        <h4>HDR fotografije</h4>
        <ItemPrice amount="hdr" unit="/ nekretnina" lang="sr" />
      </div>
      <p className="note">
        Cene su za jednu nekretninu prosečne veličine. Za više nekretnina mesečno cena po nekretnini pada -
        pogledajte <Link href="/#cenovnik">ceo cenovnik</Link> ili{' '}
        <Link href="/za-agencije">paket za agencije</Link>.
      </p>
    </div>
  );
}
