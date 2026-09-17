/**
 * Kvadratura i cena iz upitnika: agent ih kuca slobodno ("58 m²", "1.200
 * EUR", "450 e/mesečno"), a filteri na /ture traže broj. Ovde se iz tog
 * teksta vadi jedan broj, ili ništa kad se ne može pouzdano pročitati.
 *
 * Namerno bez nagađanja: tekst iz kog se ne vidi jasan broj vraća null i
 * tura prosto prolazi kroz filter, umesto da završi u pogrešnom rasponu.
 */

/**
 * Domaći zapis broja: tačka je hiljadarka, zarez decimala ("1.200,50").
 * Engleski zapis ("1,200.50") se takođe prepoznaje, jer agenti lepe cene
 * iz oglasa pisanih na oba načina.
 */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '');
  if (!/[0-9]/.test(cleaned)) return null;

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  let normalized = cleaned;
  if (hasDot && hasComma) {
    // Poslednji od ta dva znaka je decimalni zarez, onaj drugi je hiljadarka.
    const decimal = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    normalized = cleaned.split(thousands).join('').replace(decimal, '.');
  } else if (hasComma) {
    // "1,200" je hiljadu dvesta, "58,5" je pedeset osam i po.
    normalized = /,\d{3}$/.test(cleaned) ? cleaned.replace(',', '') : cleaned.replace(',', '.');
  } else if (hasDot) {
    normalized = /\.\d{3}$/.test(cleaned) ? cleaned.replace('.', '') : cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Prvi broj u tekstu, sa svojim razdvojnicima hiljada i decimala. */
function firstNumber(text: string): number | null {
  const match = text.match(/\d[\d.,\s]*/);
  return match ? toNumber(match[0]) : null;
}

/**
 * Kvadratura u m². Raspon ("50-60 m²") se čita kao donja granica, da stan
 * ne ispadne veći nego što jeste.
 */
export function parseArea(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const area = firstNumber(String(raw));
  // Gornja granica je gruba zaštita od zalutalog broja (godina, telefon),
  // a ne stvarno ograničenje - nekretnina preko 10.000 m² nije stan.
  return area !== null && area <= 10_000 ? Math.round(area * 10) / 10 : null;
}

/**
 * Cena u evrima. Šta je cena zavisi od vrste oglasa: kod prodaje je ukupna,
 * kod izdavanja mesečna, kod smeštaja po noćenju - zato se rasponi na /ture
 * računaju tek unutar izabrane vrste oglasa.
 *
 * Dinari se NE preračunavaju: kurs bi se ovde zamrznuo u trenutku unosa.
 * Cena u dinarima se zato ne čita - agent je upisuje u evrima.
 */
export function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = String(raw);
  if (/\b(rsd|din)\b|дин/i.test(text)) return null;

  const price = firstNumber(text);
  return price !== null ? Math.round(price) : null;
}

/** Odgovor iz upitnika koji nosi cenu - zavisi od vrste oglasa. */
export const PRICE_ANSWER_KEYS = ['Prodajna cena', 'Mesečna zakupnina', 'Cena po noćenju'];

export function priceFromAnswers(answers: Record<string, string>): number | null {
  for (const key of PRICE_ANSWER_KEYS) {
    const price = parsePrice(answers[key]);
    if (price !== null) return price;
  }
  return null;
}
