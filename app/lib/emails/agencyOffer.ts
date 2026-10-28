import {
  PRICE_TIERS,
  displayPerProperty,
  formatAmount,
  isPromoActive,
  promoDaysLeft
} from '../pricing';
import { CONTACT, SITE_URL } from '../site';
import { COLORS, SANS, accentSpan, e, emailLayout, roomsLabel, row } from './shell';

/**
 * Mejl "Ponuda agenciji" - vlasnik ga šalje ručno, jednoj agenciji, iz
 * admina (Agencije → "Pošalji ponudu", /api/admin/agency-offer). Izgled po
 * maketi public/mockup/mejlovi/ponuda.html: prava tura kao primer, tri
 * koristi, cena iz lib/pricing.ts (sa promocijom dok traje), lični potpis.
 */

export type AgencyOfferEmail = {
  /** Ime za pozdrav ("Dobar dan, Jelena,"); prazno = "Dobar dan,". */
  name: string | null;
  /** Lična rečenica ispod uvoda (npr. o njihovom oglasu) - opciono. */
  note: string | null;
  tourTitle: string;
  tourUrl: string;
  coverUrl: string | null;
  roomCount: number;
  now?: Date;
};

const BENEFITS: [string, string][] = [
  ['Manje uzaludnih razgledanja', 'Na razgledanje dolaze kupci koji su već prošetali kroz nekretninu.'],
  ['Vaše ime u svakoj turi', 'Kontakt agenta i dugme „Zakaži razgledanje“, i kad se link deli dalje.'],
  ['Mesečni izveštaj, za vas i za vlasnika', 'Koliko ljudi je pogledalo nekretninu i koje prostorije najduže.']
];

/** "1 dan", "3 dana", "21 dan". */
function daysLabel(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? `${n} dan` : `${n} dana`;
}

export function agencyOfferEmail(o: AgencyOfferEmail): { subject: string; html: string; text: string } {
  const now = o.now ?? new Date();
  const promo = isPromoActive(now);
  // Najjeftinija nekretnina: jedna, Osnovni paket (tura + HDR), sa promocijom dok traje.
  const price = formatAmount(displayPerProperty(PRICE_TIERS[0], 'basic', 'sr', promo), 'sr');
  const days = promoDaysLeft(now);
  const greeting = o.name ? `Dobar dan, ${o.name},` : 'Dobar dan,';
  const intro = 'kad je vaš oglas jedini u kome kupac može da prošeta kroz nekretninu, on zove vas. Mi snimamo, a vi za 48h dobijate turu za oglas.';
  const ctaUrl = `${SITE_URL}/za-agencije#kontakt`;

  const photo = o.coverUrl
    ? `<tr><td><a href="${e(o.tourUrl)}" style="text-decoration:none;">
  <img src="${e(o.coverUrl)}" width="600" alt="${e(o.tourTitle)}, 360° tura" style="display:block;width:100%;height:auto;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};"><tr>
    <td class="pad" style="padding:13px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; Prošetajte kroz primer ture</td>
    <td align="right" class="pad" style="padding:13px 32px;font-family:${SANS};font-size:14px;color:#CFE0F5;white-space:nowrap;">${o.roomCount > 0 ? e(roomsLabel(o.roomCount)) : ''}</td>
  </tr></table>
</a></td></tr>`
    : row(`<p style="margin:0;font-family:${SANS};font-size:15px;"><a href="${e(o.tourUrl)}" style="font-weight:700;text-decoration:none;">&#9654;&nbsp; Prošetajte kroz primer ture</a></p>`);

  const benefits = BENEFITS.map(
    ([title, text], i) =>
      `<tr><td style="padding:14px 0;border-top:1px solid ${COLORS.lineStrong};${i === BENEFITS.length - 1 ? `border-bottom:1px solid ${COLORS.lineStrong};` : ''}"><p style="margin:0;font-size:17px;font-weight:700;color:${COLORS.ink};">${e(title)}</p><p style="margin:4px 0 0;font-size:15px;line-height:1.55;color:${COLORS.soft};">${e(text)}</p></td></tr>`
  ).join('');

  const priceBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};border-radius:14px;"><tr>
  <td class="stack" style="padding:18px 20px;font-family:${SANS};">
    <p style="margin:0;font-size:14px;color:#17447E;font-weight:700;">Probajte na jednoj nekretnini</p>
    <p style="margin:2px 0 0;font-size:26px;font-weight:800;color:${COLORS.ink};letter-spacing:-.02em;">od ${e(price)}</p>
    ${promo ? `<p style="margin:2px 0 0;font-size:13px;color:${COLORS.soft};">Uvodna promocija važi još ${e(daysLabel(days))}.</p>` : ''}
  </td>
  <td class="stack" align="right" style="padding:18px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${COLORS.blue};border-radius:999px;"><a href="${e(ctaUrl)}" style="display:inline-block;padding:14px 24px;font-family:${SANS};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;white-space:nowrap;">Zakažite snimanje</a></td></tr></table>
  </td>
</tr></table>`;

  const body = [
    photo,
    row(
      `<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">Ista nekretnina, tri agencije. ${accentSpan('Kupac zove vas.')}</h1>
<p style="margin:14px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(greeting)} ${e(intro)}</p>
${o.note ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.ink};">${e(o.note)}</p>` : ''}`,
      '30px 32px 0'
    ),
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};">${benefits}</table>`),
    row(priceBox, '24px 32px 0'),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.ink};">Ako vam je lakše, pozovite me ili mi odgovorite na ovaj mejl.</p>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${COLORS.ink};"><b>Nikola</b><br><span style="color:${COLORS.soft};">Kvadrat360 · <a href="tel:${e(CONTACT.phoneE164)}" style="text-decoration:none;">${e(CONTACT.phoneDisplay)}</a></span></p>`,
      '26px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Kvadrat360 za agencije',
    preheader: `Prošetajte kroz pravu turu i probajte na jednoj nekretnini, od ${price}`,
    body,
    footer: 'Ne želite više ovakve mejlove? Odgovorite sa „odjava“.'
  });

  const text = [
    greeting,
    '',
    `Ista nekretnina, tri agencije. Kupac zove vas: ${intro}`,
    ...(o.note ? ['', o.note] : []),
    '',
    `Primer ture: ${o.tourUrl}`,
    '',
    ...BENEFITS.map(([title, t]) => `- ${title}: ${t}`),
    '',
    `Probajte na jednoj nekretnini, od ${price}.${promo ? ` Uvodna promocija važi još ${daysLabel(days)}.` : ''}`,
    `Zakažite snimanje: ${ctaUrl}`,
    '',
    'Ako vam je lakše, pozovite me ili mi odgovorite na ovaj mejl.',
    `Nikola, Kvadrat360 · ${CONTACT.phoneDisplay}`,
    '',
    'Ne želite više ovakve mejlove? Odgovorite sa „odjava“.'
  ].join('\n');

  return { subject: 'Ista nekretnina, tri agencije. Kupac zove vas.', html, text };
}
