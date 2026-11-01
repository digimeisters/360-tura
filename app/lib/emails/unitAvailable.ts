import { formatPrice, structureText, type ProjectLang } from '../projectI18n';
import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';

/**
 * "Stan A-07 je ponovo slobodan" - mejl kupcu koji se upisao na "Obavesti
 * me" (app/lib/unitWatch.ts). Po maketi public/mockup/ObavestiMe.html:
 * naziv projekta i investitora gore, podaci stana, dugme na stranu stana,
 * telefon prodaje i odjava jednim klikom u podnožju.
 */

export type AvailableUnit = {
  code: string;
  structure: string | null;
  areaSqm: number | null;
  price: number | null;
  floor: string | null;
  url: string;
  /** Baš stan na koji se kupac upisao (a ne sličan). */
  own: boolean;
};

const MONTH_OF = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const T = {
  sr: {
    ownTitle: (code: string) => [`Stan ${code} je `, 'ponovo slobodan'],
    similarTitle: (n: number) => (n === 1 ? ['Pojavio se ', 'sličan stan'] : ['Pojavili su se ', 'slični stanovi']),
    since: (d: string, code: string) => `Upisali ste se ${d} da vam javimo ako se stan ${code} oslobodi.`,
    ownLead: 'Stan se ponovo prodaje.',
    similarLead: 'Ovo je slobodan stan iste strukture u istom projektu.',
    similarLeadMany: 'Ovo su slobodni stanovi iste strukture u istom projektu.',
    structure: 'Struktura',
    area: 'Površina',
    price: 'Cena',
    onRequest: 'na upit',
    floor: 'Sprat',
    open: 'Pogledajte stan',
    call: (p: string) => `Ili pozovite prodaju: ${p}`,
    footer: (code: string, url: string) =>
      `Dobili ste ovaj mejl jer ste se upisali na kartici stana ${e(code)}. <a href="${e(url)}" style="color:${COLORS.faint};">Ne javljajte mi više</a>`,
    footerText: (code: string) => `Dobili ste ovaj mejl jer ste se upisali na kartici stana ${code}. Odjava:`,
    date: (d: Date) => `${d.getDate()}. ${MONTH_OF[d.getMonth()]}`
  },
  en: {
    ownTitle: (code: string) => [`Apartment ${code} is `, 'available again'],
    similarTitle: (n: number) => (n === 1 ? ['A similar apartment ', 'is available'] : ['Similar apartments ', 'are available']),
    since: (d: string, code: string) => `On ${d} you asked us to let you know if apartment ${code} becomes available.`,
    ownLead: 'It is on sale again.',
    similarLead: 'This is an available apartment of the same layout in the same development.',
    similarLeadMany: 'These are available apartments of the same layout in the same development.',
    structure: 'Layout',
    area: 'Size',
    price: 'Price',
    onRequest: 'on request',
    floor: 'Floor',
    open: 'View the apartment',
    call: (p: string) => `Or call the sales team: ${p}`,
    footer: (code: string, url: string) =>
      `You are receiving this because you signed up on apartment ${e(code)}. <a href="${e(url)}" style="color:${COLORS.faint};">Stop these emails</a>`,
    footerText: (code: string) => `You are receiving this because you signed up on apartment ${code}. Unsubscribe:`,
    date: (d: Date) => `${MONTH_EN[d.getMonth()]} ${d.getDate()}`
  }
} as const;

export function unitAvailableEmail(o: {
  lang: ProjectLang;
  projectTitle: string;
  developer: string | null;
  watchedCode: string;
  since: string;
  units: AvailableUnit[];
  salesPhone: string | null;
  unsubscribeUrl: string;
  /** POST adresa za odjavu jednim klikom iz programa za mejl. */
  oneClickUrl: string;
}): { subject: string; html: string; text: string; headers: Record<string, string> } {
  const t = T[o.lang];
  const own = o.units.find((u) => u.own);
  const [plain, accent] = own ? t.ownTitle(own.code) : t.similarTitle(o.units.length);
  const since = t.since(t.date(new Date(o.since)), o.watchedCode);
  const lead = own ? t.ownLead : o.units.length > 1 ? t.similarLeadMany : t.similarLead;
  const area = (n: number | null) => (n ? `${n.toLocaleString(o.lang === 'en' ? 'en-GB' : 'sr-RS')} m²` : '—');
  const price = (n: number | null) => (n ? formatPrice(n, o.lang) : t.onRequest);

  const fact = (label: string, value: string) =>
    `<td class="kpi" width="33%" valign="top" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};border-radius:12px;"><tr><td style="padding:10px 12px;">
  <p style="margin:0;font-size:12px;font-weight:700;color:${COLORS.soft};">${e(label)}</p>
  <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:${COLORS.ink};">${e(value)}</p>
</td></tr></table></td>`;

  const unitBlock = (u: AvailableUnit, i: number) => `<div style="${i ? `margin-top:20px;padding-top:18px;border-top:1px solid ${COLORS.line};` : ''}">
${o.units.length > 1 || !u.own ? `<p style="margin:0 0 8px;font-size:17px;font-weight:800;color:${COLORS.ink};">${o.lang === 'en' ? 'Apartment' : 'Stan'} ${e(u.code)}${u.floor ? ` <span style="font-weight:500;color:${COLORS.soft};font-size:14px;">· ${e(u.floor)}</span>` : ''}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -4px 14px;"><tr>
${fact(t.structure, structureText(u.structure, o.lang) ?? '—')}
${fact(t.area, area(u.areaSqm))}
${fact(t.price, price(u.price))}
</tr></table>
${buttons({ href: u.url, label: t.open })}
</div>`;

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">${e(o.projectTitle)}${o.developer ? ` · ${e(o.developer)}` : ''}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:${COLORS.ink};">${e(plain)}${accentSpan(accent)}</h1>`,
      '26px 32px 0'
    ),
    row(
      `<div style="font-family:${SANS};">
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.soft};">${e(since)} ${e(lead)}</p>
${o.units.map(unitBlock).join('\n')}
${o.salesPhone ? `<p style="margin:14px 0 0;font-size:14px;color:${COLORS.soft};">${e(t.call(o.salesPhone))}</p>` : ''}
</div>`
    )
  ].join('\n');

  const subject = own ? `${plain}${accent}` : `${o.projectTitle}: ${plain.trim().toLowerCase()} ${accent}`.replace(/^./, (c) => c.toUpperCase());
  const html = emailLayout({ title: subject, preheader: `${since} ${lead}`, body, footer: t.footer(o.watchedCode, o.unsubscribeUrl), lang: o.lang });
  const text = [
    `${o.projectTitle}${o.developer ? ` · ${o.developer}` : ''}`,
    `${plain}${accent}`,
    '',
    `${since} ${lead}`,
    '',
    ...o.units.flatMap((u) => [
      `${o.lang === 'en' ? 'Apartment' : 'Stan'} ${u.code}${u.floor ? ` · ${u.floor}` : ''}: ${[structureText(u.structure, o.lang), area(u.areaSqm), price(u.price)].filter(Boolean).join(', ')}`,
      u.url,
      ''
    ]),
    ...(o.salesPhone ? [t.call(o.salesPhone), ''] : []),
    `${t.footerText(o.watchedCode)} ${o.unsubscribeUrl}`
  ].join('\n');

  return {
    subject,
    html,
    text,
    // Gmail/Outlook pokazuju dugme "Odjavi se" pored pošiljaoca.
    headers: { 'List-Unsubscribe': `<${o.oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  };
}
