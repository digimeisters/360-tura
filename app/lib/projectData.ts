import { cache } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { isValidPreviewToken } from './projectPreview';
import { cleanPhotos, cleanPolygon, cleanRooms, type BuildingRow, type FloorRow, type ProjectRow, type ShapeRow, type UnitRow, type ViewRow } from './projects';
import type { SelectorBuilding, SelectorFloor, SelectorShape, SelectorUnit, SelectorView } from '../../components/projekat/ProjectSelector';

/**
 * Podaci projekta za /novogradnja/[slug] i za pregled pre objave
 * (/novogradnja/[slug]/pregled).
 *
 * Javna strana čita anon ključem, pa RLS iz migracije 019 sam pušta samo
 * objavljen projekat. Pregled čita service role ključem, ali tek posle
 * provere potpisanog linka (projectPreview.ts).
 *
 * U oba slučaja se iz tabele tours uzimaju samo OBJAVLJENE ture - stan čija
 * tura nije objavljena prikazuje se bez dugmeta za turu, umesto sa linkom
 * koji vodi na grešku. Pregled tako izgleda isto kao buduća javna strana.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prima i tipiziran anon i netipiziran service role klijent
type Db = SupabaseClient<any>;

/** Jedan mesec gradilišta (migracija 021): 360° tura tog meseca, ako je objavljena. */
export type ProgressEntry = {
  id: string;
  month: string;
  note: string | null;
  tourHref: string | null;
  preview: string | null;
};

export type ProjectPageData = {
  project: ProjectRow;
  floors: SelectorFloor[];
  units: SelectorUnit[];
  progress: ProgressEntry[];
  /** Migracija 025: lamele (prazno = jedna zgrada) i slike sa oblicima. */
  buildings: SelectorBuilding[];
  views: SelectorView[];
  /** Prezentacija (migracija 026): popuna praznih kartica stana; null = prikazuje se samo ono što postoji. */
  demoMedia: DemoMedia | null;
};

/** Demo sadržaj za kartice stana kad je projects.show_all_tabs. */
export type DemoMedia = { tourHref: string | null; photos: string[] };

async function loadProject(db: Db, slug: string, onlyPublished: boolean): Promise<ProjectPageData | null> {
  let query = db.from('projects').select('*').eq('slug', slug);
  if (onlyPublished) query = query.eq('published', true);
  const { data: project } = await query.maybeSingle();
  if (!project) return null;
  const p = project as unknown as ProjectRow;

  const [{ data: floorsRaw }, { data: unitsRaw }, { data: progressRaw }, { data: buildingsRaw }, { data: viewsRaw }, { data: shapesRaw }] = await Promise.all([
    db.from('project_floors').select('*').eq('project_id', p.id).order('level'),
    db.from('project_units').select('*').eq('project_id', p.id).order('sort'),
    db.from('project_progress').select('id, month, note, tour_id').eq('project_id', p.id).order('month', { ascending: false }),
    db.from('project_buildings').select('*').eq('project_id', p.id).order('sort').order('name'),
    db.from('project_views').select('*').eq('project_id', p.id).order('sort').order('created_at'),
    db.from('project_view_shapes').select('id, view_id, project_id, building_id, floor_id, unit_id, polygon').eq('project_id', p.id)
  ]);
  const floors = (floorsRaw ?? []) as unknown as FloorRow[];
  const units = (unitsRaw ?? []) as unknown as UnitRow[];
  const progressRows = (progressRaw ?? []) as { id: string; month: string; note: string | null; tour_id: string | null }[];

  const tourIds = [
    ...new Set(
      [...units.map((u) => u.tour_id), ...floors.map((f) => f.view_tour_id), ...progressRows.map((r) => r.tour_id), p.demo_tour_id].filter((x): x is string =>
        Boolean(x)
      )
    )
  ];
  const tourSlug = new Map<string, string>();
  const tourPreview = new Map<string, string>();
  if (tourIds.length) {
    const { data: tours } = await db.from('tours').select('id, slug').in('id', tourIds).eq('published', true);
    for (const t of (tours ?? []) as { id: string; slug: string }[]) tourSlug.set(t.id, t.slug);
    const slugs = [...tourSlug.values()];
    if (slugs.length) {
      // Sličica za dugme "Prošetajte kroz stan": prva soba ture koja je ima.
      const { data: rooms } = await db
        .from('rooms')
        .select('tour_slug, preview_url, order_index')
        .in('tour_slug', slugs)
        .not('preview_url', 'is', null)
        .order('order_index');
      for (const r of (rooms ?? []) as { tour_slug: string | null; preview_url: string | null }[]) {
        if (r.tour_slug && r.preview_url && !tourPreview.has(r.tour_slug)) tourPreview.set(r.tour_slug, r.preview_url);
      }
    }
  }
  const href = (id: string | null) => (id && tourSlug.has(id) ? `/tour/${tourSlug.get(id)}` : null);

  const selectorFloors: SelectorFloor[] = floors.map((f) => ({
    id: f.id,
    level: f.level,
    label: f.label,
    buildingId: f.building_id,
    planUrl: f.plan_url,
    viewHref: href(f.view_tour_id)
  }));

  const selectorUnits: SelectorUnit[] = units.map((u) => {
    const slugForTour = u.tour_id ? tourSlug.get(u.tour_id) : undefined;
    return {
      id: u.id,
      floorId: u.floor_id,
      code: u.code,
      structure: u.structure,
      areaSqm: u.area_sqm === null ? null : Number(u.area_sqm),
      terraceSqm: u.terrace_sqm === null ? null : Number(u.terrace_sqm),
      orientation: u.orientation,
      price: u.price === null ? null : Number(u.price),
      status: u.status,
      polygon: u.polygon,
      tourHref: href(u.tour_id),
      tourPreview: slugForTour ? tourPreview.get(slugForTour) ?? null : null,
      planUrl: u.plan_url,
      plan3dUrl: u.plan3d_url,
      photos: cleanPhotos(u.photos),
      rooms: cleanRooms(u.rooms)
    };
  });

  // Mesec bez objavljene ture se ne prikazuje - nema šta da se obiđe.
  const progress: ProgressEntry[] = progressRows
    .filter((r) => href(r.tour_id))
    .map((r) => {
      const slugForTour = r.tour_id ? tourSlug.get(r.tour_id) : undefined;
      return { id: r.id, month: r.month, note: r.note, tourHref: href(r.tour_id), preview: slugForTour ? tourPreview.get(slugForTour) ?? null : null };
    });

  // Slike i oblici (migracija 025). Oblik bez važeće mete se preskače.
  const buildings = (buildingsRaw ?? []) as unknown as BuildingRow[];
  const shapes = (shapesRaw ?? []) as unknown as ShapeRow[];
  const views: SelectorView[] = ((viewsRaw ?? []) as unknown as ViewRow[]).map((v) => ({
    id: v.id,
    kind: v.kind,
    buildingId: v.building_id,
    label: v.label,
    imageUrl: v.image_url,
    shapes: shapes
      .filter((sh) => sh.view_id === v.id)
      .flatMap((sh): SelectorShape[] => {
        const polygon = cleanPolygon(sh.polygon);
        if (!polygon) return [];
        if (sh.unit_id) return [{ target: 'unit', id: sh.unit_id, polygon }];
        if (sh.floor_id) return [{ target: 'floor', id: sh.floor_id, polygon }];
        if (sh.building_id) return [{ target: 'building', id: sh.building_id, polygon }];
        return [];
      })
  }));

  return {
    project: p,
    floors: selectorFloors,
    units: selectorUnits,
    progress,
    buildings: buildings.map((b) => ({ id: b.id, name: b.name })),
    views,
    // Slike stana za prezentaciju = renderi zgrade (bez duplikata).
    demoMedia: p.show_all_tabs
      ? { tourHref: href(p.demo_tour_id), photos: [...new Set(views.filter((v) => v.kind === 'building').map((v) => v.imageUrl))].slice(0, 12) }
      : null
  };
}

/** Javna strana: samo objavljen projekat (anon ključ + RLS). cache(): metadata i strana dele upit. */
export const getPublicProject = cache((slug: string) => loadProject(supabase, slug, true));

/** Pregled pre objave: projekat bez obzira na objavu, ali samo uz važeći potpisan link. */
export const getPreviewProject = cache(async (slug: string, token: string | null): Promise<ProjectPageData | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !token) return null;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await db.from('projects').select('id').eq('slug', slug).maybeSingle();
  if (!data || !isValidPreviewToken((data as { id: string }).id, token)) return null;
  return loadProject(db, slug, false);
});
