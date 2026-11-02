import { NextResponse } from 'next/server';
import type { Database, Json } from '@/types/supabase';
import { levelPrefix, unitSuffix } from '@/app/lib/projects';
import { fail, text, num, refresh, projectSlug, type Action } from './shared';

/** Spratovi. */
export const floorsActions: Record<string, Action> = {
  'floor-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const level = num(body.level);
    if (!projectId || level === null || !Number.isInteger(level) || level < -5 || level > 80) {
      return fail('Sprat mora biti ceo broj (0 = prizemlje).');
    }
    const row: Record<string, unknown> = { project_id: projectId, level };
    if ('label' in body) row.label = text(body.label, 40);
    if ('plan_url' in body) row.plan_url = text(body.plan_url, 500);
    if ('view_tour_id' in body) row.view_tour_id = text(body.view_tour_id, 40);
    const floorId = text(body.id, 40);
    if (!floorId) row.building_id = text(body.buildingId, 40);
    const query = floorId
      ? db
          .from('project_floors')
          .update(row as Database['public']['Tables']['project_floors']['Update'])
          .eq('id', floorId)
          .eq('project_id', projectId)
      : db.from('project_floors').insert(row as Database['public']['Tables']['project_floors']['Insert']);
    const { data, error } = await query.select('*').single();
    if (error) {
      return fail(error.code === '23505' ? `Sprat ${level} već postoji u ovoj zgradi.` : error.message, error.code === '23505' ? 409 : 500);
    }
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, floor: data });
  },

  // Više spratova odjednom ("P-6"); spratovi koji već postoje se preskaču.
  'floors-add': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const levels = Array.isArray(body.levels) ? body.levels.map(num) : [];
    if (!projectId || !levels.length || levels.some((l: number | null) => l === null || !Number.isInteger(l) || l < -5 || l > 80)) {
      return fail('Spratovi moraju biti celi brojevi (0 = prizemlje).');
    }
    // Lamela (migracija 025): nivoi su jedinstveni po lameli.
    const buildingId = text(body.buildingId, 40);
    let existingQuery = db.from('project_floors').select('level').eq('project_id', projectId);
    existingQuery = buildingId ? existingQuery.eq('building_id', buildingId) : existingQuery.is('building_id', null);
    const { data: existing, error: eErr } = await existingQuery;
    if (eErr) return fail(eErr.message, 500);
    const have = new Set((existing ?? []).map((f: { level: number }) => f.level));
    const fresh = [...new Set(levels as number[])].filter((l) => !have.has(l));
    if (!fresh.length) return NextResponse.json({ success: true, floors: [], skipped: levels.length });
    const { data, error } = await db
      .from('project_floors')
      .insert(fresh.map((level) => ({ project_id: projectId, level, building_id: buildingId })))
      .select('*');
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, floors: data ?? [], skipped: levels.length - fresh.length });
  },

  // Isti raspored na više spratova: osnova + oblici stanova sa jednog
  // sprata na izabrane. Stan se uparuje po oznaci ("2A" -> "3A"); ako
  // oznake ne nose sprat, a broj stanova je isti, uparuje se redom.
  // createMissing: stanovi koji fale prave se sa istom strukturom,
  // kvadraturom i orijentacijom (cena prazna, status slobodan).
  'floor-copy': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const sourceId = text(body.sourceFloorId, 40);
    const levels: (number | null)[] = Array.isArray(body.levels) ? body.levels.map(num) : [];
    const createMissing = Boolean(body.createMissing);
    if (!projectId || !sourceId || !levels.length || levels.some((l) => l === null || !Number.isInteger(l))) {
      return fail('Izaberite spratove na koje se kopira.');
    }

    const [{ data: floorsRaw, error: fErr }, { data: unitsRaw, error: uErr }] = await Promise.all([
      db.from('project_floors').select('id, level, plan_url, building_id').eq('project_id', projectId),
      db.from('project_units').select('*').eq('project_id', projectId)
    ]);
    if (fErr || uErr) return fail((fErr ?? uErr)!.message, 500);
    type F = { id: string; level: number; plan_url: string | null; building_id: string | null };
    type U = {
      id: string;
      floor_id: string;
      code: string;
      structure: string | null;
      area_sqm: number | null;
      terrace_sqm: number | null;
      orientation: string | null;
      polygon: Json;
      sort: number;
    };
    const allFloors = (floorsRaw ?? []) as F[];
    const allUnits = (unitsRaw ?? []) as U[];
    const source = allFloors.find((f) => f.id === sourceId);
    if (!source) return fail('Izvorni sprat nije pronađen.', 404);
    const byCode = (a: U, b: U) => a.code.localeCompare(b.code, 'sr', { numeric: true });
    const sourceUnits = allUnits.filter((u) => u.floor_id === source.id && u.polygon).sort(byCode);
    if (!source.plan_url && !sourceUnits.length) return fail('Na ovom spratu nema ni osnove ni iscrtanih stanova za kopiranje.');

    const takenCodes = new Set(allUnits.map((u) => u.code.toUpperCase()));
    const report = { floors: 0, matched: 0, created: 0, unmatched: [] as string[], missingFloors: [] as number[] };

    for (const level of [...new Set(levels as number[])]) {
      if (level === source.level) continue;
      // Samo spratovi iste lamele (migracija 025).
      const target = allFloors.find((f) => f.level === level && f.building_id === source.building_id);
      if (!target) {
        report.missingFloors.push(level);
        continue;
      }
      if (source.plan_url) {
        const { error } = await db.from('project_floors').update({ plan_url: source.plan_url }).eq('id', target.id);
        if (error) return fail(error.message, 500);
      }
      report.floors++;

      const targetUnits = allUnits.filter((u) => u.floor_id === target.id).sort(byCode);
      const byOrder = targetUnits.length === allUnits.filter((u) => u.floor_id === source.id).length;
      const sourceAll = allUnits.filter((u) => u.floor_id === source.id).sort(byCode);

      for (const su of sourceUnits) {
        const suffix = unitSuffix(su.code, source.level);
        let match: U | undefined;
        let newCode: string | null = null;
        if (suffix !== null) {
          newCode = `${levelPrefix(level)}${suffix}`;
          match = targetUnits.find((u) => u.code.toUpperCase() === newCode!.toUpperCase());
        } else if (byOrder) {
          match = targetUnits[sourceAll.indexOf(su)];
        }

        if (match) {
          const { error } = await db
            .from('project_units')
            .update({ polygon: su.polygon, updated_at: new Date().toISOString() })
            .eq('id', match.id);
          if (error) return fail(error.message, 500);
          report.matched++;
        } else if (createMissing && newCode && !takenCodes.has(newCode.toUpperCase())) {
          const { error } = await db.from('project_units').insert({
            project_id: projectId,
            floor_id: target.id,
            code: newCode,
            structure: su.structure,
            area_sqm: su.area_sqm,
            terrace_sqm: su.terrace_sqm,
            orientation: su.orientation,
            polygon: su.polygon,
            status: 'available',
            sort: su.sort
          });
          if (error) return fail(error.message, 500);
          takenCodes.add(newCode.toUpperCase());
          report.created++;
        } else {
          report.unmatched.push(newCode ?? `${su.code} → ${levelPrefix(level)}?`);
        }
      }
    }
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, ...report });
  },

  'floor-delete': async (db, body) => {
    const id = text(body.id, 40);
    const projectId = text(body.projectId, 40);
    if (!id || !projectId) return fail('Nedostaje sprat.');
    const { error } = await db.from('project_floors').delete().eq('id', id).eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  }
};
