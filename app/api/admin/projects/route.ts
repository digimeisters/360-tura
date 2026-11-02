import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { loadNotes } from '@/app/lib/salesAccess';
import type { UnitStatus } from '@/app/lib/projects';
import { fail, type Action } from './_actions/shared';
import { projectActions } from './_actions/project';
import { planAiActions } from './_actions/planAi';
import { floorsActions } from './_actions/floors';
import { unitsActions } from './_actions/units';
import { buildingsActions } from './_actions/buildings';
import { viewsActions } from './_actions/views';
import { salesActions } from './_actions/sales';
import { progressActions } from './_actions/progress';

export const dynamic = 'force-dynamic';
// Okolina (Overpass) ume da traje 10-20 s, a prevod opisa nekoliko sekundi.
export const maxDuration = 60;

/**
 * ============================================================
 * /api/admin/projects - novogradnja (migracija 019)
 * ============================================================
 * GET                 -> spisak projekata (sa brojem stanova po statusu)
 * GET ?id=<uuid>      -> ceo projekat: projekat, spratovi, stanovi, ture za izbor
 * POST { action, ... } -> izmene; svaka radnja živi u _actions/<tema>.ts
 *
 * Sve ide service role ključem posle requireAdmin - tabele nemaju policy
 * za upis, pa ovo je jedini put do njih. Ture i sobe se ovde samo ČITAJU.
 */

const ACTIONS: Record<string, Action> = {
  ...projectActions,
  ...planAiActions,
  ...floorsActions,
  ...unitsActions,
  ...buildingsActions,
  ...viewsActions,
  ...salesActions,
  ...progressActions
};

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return fail(ctx.error, ctx.status);
  const db = ctx.supabase;
  const id = new URL(req.url).searchParams.get('id');

  if (!id) {
    const { data: projects, error } = await db
      .from('projects')
      .select('id, slug, title, developer_name, city, published, updated_at')
      .order('created_at', { ascending: false });
    if (error) return fail(error.message, 500);
    const { data: units } = await db.from('project_units').select('project_id, status');
    const counts: Record<string, Record<UnitStatus, number>> = {};
    for (const u of (units ?? []) as { project_id: string; status: UnitStatus }[]) {
      counts[u.project_id] ??= { available: 0, reserved: 0, sold: 0 };
      counts[u.project_id][u.status]++;
    }
    return NextResponse.json({
      success: true,
      projects: (projects ?? []).map((p) => ({ ...p, counts: counts[p.id] ?? { available: 0, reserved: 0, sold: 0 } }))
    });
  }

  const [{ data: project, error }, { data: floors }, { data: units }, { data: tours }, { data: buildings }, { data: views }, { data: shapes }] =
    await Promise.all([
      db.from('projects').select('*').eq('id', id).maybeSingle(),
      db.from('project_floors').select('*').eq('project_id', id).order('level', { ascending: true }),
      db.from('project_units').select('*').eq('project_id', id).order('sort', { ascending: true }).order('code', { ascending: true }),
      db.from('tours').select('id, slug, title, published').order('created_at', { ascending: false }),
      db.from('project_buildings').select('*').eq('project_id', id).order('sort').order('name'),
      db.from('project_views').select('*').eq('project_id', id).order('sort').order('created_at'),
      db.from('project_view_shapes').select('id, view_id, project_id, building_id, floor_id, unit_id, polygon').eq('project_id', id)
    ]);
  if (error) return fail(error.message, 500);
  if (!project) return fail('Projekat nije pronađen.', 404);
  // Beleške prodaje po stanu (migracija 023) - admin ih vidi u tabeli stanova.
  const notes = await loadNotes(db, id);
  return NextResponse.json({
    success: true,
    project,
    floors: floors ?? [],
    units: units ?? [],
    tours: tours ?? [],
    buildings: buildings ?? [],
    views: views ?? [],
    shapes: shapes ?? [],
    unitNotes: Object.fromEntries(notes.byUnit)
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return fail(ctx.error, ctx.status);
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';
  const run = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
  if (!run) return fail('Nepoznata akcija.');

  try {
    return await run(ctx.supabase, body);
  } catch (err) {
    console.error('[api/admin/projects]', action, err);
    return fail('Neočekivana greška na serveru.', 500);
  }
}
