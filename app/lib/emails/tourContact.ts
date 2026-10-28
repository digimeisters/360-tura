import { COLORS, SANS, accentSpan, buttons, e, emailLayout, propertyCard, roomsLabel, row } from './shell';

/**
 * Mejl agentu kad posetilac u turi ostavi broj ili mejl ("Pošaljite sebi
 * link i tlocrt", /api/tour-capture). Izgled po maketi
 * public/mockup/mejlovi/kontakt.html: brat mejla "Upit za razgledanje",
 * bez termina. Kad je posetilac ostavio mejl, sistem mu je link i tlocrt
 * već poslao (visitorLinkPlan.ts) - agent samo nudi razgledanje. Kad je
 * ostavio broj, agent šalje link, a dugme otvara SMS sa upisanim linkom.
 */

const LANG_NAMES: Record<string, string> = { en: 'engleskom', de: 'nemačkom', ru: 'ruskom' };
const WHERE_TEXT: Record<string, string> = { plan: 'dok je gledao tlocrt', info: 'u Info delu ture', exit: 'pri izlasku iz ture' };

export type TourContactEmail = {
  agentName: string | null;
  title: string;
  tourUrl: string;
  coverUrl: string | null;
  areaSqm: number | null;
  roomCount: number;
  contact: string;
  contactIsEmail: boolean;
  where: string;
  lang: string;
  /** Posetiocu je mejl sa linkom (i tlocrtom) već otišao. */
  visitorEmailed: boolean;
  /** Tura ima tlocrt (da se ne obećava kad ga nema). */
  hasPlan: boolean;
};

export function tourContactEmail(c: TourContactEmail): { subject: string; html: string; text: string } {
  const greeting = c.agentName ? `Zdravo, ${c.agentName}!` : 'Zdravo!';
  const what = c.hasPlan ? 'link i tlocrt' : 'link';
  const whereText = WHERE_TEXT[c.where] ?? 'u turi';
  const langName = c.lang !== 'sr' ? LANG_NAMES[c.lang] ?? c.lang : null;
  const tel = c.contact.replace(/[^\d+]/g, '');

  const meta = [c.areaSqm ? `${Math.round(c.areaSqm)} m²` : null, c.roomCount > 0 ? roomsLabel(c.roomCount) : null, '360° tura'].filter(Boolean).join(' · ');

  // Gotova poruka posetiocu: na srpskom, ili engleskom za strane posetioce.
  // Kad je link već stigao mejlom, poruka nudi razgledanje umesto linka.
  const reply = c.visitorEmailed
    ? c.lang === 'sr'
      ? `Zdravo! Javljam se povodom nekretnine ${c.title} (${c.tourUrl}). Da li biste želeli da je pogledate uživo? Mogu da predložim termin.`
      : `Hello! I'm getting in touch about ${c.title} (${c.tourUrl}). Would you like to see it in person? I can suggest a time.`
    : c.lang === 'sr'
      ? `Zdravo! Šaljem vam link 360° ture: ${c.tourUrl}${c.hasPlan ? ' Tlocrt je u turi, dugme „Plan“.' : ''} Javite mi se ako želite razgledanje.`
      : `Hello! Here is the 360° tour link: ${c.tourUrl}${c.hasPlan ? ' The floor plan is in the tour, under "Plan".' : ''} Let me know if you would like a viewing.`;
  const mailto = `mailto:${c.contact}?subject=${encodeURIComponent(c.title)}&body=${encodeURIComponent(reply)}`;
  // "?&body=" otvara poruku sa tekstom i na iPhone-u i na Androidu.
  const sms = `sms:${tel}?&body=${encodeURIComponent(reply)}`;

  const contactHtml = c.contactIsEmail
    ? `<a href="mailto:${e(c.contact)}" style="text-decoration:none;color:${COLORS.blue};">${e(c.contact)}</a>`
    : `<a href="tel:${e(tel)}" style="text-decoration:none;color:${COLORS.blue};">${e(c.contact)}</a>`;

  const factRow = (label: string, value: string, last = false) =>
    `<tr><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${last ? `border-bottom:1px solid ${COLORS.line};` : ''}color:${COLORS.soft};width:38%;vertical-align:top;">${label}</td><td style="padding:10px 0;border-top:1px solid ${COLORS.line};${last ? `border-bottom:1px solid ${COLORS.line};` : ''}font-weight:700;color:${COLORS.ink};">${value}</td></tr>`;
  const facts = [
    factRow('Kontakt', contactHtml),
    factRow('Ostavio ga je', e(whereText), !langName),
    ...(langName ? [factRow('Gledao turu na', `${e(langName)}, odgovorite na tom jeziku`, true)] : [])
  ].join('');

  const alreadySent = c.hasPlan ? 'Link i tlocrt su mu već poslati' : 'Link mu je već poslat';
  const task = c.visitorEmailed
    ? { title: alreadySent, note: `Kvadrat360 mu je odmah poslao ${what} na mejl. Dugme ispod otvara odgovor sa ponudom za razgledanje.` }
    : {
        title: `Pošaljite mu ${what}`,
        note: 'Posetilac nije tražio termin, samo da sačuva nekretninu za kasnije. Dugme ispod otvara poruku sa već upisanim linkom ture, vi samo pošaljete.'
      };
  const taskBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};border-radius:14px;"><tr><td style="padding:16px 18px;font-family:${SANS};">
  <p style="margin:0;font-size:15px;font-weight:700;color:${COLORS.ink};">${e(task.title)}</p>
  <p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:${COLORS.soft};">${e(task.note)}</p>
</td></tr></table>`;

  const actions = c.contactIsEmail
    ? buttons({ href: mailto, label: 'Odgovorite mejlom' })
    : buttons({ href: sms, label: 'Pošaljite poruku' }, { href: `tel:${tel}`, label: 'Pozovite' });

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(greeting)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:${COLORS.ink};">Posetilac želi ${c.hasPlan ? `link i ${accentSpan('tlocrt nekretnine')}` : accentSpan('link nekretnine')}</h1>`,
      '28px 32px 0'
    ),
    row(propertyCard({ tourUrl: c.tourUrl, coverUrl: c.coverUrl, title: c.title, metaHtml: e(meta) })),
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};font-size:15px;">${facts}</table>`),
    row(taskBox),
    row(
      `${actions}
<p style="margin:14px 0 0;font-family:${SANS};font-size:14px;color:${COLORS.soft};line-height:1.5;">Javite se dok mu je nekretnina još sveža u glavi, pa ponudite i razgledanje.</p>`
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Kontakt iz ture',
    preheader: `Posetilac je ${whereText} ostavio ${c.contactIsEmail ? 'mejl' : 'broj'} ${c.contact}. ${c.visitorEmailed ? `${alreadySent}.` : `Pošaljite mu ${what}.`}`,
    body,
    footer: 'Kontakt je ostavljen u 360° turi koju je za vas napravio Kvadrat360.'
  });

  const text = [
    greeting,
    `Posetilac želi ${what}: ${c.title}`,
    '',
    `Kontakt: ${c.contact}`,
    `Ostavio ga je ${whereText}.`,
    ...(langName ? [`Gledao turu na ${langName} - odgovorite na tom jeziku.`] : []),
    '',
    `${task.title}. ${task.note}`,
    '',
    `Tura: ${c.tourUrl}`,
    'Kvadrat360'
  ].join('\n');

  return { subject: `Kontakt iz ture: ${c.title}`, html, text };
}
