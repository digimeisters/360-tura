import type { MonthKey } from '../agencyReport';
import type { ProjectReport } from '../projectReport';
import { srPlural } from '../projectI18n';
import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';
import { visitorsLabel } from './monthlyReport';

/**
 * Mesečni izveštaj investitoru mejlom - šalje ga vlasnik iz admina projekta
 * ("Izveštaj i upiti" → "Mesečni izveštaj investitoru",
 * /api/admin/project-report-email) posle pregleda. Po maketi
 * public/mockup/IzvestajInvestitor.html: tri broja (posetioci, upiti,
 * prodato), najgledaniji stan, upozorenje "gledaju a ne pitaju" i dugme
 * ka celom izveštaju (/izvestaj/projekat/<token>).
 */

const MONTH_IN = ['januaru', 'februaru', 'martu', 'aprilu', 'maju', 'junu', 'julu', 'avgustu', 'septembru', 'oktobru', 'novembru', 'decembru'];
const MONTH_OF = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

const monthIndex = (key: MonthKey) => Number(key.split('-')[1]) - 1;
const inquiries = (n: number) => `${n} ${srPlural(n, 'upit', 'upita', 'upita')}`;
const views = (n: number) => `${n} ${srPlural(n, 'pregled', 'pregleda', 'pregleda')}`;

/** "A-07 i B-14", "A-07, B-14 i C-02". */
function joinCodes(codes: string[]): string {
  return codes.length < 2 ? codes.join('') : `${codes.slice(0, -1).join(', ')} i ${codes[codes.length - 1]}`;
}

export function projectReportEmail(r: ProjectReport, reportUrl: string): { subject: string; html: string; text: string } {
  const m = monthIndex(r.month);
  const prevOf = MONTH_OF[(m + 11) % 12];
  const prevIn = MONTH_IN[(m + 11) % 12];
  const t = r.totals;
  const up = (text: string) => `<p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#166534;">▲ ${e(text)}</p>`;
  const down = (text: string) => `<p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#991b1b;">▼ ${e(text)}</p>`;
  const flat = (text: string) => `<p style="margin:6px 0 0;font-size:13px;color:${COLORS.soft};">${e(text)}</p>`;

  let visitorsChange = '';
  if (r.previous && r.previous.visitors > 0) {
    const pct = Math.round(((t.visitors - r.previous.visitors) / r.previous.visitors) * 100);
    visitorsChange = pct > 0 ? up(`${pct}% od ${prevOf}`) : pct < 0 ? down(`${-pct}% od ${prevOf}`) : flat(`isto kao u ${prevIn}`);
  }
  let inquiriesChange = '';
  if (r.previous) {
    const diff = t.inquiries - r.previous.inquiries;
    inquiriesChange = diff > 0 ? up(`${diff} više`) : diff < 0 ? down(`${-diff} manje`) : flat(`isto kao u ${prevIn}`);
  }

  const kpi = (label: string, value: string, below: string, accent: boolean, pad: string) =>
    `<td class="kpi" width="33%" valign="top" style="padding:${pad};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accent ? COLORS.blueSoft : COLORS.page};border-radius:14px;"><tr><td style="padding:16px;">
    <p style="margin:0;font-size:13px;color:${accent ? COLORS.blue : COLORS.soft};font-weight:700;">${e(label)}</p>
    <p class="num" style="margin:4px 0 0;font-size:34px;line-height:1;font-weight:800;color:${accent ? COLORS.blue : COLORS.ink};">${e(value)}</p>
    ${below}
  </td></tr></table>
</td>`;

  const kpis = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${kpi('Posetioci', String(t.visitors), visitorsChange, false, '0 8px 0 0')}
${kpi('Upiti', String(t.inquiries), inquiriesChange, true, '0 4px')}
${kpi('Prodato', String(t.sold), t.reserved ? flat(`+ ${t.reserved} rezervisano`) : flat('iz prodajne table'), false, '0 0 0 8px')}
</tr></table>`;

  const top = r.units[0];
  const notes = [
    top ? `Najgledaniji: ${top.code} (${views(top.views)}, ${inquiries(top.inquiries)}).` : null,
    r.watch.length
      ? `Pažnja: ${joinCodes(r.watch.map((w) => w.code))} se ${r.watch.length === 1 ? 'mnogo gleda' : 'mnogo gledaju'}, a bez upita.`
      : null
  ].filter((x): x is string => Boolean(x));

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Mesečni izveštaj${r.developer ? ` · ${e(r.developer)}` : ''}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">${e(r.title)} u ${accentSpan(`${MONTH_IN[m]}.`)}</h1>`,
      '26px 32px 0'
    ),
    row(
      `<div style="font-family:${SANS};">${kpis}
${notes.length ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:${COLORS.soft};">${e(notes.join(' '))}</p>` : ''}</div>`
    ),
    row(
      `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.soft};">U celom izveštaju su najgledaniji stanovi, šta kupci traže po strukturi, odakle dolaze, prodaja u mesecu i čuvanje u PDF-u.</p>
${buttons({ href: reportUrl, label: 'Otvorite ceo izveštaj' })}`,
      '24px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Mesečni izveštaj projekta',
    preheader: `U ${MONTH_IN[m]}: ${t.visitors} ${visitorsLabel(t.visitors)}, ${inquiries(t.inquiries)} za stanove.`,
    body,
    footer: 'Izveštaj za prethodni mesec šaljemo početkom meseca. Ne želite ga? Odgovorite na ovaj mejl.'
  });

  const text = [
    `Mesečni izveštaj${r.developer ? ` · ${r.developer}` : ''}`,
    `${r.title} u ${MONTH_IN[m]}.`,
    '',
    `Posetioci: ${t.visitors}`,
    `Upiti: ${t.inquiries}`,
    `Prodato: ${t.sold}${t.reserved ? ` (+ ${t.reserved} rezervisano)` : ''}`,
    ...(notes.length ? ['', ...notes] : []),
    '',
    `Ceo izveštaj: ${reportUrl}`,
    'Ne želite izveštaj? Odgovorite na ovaj mejl.',
    'Kvadrat360'
  ].join('\n');

  return { subject: `${r.title} u ${MONTH_IN[m]}: ${t.visitors} ${visitorsLabel(t.visitors)}, ${inquiries(t.inquiries)}`, html, text };
}
