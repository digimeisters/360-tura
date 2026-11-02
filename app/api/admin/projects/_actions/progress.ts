import { NextResponse } from 'next/server';
import { fail, text, refresh, projectSlug, type Action } from './shared';

/** Napredak gradilišta, jedan unos po mesecu. */
export const progressActions: Record<string, Action> = {
  'progress-list': async (db, body) => {
    const projectId = text(body.projectId, 40);
    if (!projectId) return fail('Nedostaje projekat.');
    const { data, error } = await db
      .from('project_progress')
      .select('id, month, tour_id, note')
      .eq('project_id', projectId)
      .order('month', { ascending: false });
    if (error) return fail(error.message, 500);
    return NextResponse.json({ success: true, progress: data ?? [] });
  },

  // Jedan unos po mesecu: isti mesec ponovo = izmena (upsert po project_id + month).
  'progress-save': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const month = typeof body.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? `${body.month}-01` : null;
    if (!projectId || !month) return fail('Izaberite mesec.');
    const tourId = text(body.tour_id, 40);
    if (!tourId) return fail('Izaberite turu sa snimkom gradilišta.');
    const { error } = await db
      .from('project_progress')
      .upsert({ project_id: projectId, month, tour_id: tourId, note: text(body.note, 500) }, { onConflict: 'project_id,month' });
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  },

  'progress-delete': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    if (!projectId || !id) return fail('Nedostaje unos.');
    const { error } = await db.from('project_progress').delete().eq('id', id).eq('project_id', projectId);
    if (error) return fail(error.message, 500);
    refresh(await projectSlug(db, projectId));
    return NextResponse.json({ success: true });
  }
};
