import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';

/**
 * Mejl "Vaš link za vođenje uživo" - agentu iz admina (meni "⋯" →
 * "Link za vođenje uživo" → Pošalji, /api/admin/tours/send-live-link).
 * Izgled po maketi public/mockup/mejlovi/vodjenje-uzivo.html.
 *
 * Dva linka sa dva stalna imena, da agent kupcu ne pošalje pogrešan:
 * "link za vođenje" (ovaj, trajan, njime agent upravlja) i "link za kupca"
 * (pravi se u turi na "Uživo", nov za svako gledanje). Pun link za vođenje
 * je samo iza dugmadi; vidljiv je skraćen, sa tačkicama umesto potpisa.
 */

export type LiveGuideLinkEmail = {
  /** Kome se obraća ("Zdravo, Jelena!"); prazno = "Zdravo!". */
  name: string | null;
  title: string;
  areaSqm: number | null;
  coverUrl: string | null;
  /** Pun agentov link: https://kvadrat360.com/tour/<slug>?agent=<token>. */
  guideUrl: string;
};

export function liveGuideLinkEmail(t: LiveGuideLinkEmail): { subject: string; html: string; text: string } {
  const greeting = t.name ? `Zdravo, ${t.name}!` : 'Zdravo!';
  // Kvadratura samo kad je naslov već ne sadrži ("Dvosoban stan 52 m² - Beograd").
  const showArea = t.areaSqm && !/m²|m2\b/i.test(t.title);
  const subtitle = [t.title, showArea ? `${Math.round(t.areaSqm!)} m²` : null].filter(Boolean).join(', ');
  const maskedUrl = t.guideUrl.replace(/^https?:\/\//, '').replace(/([?&]agent=).*$/, '$1••••••');
  const kicker = (text: string, color: string = COLORS.blue) =>
    `<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${color};">${e(text)}</p>`;

  const photo = t.coverUrl
    ? `<tr><td><a href="${e(t.guideUrl)}" style="text-decoration:none;">
  <img src="${e(t.coverUrl)}" width="600" alt="${e(t.title)}, 360° tura" style="display:block;width:100%;height:auto;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};"><tr>
    <td class="pad" style="padding:13px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; Otvorite link za vođenje</td>
    <td align="right" class="pad" style="padding:13px 32px;font-family:${SANS};font-size:14px;color:#CFE0F5;white-space:nowrap;">Vi upravljate</td>
  </tr></table>
</a></td></tr>`
    : '';

  // Dva linka, dve uloge: agentov u plavom okviru sa dugmetom, kupčev obrubljen.
  const links = `<p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Dva linka, dve uloge</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};border:1.5px solid ${COLORS.blue};border-radius:14px;"><tr><td style="padding:18px 20px;">
  ${kicker('Samo vaš')}
  <p style="margin:2px 0 0;font-size:19px;font-weight:800;color:${COLORS.ink};">Link za vođenje</p>
  <p style="margin:4px 0 12px;font-size:14px;line-height:1.55;color:${COLORS.soft};">Njime upravljate: birate sobu, pravac i pokazujete detalje. Ne šaljite ga kupcu.</p>
  <p style="margin:0 0 14px;padding:10px 12px;background:#FFFFFF;border-radius:10px;font-family:Consolas,Menlo,monospace;font-size:13px;color:${COLORS.ink};word-break:break-all;">${e(maskedUrl)}</p>
  ${buttons({ href: t.guideUrl, label: 'Otvorite link za vođenje' })}
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid ${COLORS.lineStrong};border-radius:14px;"><tr><td style="padding:18px 20px;">
  ${kicker('Šaljete kupcu', COLORS.soft)}
  <p style="margin:2px 0 0;font-size:19px;font-weight:800;color:${COLORS.ink};">Link za kupca</p>
  <p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:${COLORS.soft};">Pravi se tek kad u turi pritisnete „Uživo“, nov za svako razgledanje. Njega šaljete kupcu, a kupac samo prati.</p>
</td></tr></table>`;

  // Jedan korak: broj u plavom krugu levo, naslov i objašnjenje desno.
  const step = (n: number, title: string, note: string, last = false) => {
    const border = `border-top:1px solid ${COLORS.lineStrong};${last ? `border-bottom:1px solid ${COLORS.lineStrong};` : ''}`;
    return `<tr>
  <td width="44" valign="top" style="padding:16px 0;${border}"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:999px;background:${COLORS.blueSoft};color:${COLORS.blue};font-size:15px;font-weight:800;">${n}</span></td>
  <td style="padding:16px 0;${border}"><p style="margin:0;font-size:17px;font-weight:700;color:${COLORS.ink};">${e(title)}</p><p style="margin:3px 0 0;font-size:14px;line-height:1.5;color:${COLORS.soft};">${e(note)}</p></td>
</tr>`;
  };

  const steps = `<p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Kako ide</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${step(1, 'Otvorite link za vođenje i pritisnite „Uživo“', 'Na telefonu ili računaru. Dugme je sa strane, ispod ostalih dugmadi u turi.')}
${step(2, 'Pošaljite kupcu link za kupca', 'Pojavi se čim pritisnete „Uživo“. Kopirajte ga ili ga pošaljite Viberom.')}
${step(3, 'Pozovite ga i vodite', 'Razgovarate telefonom ili Viberom, a kupac prati gde gledate. Kad završite, pritisnite „Završi“.', true)}
</table>`;

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(greeting)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">Vaš link za vođenje ${accentSpan('uživo.')}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(subtitle)}. Preko ovog linka vi upravljate turom, a kupac na svom telefonu prati sve što mu pokažete, bez dolaska na adresu.</p>`,
      '26px 32px 22px'
    ),
    photo,
    row(`<div style="font-family:${SANS};">${links}</div>`, '26px 32px 0'),
    row(`<div style="font-family:${SANS};">${steps}</div>`, '28px 32px 0'),
    row(
      `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.soft};">Sačuvajte ovaj mejl. Link za vođenje važi za svako sledeće razgledanje ove nekretnine.</p>`,
      '22px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Vaš link za vođenje uživo',
    preheader: `Vaš link za vođenje za ${subtitle}: vi upravljate turom, kupac na svom telefonu prati.`,
    body,
    footer: 'Prvi put vodite kupca? Odgovorite na ovaj mejl i probaćemo zajedno.'
  });

  const text = [
    greeting,
    `Vaš link za vođenje uživo: ${subtitle}.`,
    'Preko ovog linka vi upravljate turom, a kupac na svom telefonu prati sve što mu pokažete.',
    '',
    'LINK ZA VOĐENJE (samo vaš, ne šaljite ga kupcu):',
    t.guideUrl,
    '',
    'LINK ZA KUPCA: pravi se tek kad u turi pritisnete „Uživo“, nov za svako razgledanje. Njega šaljete kupcu.',
    '',
    'Kako ide:',
    '1. Otvorite link za vođenje i pritisnite „Uživo“ (dugme sa strane, ispod ostalih dugmadi).',
    '2. Pošaljite kupcu link za kupca - kopirajte ga ili ga pošaljite Viberom.',
    '3. Pozovite ga i vodite. Kad završite, pritisnite „Završi“.',
    '',
    'Sačuvajte ovaj mejl. Link za vođenje važi za svako sledeće razgledanje ove nekretnine.',
    'Prvi put vodite kupca? Odgovorite na ovaj mejl i probaćemo zajedno.',
    'Kvadrat360'
  ].join('\n');

  return { subject: `Link za vođenje uživo: ${t.title}`, html, text };
}
