import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { currentMonthKey, monthLabel, parseMonthKey, shiftMonth } from '@/app/lib/agencyReport';
import { looksLikeEmail, sendEmail } from '@/app/lib/email';
import { projectReportEmail } from '@/app/lib/emails/projectReport';
import { buildProjectReport, projectReportToken } from '@/app/lib/projectReport';
import { CONTACT, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/project-report-email
 *
 * Mesečni izveštaj investitoru - dugme "Mesečni izveštaj investitoru" u
 * adminu projekta ("Izveštaj i upiti"). Samo za admina. Sa `preview: true`
 * vraća link izveštaja, HTML mejla i predloženog primaoca (mejl prodaje
 * projekta), bez slanja.
 *
 * Telo: { projectId, month? ("2026-10", podrazumevano prošli mesec), to?: string[], preview? }
 */

const MAX_RECIPIENTS = 10;

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const projectId = typeof body?.projectId === 'string' && /^[0-9a-f-]{36}$/i.test(body.projectId) ? body.projectId : '';
  if (!projectId) return NextResponse.json({ success: false, error: 'Neispravan zahtev.' }, { status: 400 });
  const month = parseMonthKey(body?.month) ?? shiftMonth(currentMonthKey(), -1);
  const preview = body?.preview === true;

  const report = await buildProjectReport(projectId, month).catch((err) => {
    console.error('[api/admin/project-report-email] report failed:', err);
    return undefined;
  });
  if (report === undefined) return NextResponse.json({ success: false, error: 'Baza trenutno ne odgovara - pokušajte ponovo za minut.' }, { status: 503 });
  if (!report) return NextResponse.json({ success: false, error: 'Projekat ne postoji.' }, { status: 404 });

  const reportUrl = `${SITE_URL}/izvestaj/projekat/${projectReportToken(projectId)}?mesec=${month}`;
  const email = projectReportEmail(report, reportUrl);

  if (preview) {
    const { data: project } = await ctx.supabase.from('projects').select('contact_email').eq('id', projectId).maybeSingle();
    const contact = project?.contact_email?.trim().toLowerCase();
    return NextResponse.json({
      success: true,
      reportUrl,
      subject: email.subject,
      html: email.html,
      recipients: contact && looksLikeEmail(contact) ? [contact] : [],
      monthLabel: monthLabel(month),
      visitors: report.totals.visitors,
      inquiries: report.totals.inquiries
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
