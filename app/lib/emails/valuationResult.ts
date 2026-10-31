import { CONDITION_LABELS, FURNISHING_LABELS, TYPE_LABELS } from '../valuationLeadLabels';
import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';

/**
 * Mejl "Vaša procena" - vlasniku, sam od sebe, kad na
 * /alati/procena-vrednosti dobije procenu i ostavi mejl
 * (/api/valuation/estimate). Izgled po maketi
 * public/mockup/mejlovi/procena.html: isti raspon i ista napomena kao na
 * ekranu, njegovi podaci, pa tura i "Da, pozovite me za snimanje" (vodi na
 * stranu potvrde, ne poziva sam - skeneri linkova u mejlu bi ga kliknuli).
 * Kad za lokaciju nema cena, umesto broja stoji obećanje ručne procene.
 */

export type ValuationResultEmail = {
  name: string;
  phone: string;
  listingType: 'sale' | 'rent';
  propertyType: string;
  city: string;
  neighborhood: string;
  sqm: number;
  rooms: number | null;
  floorNumber: number | null;
  hasElevator: boolean | null;
  condition: string;
  furnishing: string | null;
  hasParking: boolean;
  hasTerrace: boolean;
  estimate: { low: number; high: number } | null;
  /** Strana potvrde poziva (/alati/procena-vrednosti/poziv?...). */
  callbackUrl: string;
  tourUrl: string;
  coverUrl: string | null;
};

const COPY = {
  sale: {
    label: 'Procenjena prodajna cena',
    pending: 'Procenu šaljemo u roku od 24h',
    next: 'Kad krenete u prodaju',
    upsell: 'Nekretnine sa 360° turom privlače ozbiljnije kupce: na razgledanje dolaze oni koji su je već prošetali na telefonu.'
  },
  rent: {
    label: 'Procenjena kirija, mesečno',
    pending: 'Procenu kirije šaljemo u roku od 24h',
    next: 'Kad krenete u izdavanje',
    upsell: 'Sa 360° turom zakupci pregledaju nekretninu pre poziva, pa na razgledanje dolaze samo zainteresovani.'
  }
} as const;

const eur = (n: number) => `${Math.round(n).toLocaleString('sr-RS')} €`;

export function valuationResultEmail(v: ValuationResultEmail): { subject: string; html: string; text: string } {
  const c = COPY[v.listingType];
  const firstName = v.name.trim().split(/\s+/)[0];
  const range = v.estimate ? `${Math.round(v.estimate.low).toLocaleString('sr-RS')} – ${eur(v.estimate.high)}` : null;
  // Kirija po m² je par evra - jedna decimala; prodajna cena po m² na ceo evro.
  const perSqm = (n: number) => (v.listingType === 'rent' ? (Math.round((n / v.sqm) * 10) / 10).toLocaleString('sr-RS') : Math.round(n / v.sqm).toLocaleString('sr-RS'));
  const perSqmText = v.estimate && v.sqm > 0 ? `oko ${perSqm(v.estimate.low)} – ${perSqm(v.estimate.high)} € po m²` : null;

  const type = TYPE_LABELS[v.propertyType] ?? 'Nekretnina';
  const roomsWord = v.propertyType === 'commercial' ? 'prostorija' : v.rooms === 1 ? 'soba' : v.rooms && v.rooms < 5 ? 'sobe' : 'soba';
  const facts: [string, string][] = [
    ['Nekretnina', [type, `${v.sqm} m²`, v.rooms ? `${v.rooms} ${roomsWord}` : null].filter(Boolean).join(', ')],
    ['Lokacija', [v.neighborhood, v.city].filter(Boolean).join(', ')],
    ['Stanje', [CONDITION_LABELS[v.condition], v.furnishing ? FURNISHING_LABELS[v.furnishing] : null].filter(Boolean).join(', ')],
    [
      'Sprat i dodaci',
      [
        v.floorNumber === null ? null : v.floorNumber === 0 ? 'prizemlje' : `${v.floorNumber}. sprat`,
        v.hasElevator ? 'lift' : null,
        v.hasParking ? 'parking' : null,
        v.hasTerrace ? 'terasa' : null
      ]
        .filter(Boolean)
        .join(', ') || '—'
    ]
  ];
  // Nazivi iz valuationLeadLabels su malim slovom (srednji deo rečenice u adminu).
  for (const f of facts) f[1] = f[1] ? f[1][0].toUpperCase() + f[1].slice(1) : f[1];
  const factRows = facts
    .map(
      ([label, value], i) =>
        `<tr><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${i === facts.length - 1 ? `border-bottom:1px solid ${COLORS.line};` : ''}color:${COLORS.soft};width:42%;">${e(label)}</td><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${i === facts.length - 1 ? `border-bottom:1px solid ${COLORS.line};` : ''}font-weight:700;color:${COLORS.ink};">${e(value || '—')}</td></tr>`
    )
    .join('');

  const numberBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};border-radius:14px;"><tr><td style="padding:20px 22px;font-family:${SANS};">
  <p style="margin:0;font-size:14px;font-weight:700;color:${COLORS.blue};">${e(range ? c.label : 'Zahtev je primljen')}</p>
  <p class="h1" style="margin:4px 0 0;font-size:${range ? 34 : 24}px;line-height:1.15;font-weight:800;color:${COLORS.ink};letter-spacing:-.02em;">${e(range ?? c.pending)}</p>
  ${perSqmText ? `<p style="margin:6px 0 0;font-size:14px;color:${COLORS.soft};">${e(perSqmText)}</p>` : ''}
  <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${COLORS.faint};">${e(
    range
      ? 'Automatska, gruba procena na osnovu podataka za vašu lokaciju. Nije zvanična procena vrednosti.'
      : 'Za vašu lokaciju još nemamo dovoljno podataka za automatski raspon, pa ga ne izmišljamo — izračunaćemo ga ručno.'
  )}</p>
</td></tr></table>`;

  const tour = v.coverUrl
    ? `<a href="${e(v.tourUrl)}" style="text-decoration:none;">
  <img src="${e(v.coverUrl)}" width="536" alt="Primer 360° ture" style="display:block;width:100%;height:auto;border-radius:14px 14px 0 0;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};border-radius:0 0 14px 14px;"><tr>
    <td style="padding:12px 18px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; Pogledajte primer ture</td>
  </tr></table>
</a>`
    : `<p style="margin:0;font-family:${SANS};font-size:15px;"><a href="${e(v.tourUrl)}" style="font-weight:700;text-decoration:none;">&#9654;&nbsp; Pogledajte primer ture</a></p>`;

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">Zdravo, ${e(firstName)}!</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">Vaša procena je ${accentSpan('sačuvana.')}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">Evo je i ovde, da je imate kad vam zatreba.</p>`,
      '26px 32px 0'
    ),
    row(numberBox),
    row(
      `<p style="margin:0 0 4px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Na osnovu vaših podataka</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};font-size:15px;">${factRows}</table>`,
      '24px 32px 0'
    ),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:19px;font-weight:800;color:${COLORS.ink};">${e(c.next)}</p>
<p style="margin:6px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.soft};">${e(c.upsell)} Tura je gotova za 24–48h od snimanja.</p>`,
      '28px 32px 0'
    ),
    row(tour, '16px 32px 0'),
    row(
      `${buttons({ href: v.callbackUrl, label: 'Da, pozovite me za snimanje' })}
<p style="margin:12px 0 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${COLORS.soft};">Zovemo vas na ${e(v.phone)} da dogovorimo termin, bez obaveze.</p>`,
      '20px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Vaša procena',
    preheader: range ? `${type}, ${v.sqm} m², ${v.neighborhood || v.city}: ${c.label.toLowerCase()} ${range}.` : `${type}, ${v.sqm} m²: ${c.pending}.`,
    body,
    footer: 'Ovaj mejl ste dobili jer ste tražili procenu na kvadrat360.com. Ne šaljemo vam ništa drugo.'
  });

  const text = [
    `Zdravo, ${firstName}!`,
    'Vaša procena je sačuvana.',
    '',
    range ? `${c.label}: ${range}${perSqmText ? ` (${perSqmText})` : ''}` : c.pending,
    range ? 'Automatska, gruba procena na osnovu podataka za vašu lokaciju. Nije zvanična procena vrednosti.' : '',
    '',
    ...facts.map(([label, value]) => `${label}: ${value || '—'}`),
    '',
    `${c.next}: ${c.upsell}`,
    `Primer ture: ${v.tourUrl}`,
    `Da, pozovite me za snimanje: ${v.callbackUrl}`,
    '',
    'Ovaj mejl ste dobili jer ste tražili procenu na kvadrat360.com.',
    'Kvadrat360'
  ].join('\n');

  const subject = range ? `Vaša procena: ${range}${v.listingType === 'rent' ? ' mesečno' : ''}` : 'Vaša procena je primljena';
  return { subject, html, text };
}
