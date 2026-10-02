import { createHash, randomBytes } from 'crypto';
import { revalidateProject } from './revalidateProject';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { escapeHtml, sendTelegramMessage } from './telegram';
import { formatEur, UNIT_STATUS_LABEL, type UnitStatus } from './projects';
import { loadProjectStats, type ProjectStats } from './projectStats';

/**
 * Pristup za prodaju investitora (migracija 020): lični link
 * /prodaja/<kod> preko koga osoba iz prodaje menja SAMO status i cenu
 * stanova jednog projekta. Bez naloga - kod je dug i nasumičan, u bazi je
 * samo njegov SHA-256 otisak, a admin link gasi jednim klikom.
 *
 * Ovde je i zapis promena (project_unit_changes), koji koriste i link za
 * prodaju i admin, i Telegram obaveštenje o prodaji/rezervaciji.
 */

export const ADMIN_ACTOR = 'Admin';

/** 32 bajta nasumično = 43 znaka; ne može se pogoditi. */
export function newSalesToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSalesToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SalesLink = { id: string; project_id: string; person_name: string };
export type SalesProject = { id: string; slug: string; title: string; notify_sales: boolean };

/** Aktivan link + njegov projekat, ili null (nepostojeći, ugašen, ili loš format koda). */
export async function resolveSalesLink(db: SupabaseClient, token: string): Promise<{ link: SalesLink; project: SalesProject } | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const { data: link } = await db
    .from('project_sales_links')
    .select('id, project_id, person_name, revoked_at')
    .eq('token_hash', hashSalesToken(token))
    .maybeSingle();
  if (!link || (link as { revoked_at: string | null }).revoked_at) return null;
  const { data: project } = await db
    .from('projects')
    .select('id, slug, title, notify_sales')
    .eq('id', (link as SalesLink).project_id)
    .maybeSingle();
  if (!project) return null;
  return { link: link as SalesLink, project: project as SalesProject };
}

/** Kratka beleška prodaje (migracija 023): jedna po stanu / upitu, nova zamenjuje staru. */
export type SalesNote = { text: string; important: boolean; author: string; updated_at: string };

export const NOTE_MAX = 120;

export type SalesUnit = {
  id: string;
  floor_id: string;
  code: string;
  structure: string | null;
  area_sqm: number | null;
  status: UnitStatus;
  price: number | null;
  note: SalesNote | null;
};

export type SalesChange = {
  id: string;
  created_at: string;
  actor: string;
  unit_code: string;
  field: 'status' | 'price';
  old_value: string | null;
  new_value: string | null;
};

/** Upit za stan sa javne strane (migracija 021). */
export type SalesInquiry = {
  id: string;
  created_at: string;
  unit_code: string;
  name: string;
  contact: string;
  message: string | null;
  embedded: boolean;
  lang: string;
  handled_at: string | null;
  handled_by: string | null;
  note: SalesNote | null;
};

export type SalesData = {
  project: { title: string; slug: string; published: boolean };
  person: string;
  /** building = naziv lamele (migracija 025), null kad projekat nema lamele. */
  floors: { id: string; level: number; label: string | null; building: string | null }[];
  units: SalesUnit[];
  changes: SalesChange[];
  inquiries: SalesInquiry[];
  stats: ProjectStats;
};

/** Sve što strana za prodaju prikazuje: upiti, spratovi, stanovi, poslednje promene, izveštaj. */
export async function loadSalesData(db: SupabaseClient, projectId: string, person: string): Promise<SalesData | null> {
  const [{ data: project }, { data: floors }, { data: units }, { data: changes }, { data: inquiries }, { data: buildings }] = await Promise.all([
    db.from('projects').select('title, slug, published').eq('id', projectId).maybeSingle(),
    db.from('project_floors').select('id, level, label, building_id').eq('project_id', projectId).order('level', { ascending: false }),
    db.from('project_units').select('id, floor_id, code, structure, area_sqm, status, price').eq('project_id', projectId),
    db
      .from('project_unit_changes')
      .select('id, created_at, actor, unit_code, field, old_value, new_value')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(15),
    db
      .from('project_inquiries')
      .select('id, created_at, unit_code, name, contact, message, embedded, lang, handled_at, handled_by')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('project_buildings').select('id, name, sort').eq('project_id', projectId)
  ]);
  if (!project) return null;
  // Lamele: spratovi po lameli (redosled iz admina), pa od vrha ka dnu.
  const bRows = (buildings ?? []) as { id: string; name: string; sort: number }[];
  const bOrder = (bid: string | null) => bRows.find((b) => b.id === bid)?.sort ?? 0;
  const floorRows = ((floors ?? []) as { id: string; level: number; label: string | null; building_id: string | null }[])
    .map((f) => ({ id: f.id, level: f.level, label: f.label, building: bRows.find((b) => b.id === f.building_id)?.name ?? null, order: bOrder(f.building_id) }))
    .sort((a, b) => a.order - b.order || b.level - a.level)
    .map((f) => ({ id: f.id, level: f.level, label: f.label, building: f.building }));
  const notes = await loadNotes(db, projectId);
  const unitRows = ((units ?? []) as SalesUnit[])
    .map((u) => ({
      ...u,
      area_sqm: u.area_sqm === null ? null : Number(u.area_sqm),
      price: u.price === null ? null : Number(u.price),
      note: notes.byUnit.get(u.id) ?? null
    }))
    .sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }));
  const p = project as SalesData['project'];
  const stats = await loadProjectStats(db, projectId, p.slug, unitRows.map((u) => u.code));
  return {
    project: p,
    person,
    floors: floorRows,
    units: unitRows,
    changes: (changes ?? []) as SalesChange[],
    inquiries: ((inquiries ?? []) as SalesInquiry[]).map((q) => ({ ...q, note: notes.byInquiry.get(q.id) ?? null })),
    stats
  };
}

/** Sve beleške projekta, po stanu i po upitu (za stranu prodaje i admin). */
export async function loadNotes(db: SupabaseClient, projectId: string) {
  const { data } = await db
    .from('project_notes')
    .select('unit_id, inquiry_id, text, important, author, updated_at')
    .eq('project_id', projectId);
  const byUnit = new Map<string, SalesNote>();
  const byInquiry = new Map<string, SalesNote>();
  for (const n of (data ?? []) as (SalesNote & { unit_id: string | null; inquiry_id: string | null })[]) {
    const note = { text: n.text, important: n.important, author: n.author, updated_at: n.updated_at };
    if (n.unit_id) byUnit.set(n.unit_id, note);
    if (n.inquiry_id) byInquiry.set(n.inquiry_id, note);
  }
  return { byUnit, byInquiry };
}

/**
 * Upisuje (ili briše, kad je tekst prazan) belešku na stanu ili upitu.
 * Proverava da stan/upit pripada projektu. Vraća grešku kao tekst, ili null.
 */
export async function saveNote(
  db: SupabaseClient,
  projectId: string,
  target: 'unit' | 'inquiry',
  targetId: string,
  rawText: unknown,
  important: unknown,
  author: string
): Promise<string | null> {
  const table = target === 'unit' ? 'project_units' : 'project_inquiries';
  const { data: owner } = await db.from(table).select('id').eq('id', targetId).eq('project_id', projectId).maybeSingle();
  if (!owner) return target === 'unit' ? 'Stan nije pronađen u ovom projektu.' : 'Upit nije pronađen u ovom projektu.';
  const column = target === 'unit' ? 'unit_id' : 'inquiry_id';
  const text = typeof rawText === 'string' ? rawText.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) : '';
  if (!text) {
    const { error } = await db.from('project_notes').delete().eq(column, targetId);
    return error ? 'Beleška nije obrisana.' : null;
  }
  const { error } = await db.from('project_notes').upsert(
    { project_id: projectId, [column]: targetId, text, important: important === true, author: author.slice(0, 80), updated_at: new Date().toISOString() },
    { onConflict: column }
  );
  return error ? 'Beleška nije sačuvana.' : null;
}

export type UnitChange = {
  unitId: string;
  code: string;
  oldStatus: UnitStatus;
  newStatus: UnitStatus;
  oldPrice: number | null;
  newPrice: number | null;
};

const priceText = (n: number | null) => (n === null ? null : String(n));

/**
 * Upisuje promene u istoriju, osvežava javnu stranu projekta i (ako je
 * uključeno) šalje Telegram kad stan postane prodat ili rezervisan.
 * Neuspeh istorije ili Telegrama ne obara samu izmenu - ona je već upisana.
 */
export async function recordUnitChanges(
  db: SupabaseClient,
  project: SalesProject,
  actor: string,
  linkId: string | null,
  changes: UnitChange[]
): Promise<void> {
  const rows = changes.flatMap((c) => {
    const out = [];
    if (c.oldStatus !== c.newStatus) {
      out.push({ field: 'status', old_value: c.oldStatus, new_value: c.newStatus });
    }
    if (priceText(c.oldPrice) !== priceText(c.newPrice)) {
      out.push({ field: 'price', old_value: priceText(c.oldPrice), new_value: priceText(c.newPrice) });
    }
    return out.map((r) => ({ ...r, project_id: project.id, unit_id: c.unitId, unit_code: c.code, link_id: linkId, actor }));
  });
  if (!rows.length) return;

  const { error } = await db.from('project_unit_changes').insert(rows);
  if (error) console.error('[salesAccess] zapis promene nije upisan:', error.message);

  revalidateProject(project.slug);

  if (!project.notify_sales || actor === ADMIN_ACTOR) return;
  const notable = changes.filter((c) => c.oldStatus !== c.newStatus && (c.newStatus === 'sold' || c.newStatus === 'reserved'));
  if (!notable.length) return;
  const lines = [
    `🏢 <b>${escapeHtml(project.title)}</b>`,
    ...notable.map(
      (c) =>
        `${c.newStatus === 'sold' ? '✅' : '🟡'} Stan <b>${escapeHtml(c.code)}</b>: ${UNIT_STATUS_LABEL[c.oldStatus].toLowerCase()} → <b>${UNIT_STATUS_LABEL[c.newStatus].toLowerCase()}</b>${c.newPrice !== null && c.newStatus !== 'sold' ? ` (${formatEur(c.newPrice)})` : ''}`
    ),
    `👤 ${escapeHtml(actor)}`
  ];
  await sendTelegramMessage(lines.join('\n')).catch(() => false);
}
