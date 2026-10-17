import { formatListingPrice } from '../listingPrice';
import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';

/**
 * Mejl agentu kad posetilac ture zakaže razgledanje (/api/viewing-request).
 * Izgled po maketi public/mockup/mejlovi/upit.html: nekretnina kao kartica
 * ture, podaci o posetiocu u tabeli, jedno glavno dugme - poziv.
 */

const LANG_NAMES: Record<string, string> = { en: 'engleskom', de: 'nemačkom', ru: 'ruskom' };

// Ko traži razgledanje zavisi od vrste oglasa.
const WHO: Record<string, string> = { sale: 'Kupac', rent: 'Zakupac', booking: 'Gost' };

export type ViewingRequestEmail = {
  agentName: string | null;
  title: string;
  tourUrl: string;
  coverUrl: string | null;
  category: string | null;
  price: unknown;
  areaSqm: unknown;
  roomCount: number;
  name: string;
  phone: string;
  slot: string | null;
  lang: string;
  message: string;
};

export function viewingRequestEmail(req: ViewingRequestEmail): { subject: string; html: string; text: string } {
  const tel = req.phone.replace(/[^\d+]/g, '');
  const who = WHO[req.category ?? ''] ?? 'Posetilac ture';
  const greeting = req.agentName ? `Zdravo, ${req.agentName}!` : 'Zdravo!';
  const slotText = req.slot ?? 'Nije izabran, dogovor pozivom';
  const langName = req.lang !== 'sr' ? LANG_NAMES[req.lang] ?? req.lang : null;

  const price = formatListingPrice(req.price, req.category, 'sr');
  const area = typeof req.areaSqm === 'number' || typeof req.areaSqm === 'string' ? Number(req.areaSqm) : NaN;
  const meta = [
    Number.isFinite(area) && area > 0 ? `${Math.round(area)} m²` : null,
    req.roomCount > 0 ? roomsLabel(req.roomCount) : null
  ].filter(Boolean);
  const priceHtml = price ? ` · <b style="color:${COLORS.ink};">${e(price.amount)}</b>${price.unit ? ` ${e(price.unit.replace('/ ', ''))}` : ''}` : '';

  const property = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:14px;"><tr>
  ${req.coverUrl ? `<td width="132" class="stack stack-gap" style="padding:10px;"><a href="${e(req.tourUrl)}"><img src="${e(req.coverUrl)}" width="120" height="84" alt="" style="display:block;width:120px;height:84px;object-fit:cover;border-radius:10px;border:0;"></a></td>` : ''}
  <td class="stack" style="padding:10px 14px 10px ${req.coverUrl ? '4px' : '14px'};font-family:${SANS};">
    <p style="margin:0;font-size:16px;font-weight:700;color:${COLORS.ink};line-height:1.3;">${e(req.title)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:${COLORS.soft};">${e(meta.join(' · ') || '360° tura')}${priceHtml}</p>
    <p style="margin:6px 0 0;font-size:14px;"><a href="${e(req.tourUrl)}" style="font-weight:700;text-decoration:none;color:${COLORS.blue};">Otvori turu</a></p>
  </td>
</tr></table>`;

  const factRow = (label: string, value: string, last = false) =>
    `<tr><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${last ? `border-bottom:1px solid ${COLORS.line};` : ''}color:${COLORS.soft};width:38%;vertical-align:top;">${label}</td><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${last ? `border-bottom:1px solid ${COLORS.line};` : ''}font-weight:700;color:${COLORS.ink};">${value}</td></tr>`;

  const facts = [
    factRow('Ime', e(req.name)),
    factRow('Telefon', `<a href="tel:${e(tel)}" style="text-decoration:none;color:${COLORS.blue};">${e(req.phone)}</a>`),
    factRow('Željeni termin', e(slotText), !langName),
    ...(langName ? [factRow('Gledao turu na', `${e(langName)}, odgovorite na tom jeziku`, true)] : [])
  ].join('');

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(greeting)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:${COLORS.ink};">${e(who)} želi da pogleda ${accentSpan('vašu nekretninu')}</h1>`,
      '28px 32px 0'
    ),
    row(property),
    row(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};font-size:15px;">${facts}</table>
${req.message ? `<p style="margin:16px 0 0;padding:14px 16px;background:${COLORS.page};border-radius:12px;font-family:${SANS};font-size:15px;line-height:1.55;color:${COLORS.ink};">„${e(req.message)}“</p>` : ''}`
    ),
    row(
      `${buttons({ href: `tel:${tel}`, label: 'Pozovite' }, { href: `sms:${tel}`, label: 'Pošaljite poruku' })}
<p style="margin:14px 0 0;font-family:${SANS};font-size:14px;color:${COLORS.soft};line-height:1.5;">Termin je želja posetioca, ne rezervacija. Potvrdite ga pozivom.</p>`,
      '24px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Upit za razgledanje',
    preheader: `${req.name} želi da pogleda ${req.title}. ${req.slot ? `Termin: ${req.slot}.` : ''} Pozovite: ${req.phone}`,
    body,
    footer: 'Upit je stigao iz 360° ture koju je za vas napravio Kvadrat360.'
  });

  const text = [
    greeting,
    `${who} želi da pogleda vašu nekretninu: ${req.title}`,
    '',
    `Ime: ${req.name}`,
    `Telefon: ${req.phone}`,
    `Željeni termin: ${slotText}`,
    ...(langName ? [`Gledao turu na ${langName} - odgovorite na tom jeziku.`] : []),
    ...(req.message ? ['', `Poruka: ${req.message}`] : []),
    '',
    `Tura: ${req.tourUrl}`,
    '',
    'Termin je želja posetioca, ne rezervacija. Potvrdite ga pozivom.',
    'Kvadrat360'
  ].join('\n');

  return { subject: `Razgledanje: ${req.title} - ${req.name}`, html, text };
}

/** "1 prostorija", "3 prostorije", "10 prostorija". */
function roomsLabel(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${n} ${few ? 'prostorije' : 'prostorija'}`;
}
