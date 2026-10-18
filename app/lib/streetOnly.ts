/**
 * Samo ulica, bez kućnog broja: "Maglićka 12, Kragujevac" -> "Maglićka".
 * Tačan broj posetilac dobija od agenta, pred razgledanje (obećanje na
 * početnoj: kućni broj se nikad ne prikazuje) - važi za turu, AI asistenta,
 * opis za pretraživače i strukturisane podatke.
 */
export function streetOnly(address: string | null | undefined): string {
  const first = address?.split(',')[0]?.trim() || '';
  return first.replace(/\s+(bb|b\.b\.|\d+[a-zA-Z]?(\s*[/-]\s*\d+[a-zA-Z]?)?)$/i, '').trim();
}
