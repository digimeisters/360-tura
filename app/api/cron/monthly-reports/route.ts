import { NextResponse } from 'next/server';
import { agencyReportLinks, buildAgencyReport, currentMonthKey, monthLabel, shiftMonth } from '@/app/lib/agencyReport';
import { isDemoTour } from '@/app/lib/demoTour';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/telegram';
import { requestsLabel, visitorsLabel } from '@/app/lib/emails/monthlyReport';
import { SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/monthly-reports - Vercel Cron, 1. u mesecu ujutru (vercel.json).
 *
 * Ne šalje ništa agencijama: vlasniku javi na Telegram koje agencije imaju
 * posetioce za prošli mesec, a izveštaje šalje sam iz admina (Agencije →
 * "Pošalji izveštaj") posle pregleda. Vercel šalje
 * "Authorization: Bearer <CRON_SECRET>"; bez te promenljive ruta ne radi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const month = shiftMonth(currentMonthKey(), -1);
  const agencies = (await agencyReportLinks()).filter((a) => !isDemoTour(a.agency));

  const ready: { agency: string; visitors: number; requests: number }[] = [];
  for (const { agency } of agencies) {
    const report = await buildAgencyReport(agency, month).catch(() => null);
    if (report && report.totals.visitors > 0) {
      ready.push({ agency, visitors: report.totals.visitors, requests: report.totals.viewingRequests });
    }
  }

  const lines = ready.length
    ? [
        `📊 <b>Mesečni izveštaji za ${escapeHtml(monthLabel(month))} su spremni</b>`,
        '',
        ...ready.map((r) => `• ${escapeHtml(r.agency)}: ${r.visitors} ${visitorsLabel(r.visitors)}, ${requestsLabel(r.requests)}`),
        '',
        `Pregledajte i pošaljite: <a href="${SITE_URL}/admin/agencije">Admin → Agencije</a> → „✉ Pošalji izveštaj“`
      ]
    : [`📊 Za ${escapeHtml(monthLabel(month))} nijedna agencija nema posetioce - nema izveštaja za slanje.`];
  await sendTelegramMessage(lines.join('\n'));

  return NextResponse.json({ success: true, month, ready: ready.length });
}
