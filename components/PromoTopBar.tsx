import type { HomeLang } from '../app/lib/homeCopy';
import { isPromoActive, promoDaysLeft } from '../app/lib/pricing';
import PromoTopBarClient from './PromoTopBarClient';

/**
 * Tanka traka iznad menija dok traje promocija: isti tekst kao velika traka
 * u cenovniku (PromoBanner), skraćen na naslov i broj preostalih dana.
 * Klik vodi do cenovnika.
 *
 * Serverska komponenta: datum se proverava već kad se strana pravi (ISR, na
 * sat), pa je traka u HTML-u od prvog crtanja. Ranije se pojavljivala tek
 * posle hidracije i gurala hero nadole (CLS 0.033). Klijentski deo i dalje
 * proverava datum, pa traka nestane čim kampanja istekne.
 *
 * Na telefonu ide kraći tekst u jednom redu ("Uvodna promocija −30% · Još 32
 * dana") - pun se lomio tako da "32 dana" ostane samo u drugom redu.
 * Broj dana je uvek vezan za reč "dana" (nowrap).
 */
export default function PromoTopBar({ lang = 'sr', href }: { lang?: HomeLang; href: string }) {
  const now = new Date();
  return (
    <PromoTopBarClient
      lang={lang}
      href={href}
      serverActive={isPromoActive(now)}
      serverDaysLeft={promoDaysLeft(now)}
    />
  );
}
