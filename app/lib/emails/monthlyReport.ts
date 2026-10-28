import type { AgencyReport, MonthKey } from '../agencyReport';
import type { RoomHeatRow } from '../roomHeat';
import { COLORS, SANS, accentSpan, buttons, e, emailLayout, row } from './shell';

/**
 * Mesečni izveštaj agenciji mejlom - šalje ga vlasnik iz admina (Agencije →
 * "Pošalji izveštaj", /api/admin/agency-report-email) posle pregleda; 1. u
 * mesecu stiže samo podsetnik na Telegram (/api/cron/monthly-reports).
 * Izgled po maketi public/mockup/mejlovi/izvestaj.html: tri broja sa
 * poređenjem, kratka lista tura, dugme ka celom izveštaju (/izvestaj/<token>).
 */

const MONTH_IN = ['januaru', 'februaru', 'martu', 'aprilu', 'maju', 'junu', 'julu', 'avgustu', 'septembru', 'oktobru', 'novembru', 'decembru'];
const MONTH_OF = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
const MAX_TOURS = 3;

const monthIndex = (key: MonthKey) => Number(key.split('-')[1]) - 1;

/** 1 posetilac, 2-4 posetioca, 5+ posetilaca (11-14 su "posetilaca"). */
export function visitorsLabel(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return 'posetilac';
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'posetioca' : 'posetilaca';
}

export const requestsLabel = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? `${n} zahtev` : `${n} zahteva`);

// Soba koju je video manji deo posetilaca ne može biti "najduže gledana":
// jedan dug pogled na toalet ne govori ništa o kupcima.
const TOP_ROOM_MIN_SEEN_PCT = 30;

function topRoom(rows: RoomHeatRow[]): RoomHeatRow | null {
  const seen = rows.filter((r) => r.seenPct >= TOP_ROOM_MIN_SEEN_PCT && r.avgSeconds > 0);
  return seen.sort((a, b) => b.avgSeconds - a.avgSeconds)[0] ?? null;
}

function duration(seconds: number): string {
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function monthlyReportEmail(r: AgencyReport, reportUrl: string): { subject: string; html: string; text: string } {
  const m = monthIndex(r.month);
  const prevOf = MONTH_OF[(m + 11) % 12];
  const t = r.totals;
  const up = (text: string) => `<p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#166534;">▲ ${e(text)}</p>`;
  const down = (text: string) => `<p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#991b1b;">▼ ${e(text)}</p>`;
  const flat = (text: string) => `<p style="margin:6px 0 0;font-size:13px;color:${COLORS.soft};">${e(text)}</p>`;

  // Poređenje sa prošlim mesecom, samo kad je tada bilo tura i posetilaca.
  let visitorsChange = '';
  if (r.previous && r.previous.visitors > 0) {
    const pct = Math.round(((t.visitors - r.previous.visitors) / r.previous.visitors) * 100);
    visitorsChange = pct > 0 ? up(`${pct}% od ${prevOf}`) : pct < 0 ? down(`${-pct}% od ${prevOf}`) : flat(`isto kao u ${MONTH_IN[(m + 11) % 12]}`);
  }
  let requestsChange = '';
  if (r.previous) {
    const diff = t.viewingRequests - r.previous.viewingRequests;
    requestsChange = diff > 0 ? up(`${diff} više`) : diff < 0 ? down(`${-diff} manje`) : flat(`isto kao u ${MONTH_IN[(m + 11) % 12]}`);
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
${kpi('Zahtevi za razgledanje', String(t.viewingRequests), requestsChange, true, '0 4px')}
${kpi('Prosečno u turi', duration(t.avgSeconds), flat('minuta po posetiocu'), false, '0 0 0 8px')}
</tr></table>`;

  const enterRate = t.visitors ? Math.round((t.entered / t.visitors) * 100) : 0;
  const more = [
    `${enterRate}% posetilaca je ušlo u turu`,
    t.foreignVisitors ? `${t.foreignVisitors} je gledalo na stranom jeziku` : null,
    t.contactClicks ? `${t.contactClicks} je otvorilo vaš kontakt` : null
  ].filter(Boolean);

  const shown = r.tours.filter((x) => x.visitors > 0).slice(0, MAX_TOURS);
  const tourRows = shown
    .map((x, i) => {
      const last = i === shown.length - 1;
      const border = `border-top:1px solid ${COLORS.lineStrong};${last ? `border-bottom:1px solid ${COLORS.lineStrong};` : ''}`;
      const top = topRoom(x.heat?.rows ?? []);
      const req = x.viewingRequests
        ? `<span style="font-size:13px;color:${COLORS.blue};font-weight:700;">${e(requestsLabel(x.viewingRequests))}</span>`
        : `<span style="font-size:13px;color:${COLORS.soft};">bez zahteva</span>`;
      return `<tr>
  <td style="padding:14px 0;${border}"><p style="margin:0;font-weight:700;">${e(x.title)}</p>${top ? `<p style="margin:2px 0 0;font-size:13px;color:${COLORS.soft};">Najduže gledali: ${e(top.title)}</p>` : ''}</td>
  <td align="right" style="padding:14px 0 14px 12px;${border}white-space:nowrap;"><b>${x.visitors}</b> <span style="color:${COLORS.soft};font-size:13px;">${visitorsLabel(x.visitors)}</span><br>${req}</td>
</tr>`;
    })
    .join('');

  const body = [
    row(
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Mesečni izveštaj · ${e(r.agency)}</p>
<h1 class="h1" style="margin:0;font-family:${SANS};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:${COLORS.ink};">Vaše ture u ${accentSpan(`${MONTH_IN[m]}.`)}</h1>`,
      '26px 32px 0'
    ),
    row(
      `<div style="font-family:${SANS};">${kpis}
<p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:${COLORS.soft};">Još: ${e(more.join(', '))}.</p></div>`
    ),
    shown.length
      ? row(
          `<p style="margin:0 0 4px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.blue};">Po turama</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SANS};font-size:15px;color:${COLORS.ink};">${tourRows}</table>`,
          '26px 32px 0'
        )
      : '',
    row(
      `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.soft};">U celom izveštaju su sve ture, toplotna mapa po prostorijama (gde se kupci najduže zadržavaju) i čuvanje u PDF-u.</p>
${buttons({ href: reportUrl, label: 'Otvorite ceo izveštaj' })}`,
      '24px 32px 0'
    )
  ].join('\n');

  const html = emailLayout({
    title: 'Mesečni izveštaj',
    preheader: `U ${MONTH_IN[m]}: ${t.visitors} ${visitorsLabel(t.visitors)}, ${requestsLabel(t.viewingRequests)} za razgledanje.`,
    body,
    footer: 'Izveštaj stiže svakog 1. u mesecu. Ne želite ga? Odgovorite na ovaj mejl.'
  });

  const text = [
    `Mesečni izveštaj · ${r.agency}`,
    `Vaše ture u ${MONTH_IN[m]}.`,
    '',
    `Posetioci: ${t.visitors}`,
    `Zahtevi za razgledanje: ${t.viewingRequests}`,
    `Prosečno u turi: ${duration(t.avgSeconds)} min`,
    `Još: ${more.join(', ')}.`,
    '',
    ...shown.map((x) => `${x.title}: ${x.visitors} ${visitorsLabel(x.visitors)}, ${x.viewingRequests ? requestsLabel(x.viewingRequests) : 'bez zahteva'}`),
    '',
    `Ceo izveštaj: ${reportUrl}`,
    'Ne želite izveštaj? Odgovorite na ovaj mejl.',
    'Kvadrat360'
  ].join('\n');

  const label = MONTH_IN[m];
  return { subject: `Vaše ture u ${label}: ${t.visitors} ${visitorsLabel(t.visitors)}`, html, text };
}
