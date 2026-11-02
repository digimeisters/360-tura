import { NextResponse, after } from 'next/server';
import { freedUnits, notifyWatchers } from '@/app/lib/unitWatch';
import { revalidateProject } from '@/app/lib/revalidateProject';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { ADMIN_ACTOR, recordUnitChanges, type SalesProject, type UnitChange } from '@/app/lib/salesAccess';
import type { UnitStatus } from '@/app/lib/projects';

/**
 * Zajedničko za radnje /api/admin/projects (route.ts ih prosleđuje po
 * body.action). Sve ide service role ključem posle requireAdmin.
 */

// Telo zahteva je neprovereni JSON - svaka radnja sama proverava polja (text, num).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Body = any;
export type Action = (db: SupabaseClient<Database>, body: Body) => Promise<Response>;

export const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

export const text = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
};

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const PROJECT_FIELDS: Record<string, number> = {
  title: 120,
  developer_name: 120,
  address: 200,
  city: 80,
  // Naselje za cene novogradnje (migracija 033) - lista iz propertyTaxonomy.
  neighborhood: 80,
  move_in: 60,
  description: 2000,
  contact_phone: 60,
  contact_email: 120,
  title_en: 120,
  description_en: 2000
};

export const VIDEO_ERROR = 'Video link mora biti YouTube, Vimeo ili https link na .mp4 fajl.';

export function refresh(slug?: string | null) {
  if (!slug) return;
  revalidateProject(slug);
}

export async function uniqueSlug(db: SupabaseClient, base: string): Promise<string> {
  const root = base || 'projekat';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await db.from('projects').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export type OldUnit = { code: string; status: UnitStatus; price: number | null };

/**
 * Izmene statusa/cene iz admina idu u istu istoriju kao izmene prodaje (bez
 * Telegrama). Stan koji postane slobodan javlja se kupcima sa "Obavesti me".
 */
export async function logAdminChanges(db: SupabaseClient, projectId: string, changes: UnitChange[]) {
  if (!changes.length) return;
  const { data } = await db.from('projects').select('id, slug, title, notify_sales').eq('id', projectId).maybeSingle();
  if (data) await recordUnitChanges(db, data as SalesProject, ADMIN_ACTOR, null, changes);
  const freed = freedUnits(changes);
  if (freed.length) after(() => notifyWatchers(db, projectId, freed).catch((err) => console.error('[api/admin/projects] obavesti me:', err)));
}

export async function projectSlug(db: SupabaseClient, projectId: string): Promise<string | null> {
  const { data } = await db.from('projects').select('slug').eq('id', projectId).maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}
