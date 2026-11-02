import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { parseVideo } from '@/app/lib/videoEmbed';
import {
  cleanPhotos,
  cleanPolygon,
  cleanRooms,
  matchBuilding,
  parseUnitTable,
  unitSuffix,
  UNIT_STATUSES,
  type UnitStatus
} from '@/app/lib/projects';
import { fail, text, num, VIDEO_ERROR, refresh, type OldUnit, logAdminChanges, projectSlug, type Action } from './shared';

/** Stanovi: čuvanje, brisanje, uvoz tabele, kopiranje slika na iste stanove. */
export const unitsActions: Record<string, Action> = {
  'unit-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    if (!projectId) return fail('Nedostaje projekat.');
    const unitId = text(body.id, 40);
    const f = (body.fields ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('code' in f) {
      const code = text(f.code, 20);
      if (!code) return fail('Oznaka stana ne sme biti prazna.');
      row.code = code;
    }
    if ('floor_id' in f) row.floor_id = text(f.floor_id, 40);
    if ('structure' in f) row.structure = text(f.structure, 60);
    if ('orientation' in f) row.orientation = text(f.orientation, 40);
    if ('area_sqm' in f) row.area_sqm = num(f.area_sqm);
    if ('terrace_sqm' in f) row.terrace_sqm = num(f.terrace_sqm);
    if ('price' in f) row.price = num(f.price);
    if ('status' in f) {
      if (!UNIT_STATUSES.includes(f.status as UnitStatus)) return fail('Nepoznat status.');
      row.status = f.status;
    }
    if ('polygon' in f) row.polygon = cleanPolygon(f.polygon);
    if ('tour_id' in f) row.tour_id = text(f.tour_id, 40);
    // Kartica stana (migracija 024).
    if ('plan_url' in f) row.plan_url = text(f.plan_url, 600);
    if ('plan3d_url' in f) row.plan3d_url = text(f.plan3d_url, 600);
    if ('photos' in f) row.photos = cleanPhotos(f.photos);
    if ('rooms' in f) row.rooms = cleanRooms(f.rooms);
    // Opis i video stana (migracija 040).
    if ('description' in f) row.description = text(f.description, 600);
    if ('description_en' in f) row.description_en = text(f.description_en, 600);
    if ('video_url' in f) {
      const video = text(f.video_url, 600);
      if (video && !parseVideo(video)) return fail(VIDEO_ERROR);
      row.video_url = video;
    }

    let result;
    if (unitId) {
      // Stara vrednost za istoriju promena (ista tabela koju puni link za prodaju).
      const before = 'status' in row || 'price' in row
        ? ((await db.from('project_units').select('code, status, price').eq('id', unitId).maybeSingle()).data as OldUnit | null)
        : null;
      result = await db
        .from('project_units')
        .update(row as Database['public']['Tables']['project_units']['Update'])
        .eq('id', unitId)
        .eq('project_id', projectId)
        .select('*')
        .single();
      if (!result.error && before) {
        const after = result.data as OldUnit;
        await logAdminChanges(db, projectId, [
          {
            unitId,
            code: after.code,
            oldStatus: before.status,
            newStatus: after.status,
            oldPrice: before.price === null ? null : Number(before.price),
            newPrice: after.price === null ? null : Number(after.price)
          }
        ]);
      }
    } else {
      if (!row.code || !row.floor_id) return fail('Za novi stan trebaju oznaka i sprat.');
      result = await db
        .from('project_units')
        .insert({ ...row, project_id: projectId } as Database['public']['Tables']['project_units']['Insert'])
        .select('*')
        .single();
    }
    if (result.error) {
      return fail(result.error.code === '23505' ? 'Stan sa tom oznakom već postoji.' : result.error.message, result.error.code === '23505' ? 409 : 500);
    }
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, unit: result.data });
  },

  'unit-delete': async (db, body) => {
    const id = text(body.id, 40);
    const projectId = text(body.projectId, 40);
    if (!id || !projectId) return fail('Nedostaje stan.');
    const { error } = await db.from('project_units').delete().eq('id', id).eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  },

  // Tabela iz Excela: pravi spratove koji fale, stanove dodaje ili
  // ažurira po oznaci. Oblici i ture postojećih stanova se ne diraju.
  'units-import': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const raw = typeof body.text === 'string' ? body.text.slice(0, 200_000) : '';
    if (!projectId || !raw.trim()) return fail('Nalepite tabelu stanova.');
    const { rows, errors } = parseUnitTable(raw);
    if (errors.length) return fail(errors.slice(0, 8).join('\n'));
    if (!rows.length) return fail('U tabeli nema nijednog stana.');

    // Lamele (migracija 025): 9. kolona tabele, inače lamela izabrana u adminu.
    const [{ data: existingFloors, error: fErr }, { data: buildingsRaw }] = await Promise.all([
      db.from('project_floors').select('id, level, building_id').eq('project_id', projectId),
      db.from('project_buildings').select('id, name').eq('project_id', projectId)
    ]);
    if (fErr) return fail(fErr.message, 500);
    const buildings = (buildingsRaw ?? []) as { id: string; name: string }[];
    const defaultBuilding = text(body.buildingId, 40);
    const rowBuilding: (string | null)[] = [];
    const bErrors: string[] = [];
    for (const r of rows) {
      if (!buildings.length) {
        rowBuilding.push(null);
      } else if (r.building) {
        const b = matchBuilding(r.building, buildings);
        if (!b) bErrors.push(`${r.code}: lamela „${r.building}" ne postoji (imate: ${buildings.map((x) => x.name).join(', ')}).`);
        rowBuilding.push(b?.id ?? null);
      } else {
        if (!defaultBuilding) bErrors.push(`${r.code}: nedostaje lamela - dodajte 9. kolonu ili izaberite lamelu iznad tabele.`);
        rowBuilding.push(defaultBuilding);
      }
    }
    if (bErrors.length) return fail(bErrors.slice(0, 8).join('\n'));

    const fkey = (b: string | null, level: number) => `${b ?? '-'}|${level}`;
    const floorByKey = new Map(
      ((existingFloors ?? []) as { id: string; level: number; building_id: string | null }[]).map((f) => [fkey(f.building_id, f.level), f.id])
    );
    const missing = [...new Set(rows.map((r, i) => fkey(rowBuilding[i], r.level)))].filter((k) => !floorByKey.has(k));
    if (missing.length) {
      const { data: created, error } = await db
        .from('project_floors')
        .insert(
          missing.map((k) => {
            const [b, level] = k.split('|');
            return { project_id: projectId, level: Number(level), building_id: b === '-' ? null : b };
          })
        )
        .select('id, level, building_id');
      if (error) return fail(error.message, 500);
      for (const f of (created ?? []) as { id: string; level: number; building_id: string | null }[]) floorByKey.set(fkey(f.building_id, f.level), f.id);
    }

    const now = new Date().toISOString();
    const payload = rows.map((r, i) => ({
      project_id: projectId,
      floor_id: floorByKey.get(fkey(rowBuilding[i], r.level))!,
      code: r.code,
      structure: r.structure,
      area_sqm: r.area_sqm,
      terrace_sqm: r.terrace_sqm,
      orientation: r.orientation,
      price: r.price,
      status: r.status,
      sort: i,
      updated_at: now
    }));
    const { data: beforeRaw } = await db.from('project_units').select('id, code, status, price').eq('project_id', projectId);
    const before = new Map(((beforeRaw ?? []) as (OldUnit & { id: string })[]).map((u) => [u.code, u]));
    const { error } = await db.from('project_units').upsert(payload, { onConflict: 'project_id,code' });
    if (error) return fail(error.message, 500);
    // Istorija samo za stanove koji su već postojali - novi nemaju "pre".
    await logAdminChanges(
      db,
      projectId,
      rows.flatMap((r) => {
        const old = before.get(r.code);
        if (!old) return [];
        return [{ unitId: old.id, code: r.code, oldStatus: old.status, newStatus: r.status, oldPrice: old.price === null ? null : Number(old.price), newPrice: r.price }];
      })
    );
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, imported: rows.length, floorsCreated: missing.length });
  },

  // Isti tip stana na drugim spratovima: osnova, 3D osnova, slike i
  // prostorije (po želji i 360° tura) sa jednog stana na sve sa istim
  // slovom (2A -> 3A, 4A...). Bez oznake sprata u kodu: stanovi iste
  // strukture i kvadrature. Status, cena i oblik na osnovi se ne diraju.
  'unit-media-copy': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const sourceId = text(body.sourceId, 40);
    if (!projectId || !sourceId) return fail('Nedostaje stan.');
    const [{ data: unitsRaw, error: uErr }, { data: floorsRaw }] = await Promise.all([
      db.from('project_units').select('id, floor_id, code, structure, area_sqm, plan_url, plan3d_url, photos, rooms, tour_id').eq('project_id', projectId),
      db.from('project_floors').select('id, level').eq('project_id', projectId)
    ]);
    if (uErr) return fail(uErr.message, 500);
    type U = { id: string; floor_id: string; code: string; structure: string | null; area_sqm: number | null; plan_url: string | null; plan3d_url: string | null; photos: unknown; rooms: unknown; tour_id: string | null };
    const all = (unitsRaw ?? []) as U[];
    const levelOf = new Map(((floorsRaw ?? []) as { id: string; level: number }[]).map((f) => [f.id, f.level]));
    const src = all.find((u) => u.id === sourceId);
    if (!src) return fail('Stan nije pronađen.', 404);
    const srcSuffix = unitSuffix(src.code, levelOf.get(src.floor_id) ?? 0);
    const targets = all.filter((u) => {
      if (u.id === src.id) return false;
      if (srcSuffix !== null) return unitSuffix(u.code, levelOf.get(u.floor_id) ?? 0) === srcSuffix;
      return u.structure === src.structure && Number(u.area_sqm) === Number(src.area_sqm) && src.area_sqm !== null;
    });
    if (!targets.length) return fail('Nema drugih stanova istog tipa (isto slovo u oznaci, npr. 2A, 3A…).');
    const patch: Record<string, unknown> = {
      plan_url: src.plan_url,
      plan3d_url: src.plan3d_url,
      photos: cleanPhotos(src.photos),
      rooms: cleanRooms(src.rooms),
      updated_at: new Date().toISOString()
    };
    if (body.includeTour === true) patch.tour_id = src.tour_id;
    const { error } = await db
      .from('project_units')
      .update(patch as Database['public']['Tables']['project_units']['Update'])
      .in('id', targets.map((t) => t.id))
      .eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, count: targets.length, codes: targets.map((t) => t.code).sort((a, b) => a.localeCompare(b, 'sr', { numeric: true })) });
  }
};
