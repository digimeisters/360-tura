import { CONTACT, SITE_URL } from '../site';
import { COLORS, SANS, accentSpan, e, emailLayout, row } from './shell';

/**
 * Mejl "Primili smo vašu poruku" - potvrda posle kontakt forme na sajtu
 * (/api/contact), samo kad je u polje za kontakt upisan mejl i samo za
 * upite Kvadrat360 (početna, /en, /za-agencije, /za-investitore) - upit za
 * stan u novogradnji vodi prodaja investitora, ne mi. Izgled po maketi
 * public/mockup/mejlovi/potvrda.html.
 */

export type ContactReceivedEmail = {
  lang: 'sr' | 'en';
  name: string;
  message: string | null;
  /** Kratak opis izbora iz forme ("Premium (sva 4 jezika)", broj nekretnina...). */
  choice: string | null;
  tourUrl: string;
  coverUrl: string | null;
};

const COPY = {
  sr: {
    hi: (n: string) => `Zdravo, ${n}!`,
    lead: 'Primili smo vašu',
    accent: 'poruku.',
    when: 'Javljam se u roku od 24h, na kontakt koji ste ostavili.',
    yours: 'Vaša poruka',
    noMessage: 'Poruka bez teksta - javljam se da dogovorimo detalje.',
    wait: 'Dok čekate',
    tourTitle: 'Prošetajte kroz primer ture',
    tourText: 'Tako izgleda tura koju dobijate za oglas.',
    open: 'Otvori turu',
    pricing: 'Cenovnik',
    urgent: 'Ako je hitno, pozovite me ili mi odgovorite na ovaj mejl.',
    footer: 'Ovaj mejl ste dobili jer ste nam pisali preko sajta kvadrat360.com.',
    subject: 'Primili smo vašu poruku - Kvadrat360',
    pricingPath: '/cenovnik'
  },
  en: {
    hi: (n: string) => `Hi ${n},`,
    lead: 'We got your',
    accent: 'message.',
    when: "I'll get back to you within 24 hours, at the contact you left.",
    yours: 'Your message',
    noMessage: "No message text - I'll get in touch to go over the details.",
    wait: 'While you wait',
    tourTitle: 'Walk through a sample tour',
    tourText: 'This is the tour you get for your listing.',
    open: 'Open the tour',
    pricing: 'Pricing',
    urgent: "If it's urgent, call me or reply to this email.",
    footer: 'You received this email because you wrote to us through kvadrat360.com.',
    subject: 'We got your message - Kvadrat360',
    pricingPath: '/en#cenovnik'
  }
} as const;

export function contactReceivedEmail(c: ContactReceivedEmail): { subject: string; html: string; text: string } {
  const t = COPY[c.lang];
  const firstName = c.name.trim().split(/\s+/)[0];
  const pricingUrl = `${SITE_URL}${t.pricingPath}`;

  const quote = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};border-radius:14px;"><tr><td style="padding:16px 18px;font-family:${SANS};">
  <p style="margin:0;font-size:13px;font-weight:700;color:${COLORS.soft};">${e(t.yours)}${c.choice ? ` · ${e(c.choice)}` : ''}</p>
  <p style="margin:6px 0 0;font-size:15px;line-height:1.55;color:${COLORS.ink};white-space:pre-line;">${c.message ? `„${e(c.message)}“` : e(t.noMessage)}</p>
</td></tr></table>`;

  const tourCard = `<p style="margin:0 0 10px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">${e(t.wait)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:14px;"><tr>
  ${c.coverUrl ? `<td width="132" class="stack stack-gap" style="padding:10px;"><a href="${e(c.tourUrl)}"><img src="${e(c.coverUrl)}" width="120" height="84" alt="" style="display:block;width:120px;height:84px;object-fit:cover;border-radius:10px;border:0;"></a></td>` : ''}
  <td class="stack" style="padding:10px 14px 10px ${c.coverUrl ? '4px' : '14px'};font-family:${SANS};">
    <p style="margin:0;font-size:16px;font-weight:700;color:${COLORS.ink};">${e(t.tourTitle)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:${COLORS.soft};">${e(t.tourText)}</p>
    <p style="margin:6px 0 0;font-size:14px;"><a href="${e(c.tourUrl)}" style="font-weight:700;text-decoration:none;color:${COLORS.blue};">${e(t.open)}</a> &nbsp;·&nbsp; <a href="${e(pricingUrl)}" style="font-weight:700;text-decoration:none;color:${COLORS.blue};">${e(t.pricing)}</a></p>
  </td>
</tr></table>`;

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(t.hi(firstName))}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">${e(t.lead)} ${accentSpan(t.accent)}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(t.when)}</p>`,
      '26px 32px 0'
    ),
    row(quote),
    row(tourCard, '24px 32px 0'),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.ink};">${e(t.urgent)}</p>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${COLORS.ink};"><b>Nikola</b><br><span style="color:${COLORS.soft};">Kvadrat360 · <a href="tel:${e(CONTACT.phoneE164)}" style="text-decoration:none;">${e(CONTACT.phoneDisplay)}</a></span></p>`,
      '26px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: t.subject,
    preheader: `${t.when} ${t.tourTitle}.`,
    body,
    footer: e(t.footer)
  });

  const text = [
    t.hi(firstName),
    `${t.lead} ${t.accent} ${t.when}`,
    '',
    `${t.yours}${c.choice ? ` (${c.choice})` : ''}:`,
    c.message ?? t.noMessage,
    '',
    `${t.tourTitle}: ${c.tourUrl}`,
    `${t.pricing}: ${pricingUrl}`,
    '',
    t.urgent,
    `Nikola, Kvadrat360 · ${CONTACT.phoneDisplay}`
  ].join('\n');

  return { subject: t.subject, html, text };
}
