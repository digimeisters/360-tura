import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { cleanPolygon, MAX_VIEWS_PER_BUILDING, SHAPE_COLUMN, type ShapeTarget } from '@/app/lib/projects';
import { fail, text, refresh, projectSlug, type Action } from './shared';

/** Slike zgrade (fasade, pogledi) i oblici na njima. */
export const viewsActions: Record<string, Action> = {
  'view-add': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const kind = body.kind === 'site' ? 'site' : 'building';
    const buildingId = kind === 'site' ? null : text(body.buildingId, 40);
    const imageUrl = text(body.imageUrl, 600);
    if (!projectId || !imageUrl || !/^https:\/\//.test(imageUrl)) return fail('Nedostaje slika.');
    let q = db.from('project_views').select('sort').eq('project_id', projectId).eq('kind', kind);
    q = buildingId ? q.eq('building_id', buildingId) : q.is('building_id', null);
    const { data: same, error: sErr } = await q;
    if (sErr) return fail(sErr.message, 500);
    const siblings = (same ?? []) as { sort: number }[];
    if (siblings.length >= MAX_VIEWS_PER_BUILDING) return fail(`Najviše ${MAX_VIEWS_PER_BUILDING} slika po zgradi.`);
    const sort = siblings.reduce((m, v) => Math.max(m, v.sort), -1) + 1;
    const { data, error } = await db
      .from('project_views')
      .insert({ project_id: projectId, kind, building_id: buildingId, image_url: imageUrl, label: text(body.label, 40), sort })
      .select('*')
      .single();
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, view: data });
  },

  // Natpis ili nova slika (oblici ostaju - ista kamera, nov render).
  'view-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    if (!projectId || !id) return fail('Nedostaje slika.');
    const patch: Record<string, unknown> = {};
    if ('label' in body) patch.label = text(body.label, 40);
    if ('imageUrl' in body) {
      const url = text(body.imageUrl, 600);
      if (!url || !/^https:\/\//.test(url)) return fail('Nedostaje slika.');
      patch.image_url = url;
    }
    const { data, error } = await db
      .from('project_views')
      .update(patch as Database['public']['Tables']['project_views']['Update'])
      .eq('id', id)
      .eq('project_id', projectId)
      .select('*')
      .single();
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, view: data });
  },

  // Redosled rotacije: slika menja mesto sa susednom slikom iste zgrade.
  'view-move': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    const dir = body.dir === -1 ? -1 : 1;
    if (!projectId || !id) return fail('Nedostaje slika.');
    const { data: all, error: aErr } = await db.from('project_views').select('id, kind, building_id, sort, created_at').eq('project_id', projectId);
    if (aErr) return fail(aErr.message, 500);
    type V = { id: string; kind: string; building_id: string | null; sort: number; created_at: string };
    const rows = (all ?? []) as V[];
    const me = rows.find((v) => v.id === id);
    if (!me) return fail('Slika nije pronađena.', 404);
    const group = rows
      .filter((v) => v.kind === me.kind && v.building_id === me.building_id)
      .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
    const i = group.findIndex((v) => v.id === id);
    const j = i + dir;
    if (j >= 0 && j < group.length) {
      [group[i], group[j]] = [group[j], group[i]];
      for (let k = 0; k < group.length; k++) {
        const { error } = await db.from('project_views').update({ sort: k }).eq('id', group[k].id);
        if (error) return fail(error.message, 500);
      }
      refresh(await projectSlug(db, projectId));
    }
    return NextResponse.json({ success: true, order: group.map((v) => v.id) });
  },

  'view-delete': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    if (!projectId || !id) return fail('Nedostaje slika.');
    const { error } = await db.from('project_views').delete().eq('id', id).eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  },

  // Oblik lamele / sprata / stana na jednoj slici; polygon null = brisanje.
  'shape-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const viewId = text(body.viewId, 40);
    const target = body.target as ShapeTarget;
    const targetId = text(body.targetId, 40);
    if (!projectId || !viewId || !targetId || !Object.prototype.hasOwnProperty.call(SHAPE_COLUMN, target)) return fail('Nedostaje oblik.');
    const column = SHAPE_COLUMN[target];
    const table = target === 'building' ? 'project_buildings' : target === 'floor' ? 'project_floors' : 'project_units';
    const [{ data: view }, { data: owner }] = await Promise.all([
      db.from('project_views').select('id, kind').eq('id', viewId).eq('project_id', projectId).maybeSingle(),
      db.from(table).select('id').eq('id', targetId).eq('project_id', projectId).maybeSingle()
    ]);
    if (!view || !owner) return fail('Slika ili oblik ne pripadaju ovom projektu.', 404);
    if (((view as { kind: string }).kind === 'site') !== (target === 'building')) {
      return fail((view as { kind: string }).kind === 'site' ? 'Na slici kompleksa se crtaju lamele.' : 'Lamele se crtaju na slici kompleksa.');
    }
    const { error: dErr } = await db.from('project_view_shapes').delete().eq('view_id', viewId).eq(column, targetId);
    if (dErr) return fail(dErr.message, 500);
    let shape = null;
    if (body.polygon !== null) {
      const polygon = cleanPolygon(body.polygon);
      if (!polygon) return fail('Oblik nije ispravan - potrebne su bar 3 tačke.');
      const { data, error } = await db
        .from('project_view_shapes')
        .insert({
          view_id: viewId,
          project_id: projectId,
          [column]: targetId,
          polygon
        } as Database['public']['Tables']['project_view_shapes']['Insert'])
        .select('id, view_id, project_id, building_id, floor_id, unit_id, polygon')
        .single();
      if (error) return fail(error.message, 500);
      shape = data;
    }
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, shape });
  }
};
