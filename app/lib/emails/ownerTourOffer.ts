import { PRICE_TIERS, displayPerProperty, formatAmount, isPromoActive, promoDaysLeft } from '../pricing';
import { CONTACT, SITE_URL } from '../site';
import { COLORS, SANS, accentSpan, e, emailLayout, roomsLabel, row } from './shell';

/**
 * Mejl "Ponuda za turu" vlasniku koji je tražio procenu vrednosti
 * (/alati/procena-vrednosti) - šalje ga vlasnik sajta ručno iz admina
 * (Procene → "Pošalji ponudu za turu"). Isti izgled kao ponuda agenciji:
 * prava tura kao primer, tri koristi, cena iz lib/pricing.ts, lični potpis.
 * Koristi se razlikuju za prodaju i izdavanje.
 */

export type OwnerTourOfferEmail = {
  name: string | null;
  listingType: 'sale' | 'rent';
  /** "Stan · Bubanj" - šta je procenjivao. */
  property: string;
  /** "78.000 – 86.000 €" ili "300 – 350 € mesečno" - procena koju je dobio. */
  estimate: string | null;
  tourTitle: string;
  tourUrl: string;
  coverUrl: string | null;
  roomCount: number;
  now?: Date;
};

const BENEFITS: Record<'sale' | 'rent', [string, string][]> = {
  sale: [
    ['Kupci koji su već "bili" u stanu', 'Na razgledanje dolaze oni kojima se stan dopao u 360° turi - manje uzaludnih obilazaka.'],
    ['Oglas koji se izdvaja', 'Link ture ide u oglas na 4zida i Halo oglasima; kupac prošeta sobu po sobu, na telefonu.'],
    ['I kupci iz drugih gradova', 'Tura ima audio vodič na srpskom, engleskom, nemačkom i ruskom.']
  ],
  rent: [
    ['Manje poziva koji ne vode nikuda', 'Podstanari vide ceo stan pre nego što pozovu - zovu oni kojima odgovara.'],
    ['Brže izdavanje', 'Link ture ide u oglas; stan se razgleda i kad vi niste tu.'],
    ['Jednom snimljeno, važi dugo', 'Ista tura služi i za sledećeg podstanara.']
  ]
};

/** Cena se piše "6.000 din." - bez druge tačke kad je kraj rečenice. */
const endSentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);

function daysLabel(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? `${n} dan` : `${n} dana`;
}

export function ownerTourOfferEmail(o: OwnerTourOfferEmail): { subject: string; html: string; text: string } {
  const now = o.now ?? new Date();
  const promo = isPromoActive(now);
  const price = formatAmount(displayPerProperty(PRICE_TIERS[0], 'basic', 'sr', promo), 'sr');
  const days = promoDaysLeft(now);
  const greeting = o.name ? `Dobar dan, ${o.name},` : 'Dobar dan,';
  const goal = o.listingType === 'rent' ? 'izdate' : 'prodate';
  const intro = `hvala što ste na našem sajtu proverili vrednost nekretnine (${o.property}${o.estimate ? `, procena ${o.estimate}` : ''}). Ako je oglašavate, 360° tura pomaže da je ${goal} brže i sa manje uzaludnih razgledanja.`;
  const ctaUrl = `${SITE_URL}/#kontakt`;
  const benefitsList = BENEFITS[o.listingType];

  const photo = o.coverUrl
    ? `<tr><td><a href="${e(o.tourUrl)}" style="text-decoration:none;">
  <img src="${e(o.coverUrl)}" width="600" alt="${e(o.tourTitle)}, 360° tura" style="display:block;width:100%;height:auto;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};"><tr>
    <td class="pad" style="padding:13px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; Prošetajte kroz primer ture</td>
    <td align="right" class="pad" style="padding:13px 32px;font-family:${SANS};font-size:14px;color:#CFE0F5;white-space:nowrap;">${o.roomCount > 0 ? e(roomsLabel(o.roomCount)) : ''}</td>
  </tr></table>
</a></td></tr>`
    : row(`<p style="margin:0;font-family:${SANS};font-size:15px;"><a href="${e(o.tourUrl)}" style="font-weight:700;text-decoration:none;">&#9654;&nbsp; Prošetajte kroz primer ture</a></p>`);

  const benefits = benefitsList
    .map(
      ([title, text], i) =>
        `<tr><td style="padding:14px 0;border-top:1px solid ${COLORS.lineStrong};${i === benefitsList.length - 1 ? `border-bottom:1px solid ${COLORS.lineStrong};` : ''}"><p style="margin:0;font-size:17px;font-weight:700;color:${COLORS.ink};">${e(title)}</p><p style="margin:4px 0 0;font-size:15px;line-height:1.55;color:${COLORS.soft};">${e(text)}</p></td></tr>`
    )
    .join('');

  const priceBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};border-radius:14px;"><tr>
  <td class="stack" style="padding:18px 20px;font-family:${SANS};">
    <p style="margin:0;font-size:14px;color:#17447E;font-weight:700;">360° tura</p>
    <p style="margin:2px 0 0;font-size:26px;font-weight:800;color:${COLORS.ink};letter-spacing:-.02em;">${e(price)}</p>
    ${promo ? `<p style="margin:2px 0 0;font-size:13px;color:${COLORS.soft};">Uvodna promocija važi još ${e(daysLabel(days))}.</p>` : ''}
  </td>
  <td class="stack" align="right" style="padding:18px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${COLORS.blue};border-radius:999px;"><a href="${e(ctaUrl)}" style="display:inline-block;padding:14px 24px;font-family:${SANS};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;white-space:nowrap;">Zakažite snimanje</a></td></tr></table>
  </td>
</tr></table>`;

  const headline = o.listingType === 'rent' ? 'Podstanar vidi ceo stan' : 'Kupac vidi ceo stan';
  const body = [
    photo,
    row(
      `<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">${e(headline)} ${accentSpan('pre prvog poziva.')}</h1>
<p style="margin:14px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(greeting)} ${e(intro)}</p>`,
      '30px 32px 0'
    ),
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};">${benefits}</table>`),
    row(priceBox, '24px 32px 0'),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.ink};">Snimanje traje oko sat vremena, a tura je gotova za 48h. Ako vam je lakše, pozovite me ili odgovorite na ovaj mejl.</p>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${COLORS.ink};"><b>Nikola</b><br><span style="color:${COLORS.soft};">Kvadrat360 · <a href="tel:${e(CONTACT.phoneE164)}" style="text-decoration:none;">${e(CONTACT.phoneDisplay)}</a></span></p>`,
      '26px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: '360° tura za vašu nekretninu',
    preheader: `${headline} pre prvog poziva - 360° tura, ${price}`,
    body,
    footer: 'Ne želite više ovakve mejlove? Odgovorite sa „odjava“.'
  });

  const text = [
    greeting,
    '',
    intro,
    '',
    `Primer ture: ${o.tourUrl}`,
    '',
    ...benefitsList.map(([title, t]) => `- ${title}: ${t}`),
    '',
    `360° tura: ${endSentence(price)}${promo ? ` Uvodna promocija važi još ${daysLabel(days)}.` : ''}`,
    `Zakažite snimanje: ${ctaUrl}`,
    '',
    'Snimanje traje oko sat vremena, a tura je gotova za 48h. Ako vam je lakše, pozovite me ili odgovorite na ovaj mejl.',
    `Nikola, Kvadrat360 · ${CONTACT.phoneDisplay}`,
    '',
    'Ne želite više ovakve mejlove? Odgovorite sa „odjava“.'
  ].join('\n');

  return { subject: `${headline} pre prvog poziva`, html, text };
}

/** Kratka poruka za Viber kad vlasnik nije ostavio mejl (isti smisao kao mejl). */
export function ownerTourOfferViber(o: Pick<OwnerTourOfferEmail, 'name' | 'listingType' | 'property' | 'tourUrl'>, price: string): string {
  const goal = o.listingType === 'rent' ? 'izdate' : 'prodate';
  return [
    `${o.name ? `Dobar dan, ${o.name}` : 'Dobar dan'}, Nikola iz Kvadrat360.`,
    `Videli smo da ste proverili vrednost nekretnine (${o.property}). Ako je oglašavate, 360° tura pomaže da je ${goal} brže - kupci vide ceo stan pre poziva.`,
    `Primer ture: ${o.tourUrl}`,
    `360° tura: ${endSentence(price)} Snimanje oko sat vremena, tura gotova za 48h.`,
    `Ako vas zanima, javite se ovde ili na ${CONTACT.phoneDisplay} - rado dogovaramo termin.`
  ].join('\n');
}
