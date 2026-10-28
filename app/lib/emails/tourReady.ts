import { COLORS, SANS, accentSpan, buttons, e, emailLayout, roomsLabel, row } from './shell';

/**
 * Mejl "Vaša tura je gotova" - šalje se iz admina dugmetom "Pošalji
 * klijentu" (/api/admin/tours/send-ready), nikad sam od sebe.
 * Izgled po maketi public/mockup/mejlovi/tura-gotova.html: velika slika
 * ture sa plavom trakom, pa spisak onoga što je stiglo, svaka stavka u
 * svom redu. Redovi za HDR fotografije i QR kod se pojavljuju samo kad ih
 * ima (link upisan u admin / QR u prilogu).
 */

export type TourReadyEmail = {
  /** Kome se obraća ("Zdravo, Jelena!"); prazno = "Zdravo!". */
  name: string | null;
  title: string;
  tourUrl: string;
  embedCode: string;
  coverUrl: string | null;
  roomCount: number;
  /** Jezici ture, npr. ['sr', 'en']. */
  languages: string[];
  areaSqm: number | null;
  /** Link ka HDR fotografijama (Google Drive, WeTransfer...) - opciono. */
  hdrUrl: string | null;
  /** QR kod ide u prilogu mejla. */
  qrAttached: boolean;
};

export function tourReadyEmail(t: TourReadyEmail): { subject: string; html: string; text: string } {
  const greeting = t.name ? `Zdravo, ${t.name}!` : 'Zdravo!';
  const langs = t.languages.map((l) => l.toUpperCase()).join(', ');
  const barRight = [t.roomCount > 0 ? roomsLabel(t.roomCount) : null, langs || null].filter(Boolean).join(' · ');
  const subtitle = [t.title, t.areaSqm ? `${Math.round(t.areaSqm)} m²` : null].filter(Boolean).join(', ');
  const shortUrl = t.tourUrl.replace(/^https?:\/\//, '');

  // Jedna stavka: naslov i opis levo, veza desno (na telefonu ispod).
  const item = (title: string, note: string, link?: { href: string; label: string }) =>
    `<tr>
  <td class="stack" style="padding:16px 0;border-top:1px solid ${COLORS.lineStrong};"><p style="margin:0;font-size:17px;font-weight:700;color:${COLORS.ink};">${e(title)}</p><p style="margin:3px 0 0;font-size:14px;color:${COLORS.soft};word-break:break-all;">${e(note)}</p></td>
  <td class="stack stack-r" align="right" style="padding:16px 0;border-top:1px solid ${COLORS.lineStrong};">${link ? `<a href="${e(link.href)}" style="font-size:15px;font-weight:700;text-decoration:none;white-space:nowrap;color:${COLORS.blue};">${e(link.label)}</a>` : ''}</td>
</tr>`;

  const items = [
    item('Link za oglas', shortUrl, { href: t.tourUrl, label: 'Otvorite link' }),
    t.hdrUrl ? item('HDR fotografije', 'Pune rezolucije, za portal i društvene mreže', { href: t.hdrUrl, label: 'Preuzmite' }) : '',
    t.qrAttached ? item('QR kod', 'Za letak, izlog i štampani oglas. U prilogu ovog mejla.') : '',
    `<tr><td colspan="2" style="padding:16px 0;border-top:1px solid ${COLORS.lineStrong};border-bottom:1px solid ${COLORS.lineStrong};">
  <p style="margin:0;font-size:17px;font-weight:700;color:${COLORS.ink};">Kod za sajt agencije</p>
  <p style="margin:3px 0 10px;font-size:14px;color:${COLORS.soft};">Prosledite ga osobi koja vam održava sajt.</p>
  <p style="margin:0;padding:12px 14px;background:${COLORS.page};border-radius:10px;font-family:Consolas,Menlo,monospace;font-size:13px;line-height:1.5;color:${COLORS.ink};word-break:break-all;">${e(t.embedCode)}</p>
</td></tr>`
  ].join('');

  const photo = t.coverUrl
    ? `<tr><td><a href="${e(t.tourUrl)}" style="text-decoration:none;">
  <img src="${e(t.coverUrl)}" width="600" alt="${e(t.title)}, 360° tura" style="display:block;width:100%;height:auto;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};"><tr>
    <td class="pad" style="padding:13px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; Otvorite turu</td>
    <td align="right" class="pad" style="padding:13px 32px;font-family:${SANS};font-size:14px;color:#CFE0F5;white-space:nowrap;">${e(barRight)}</td>
  </tr></table>
</a></td></tr>`
    : '';

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(greeting)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">Vaša tura je ${accentSpan('gotova.')}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(subtitle)}. Možete je staviti na oglas već danas.</p>`,
      '26px 32px 22px'
    ),
    photo,
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};">${items}</table>`, '26px 32px 0'),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.soft};">Kad kupac zakaže razgledanje iz ture, upit stiže na mejl agenta upisan u turi, sa imenom, telefonom i željenim terminom.</p>`,
      '24px 32px 0'
    ),
    row(buttons({ href: t.tourUrl, label: 'Otvorite turu' }), '22px 32px 0')
  ].join('\n');

  const html = emailLayout({
    title: 'Vaša tura je gotova',
    preheader: `${t.title}: link za oglas${t.hdrUrl ? ', HDR fotografije' : ''} i kod za sajt. Spremno za objavu danas.`,
    body,
    footer: 'Nešto treba ispraviti u turi? Odgovorite na ovaj mejl.'
  });

  const text = [
    greeting,
    `Vaša tura je gotova: ${subtitle}.`,
    '',
    `Link za oglas: ${t.tourUrl}`,
    ...(t.hdrUrl ? [`HDR fotografije: ${t.hdrUrl}`] : []),
    ...(t.qrAttached ? ['QR kod: u prilogu ovog mejla.'] : []),
    '',
    'Kod za sajt agencije:',
    t.embedCode,
    '',
    'Kad kupac zakaže razgledanje iz ture, upit stiže na mejl agenta upisan u turi.',
    'Nešto treba ispraviti? Odgovorite na ovaj mejl.',
    'Kvadrat360'
  ].join('\n');

  return { subject: `Vaša tura je gotova: ${t.title}`, html, text };
}
