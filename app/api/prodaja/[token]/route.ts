import { NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '@/app/lib/rateLimit';
import { loadSalesData, recordUnitChanges, resolveSalesLink, saveNote, serviceClient } from '@/app/lib/salesAccess';
import { UNIT_STATUSES, type UnitStatus } from '@/app/lib/projects';

export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * /api/prodaja/<kod> - izmene sa strane za prodaju investitora
 * ============================================================
 * GET  -> sveži podaci (stanovi + poslednje promene)
 * POST { unitId, status, price, expected: { status, price } }
 *      -> menja JEDAN stan, posle potvrde na strani.
 *
 * Dozvoljeno je samo: status i cena stana iz projekta kome link pripada.
 * `expected` je ono što je prodavac video pre izmene - ako je u međuvremenu
 * neko drugi promenio isti stan, izmena se odbija (409) umesto da tiho
 * pregazi tuđu, pa strana pokaže novo stanje.
 */

type Params = { params: Promise<{ token: string }> };

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

const priceOrNull = (v: unknown): number | null | undefined => {
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return undefined;
  return Math.round(n);
};

export async function GET(req: Request, { params }: Params) {
  const limit = rateLimit(req, 'prodaja-get', 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec, 'Previše zahteva. Sačekajte malo.');
  const { token } = await params;
  const db = serviceClient();
  if (!db) return fail('Nedostaje konfiguracija.', 500);
  const access = await resolveSalesLink(db, token);
  if (!access) return fail('Link ne važi. Zatražite novi od Kvadrat360.', 404);
  const data = await loadSalesData(db, access.project.id, access.link.person_name);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request, { params }: Params) {
  const limit = rateLimit(req, 'prodaja-post', 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec, 'Previše izmena u kratkom roku. Sačekajte malo.');
  const { token } = await params;
  const db = serviceClient();
  if (!db) return fail('Nedostaje konfiguracija.', 500);
  const access = await resolveSalesLink(db, token);
  if (!access) return fail('Link ne važi. Zatražite novi od Kvadrat360.', 404);
  const { link, project } = access;

  const body = await req.json().catch(() => ({}));

  // Kratka beleška na stanu ili upitu (migracija 023): nova zamenjuje staru,
  // prazan tekst je briše. Autor = ime iz linka.
  if (body.action === 'note') {
    const target = body.target === 'inquiry' ? 'inquiry' : body.target === 'unit' ? 'unit' : null;
    const targetId = typeof body.id === 'string' ? body.id : '';
    if (!target || !/^[0-9a-f-]{36}$/i.test(targetId)) return fail('Neispravna beleška.');
    const err = await saveNote(db, project.id, target, targetId, body.text, body.important, link.person_name);
    if (err) return fail(err, 400);
    const data = await loadSalesData(db, project.id, link.person_name);
    return NextResponse.json({ success: true, data });
  }

  // Upit za stan: prodaja ga označava kao "javio/la sam se" (ili vraća nazad).
  if (body.action === 'inquiry-handled') {
    const inquiryId = typeof body.inquiryId === 'string' ? body.inquiryId : '';
    const handled = body.handled !== false;
    if (!inquiryId) return fail('Nedostaje upit.');
    const { error } = await db
      .from('project_inquiries')
      .update(handled ? { handled_at: new Date().toISOString(), handled_by: link.person_name } : { handled_at: null, handled_by: null })
      .eq('id', inquiryId)
      .eq('project_id', project.id);
    if (error) return fail('Izmena nije sačuvana. Pokušajte ponovo.', 500);
    const data = await loadSalesData(db, project.id, link.person_name);
    return NextResponse.json({ success: true, data });
  }

  const unitId = typeof body.unitId === 'string' ? body.unitId : '';
  const status = body.status as UnitStatus;
  const price = priceOrNull(body.price);
  const expected = (body.expected ?? {}) as { status?: unknown; price?: unknown };
  if (!unitId || !UNIT_STATUSES.includes(status) || price === undefined) return fail('Neispravna izmena.');

  const { data: current } = await db
    .from('project_units')
    .select('id, code, status, price')
    .eq('id', unitId)
    .eq('project_id', project.id)
    .maybeSingle();
  if (!current) return fail('Stan nije pronađen u ovom projektu.', 404);
  const cur = current as { id: string; code: string; status: UnitStatus; price: number | null };
  const curPrice = cur.price === null ? null : Number(cur.price);

  if (expected.status !== cur.status || priceOrNull(expected.price) !== curPrice) {
    const data = await loadSalesData(db, project.id, link.person_name);
    return NextResponse.json(
      { success: false, conflict: true, error: `Stan ${cur.code} je u međuvremenu promenio neko drugi. Prikazano je novo stanje - proverite i pokušajte ponovo.`, data },
      { status: 409 }
    );
  }

  if (cur.status === status && curPrice === price) {
    const data = await loadSalesData(db, project.id, link.person_name);
    return NextResponse.json({ success: true, data });
  }

  const { error } = await db
    .from('project_units')
    .update({ status, price, updated_at: new Date().toISOString() })
    .eq('id', cur.id)
    .eq('project_id', project.id);
  if (error) return fail('Izmena nije sačuvana. Pokušajte ponovo.', 500);

  await Promise.all([
    recordUnitChanges(db, project, link.person_name, link.id, [
      { unitId: cur.id, code: cur.code, oldStatus: cur.status, newStatus: status, oldPrice: curPrice, newPrice: price }
    ]),
    db.from('project_sales_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)
  ]);

  const data = await loadSalesData(db, project.id, link.person_name);
  return NextResponse.json({ success: true, data });
}
