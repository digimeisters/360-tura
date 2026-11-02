'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminAuthHeader } from '../../../lib/authFetch';
import { shrinkImage } from '../../../lib/shrinkImage';
import { srPlural } from '../../../lib/projectI18n';
import type { CanvasShape } from '../../../../components/projekat/PolygonCanvas';
import { floorName, SHAPE_COLUMN, UNIT_STATUS_COLORS, type BuildingRow, type FloorRow, type Polygon, type ProjectBundle, type ProjectRow, type ShapeRow, type ShapeTarget, type UnitRow, type UnitStatus, type ViewKind, type ViewRow } from '../../../lib/projects';

/** Šta se crta: oblik na slici (fasada / kompleks) ili stan na osnovi sprata. */
export type Draw = { on: 'view'; viewId: string; target: ShapeTarget; id: string } | { on: 'plan'; id: string } | null;
export type Msg = { ok: boolean; text: string } | null;

export type InfoForm = Pick<
  ProjectRow,
  | 'title'
  | 'developer_name'
  | 'address'
  | 'city'
  | 'neighborhood'
  | 'move_in'
  | 'description'
  | 'contact_phone'
  | 'contact_email'
  | 'title_en'
  | 'description_en'
>;

export const INFO_FIELDS: { key: keyof InfoForm; label: string; wide?: boolean; area?: boolean; placeholder?: string }[] = [
  { key: 'title', label: 'Naziv projekta' },
  { key: 'developer_name', label: 'Investitor', placeholder: 'npr. Gradnja d.o.o.' },
  { key: 'address', label: 'Adresa' },
  { key: 'city', label: 'Grad' },
  // Lista naselja grada (propertyTaxonomy) - za cene novogradnje po naseljima (migracija 033).
  { key: 'neighborhood', label: 'Naselje' },
  { key: 'move_in', label: 'Useljenje', placeholder: 'npr. jun 2027' },
  { key: 'contact_phone', label: 'Telefon prodaje' },
  { key: 'contact_email', label: 'Email prodaje' },
  { key: 'description', label: 'Opis projekta', wide: true, area: true },
  { key: 'title_en', label: 'Naziv na engleskom (opciono)', placeholder: 'prazno = isti kao srpski' },
  { key: 'description_en', label: 'Opis na engleskom (za /en stranu)', wide: true, area: true }
];

export type UnitDraft = {
  code: string;
  floor_id: string;
  structure: string;
  area_sqm: string;
  terrace_sqm: string;
  orientation: string;
  price: string;
  status: UnitStatus;
  tour_id: string;
};

export const toDraft = (u: UnitRow): UnitDraft => ({
  code: u.code,
  floor_id: u.floor_id,
  structure: u.structure ?? '',
  area_sqm: u.area_sqm?.toString() ?? '',
  terrace_sqm: u.terrace_sqm?.toString() ?? '',
  orientation: u.orientation ?? '',
  price: u.price?.toString() ?? '',
  status: u.status,
  tour_id: u.tour_id ?? ''
});

export const IMPORT_EXAMPLE = 'Oznaka\tSprat\tStruktura\tm²\tTerasa\tOrijentacija\tCena\tStatus\n1A\t1\tDvosoban\t54\t6\tJug\t89000\tslobodan\n1B\t1\tTrosoban\t72\t9\tZapad\t118000\tprodat';

/**
 * Stanje i radnje editora projekta (strana page.tsx i sekcije u _sections/).
 * useProjectEditor drži sve useState/useCallback; editorView dodaje ono što
 * se računa iz učitanog projekta (oblici na slikama, AI predlozi...).
 */
export function useProjectEditor() {
  const params = useParams();
  const id = String(params?.id || '');
  const router = useRouter();

  const [data, setData] = useState<ProjectBundle | null>(null);
  const [loadError, setLoadError] = useState('');
  const [info, setInfo] = useState<InfoForm | null>(null);
  // Video link projekta dok se kuca (null = nije menjan, važi sačuvani).
  const [projectVideo, setProjectVideo] = useState<string | null>(null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [draw, setDraw] = useState<Draw>(null);
  const [drafts, setDrafts] = useState<Record<string, UnitDraft>>({});
  const [newLevel, setNewLevel] = useState('');
  const [importText, setImportText] = useState('');
  const [copyLevels, setCopyLevels] = useState('');
  const [copyCreate, setCopyCreate] = useState(true);
  // Prozor „Detalji" stana (osnova, 3D osnova, slike, prostorije - migracija 024).
  const [mediaUnitId, setMediaUnitId] = useState<string | null>(null);
  // Lamela koja se uređuje (null = projekat bez lamela) i izabrana slika po grupi ('site' / id lamele / 'main').
  const [bId, setBId] = useState<string | null>(null);
  const [viewSel, setViewSel] = useState<Record<string, string>>({});
  // Na fasadi se crtaju spratovi ili stanovi.
  const [facadeMode, setFacadeMode] = useState<'floors' | 'units'>('floors');
  const [newBuilding, setNewBuilding] = useState('');
  const [firstBuilding, setFirstBuilding] = useState('Lamela A');
  const [importBuilding, setImportBuilding] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  // AI predlog spratova ili stanova na slici fasade - vidi se na slici, upisuje se tek na „Sačuvaj predlog".
  const [aiFloors, setAiFloors] = useState<{
    viewId: string;
    kind: 'floor' | 'unit';
    items: { id: string; label: string; polygon: Polygon }[];
    note: string;
  } | null>(null);
  const [aiFloorSel, setAiFloorSel] = useState<string | null>(null);
  // AI predlog stanova na osnovi sprata (plan_url) - isti princip, ali se čuva u project_units.polygon (unit-save), ne u project_view_shapes.
  const [aiPlanUnits, setAiPlanUnits] = useState<{
    floorId: string;
    items: { id: string; label: string; polygon: Polygon }[];
    note: string;
  } | null>(null);
  const [aiPlanSel, setAiPlanSel] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, { headers: await adminAuthHeader() });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      setLoadError(json?.error || 'Projekat nije učitan.');
      return;
    }
    const bundle: ProjectBundle = {
      project: json.project,
      floors: json.floors,
      units: json.units,
      tours: json.tours,
      buildings: json.buildings ?? [],
      views: json.views ?? [],
      shapes: json.shapes ?? [],
      unitNotes: json.unitNotes ?? {}
    };
    setData(bundle);
    setInfo((prev) => prev ?? pickInfo(bundle.project));
    const firstB = bundle.buildings[0]?.id ?? null;
    setBId((prev) => (prev && bundle.buildings.some((b) => b.id === prev) ? prev : firstB));
    setFloorId((prev) => prev ?? [...bundle.floors].reverse().find((f) => f.building_id === firstB)?.id ?? null);
  }, [id]);

  // Prijavu drži okvir admina (components/admin/AdminShell.tsx).
  useEffect(() => {
    if (id) Promise.resolve().then(load);
  }, [id, load]);

  const api = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
      body: JSON.stringify({ action, ...payload })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Izmena nije sačuvana.');
    return json;
  }, []);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Greška.' });
    } finally {
      setBusy('');
    }
  };

  const upload = async (file: File, kind: 'view' | 'plan' | 'unit' | 'logo' | 'render'): Promise<string> => {
    // Logo se ne smanjuje: shrinkImage pravi JPG, a logo treba providnu pozadinu (i SVG ostaje SVG).
    const small = kind === 'logo' ? file : await shrinkImage(file, 3 * 1024 * 1024);
    const res = await fetch('/api/admin/projects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
      body: JSON.stringify({ projectId: id, kind, fileType: small.type || 'image/jpeg', fileSize: small.size })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || 'Upload nije pripremljen.');
    const put = await fetch(json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': json.contentType }, body: small });
    if (!put.ok) throw new Error(`Slika nije poslata (R2 ${put.status}).`);
    return json.publicUrl as string;
  };

  const floors = useMemo(() => data?.floors ?? [], [data]);
  const units = useMemo(() => data?.units ?? [], [data]);
  // Lamele, slike i oblici (migracija 025).
  const buildings = useMemo(() => data?.buildings ?? [], [data]);
  const views = useMemo(() => data?.views ?? [], [data]);
  const shapes = useMemo(() => data?.shapes ?? [], [data]);
  const hasBuildings = buildings.length > 0;
  const buildingName = (bid: string | null) => buildings.find((b) => b.id === bid)?.name ?? '';
  // Spratovi, stanovi i fasade lamele koja se uređuje (bez lamela: sve).
  const bFloors = floors.filter((f) => (hasBuildings ? f.building_id === bId : true));
  const bFloorIds = new Set(bFloors.map((f) => f.id));
  const bUnits = units.filter((u) => bFloorIds.has(u.floor_id));
  const groupKey = bId ?? 'main';
  const bViews = views.filter((v) => v.kind === 'building' && (hasBuildings ? v.building_id === bId : v.building_id === null));
  const siteViews = views.filter((v) => v.kind === 'site');
  const activeView = bViews.find((v) => v.id === viewSel[groupKey]) ?? bViews[0] ?? null;
  const activeSite = siteViews.find((v) => v.id === viewSel.site) ?? siteViews[0] ?? null;
  const shapeOf = (viewId: string | null | undefined, target: ShapeTarget, targetId: string): ShapeRow | null =>
    viewId ? shapes.find((sh) => sh.view_id === viewId && sh[SHAPE_COLUMN[target]] === targetId) ?? null : null;

  const floor = floors.find((f) => f.id === floorId) ?? null;
  const floorUnits = units.filter((u) => u.floor_id === floorId);
  const floorsDesc = [...bFloors].sort((a, b) => b.level - a.level);

  const shapeName = (target: ShapeTarget, targetId: string) => {
    if (target === 'building') return buildingName(targetId);
    if (target === 'unit') return `stan ${units.find((u) => u.id === targetId)?.code ?? ''}`;
    const f = floors.find((x) => x.id === targetId);
    return f ? floorName(f.level, f.label).toLowerCase() : 'sprat';
  };

  const putShape = (viewId: string, target: ShapeTarget, targetId: string, shape: ShapeRow | null) =>
    setData((d) =>
      d
        ? {
            ...d,
            shapes: [...d.shapes.filter((sh) => !(sh.view_id === viewId && sh[SHAPE_COLUMN[target]] === targetId)), ...(shape ? [shape] : [])]
          }
        : d
    );
  const saveShape = async (viewId: string, target: ShapeTarget, targetId: string, polygon: Polygon | null) => {
    const json = await api('shape-save', { projectId: id, viewId, target, targetId, polygon });
    putShape(viewId, target, targetId, json.shape as ShapeRow | null);
  };
  const removeShape = (viewId: string, target: ShapeTarget, targetId: string) =>
    run('shape', async () => {
      await saveShape(viewId, target, targetId, null);
      return `Oblik za ${shapeName(target, targetId)} je uklonjen sa slike.`;
    });

  // ---------- slike (pogledi) ----------
  const patchView = (v: ViewRow) => setData((d) => (d ? { ...d, views: d.views.map((x) => (x.id === v.id ? v : x)) } : d));
  const addView = (kind: ViewKind, key: string) => (file: File) =>
    run('view', async () => {
      const url = await upload(file, 'view');
      const json = await api('view-add', { projectId: id, kind, buildingId: kind === 'site' ? null : bId, imageUrl: url });
      setData((d) => (d ? { ...d, views: [...d.views, json.view] } : d));
      setViewSel((sel) => ({ ...sel, [key]: json.view.id }));
      return kind === 'site'
        ? 'Slika kompleksa je dodata - iscrtajte lamele na njoj.'
        : 'Slika je dodata - iscrtajte spratove ili stanove na njoj.';
    });
  const labelView = (vid: string, label: string) =>
    run('view', async () => {
      const json = await api('view-save', { projectId: id, id: vid, label });
      patchView(json.view);
    });
  const moveView = (vid: string, dir: -1 | 1) =>
    run('view', async () => {
      const json = await api('view-move', { projectId: id, id: vid, dir });
      const order = json.order as string[];
      setData((d) =>
        d ? { ...d, views: d.views.map((v) => (order.includes(v.id) ? { ...v, sort: order.indexOf(v.id) } : v)).sort((x, y) => x.sort - y.sort) } : d
      );
    });
  const replaceView = (vid: string, file: File) =>
    run('view', async () => {
      const url = await upload(file, 'view');
      const json = await api('view-save', { projectId: id, id: vid, imageUrl: url });
      patchView(json.view);
      return 'Slika je zamenjena, oblici su ostali.';
    });
  const deleteView = (vid: string) =>
    run('view', async () => {
      await api('view-delete', { projectId: id, id: vid });
      setDraw(null);
      setData((d) => (d ? { ...d, views: d.views.filter((v) => v.id !== vid), shapes: d.shapes.filter((sh) => sh.view_id !== vid) } : d));
      return 'Slika je obrisana.';
    });

  // ---------- lamele ----------
  const pickBuilding = (bid: string) => {
    setBId(bid);
    setFloorId([...floors].sort((a, b) => b.level - a.level).find((f) => f.building_id === bid)?.id ?? null);
    setUnitId(null);
    setDraw(null);
  };
  const addBuilding = () =>
    run('building', async () => {
      const name = newBuilding.trim();
      const json = await api('building-add', { projectId: id, name, existingName: firstBuilding.trim() });
      const added = json.buildings as BuildingRow[];
      setNewBuilding('');
      await load();
      setBId(added[added.length - 1].id);
      setFloorId(null);
      return added.length > 1
        ? `Projekat je sada kompleks: postojeći spratovi i fasade su u „${added[0].name}“, dodata je „${added[1].name}“.`
        : `Dodata je „${added[0].name}“ - dodajte joj spratove i sliku fasade.`;
    });


  const patchFloor = (f: FloorRow) => setData((d) => (d ? { ...d, floors: d.floors.map((x) => (x.id === f.id ? f : x)).sort((a, b) => a.level - b.level) } : d));
  const patchUnit = (u: UnitRow) => setData((d) => (d ? { ...d, units: d.units.map((x) => (x.id === u.id ? u : x)) } : d));

  const onPolygon = async (poly: Polygon) => {
    const target = draw;
    setDraw(null);
    if (!target) return;
    await run('shape', async () => {
      if (target.on === 'view') {
        await saveShape(target.viewId, target.target, target.id, poly);
        return `Oblik za ${shapeName(target.target, target.id)} je sačuvan.`;
      }
      const json = await api('unit-save', { projectId: id, id: target.id, fields: { polygon: poly } });
      patchUnit(json.unit);
      return `Oblik stana ${json.unit.code} je sačuvan.`;
    });
  };

  // Ispravka povlačenjem uglova: oblik se odmah menja na ekranu, pa se čuva.
  // Ako čuvanje ne uspe, vraća se stari oblik.
  const onViewEdit = (viewId: string, target: ShapeTarget, targetId: string, poly: Polygon) => {
    const old = shapeOf(viewId, target, targetId);
    if (!old) return;
    putShape(viewId, target, targetId, { ...old, polygon: poly });
    run('shape', async () => {
      try {
        await saveShape(viewId, target, targetId, poly);
      } catch (e) {
        putShape(viewId, target, targetId, old);
        throw e;
      }
    });
  };

  const onPlanEdit = (targetId: string, poly: Polygon) => {
    const u = units.find((x) => x.id === targetId);
    if (!u) return;
    patchUnit({ ...u, polygon: poly });
    run('shape', async () => {
      try {
        const json = await api('unit-save', { projectId: id, id: u.id, fields: { polygon: poly } });
        patchUnit(json.unit);
      } catch (e) {
        patchUnit(u);
        throw e;
      }
    });
  };

  // Brisanje (meni "⋯" u zaglavlju): projekat, spratovi i stanovi; ture ostaju.
  const deleteProject = () => {
    if (!data) return;
    if (!window.confirm(`Trajno obrisati projekat „${data.project.title}“? Brišu se spratovi i stanovi; ture ostaju netaknute.`)) return;
    run('delete', async () => {
      await api('delete', { id });
      router.push('/admin/projekti');
    });
  };

  // Traka sekcija u vrhu: samo delovi koji se trenutno prikazuju.
  const sections: { id: string; label: string }[] = [
    { id: 'sec-podaci', label: 'Podaci' },
    { id: 'sec-okolina', label: 'Okolina' },
    { id: 'sec-upiti', label: 'Upiti' },
    { id: 'sec-zgrade', label: 'Zgrade' },
    ...(buildings.length > 1 ? [{ id: 'sec-vazduh', label: 'Iz vazduha' }] : []),
    { id: 'sec-fasada', label: 'Fasada i spratovi' },
    ...(floor ? [{ id: 'sec-osnova', label: 'Osnova sprata' }] : []),
    { id: 'sec-stanovi', label: 'Stanovi' },
    { id: 'sec-osnove-ai', label: 'Osnove (AI)' },
    { id: 'sec-gradiliste', label: 'Gradilište' },
    { id: 'sec-ugradnja', label: 'Ugradnja' },
    { id: 'sec-prodaja', label: 'Prodaja' }
  ];

  return { params, id, router, data, setData, loadError, setLoadError, info, setInfo, projectVideo, setProjectVideo, floorId, setFloorId, unitId, setUnitId, draw, setDraw, drafts, setDrafts, newLevel, setNewLevel, importText, setImportText, copyLevels, setCopyLevels, copyCreate, setCopyCreate, mediaUnitId, setMediaUnitId, bId, setBId, viewSel, setViewSel, facadeMode, setFacadeMode, newBuilding, setNewBuilding, firstBuilding, setFirstBuilding, importBuilding, setImportBuilding, importOpen, setImportOpen, aiFloors, setAiFloors, aiFloorSel, setAiFloorSel, aiPlanUnits, setAiPlanUnits, aiPlanSel, setAiPlanSel, busy, setBusy, msg, setMsg, load, api, run, upload, floors, units, buildings, views, shapes, hasBuildings, buildingName, bFloors, bFloorIds, bUnits, groupKey, bViews, siteViews, activeView, activeSite, shapeOf, floor, floorUnits, floorsDesc, shapeName, putShape, saveShape, removeShape, patchView, addView, labelView, moveView, replaceView, deleteView, pickBuilding, addBuilding, patchFloor, patchUnit, onPolygon, onViewEdit, onPlanEdit, deleteProject, sections };
}

export type ProjectEditor = ReturnType<typeof useProjectEditor>;

/** Sve za prikaz, kad je projekat učitan (data i info nisu null). */
export function editorView(ed: ProjectEditor, data: ProjectBundle, info: InfoForm) {
  const { id, floorId, unitId, draw, setDraw, drafts, bId, facadeMode, aiFloors, setAiFloors, aiFloorSel, setAiFloorSel, aiPlanUnits, setAiPlanUnits, aiPlanSel, setAiPlanSel, api, run, units, buildings, bFloors, bUnits, activeView, activeSite, shapeOf, floor, floorUnits, saveShape, patchUnit } = ed;
  const { project, tours } = data;
  const freeOnFloor = (fid: string) => units.filter((u) => u.floor_id === fid && u.status === 'available').length;

  // Oblici na izabranoj slici fasade: spratovi ILI stanovi (prema prekidaču),
  // da se ručice za ispravku ne preklapaju.
  const facadeShapes: CanvasShape[] = !activeView
    ? []
    : facadeMode === 'floors'
      ? bFloors.flatMap((f) => {
          const sh = shapeOf(activeView.id, 'floor', f.id);
          if (!sh) return [];
          const free = freeOnFloor(f.id);
          return [
            {
              id: f.id,
              label: f.level === 0 ? 'P' : String(f.level),
              polygon: sh.polygon,
              fill: f.id === floorId ? 'rgba(30,90,168,.30)' : free ? 'rgba(46,158,91,.18)' : 'rgba(120,120,120,.22)',
              stroke: free ? '#2E9E5B' : '#9A9A9A',
              active: f.id === floorId
            }
          ];
        })
      : bUnits.flatMap((u) => {
          const sh = shapeOf(activeView.id, 'unit', u.id);
          if (!sh) return [];
          return [
            {
              id: u.id,
              label: u.code,
              polygon: sh.polygon,
              fill: UNIT_STATUS_COLORS[u.status].fill,
              stroke: UNIT_STATUS_COLORS[u.status].stroke,
              active: u.id === unitId
            }
          ];
        });

  // Lamele na slici kompleksa iz vazduha.
  const siteShapes: CanvasShape[] = !activeSite
    ? []
    : buildings.flatMap((b) => {
        const sh = shapeOf(activeSite.id, 'building', b.id);
        if (!sh) return [];
        return [{ id: b.id, label: b.name, polygon: sh.polygon, fill: b.id === bId ? 'rgba(30,90,168,.30)' : 'rgba(30,90,168,.12)', stroke: '#1E5AA8', active: b.id === bId }];
      });
  const drawingOn = (viewId: string | undefined) => (draw?.on === 'view' && draw.viewId === viewId ? draw : null);
  const previewOn = Boolean(
    aiFloors && activeView && aiFloors.viewId === activeView.id && (facadeMode === 'floors' ? aiFloors.kind === 'floor' : aiFloors.kind === 'unit')
  );
  // Predlog stanova: naizmenične nijanse ljubičaste, da se susedni stanovi razlikuju.
  const previewShapes: CanvasShape[] = previewOn
    ? aiFloors!.items.map((it, i) => ({
        id: it.id,
        label: it.label,
        polygon: it.polygon,
        fill: it.id === aiFloorSel ? 'rgba(124,58,237,.38)' : aiFloors!.kind === 'unit' && i % 2 ? 'rgba(124,58,237,.24)' : 'rgba(124,58,237,.12)',
        stroke: '#7C3AED',
        active: it.id === aiFloorSel
      }))
    : [];

  const suggestFloors = () => {
    if (!activeView) return;
    const has = bFloors.some((f) => shapeOf(activeView.id, 'floor', f.id));
    run('ai-floors', async () => {
      const json = await api('facade-floors', { projectId: id, viewId: activeView.id });
      const items = ((json.proposals as { floorId: string; level: number; polygon: Polygon }[]) ?? []).map((p) => ({
        id: p.floorId,
        label: p.level === 0 ? 'P' : String(p.level),
        polygon: p.polygon
      }));
      const seen = Number(json.seen ?? items.length);
      const total = Number(json.floors ?? items.length);
      const parts = [`AI je našao ${seen} ${srPlural(seen, 'etažu', 'etaže', 'etaža')} (spratova u projektu: ${total}).`];
      if (seen !== total) parts.push(seen < total ? 'Nedostaju gornji spratovi - dodajte ih ručno posle čuvanja.' : 'Višak etaža je izostavljen odozgo.');
      if (has) parts.push('Čuvanje zamenjuje spratove već nacrtane na ovoj slici.');
      if (json.backup) parts.push('Čitao je rezervni model - proverite granice pažljivije.');
      parts.push('Kliknite sprat na slici i povucite ugao ako treba, pa „Sačuvaj predlog".');
      setAiFloors({ viewId: activeView.id, kind: 'floor', items, note: parts.join(' ') });
      setAiFloorSel(null);
      setDraw(null);
    });
  };

  const suggestUnits = () => {
    if (!activeView) return;
    const has = bUnits.some((u) => shapeOf(activeView.id, 'unit', u.id));
    run('ai-floors', async () => {
      const json = await api('facade-units', { projectId: id, viewId: activeView.id });
      const items = ((json.proposals as { unitId: string; code: string; polygon: Polygon }[]) ?? []).map((p) => ({
        id: p.unitId,
        label: p.code,
        polygon: p.polygon
      }));
      const parts = [`AI je podelio spratove na ${items.length} ${srPlural(items.length, 'stan', 'stana', 'stanova')} koji se vide na ovoj slici.`];
      if (!json.withPlan) parts.push('Bez osnove sprata sa iscrtanim stanovima AI teže pogađa koji je stan koji - proverite oznake.');
      if (has) parts.push('Čuvanje zamenjuje stanove već nacrtane na ovoj slici.');
      if (json.backup) parts.push('Čitao je rezervni model - proverite granice pažljivije.');
      parts.push('Kliknite stan i povucite ugao ako treba, pa „Sačuvaj predlog".');
      setAiFloors({ viewId: activeView.id, kind: 'unit', items, note: parts.join(' ') });
      setAiFloorSel(null);
      setDraw(null);
    });
  };

  const saveAiFloors = () => {
    if (!aiFloors) return;
    const { viewId, items, kind } = aiFloors;
    run('ai-floors-save', async () => {
      // Stanovi: prvo se brišu stari oblici stanova sa ove slike kojih nema u predlogu, da ne ostanu stari preklopi.
      if (kind === 'unit') {
        const keep = new Set(items.map((it) => it.id));
        for (const u of bUnits) if (!keep.has(u.id) && shapeOf(viewId, 'unit', u.id)) await saveShape(viewId, 'unit', u.id, null);
      }
      for (const it of items) await saveShape(viewId, kind, it.id, it.polygon);
      setAiFloors(null);
      setAiFloorSel(null);
      return `Sačuvani oblici ${items.length} ${kind === 'floor' ? srPlural(items.length, 'sprat', 'sprata', 'spratova') : srPlural(items.length, 'stan', 'stana', 'stanova')}. Uglove i dalje možete da pomerate povlačenjem.`;
    });
  };

  const suggestPlanUnits = () => {
    if (!floor) return;
    const has = floorUnits.some((u) => u.polygon);
    run('ai-plan-units', async () => {
      const json = await api('plan-units', { projectId: id, floorId: floor.id });
      const items = ((json.proposals as { unitId: string; code: string; polygon: Polygon }[]) ?? []).map((p) => ({
        id: p.unitId,
        label: p.code,
        polygon: p.polygon
      }));
      const parts = [`AI je prepoznao ${items.length} od ${floorUnits.length} stanova na ovoj osnovi.`];
      if (has) parts.push('Čuvanje zamenjuje oblike stanova koji već imaju oblik na ovom spratu.');
      if (json.backup) parts.push('Čitao je rezervni model - proverite granice pažljivije.');
      parts.push('Kliknite stan i povucite ugao ako treba, pa „Sačuvaj predlog".');
      setAiPlanUnits({ floorId: floor.id, items, note: parts.join(' ') });
      setAiPlanSel(null);
      setDraw(null);
    });
  };

  const saveAiPlanUnits = () => {
    if (!aiPlanUnits) return;
    const { items } = aiPlanUnits;
    run('ai-plan-units-save', async () => {
      for (const it of items) {
        const json = await api('unit-save', { projectId: id, id: it.id, fields: { polygon: it.polygon } });
        patchUnit(json.unit);
      }
      setAiPlanUnits(null);
      setAiPlanSel(null);
      return `Sačuvani oblici ${items.length} ${srPlural(items.length, 'stan', 'stana', 'stanova')}. Uglove i dalje možete da pomerate povlačenjem.`;
    });
  };


  const planShapes: CanvasShape[] = floorUnits
    .filter((u) => u.polygon)
    .map((u) => ({
      id: u.id,
      label: u.code,
      polygon: u.polygon!,
      fill: UNIT_STATUS_COLORS[u.status].fill,
      stroke: UNIT_STATUS_COLORS[u.status].stroke,
      active: u.id === unitId
    }));

  const planPreviewOn = Boolean(aiPlanUnits && floor && aiPlanUnits.floorId === floor.id);
  const planPreviewShapes: CanvasShape[] = planPreviewOn
    ? aiPlanUnits!.items.map((it) => ({
        id: it.id,
        label: it.label,
        polygon: it.polygon,
        fill: it.id === aiPlanSel ? 'rgba(124,58,237,.38)' : 'rgba(124,58,237,.12)',
        stroke: '#7C3AED',
        active: it.id === aiPlanSel
      }))
    : [];

  const unitsDirty = Object.keys(drafts).length;

  return { ...ed, data, info, project, tours, freeOnFloor, facadeShapes, siteShapes, drawingOn, previewOn, previewShapes, suggestFloors, suggestUnits, saveAiFloors, suggestPlanUnits, saveAiPlanUnits, planShapes, planPreviewOn, planPreviewShapes, unitsDirty };
}

export type EditorView = ReturnType<typeof editorView>;

export function pickInfo(p: ProjectRow): InfoForm {
  return {
    title: p.title,
    developer_name: p.developer_name,
    address: p.address,
    city: p.city,
    neighborhood: p.neighborhood,
    move_in: p.move_in,
    description: p.description,
    contact_phone: p.contact_phone,
    contact_email: p.contact_email,
    title_en: p.title_en,
    description_en: p.description_en
  };
}
