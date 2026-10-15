import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Zajedničko za strane „Alati" (/alati, /alati/kalkulator-kredita).
 */

// Meni je glavni meni sajta (components/MainMenu); ovde samo zaglavlje.
export const TOOLS_NAV = {
  brandAria: 'Kvadrat360, početna strana',
  cta: 'Zakažite snimanje'
} as const;

/** Novogradnja na koju kalkulator šalje kupca (projekat klijenta, isti kao primer na /za-investitore). */
export const NEW_BUILD_HREF = '/novogradnja/jadranska-garic-invest';

/** Kratka adresa /procena-vrednosti (za oglase) preusmerava ovde - next.config.ts. */
export const VALUATION_HREF = '/alati/procena-vrednosti';

/**
 * Da li strana procene vrednosti postoji u ovom build-u. Procena se pravi
 * odvojeno i stiže sa sopstvenim deploy-em; do tada je kartica „uskoro",
 * bez linka koji bi vodio na 404. Strane alata su statične, pa se ovo
 * proverava samo pri build-u (izvorni kod je tada na disku).
 */
export const VALUATION_LIVE = existsSync(join(process.cwd(), 'app', 'alati', 'procena-vrednosti', 'page.tsx'));
