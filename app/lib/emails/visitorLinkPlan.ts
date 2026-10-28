import { COLORS, SANS, accentSpan, e, emailLayout, roomsLabel, row } from './shell';

/**
 * Mejl posetiocu ture "Link i tlocrt" - šalje se sam od sebe čim posetilac
 * u turi ostavi mejl adresu (/api/tour-capture). Na jeziku na kom je
 * gledao turu. Izgled po maketi public/mockup/mejlovi/link-i-tlocrt.html:
 * tura (slika + plava traka), tlocrt kao slika (i u prilogu), pa agent.
 */

type Copy = {
  kicker: string;
  h1Lead: string;
  h1Accent: string;
  intro: (withPlan: boolean) => string;
  open: string;
  rooms: (n: number) => string;
  plan: string;
  schematicNote: string;
  attachedNote: string;
  agentQ: string;
  call: string;
  footer: string;
  subject: (title: string, withPlan: boolean) => string;
};

/** Ruski i srpski dele pravilo 1 / 2-4 / 5+ (osim 11-14). */
function slavicFew(n: number): 'one' | 'few' | 'many' {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return 'one';
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'few' : 'many';
}

const COPY: Record<string, Copy> = {
  sr: {
    kicker: 'Kao što ste tražili',
    h1Lead: 'Nekretnina koju ste',
    h1Accent: 'sačuvali.',
    intro: (p) => (p ? 'Evo linka ture i tlocrta, da je pogledate ponovo kad vam odgovara.' : 'Evo linka ture, da je pogledate ponovo kad vam odgovara.'),
    open: 'Otvorite turu',
    rooms: roomsLabel,
    plan: 'Tlocrt',
    schematicNote: 'Šematski prikaz rasporeda, nije u razmeri. Tlocrt je i u prilogu ovog mejla.',
    attachedNote: 'Tlocrt je i u prilogu ovog mejla.',
    agentQ: 'Pitanja ili zakazivanje razgledanja?',
    call: 'Pozovite',
    footer: 'Ovaj mejl ste dobili jer ste u 360° turi upisali ovu adresu. Ne šaljemo vam ništa drugo.',
    subject: (t, p) => (p ? `Link i tlocrt: ${t}` : `Link ture: ${t}`)
  },
  en: {
    kicker: 'As you asked',
    h1Lead: 'The property you',
    h1Accent: 'saved.',
    intro: (p) =>
      p ? 'Here is the tour link and the floor plan, so you can look again whenever it suits you.' : 'Here is the tour link, so you can look again whenever it suits you.',
    open: 'Open the tour',
    rooms: (n) => `${n} ${n === 1 ? 'room' : 'rooms'}`,
    plan: 'Floor plan',
    schematicNote: 'Schematic layout, not to scale. The floor plan is also attached to this email.',
    attachedNote: 'The floor plan is also attached to this email.',
    agentQ: 'Questions, or want to book a viewing?',
    call: 'Call',
    footer: "You received this email because you entered this address in a 360° tour. We won't send you anything else.",
    subject: (t, p) => (p ? `Link and floor plan: ${t}` : `Tour link: ${t}`)
  },
  de: {
    kicker: 'Wie gewünscht',
    h1Lead: 'Die Immobilie, die Sie',
    h1Accent: 'gespeichert haben.',
    intro: (p) =>
      p
        ? 'Hier sind der Link zur Tour und der Grundriss, damit Sie sie jederzeit wieder ansehen können.'
        : 'Hier ist der Link zur Tour, damit Sie sie jederzeit wieder ansehen können.',
    open: 'Tour öffnen',
    rooms: (n) => `${n} ${n === 1 ? 'Raum' : 'Räume'}`,
    plan: 'Grundriss',
    schematicNote: 'Schematische Darstellung, nicht maßstabsgetreu. Der Grundriss ist auch im Anhang dieser E-Mail.',
    attachedNote: 'Der Grundriss ist auch im Anhang dieser E-Mail.',
    agentQ: 'Fragen oder eine Besichtigung vereinbaren?',
    call: 'Anrufen',
    footer: 'Sie erhalten diese E-Mail, weil Sie diese Adresse in einer 360°-Tour eingegeben haben. Wir senden Ihnen nichts anderes.',
    subject: (t, p) => (p ? `Link und Grundriss: ${t}` : `Link zur Tour: ${t}`)
  },
  ru: {
    kicker: 'Как вы просили',
    h1Lead: 'Недвижимость, которую вы',
    h1Accent: 'сохранили.',
    intro: (p) =>
      p ? 'Вот ссылка на тур и план, чтобы вы могли посмотреть снова, когда вам удобно.' : 'Вот ссылка на тур, чтобы вы могли посмотреть снова, когда вам удобно.',
    open: 'Открыть тур',
    rooms: (n) => `${n} ${{ one: 'комната', few: 'комнаты', many: 'комнат' }[slavicFew(n)]}`,
    plan: 'План',
    schematicNote: 'Схема планировки, не в масштабе. План также во вложении к этому письму.',
    attachedNote: 'План также во вложении к этому письму.',
    agentQ: 'Вопросы или запись на просмотр?',
    call: 'Позвонить',
    footer: 'Вы получили это письмо, потому что указали этот адрес в 360° туре. Больше мы ничего не пришлём.',
    subject: (t, p) => (p ? `Ссылка и план: ${t}` : `Ссылка на тур: ${t}`)
  }
};

export type VisitorLinkPlanEmail = {
  lang: string;
  /** Naziv ture na jeziku posetioca. */
  title: string;
  tourUrl: string;
  coverUrl: string | null;
  roomCount: number;
  /** Slika tlocrta za <img> (PNG/JPG, lib/floorplanImage.ts) - null bez tlocrta. */
  planImageUrl: string | null;
  /** Šematski plan (napomena "nije u razmeri") ili pravi crtež. */
  planIsSchematic: boolean;
  agentName: string | null;
  agency: string | null;
  agentPhone: string | null;
};

export function visitorLinkPlanEmail(v: VisitorLinkPlanEmail): { subject: string; html: string; text: string } {
  const t = COPY[v.lang] ?? COPY.sr;
  const withPlan = Boolean(v.planImageUrl);
  const tel = v.agentPhone ? v.agentPhone.replace(/[^\d+]/g, '') : '';
  const who = v.agentName || v.agency;

  const photo = v.coverUrl
    ? `<tr><td><a href="${e(v.tourUrl)}" style="text-decoration:none;">
  <img src="${e(v.coverUrl)}" width="600" alt="${e(v.title)}, 360°" style="display:block;width:100%;height:auto;border:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blue};"><tr>
    <td class="pad" style="padding:13px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;">&#9654;&nbsp; ${e(t.open)}</td>
    <td align="right" class="pad" style="padding:13px 32px;font-family:${SANS};font-size:14px;color:#CFE0F5;white-space:nowrap;">${v.roomCount > 0 ? e(t.rooms(v.roomCount)) : ''}</td>
  </tr></table>
</a></td></tr>`
    : row(
        `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${COLORS.blue};border-radius:999px;"><a href="${e(v.tourUrl)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;">${e(t.open)}</a></td></tr></table>`,
        '0 32px'
      );

  const plan = v.planImageUrl
    ? row(
        `<p style="margin:0 0 10px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">${e(t.plan)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:14px;background:#FFFFFF;"><tr><td style="padding:16px;">
  <a href="${e(v.tourUrl)}"><img src="${e(v.planImageUrl)}" width="502" alt="${e(t.plan)}: ${e(v.title)}" style="display:block;width:100%;height:auto;border:0;"></a>
</td></tr></table>
<p style="margin:8px 0 0;font-family:${SANS};font-size:13px;color:${COLORS.faint};">${e(v.planIsSchematic ? t.schematicNote : t.attachedNote)}</p>`,
        '28px 32px 0'
      )
    : '';

  const callButtons = tel
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="background:${COLORS.blue};border-radius:999px;"><a href="tel:${e(tel)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">${e(t.call)}</a></td>
  <td width="8"></td>
  <td style="border:1.5px solid ${COLORS.lineStrong};border-radius:999px;"><a href="viber://chat?number=${encodeURIComponent(tel)}" style="display:inline-block;padding:10.5px 18px;font-family:${SANS};font-size:15px;font-weight:700;color:${COLORS.ink};text-decoration:none;">Viber</a></td>
</tr></table>`
    : '';

  const agent = who
    ? row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.lineStrong};border-bottom:1px solid ${COLORS.lineStrong};"><tr>
  <td class="stack" style="padding:18px 0;font-family:${SANS};">
    <p style="margin:0;font-size:13px;color:${COLORS.soft};">${e(t.agentQ)}</p>
    <p style="margin:3px 0 0;font-size:17px;font-weight:700;color:${COLORS.ink};">${e(who)}</p>
    <p style="margin:2px 0 0;font-size:14px;color:${COLORS.soft};">${e([v.agentName ? v.agency : null, v.agentPhone].filter(Boolean).join(' · '))}</p>
  </td>
  ${callButtons ? `<td class="stack stack-r" align="right" style="padding:18px 0;">${callButtons}</td>` : ''}
</tr></table>`,
        '26px 32px 0'
      )
    : '';

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:15px;color:${COLORS.soft};">${e(t.kicker)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">${e(t.h1Lead)} ${accentSpan(t.h1Accent)}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.soft};">${e(v.title)}. ${e(t.intro(withPlan))}</p>`,
      '26px 32px 22px'
    ),
    photo,
    plan,
    agent
  ].join('\n');

  const subject = t.subject(v.title, withPlan);
  const html = emailLayout({
    title: subject,
    preheader: `${v.title}: ${t.intro(withPlan)}`,
    body,
    footer: e(t.footer)
  });

  const text = [
    t.kicker,
    `${v.title}. ${t.intro(withPlan)}`,
    '',
    `${t.open}: ${v.tourUrl}`,
    ...(withPlan ? [t.attachedNote] : []),
    ...(who ? ['', t.agentQ, [who, v.agentName ? v.agency : null, v.agentPhone].filter(Boolean).join(' · ')] : []),
    '',
    t.footer,
    'Kvadrat360'
  ].join('\n');

  return { subject, html, text };
}
