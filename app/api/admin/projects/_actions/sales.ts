import { NextResponse } from 'next/server';
import { hashSalesToken, newSalesToken } from '@/app/lib/salesAccess';
import { fail, text, type Action } from './shared';

/** Pristup za prodaju (migracija 020). Kod se vraća samo jednom - u bazi ostaje otisak. */
export const salesActions: Record<string, Action> = {
  'sales-list': async (db, body) => {
    const projectId = text(body.projectId, 40);
    if (!projectId) return fail('Nedostaje projekat.');
    const [{ data: links, error }, { data: changes }] = await Promise.all([
      db
        .from('project_sales_links')
        .select('id, person_name, created_at, last_used_at, revoked_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),
      db
        .from('project_unit_changes')
        .select('id, created_at, actor, unit_code, field, old_value, new_value')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ success: true, links: links ?? [], changes: changes ?? [] });
  },

  // Kod se vraća SAMO ovde, jednom - u bazi ostaje samo otisak.
  'sales-link-create': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const person = text(body.person, 80);
    if (!projectId || !person) return fail('Upišite ime osobe kojoj šaljete link.');
    const token = newSalesToken();
    const { data, error } = await db
      .from('project_sales_links')
      .insert({ project_id: projectId, person_name: person, token_hash: hashSalesToken(token) })
      .select('id, person_name, created_at, last_used_at, revoked_at')
      .single();
    if (error) return fail(error.message, 500);
    return NextResponse.json({ success: true, link: data, path: `/prodaja/${token}` });
  },

  'sales-link-revoke': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const id = text(body.id, 40);
    if (!projectId || !id) return fail('Nedostaje link.');
    const { error } = await db
      .from('project_sales_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('project_id', projectId)
      .is('revoked_at', null);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ success: true });
  }
};
