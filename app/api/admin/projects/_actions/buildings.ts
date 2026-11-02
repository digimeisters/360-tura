import { NextResponse } from 'next/server';
import { fail, text, refresh, projectSlug, type Action } from './shared';

/** Lamele (migracija 025). */
export const buildingsActions: Record<string, Action> = {
  // Prva lamela pretvara projekat u kompleks: postojeći spratovi i fasade
  // prelaze u lamelu `existingName`, pa se pravi nova.
  'building-add': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const name = text(body.name, 40);
    if (!projectId || !name) return fail('Upišite naziv lamele, npr. „Lamela B“.');
    const { data: existing, error: bErr } = await db.from('project_buildings').select('id, name, sort').eq('project_id', projectId);
    if (bErr) return fail(bErr.message, 500);
    const list = (existing ?? []) as { id: string; name: string; sort: number }[];
    if (list.some((b) => b.name.toLowerCase() === name.toLowerCase())) return fail(`Lamela „${name}“ već postoji.`, 409);
    const added: unknown[] = [];
    let sort = list.reduce((m, b) => Math.max(m, b.sort), -1) + 1;
    if (!list.length) {
      const [{ count: floorCount }, { count: viewCount }] = await Promise.all([
        db.from('project_floors').select('id', { count: 'exact', head: true }).eq('project_id', projectId).is('building_id', null),
        db.from('project_views').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('kind', 'building').is('building_id', null)
      ]);
      if ((floorCount ?? 0) + (viewCount ?? 0) > 0) {
        const firstName = text(body.existingName, 40) || 'Lamela A';
        if (firstName.toLowerCase() === name.toLowerCase()) return fail('Postojeća i nova lamela moraju imati različite nazive.');
        const { data: first, error } = await db.from('project_buildings').insert({ project_id: projectId, name: firstName, sort }).select('*').single();
        if (error) return fail(error.message, 500);
        sort++;
        const [r1, r2] = await Promise.all([
          db.from('project_floors').update({ building_id: first.id }).eq('project_id', projectId).is('building_id', null),
          db.from('project_views').update({ building_id: first.id }).eq('project_id', projectId).eq('kind', 'building').is('building_id', null)
        ]);
        if (r1.error || r2.error) return fail((r1.error ?? r2.error)!.message, 500);
        added.push(first);
      }
    }
    const { data, error } = await db.from('project_buildings').insert({ project_id: projectId, name, sort }).select('*').single();
    if (error) return fail(error.message, 500);
    added.push(data);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, buildings: added });
  },

  'building-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    const name = text(body.name, 40);
    if (!projectId || !id || !name) return fail('Naziv lamele ne sme biti prazan.');
    const { data, error } = await db.from('project_buildings').update({ name }).eq('id', id).eq('project_id', projectId).select('*').single();
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true, building: data });
  },

  // Briše se samo prazna lamela - spratovi i stanovi nikad usput.
  'building-delete': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    if (!projectId || !id) return fail('Nedostaje lamela.');
    const { count } = await db.from('project_floors').select('id', { count: 'exact', head: true }).eq('building_id', id);
    if (count) return fail('Lamela ima spratove - prvo obrišite njih (ili premestite stanove).');
    const { error } = await db.from('project_buildings').delete().eq('id', id).eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  }
};
