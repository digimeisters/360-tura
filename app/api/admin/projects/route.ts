import { NextResponse } from 'next/server';
import { revalidateProject } from '@/app/lib/revalidateProject';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/app/lib/adminAuth';
import { slugify } from '@/app/lib/slug';
import { projectPreviewToken } from '@/app/lib/projectPreview';
import { loadProjectStats } from '@/app/lib/projectStats';
import { translateTexts } from '@/app/lib/translateTexts';
import { geocodeAddress } from '@/app/lib/geocode';
import { fetchNearby } from '@/app/lib/nearby';
import {
  ADMIN_ACTOR,
  hashSalesToken,
  loadNotes,
  newSalesToken,
  recordUnitChanges,
  type SalesProject,
  type UnitChange
} from '@/app/lib/salesAccess';
import {
  cleanPhotos,
  cleanPolygon,
  cleanRooms,
  levelPrefix,
  matchBuilding,
  MAX_VIEWS_PER_BUILDING,
  parseUnitTable,
  SHAPE_COLUMN,
  unitSuffix,
  UNIT_STATUSES,
  type ShapeTarget,
  type UnitStatus
} from '@/app/lib/projects';

export const dynamic = 'force-dynamic';
// Okolina (Overpass) ume da traje 10-20 s, a prevod opisa nekoliko sekundi.
export const maxDuration = 60;

/**
 * ============================================================
 * /api/admin/projects - novogradnja (migracija 019)
 * ============================================================
 * GET                 -> spisak projekata (sa brojem stanova po statusu)
 * GET ?id=<uuid>      -> ceo projekat: projekat, spratovi, stanovi, ture za izbor
 * POST { action, ... } -> sve izmene, vidi switch ispod
 *
 * Sve ide service role ključem posle requireAdmin - tabele nemaju policy
 * za upis, pa ovo je jedini put do njih. Ture i sobe se ovde samo ČITAJU.
 */

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

const text = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const PROJECT_FIELDS: Record<string, number> = {
  title: 120,
  developer_name: 120,
  address: 200,
  city: 80,
  move_in: 60,
  description: 2000,
  contact_phone: 60,
  contact_email: 120,
  title_en: 120,
  description_en: 2000
};

function refresh(slug?: string | null) {
  if (!slug) return;
  revalidateProject(slug);
}

async function uniqueSlug(db: SupabaseClient, base: string): Promise<string> {
  const root = base || 'projekat';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await db.from('projects').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

type OldUnit = { code: string; status: UnitStatus; price: number | null };

/** Izmene statusa/cene iz admina idu u istu istoriju kao izmene prodaje (bez Telegrama). */
async function logAdminChanges(db: SupabaseClient, projectId: string, changes: UnitChange[]) {
  if (!changes.length) return;
  const { data } = await db.from('projects').select('id, slug, title, notify_sales').eq('id', projectId).maybeSingle();
  if (data) await recordUnitChanges(db, data as SalesProject, ADMIN_ACTOR, null, changes);
}

async function projectSlug(db: SupabaseClient, projectId: string): Promise<string | null> {
  const { data } = await db.from('projects').select('slug').eq('id', projectId).maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}

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
  const db = ctx.supabase;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    switch (action) {
      // ---------- projekat ----------
      case 'create': {
        const title = text(body.title, 120);
        if (!title) return fail('Upišite naziv projekta.');
        const slug = await uniqueSlug(db, slugify(title));
        const { data, error } = await db.from('projects').insert({ title, slug }).select('id, slug').single();
        if (error) return fail(error.message, 500);
        return NextResponse.json({ success: true, id: data.id, slug: data.slug });
      }

      case 'update': {
        const id = text(body.id, 40);
        if (!id) return fail('Nedostaje id projekta.');
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const fields = (body.fields ?? {}) as Record<string, unknown>;
        for (const [key, max] of Object.entries(PROJECT_FIELDS)) {
          if (key in fields) patch[key] = text(fields[key], max);
        }
        if ('title' in fields && !patch.title) return fail('Naziv projekta ne sme biti prazan.');
        if ('published' in fields) patch.published = Boolean(fields.published);
        if ('notify_sales' in fields) patch.notify_sales = Boolean(fields.notify_sales);
        // Prezentacija (migracija 026).
        if ('show_all_tabs' in fields) patch.show_all_tabs = Boolean(fields.show_all_tabs);
        if ('demo_tour_id' in fields) patch.demo_tour_id = text(fields.demo_tour_id, 40);

        // Ručno upisane koordinate (npr. prekopirane iz Google mapa) imaju prednost.
        let coords: { lat: number; lng: number } | null = null;
        if ('lat' in fields || 'lng' in fields) {
          const lat = num(fields.lat);
          const lng = num(fields.lng);
          if (lat === null && lng === null) {
            patch.lat = null;
            patch.lng = null;
          } else if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return fail('Koordinate nisu ispravne - upišite širinu i dužinu, npr. 44.0128, 20.9114.');
          } else {
            patch.lat = lat;
            patch.lng = lng;
            coords = { lat, lng };
          }
        } else if ('address' in fields || 'city' in fields) {
          // Nova adresa -> koordinate iz Nominatim-a (best effort, kao kod tura).
          const { data: prev } = await db.from('projects').select('address, city, lat').eq('id', id).maybeSingle();
          const p = prev as { address: string | null; city: string | null; lat: number | null } | null;
          const changed = !p || p.address !== patch.address || p.city !== patch.city || p.lat === null;
          if (changed && (patch.address || p?.address)) {
            const found = await geocodeAddress((patch.address as string | null) ?? p?.address, (patch.city as string | null) ?? p?.city);
            if (found) {
              patch.lat = found.lat;
              patch.lng = found.lng;
              coords = found;
            }
          }
        }

        const { data, error } = await db.from('projects').update(patch).eq('id', id).select('slug').single();
        if (error) return fail(error.message, 500);
        refresh(data.slug);
        return NextResponse.json({ success: true, coords });
      }

      // Okolina na mapi (OpenStreetMap/Overpass, migracija 022). Bez
      // koordinata ih prvo traži iz adrese.
      case 'nearby-refresh': {
        const id = text(body.id, 40);
        if (!id) return fail('Nedostaje id projekta.');
        const { data: proj } = await db.from('projects').select('slug, address, city, lat, lng').eq('id', id).maybeSingle();
        const p = proj as { slug: string; address: string | null; city: string | null; lat: number | null; lng: number | null } | null;
        if (!p) return fail('Projekat nije pronađen.', 404);
        let lat = p.lat;
        let lng = p.lng;
        if (lat === null || lng === null) {
          const found = await geocodeAddress(p.address, p.city);
          if (!found) return fail('Adresa nije pronađena na mapi. Upišite tačnu adresu ili koordinate, pa pokušajte ponovo.');
          lat = found.lat;
          lng = found.lng;
        }
        let places;
        try {
          places = await fetchNearby(lat, lng);
        } catch (err) {
          console.error('[api/admin/projects] nearby', err);
          return fail('OpenStreetMap trenutno ne odgovara. Pokušajte ponovo za minut.', 502);
        }
        const updatedAt = new Date().toISOString();
        const { error } = await db.from('projects').update({ lat, lng, nearby: places, nearby_updated_at: updatedAt }).eq('id', id);
        if (error) return fail(error.message, 500);
        refresh(p.slug);
        return NextResponse.json({ success: true, lat, lng, nearby: places, nearby_updated_at: updatedAt });
      }

      // Poseban link za pokazivanje (važi 30 dana, app/lib/projectPreview.ts).
      case 'preview-link': {
        const id = text(body.id, 40);
        if (!id) return fail('Nedostaje id projekta.');
        const slug = await projectSlug(db, id);
        if (!slug) return fail('Projekat nije pronađen.', 404);
        return NextResponse.json({ success: true, url: `/novogradnja/${slug}/pregled?t=${projectPreviewToken(id)}` });
      }

      case 'delete': {
        const id = text(body.id, 40);
        if (!id) return fail('Nedostaje id projekta.');
        const slug = await projectSlug(db, id);
        // Spratovi i stanovi idu kaskadno (on delete cascade); ture ostaju.
        const { error } = await db.from('projects').delete().eq('id', id);
        if (error) return fail(error.message, 500);
        refresh(slug);
        return NextResponse.json({ success: true });
      }

      // ---------- spratovi ----------
      case 'floor-save': {
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
          ? db.from('project_floors').update(row).eq('id', floorId).eq('project_id', projectId)
          : db.from('project_floors').insert(row);
        const { data, error } = await query.select('*').single();
        if (error) {
          return fail(error.code === '23505' ? `Sprat ${level} već postoji u ovoj zgradi.` : error.message, error.code === '23505' ? 409 : 500);
        }
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, floor: data });
      }

      // Više spratova odjednom ("P-6"); spratovi koji već postoje se preskaču.
      case 'floors-add': {
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
      }

      // Isti raspored na više spratova: osnova + oblici stanova sa jednog
      // sprata na izabrane. Stan se uparuje po oznaci ("2A" -> "3A"); ako
      // oznake ne nose sprat, a broj stanova je isti, uparuje se redom.
      // createMissing: stanovi koji fale prave se sa istom strukturom,
      // kvadraturom i orijentacijom (cena prazna, status slobodan).
      case 'floor-copy': {
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
          polygon: unknown;
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
      }

      case 'floor-delete': {
        const id = text(body.id, 40);
        const projectId = text(body.projectId, 40);
        if (!id || !projectId) return fail('Nedostaje sprat.');
        const { error } = await db.from('project_floors').delete().eq('id', id).eq('project_id', projectId);
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true });
      }

      // ---------- stanovi ----------
      case 'unit-save': {
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

        let result;
        if (unitId) {
          // Stara vrednost za istoriju promena (ista tabela koju puni link za prodaju).
          const before = 'status' in row || 'price' in row
            ? ((await db.from('project_units').select('code, status, price').eq('id', unitId).maybeSingle()).data as OldUnit | null)
            : null;
          result = await db.from('project_units').update(row).eq('id', unitId).eq('project_id', projectId).select('*').single();
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
          result = await db.from('project_units').insert({ ...row, project_id: projectId }).select('*').single();
        }
        if (result.error) {
          return fail(result.error.code === '23505' ? 'Stan sa tom oznakom već postoji.' : result.error.message, result.error.code === '23505' ? 409 : 500);
        }
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, unit: result.data });
      }

      // ---------- izveštaj, upiti, gradilište, engleski (migracija 021) ----------
      case 'insights': {
        const projectId = text(body.projectId, 40);
        if (!projectId) return fail('Nedostaje projekat.');
        const [{ data: proj }, { data: unitRows }, { data: inquiries }] = await Promise.all([
          db.from('projects').select('slug').eq('id', projectId).maybeSingle(),
          db.from('project_units').select('code').eq('project_id', projectId),
          db
            .from('project_inquiries')
            .select('id, created_at, unit_code, name, contact, message, embedded, lang, handled_at, handled_by')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(100)
        ]);
        if (!proj) return fail('Projekat nije pronađen.', 404);
        const stats = await loadProjectStats(
          db,
          projectId,
          (proj as { slug: string }).slug,
          ((unitRows ?? []) as { code: string }[]).map((u) => u.code)
        );
        const notes = await loadNotes(db, projectId);
        return NextResponse.json({
          success: true,
          stats,
          inquiries: ((inquiries ?? []) as { id: string }[]).map((q) => ({ ...q, note: notes.byInquiry.get(q.id) ?? null }))
        });
      }

      case 'progress-list': {
        const projectId = text(body.projectId, 40);
        if (!projectId) return fail('Nedostaje projekat.');
        const { data, error } = await db
          .from('project_progress')
          .select('id, month, tour_id, note')
          .eq('project_id', projectId)
          .order('month', { ascending: false });
        if (error) return fail(error.message, 500);
        return NextResponse.json({ success: true, progress: data ?? [] });
      }

      // Jedan unos po mesecu: isti mesec ponovo = izmena (upsert po project_id + month).
      case 'progress-save': {
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
      }

      case 'progress-delete': {
        const projectId = text(body.projectId, 40);
        const id = text(body.id, 40);
        if (!projectId || !id) return fail('Nedostaje unos.');
        const { error } = await db.from('project_progress').delete().eq('id', id).eq('project_id', projectId);
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true });
      }

      // Predlog engleskog opisa (Gemini) - ne čuva se sam; admin ga pregleda i klikne „Sačuvaj podatke".
      case 'translate-en': {
        const description = text(body.description, 2000);
        if (!description) return fail('Prvo upišite srpski opis projekta.');
        try {
          const [en] = await translateTexts([description], 'en');
          return NextResponse.json({ success: true, description_en: en ?? '' });
        } catch (err) {
          console.error('[api/admin/projects] translate-en', err);
          return fail('Prevod trenutno nije uspeo. Pokušajte ponovo ili upišite engleski opis ručno.', 502);
        }
      }

      // ---------- pristup za prodaju (migracija 020) ----------
      case 'sales-list': {
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
      }

      // Kod se vraća SAMO ovde, jednom - u bazi ostaje samo otisak.
      case 'sales-link-create': {
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
      }

      case 'sales-link-revoke': {
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

      // Isti tip stana na drugim spratovima: osnova, 3D osnova, slike i
      // prostorije (po želji i 360° tura) sa jednog stana na sve sa istim
      // slovom (2A -> 3A, 4A...). Bez oznake sprata u kodu: stanovi iste
      // strukture i kvadrature. Status, cena i oblik na osnovi se ne diraju.
      case 'unit-media-copy': {
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
        const { error } = await db.from('project_units').update(patch).in('id', targets.map((t) => t.id)).eq('project_id', projectId);
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, count: targets.length, codes: targets.map((t) => t.code).sort((a, b) => a.localeCompare(b, 'sr', { numeric: true })) });
      }

      // ---------- lamele, slike (pogledi) i oblici na njima (migracija 025) ----------
      // Prva lamela pretvara projekat u kompleks: postojeći spratovi i fasade
      // prelaze u lamelu `existingName`, pa se pravi nova.
      case 'building-add': {
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
      }

      case 'building-save': {
        const projectId = text(body.projectId, 40);
        const id = text(body.id, 40);
        const name = text(body.name, 40);
        if (!projectId || !id || !name) return fail('Naziv lamele ne sme biti prazan.');
        const { data, error } = await db.from('project_buildings').update({ name }).eq('id', id).eq('project_id', projectId).select('*').single();
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, building: data });
      }

      // Briše se samo prazna lamela - spratovi i stanovi nikad usput.
      case 'building-delete': {
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

      case 'view-add': {
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
      }

      // Natpis ili nova slika (oblici ostaju - ista kamera, nov render).
      case 'view-save': {
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
        const { data, error } = await db.from('project_views').update(patch).eq('id', id).eq('project_id', projectId).select('*').single();
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, view: data });
      }

      // Redosled rotacije: slika menja mesto sa susednom slikom iste zgrade.
      case 'view-move': {
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
      }

      case 'view-delete': {
        const projectId = text(body.projectId, 40);
        const id = text(body.id, 40);
        if (!projectId || !id) return fail('Nedostaje slika.');
        const { error } = await db.from('project_views').delete().eq('id', id).eq('project_id', projectId);
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true });
      }

      // Oblik lamele / sprata / stana na jednoj slici; polygon null = brisanje.
      case 'shape-save': {
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
            .insert({ view_id: viewId, project_id: projectId, [column]: targetId, polygon })
            .select('id, view_id, project_id, building_id, floor_id, unit_id, polygon')
            .single();
          if (error) return fail(error.message, 500);
          shape = data;
        }
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true, shape });
      }

      case 'unit-delete': {
        const id = text(body.id, 40);
        const projectId = text(body.projectId, 40);
        if (!id || !projectId) return fail('Nedostaje stan.');
        const { error } = await db.from('project_units').delete().eq('id', id).eq('project_id', projectId);
        if (error) return fail(error.message, 500);
        refresh(await projectSlug(db, projectId));
        return NextResponse.json({ success: true });
      }

      // Tabela iz Excela: pravi spratove koji fale, stanove dodaje ili
      // ažurira po oznaci. Oblici i ture postojećih stanova se ne diraju.
      case 'units-import': {
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
      }

      default:
        return fail('Nepoznata akcija.');
    }
  } catch (err) {
    console.error('[api/admin/projects]', action, err);
    return fail('Neočekivana greška na serveru.', 500);
  }
}
