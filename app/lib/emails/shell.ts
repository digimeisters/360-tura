import { escapeHtml } from '../telegram';
import { CONTACT, SITE_URL } from '../site';

/**
 * Zajednički okvir svih mejlova Kvadrat360 (makete: public/mockup/Mejlovi.html).
 * Ime nije layout.ts: Next.js taj naziv u app/ čita kao raspored strane.
 *
 * Mejl nije web strana: Gmail i Outlook ne čitaju spoljni CSS ni flex/grid,
 * pa je raspored u tabelama, a stil u samim elementima. <style> u glavi nosi
 * samo prilagođavanje telefonu (Gmail ga poštuje, ostali ga preskoče i
 * prikažu računarsku verziju, koja je ionako široka najviše 600px).
 * Urbanist i Newsreader se vide u Apple Mail-u i na iPhone-u; ostali
 * programi padaju na Arial i Georgia.
 */

export const e = escapeHtml;

export const COLORS = {
  page: '#F1F1EC',
  card: '#FFFFFF',
  ink: '#111113',
  soft: '#5B5D63',
  faint: '#686A70',
  line: '#E4E4DE',
  lineStrong: '#D3D3CB',
  blue: '#1E5AA8',
  blueSoft: '#E9EFF6'
} as const;

export const SANS = 'Urbanist,Arial,Helvetica,sans-serif';
const SERIF = 'Newsreader,Georgia,serif';

/** "1 prostorija", "3 prostorije", "10 prostorija". */
export function roomsLabel(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${n} ${few ? 'prostorije' : 'prostorija'}`;
}

/** Plava naglašena fraza u naslovu (kao em na sajtu), nikad prelomljena. */
export function accentSpan(text: string): string {
  return `<span style="font-family:${SERIF};font-style:italic;font-weight:500;color:${COLORS.blue};white-space:nowrap;">${e(text)}</span>`;
}

/** Red sa jednim ili dva dugmeta: prvo plavo, drugo obrubljeno. */
export function buttons(primary: { href: string; label: string }, secondary?: { href: string; label: string }): string {
  const first = `<td style="background:${COLORS.blue};border-radius:999px;"><a href="${e(primary.href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">${e(primary.label)}</a></td>`;
  const second = secondary
    ? `<td width="10"></td><td style="border:1.5px solid ${COLORS.lineStrong};border-radius:999px;"><a href="${e(secondary.href)}" style="display:inline-block;padding:12.5px 22px;font-family:${SANS};font-size:16px;font-weight:700;color:${COLORS.ink};text-decoration:none;">${e(secondary.label)}</a></td>`
    : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${first}${second}</tr></table>`;
}

/** Nekretnina kao kartica ture: mala slika levo, naziv, podaci i "Otvori turu". */
export function propertyCard(p: { tourUrl: string; coverUrl: string | null; title: string; /** Već escape-ovan HTML. */ metaHtml: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:14px;"><tr>
  ${p.coverUrl ? `<td width="132" class="stack stack-gap" style="padding:10px;"><a href="${e(p.tourUrl)}"><img src="${e(p.coverUrl)}" width="120" height="84" alt="" style="display:block;width:120px;height:84px;object-fit:cover;border-radius:10px;border:0;"></a></td>` : ''}
  <td class="stack" style="padding:10px 14px 10px ${p.coverUrl ? '4px' : '14px'};font-family:${SANS};">
    <p style="margin:0;font-size:16px;font-weight:700;color:${COLORS.ink};line-height:1.3;">${e(p.title)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:${COLORS.soft};">${p.metaHtml}</p>
    <p style="margin:6px 0 0;font-size:14px;"><a href="${e(p.tourUrl)}" style="font-weight:700;text-decoration:none;color:${COLORS.blue};">Otvori turu</a></p>
  </td>
</tr></table>`;
}

/** Jedan red tabele sa unutrašnjim razmakom kartice. */
export function row(inner: string, padding = '22px 32px 0'): string {
  return `<tr><td class="pad" style="padding:${padding};">${inner}</td></tr>`;
}

/**
 * Ceo mejl: siva podloga, bela kartica od 600px, logo gore, podnožje sa
 * adresom firme dole. `preheader` je red koji Gmail prikaže pored naslova
 * u spisku mejlova, a u samom mejlu se ne vidi.
 */
export function emailLayout({
  title,
  preheader,
  body,
  footer
}: {
  title: string;
  preheader: string;
  /** Redovi kartice (<tr>...</tr>), između logoa i podnožja. */
  body: string;
  /** Rečenica iznad adrese firme (već escape-ovan HTML). */
  footer: string;
}): string {
  const logo = `${SITE_URL}/brand/kvadrat360-logo-light.png`;
  const company = `Kvadrat360 · ${e(CONTACT.street)}, ${e(CONTACT.city)} · ${e(CONTACT.phoneDisplay)}`;

  return `<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500;700;800&family=Newsreader:ital,opsz,wght@1,6..72,500&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:${COLORS.page};}
  a{color:${COLORS.blue};}
  @media (max-width:620px){
    .card{width:100% !important;border-radius:0 !important;}
    .pad{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:24px !important;}
    .stack{display:block !important;width:100% !important;box-sizing:border-box !important;}
    .stack-gap{padding:0 0 10px 0 !important;}
    .stack-r{text-align:left !important;padding-top:0 !important;}
    .kpi{display:block !important;width:100% !important;box-sizing:border-box !important;padding:0 0 10px 0 !important;}
    .num{font-size:30px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:24px 0;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${COLORS.card};border-radius:18px;overflow:hidden;">
${row(`<img src="${e(logo)}" width="132" alt="Kvadrat360" style="display:block;width:132px;height:auto;border:0;">`, '24px 32px 0')}
${body}
${row(`<p style="margin:0;padding-top:18px;border-top:1px solid ${COLORS.line};font-family:${SANS};font-size:13px;color:${COLORS.faint};line-height:1.6;">${footer}<br>${company}</p>`, '28px 32px 26px')}
</table>
</td></tr>
</table>
</body>
</html>`;
}
