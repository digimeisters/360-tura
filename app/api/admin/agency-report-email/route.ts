import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { agencyReportToken, buildAgencyReport, currentMonthKey, monthLabel, parseMonthKey, shiftMonth } from '@/app/lib/agencyReport';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { monthlyReportEmail } from '@/app/lib/emails/monthlyReport';
import { CONTACT, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/agency-report-email
 *
 * Mesečni izveštaj agenciji mejlom - dugme "Pošalji izveštaj" na strani
 * Agencije u adminu. Samo za admina. Sa `preview: true` vraća HTML mejla i
 * predložene primaoce (mejlovi agenata iz tura te agencije), bez slanja.
 *
 * Telo: { agency, month? ("2026-10", podrazumevano prošli mesec), to?: string[], preview? }
 */

const MAX_RECIPIENTS = 10;

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const agency = typeof body?.agency === 'string' ? body.agency : '';
  if (!agency.trim()) return NextResponse.json({ success: false, error: 'Neispravan zahtev.' }, { status: 400 });
  const month = parseMonthKey(body?.month) ?? shiftMonth(currentMonthKey(), -1);
  const preview = body?.preview === true;

  const report = await buildAgencyReport(agency, month).catch((err) => {
    console.error('[api/admin/agency-report-email] report failed:', err);
    return undefined;
  });
  if (report === undefined) return NextResponse.json({ success: false, error: 'Baza trenutno ne odgovara - pokušajte ponovo za minut.' }, { status: 503 });
  if (!report) return NextResponse.json({ success: false, error: 'Agencija nema nijednu turu.' }, { status: 404 });

  // Predlog primalaca: mejlovi agenata iz tura ove agencije, bez ponavljanja.
  const { data: tours } = await ctx.supabase.from('tours').select('agent_email').eq('agency_name', agency);
  const suggested = [...new Set((tours ?? []).map((t) => t.agent_email?.trim().toLowerCase()).filter(looksLikeEmail))];

  const reportUrl = `${SITE_URL}/izvestaj/${agencyReportToken(agency)}?mesec=${month}`;
  const email = monthlyReportEmail(report, reportUrl);

  if (preview) {
    return NextResponse.json({
      success: true,
      subject: email.subject,
      html: email.html,
      recipients: suggested,
      monthLabel: monthLabel(month),
      visitors: report.totals.visitors
    });
  }

  const to: string[] = Array.isArray(body?.to) ? body.to.filter((x: unknown): x is string => typeof x === 'string').map((x: string) => x.trim()) : [];
  if (!to.length || to.length > MAX_RECIPIENTS || !to.every((x) => looksLikeEmail(x))) {
    return NextResponse.json({ success: false, error: `Upišite od 1 do ${MAX_RECIPIENTS} ispravnih mejl adresa.` }, { status: 400 });
  }

  // Svako dobija svoj mejl (ne vidi ostale adrese); odgovor ide na info@.
  const results = await Promise.all(to.map(async (address) => ({ address, result: await sendEmail({ to: address, ...email, replyTo: CONTACT.email }) })));
  const failed = results.filter((r) => !r.result.ok);
  if (failed.length === results.length) {
    const error =
      failed[0].result.ok === false && failed[0].result.reason === 'not-configured'
        ? 'Slanje mejlova nije podešeno na serveru (RESEND_API_KEY).'
        : 'Mejl nije prošao kroz Resend - pokušajte ponovo za minut.';
    return NextResponse.json({ success: false, error }, { status: 502 });
  }
  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.result.ok).map((r) => r.address),
    failed: failed.map((r) => r.address)
  });
}
