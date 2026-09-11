// Kalkulator i forma za kontakt su odvojene klijentske komponente na
// početnoj. "Pošalji upit sa ovim" u kalkulatoru šalje ovaj događaj, a forma
// ga hvata i sama popuni paket i poruku.
export const ESTIMATE_EVENT = 'k360:estimate';

export type EstimateDetail = {
  /** Vrednost polja "Paket" (jedna od CONTACT_PACKAGES). */
  packageValue: string;
  /** Red koji ide na početak poruke. */
  message: string;
  /** Početak tog reda - da drugi klik zameni stari red umesto da doda novi. */
  prefix: string;
};
