'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { adminAuthHeader } from '../../../lib/authFetch';
import { FormThemeStyle } from '../../../lib/formTheme';
import { shrinkImage } from '../../../lib/shrinkImage';
import { PROJECT_ADMIN_STYLES } from '../../../../components/projekat/adminStyles';
import PolygonCanvas, { type CanvasShape } from '../../../../components/projekat/PolygonCanvas';
import SalesAccessPanel from '../../../../components/projekat/SalesAccessPanel';
import EmbedCodePanel from '../../../../components/projekat/EmbedCodePanel';
import NameAdvice from '../../../../components/projekat/NameAdvice';
import InsightsPanel from '../../../../components/projekat/InsightsPanel';
import ProgressPanel from '../../../../components/projekat/ProgressPanel';
import UnitMediaModal from '../../../../components/projekat/UnitMediaModal';
import NearbyPanel from '../../../../components/projekat/NearbyPanel';
import ViewManager from '../../../../components/projekat/ViewManager';
import {
  floorName,
  cleanPhotos,
  cleanRooms,
  parseLevels,
  levelPrefix,
  unitSuffix,
  SHAPE_COLUMN,
  UNIT_STATUSES,
  UNIT_STATUS_COLORS,
  UNIT_STATUS_LABEL,
  type BuildingRow,
  type FloorRow,
  type Polygon,
  type ProjectBundle,
  type ProjectRow,
  type ShapeRow,
  type ShapeTarget,
  type UnitRow,
  type UnitStatus,
  type ViewKind,
  type ViewRow
} from '../../../lib/projects';

/**
 * Uređivanje jednog projekta novogradnje:
 *   1) podaci projekta i objava
 *   2) lamele i slika kompleksa iz vazduha (migracija 025, samo za komplekse)
 *   3) fasada izabrane zgrade: više slika (rotacija), na svakoj oblici
 *      spratova i/ili stanova (klik po klik)
 *   4) osnova izabranog sprata: slika + oblik svakog stana, pogled sa sprata
 *   5) tabela stanova: status, cena, tura... + uvoz iz Excela
 *
 * Sve izmene idu kroz /api/admin/projects; ture se ovde samo biraju.
 */

/** Šta se crta: oblik na slici (fasada / kompleks) ili stan na osnovi sprata. */
type Draw = { on: 'view'; viewId: string; target: ShapeTarget; id: string } | { on: 'plan'; id: string } | null;
type Msg = { ok: boolean; text: string } | null;

type InfoForm = Pick<
  ProjectRow,
  'title' | 'developer_name' | 'address' | 'city' | 'move_in' | 'description' | 'contact_phone' | 'contact_email' | 'title_en' | 'description_en'
>;

const INFO_FIELDS: { key: keyof InfoForm; label: string; wide?: boolean; area?: boolean; placeholder?: string }[] = [
  { key: 'title', label: 'Naziv projekta' },
  { key: 'developer_name', label: 'Investitor', placeholder: 'npr. Gradnja d.o.o.' },
  { key: 'address', label: 'Adresa' },
  { key: 'city', label: 'Grad' },
  { key: 'move_in', label: 'Useljenje', placeholder: 'npr. jun 2027' },
  { key: 'contact_phone', label: 'Telefon prodaje' },
  { key: 'contact_email', label: 'Email prodaje' },
  { key: 'description', label: 'Opis projekta', wide: true, area: true },
  { key: 'title_en', label: 'Naziv na engleskom (opciono)', placeholder: 'prazno = isti kao srpski' },
  { key: 'description_en', label: 'Opis na engleskom (za /en stranu)', wide: true, area: true }
];

type UnitDraft = {
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

const toDraft = (u: UnitRow): UnitDraft => ({
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

const IMPORT_EXAMPLE = 'Oznaka\tSprat\tStruktura\tm²\tTerasa\tOrijentacija\tCena\tStatus\n1A\t1\tDvosoban\t54\t6\tJug\t89000\tslobodan\n1B\t1\tTrosoban\t72\t9\tZapad\t118000\tprodat';

export default function ProjectEditorPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const router = useRouter();

  const [session, setSession] = useState<'checking' | 'in' | 'out'>('checking');
  const [data, setData] = useState<ProjectBundle | null>(null);
  const [loadError, setLoadError] = useState('');
  const [info, setInfo] = useState<InfoForm | null>(null);
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
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => setSession(s.session ? 'in' : 'out'));
  }, []);

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

  useEffect(() => {
    if (session === 'in' && id) Promise.resolve().then(load);
  }, [session, id, load]);

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

  const upload = async (file: File, kind: 'view' | 'plan' | 'unit'): Promise<string> => {
    const small = await shrinkImage(file, 3 * 1024 * 1024);
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

  // ---------- prikaz ----------

  if (session !== 'in') {
    return (
      <main className="pa k-form">
        <FormThemeStyle />
        <style>{PROJECT_ADMIN_STYLES}</style>
        <div className="pa-wrap">
          {session === 'checking' ? (
            'Provera pristupa...'
          ) : (
            <p>
              Prvo se prijavite u <a href="/admin/ture">admin</a>, pa se vratite ovde.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (!data || !info) {
    return (
      <main className="pa k-form">
        <FormThemeStyle />
        <style>{PROJECT_ADMIN_STYLES}</style>
        <div className="pa-wrap">{loadError ? <p className="pa-msg is-err">{loadError}</p> : 'Učitavam projekat...'}</div>
      </main>
    );
  }

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

  const unitsDirty = Object.keys(drafts).length;

  return (
    <main className="pa k-form">
      <FormThemeStyle />
      <style>{PROJECT_ADMIN_STYLES}</style>
      <div className="pa-wrap">
        <div className="pa-top">
          <div>
            <div className="pa-crumbs">
              <Link href="/admin/projekti">← Projekti</Link>
              <span>/novogradnja/{project.slug}</span>
            </div>
            <h1>{project.title}</h1>
          </div>
          <div className="pa-row">
            <span className={project.published ? 'pa-pill is-pub' : 'pa-pill is-draft'}>{project.published ? 'Objavljen' : 'U pripremi'}</span>
            {project.published && (
              <a className="pa-btn" href={`/novogradnja/${project.slug}`} target="_blank" rel="noreferrer">
                Otvori javnu stranu ↗
              </a>
            )}
            <button
              type="button"
              className="pa-btn"
              disabled={busy === 'preview'}
              title="Poseban link: strana izgleda kao prava i radi i pre objave, ali je ne vidi niko bez linka. Važi 30 dana."
              onClick={() => {
                // Prozor se otvara odmah na klik, pa mu se adresa postavi kad
                // stigne link - inače pregledač blokira prozor otvoren posle await-a.
                const win = window.open('', '_blank');
                run('preview', async () => {
                  try {
                    const json = await api('preview-link', { id });
                    const url = `${window.location.origin}${json.url}`;
                    if (win) win.location.href = url;
                    else window.open(url, '_blank');
                    await navigator.clipboard?.writeText(url).catch(() => undefined);
                    return 'Link za pokazivanje je otvoren i kopiran - izgleda kao prava strana, važi 30 dana, a bez njega projekat niko ne vidi.';
                  } catch (e) {
                    win?.close();
                    throw e;
                  }
                });
              }}
            >
              Link za pokazivanje ↗
            </button>
            <button
              type="button"
              className={project.published ? 'pa-btn' : 'pa-btn is-primary'}
              disabled={busy === 'publish'}
              onClick={() =>
                run('publish', async () => {
                  await api('update', { id, fields: { published: !project.published } });
                  setData((d) => (d ? { ...d, project: { ...d.project, published: !project.published } } : d));
                  return project.published ? 'Projekat je sklonjen sa sajta.' : 'Projekat je objavljen.';
                })
              }
            >
              {project.published ? 'Skloni sa sajta' : 'Objavi'}
            </button>
          </div>
        </div>

        {/* Poruka je pričvršćena na dno ekrana: dugmići su često daleko ispod
            vrha strane, pa poruka u vrhu ostane van vidokruga (vlasnik nije
            video grešku pri dodavanju sprata, 2. 10. 2026). */}
        {msg && (
          <p className={msg.ok ? 'pa-msg pa-toast is-ok' : 'pa-msg pa-toast is-err'} role="status">
            <span>{msg.text}</span>
            <button type="button" aria-label="Zatvori poruku" onClick={() => setMsg(null)}>
              ×
            </button>
          </p>
        )}

        {/* 1) Podaci projekta */}
        <section className="pa-card">
          <h2>Podaci projekta</h2>
          <p className="pa-hint">Prikazuju se u vrhu javne strane projekta.</p>
          <div className="pa-grid">
            {INFO_FIELDS.map((f) => (
              <label key={f.key} className={f.wide ? 'pa-field is-wide' : 'pa-field'}>
                {f.label}
                {f.area ? (
                  <textarea value={info[f.key] ?? ''} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
                ) : (
                  <input type="text" value={info[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
                )}
                {/* Naziv na strani se ovde menja slobodno (adresa ostaje ista), ali isti savet važi. */}
                {f.key === 'title' && <NameAdvice title={info.title ?? ''} onAccept={(fixed) => setInfo({ ...info, title: fixed })} />}
              </label>
            ))}
          </div>
          <div className="pa-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="pa-btn is-primary"
              disabled={busy === 'info'}
              onClick={() =>
                run('info', async () => {
                  const json = await api('update', { id, fields: info });
                  // Nova adresa -> server je možda našao i koordinate (za mapu okoline).
                  const coords = json.coords as { lat: number; lng: number } | null;
                  setData((d) => (d ? { ...d, project: { ...d.project, ...info, ...(coords ?? {}) } } : d));
                  return coords ? 'Podaci projekta su sačuvani, a adresa je pronađena na mapi.' : 'Podaci projekta su sačuvani.';
                })
              }
            >
              {busy === 'info' ? 'Čuvam...' : 'Sačuvaj podatke'}
            </button>
            <button
              type="button"
              className="pa-btn"
              disabled={busy === 'translate' || !info.description?.trim()}
              title="AI predlog prevoda srpskog opisa; proverite ga pa kliknite „Sačuvaj podatke“"
              onClick={() =>
                run('translate', async () => {
                  const json = await api('translate-en', { description: info.description });
                  setInfo({ ...info, description_en: json.description_en });
                  return 'Engleski opis je predložen - proverite ga i kliknite „Sačuvaj podatke“.';
                })
              }
            >
              {busy === 'translate' ? 'Prevodim...' : '🌐 Prevedi opis na engleski'}
            </button>
            {project.published && (
              <a className="pa-btn" href={`/en/novogradnja/${project.slug}`} target="_blank" rel="noreferrer">
                Engleska strana ↗
              </a>
            )}
          </div>

          {/* Prezentacija (migracija 026): sve kartice stana, i kad stan nema sadržaj. */}
          <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
            <label className="pa-row" style={{ fontSize: 14, fontWeight: 650 }}>
              <input
                type="checkbox"
                checked={project.show_all_tabs}
                disabled={busy === 'demo'}
                onChange={(e) => {
                  const show_all_tabs = e.target.checked;
                  run('demo', async () => {
                    await api('update', { id, fields: { show_all_tabs } });
                    setData((d) => (d ? { ...d, project: { ...d.project, show_all_tabs } } : d));
                    return show_all_tabs
                      ? 'Prezentacija uključena: svaki stan ima sve kartice (Osnova, 360° tura, 3D osnova, Slike).'
                      : 'Prezentacija isključena: stan pokazuje samo ono što ima.';
                  });
                }}
              />
              Prezentacija: prikaži sve kartice stana
            </label>
            <p className="pa-hint" style={{ margin: '4px 0 8px' }}>
              Za pokazivanje investitoru. Stan bez ture dobija demo turu (sa oznakom „Primer ture“), bez slika - rendere zgrade, a 3D osnova
              oznaku „uskoro“. Za pravi projekat isključite - tada se vidi samo ono što stan stvarno ima.
            </p>
            {project.show_all_tabs && (
              <label className="pa-field" style={{ maxWidth: 360 }}>
                Demo tura
                <select
                  value={project.demo_tour_id ?? ''}
                  onChange={(e) => {
                    const demo_tour_id = e.target.value || null;
                    run('demo', async () => {
                      await api('update', { id, fields: { demo_tour_id } });
                      setData((d) => (d ? { ...d, project: { ...d.project, demo_tour_id } } : d));
                      return 'Demo tura je sačuvana.';
                    });
                  }}
                >
                  <option value="">— bez demo ture —</option>
                  {tours
                    .filter((t) => t.published)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || t.slug}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        </section>

        <NearbyPanel
          projectId={id}
          lat={project.lat}
          lng={project.lng}
          nearby={project.nearby}
          nearbyUpdatedAt={project.nearby_updated_at}
          onChange={(patch) => setData((d) => (d ? { ...d, project: { ...d.project, ...patch } } : d))}
        />

        <InsightsPanel projectId={id} />

        {/* 2) Lamele (migracija 025) */}
        <section className="pa-card">
          <h2>Zgrade i lamele</h2>
          {!hasBuildings ? (
            <>
              <p className="pa-hint">
                Projekat je jedna zgrada. Ako investitor gradi više lamela ili zgrada, dodajte ih - posetilac tada prvo bira zgradu (na slici
                kompleksa iz vazduha ili iz spiska), pa sprat i stan.
              </p>
              <form
                className="pa-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newBuilding.trim() && firstBuilding.trim()) addBuilding();
                }}
              >
                <label className="pa-field" style={{ maxWidth: 200 }}>
                  Naziv postojeće zgrade
                  <input type="text" value={firstBuilding} maxLength={40} onChange={(e) => setFirstBuilding(e.target.value)} />
                </label>
                <label className="pa-field" style={{ maxWidth: 200 }}>
                  Nova lamela
                  <input type="text" value={newBuilding} maxLength={40} placeholder="npr. Lamela B" onChange={(e) => setNewBuilding(e.target.value)} />
                </label>
                <button type="submit" className="pa-btn" style={{ alignSelf: 'flex-end' }} disabled={!newBuilding.trim() || !firstBuilding.trim() || busy === 'building'}>
                  {busy === 'building' ? 'Dodajem...' : '+ Podeli na lamele'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="pa-hint">Izaberite lamelu koju uređujete - fasada, spratovi i osnove ispod su za nju. Stanovi svih lamela su u tabeli na dnu.</p>
              <div className="pa-bchips">
                {buildings.map((bb) => {
                  const fl = floors.filter((f) => f.building_id === bb.id).map((f) => f.id);
                  const count = units.filter((u) => fl.includes(u.floor_id)).length;
                  return (
                    <button key={bb.id} type="button" className="pa-floor" aria-pressed={bb.id === bId} onClick={() => pickBuilding(bb.id)}>
                      <span>
                        <b>{bb.name}</b>
                        <br />
                        <small>
                          {fl.length} spratova · {count} stanova
                        </small>
                      </span>
                    </button>
                  );
                })}
                <form
                  className="pa-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newBuilding.trim()) addBuilding();
                  }}
                >
                  <input type="text" value={newBuilding} maxLength={40} placeholder="npr. Lamela C" aria-label="Naziv nove lamele" onChange={(e) => setNewBuilding(e.target.value)} style={{ maxWidth: 150 }} />
                  <button type="submit" className="pa-btn" disabled={!newBuilding.trim() || busy === 'building'}>
                    + Lamela
                  </button>
                </form>
              </div>
              {bId && (
                <div className="pa-row" style={{ marginTop: 10 }}>
                  <input
                    key={bId}
                    type="text"
                    defaultValue={buildingName(bId)}
                    maxLength={40}
                    aria-label="Naziv lamele"
                    style={{ maxWidth: 200 }}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (!name || name === buildingName(bId)) return;
                      run('building', async () => {
                        const json = await api('building-save', { projectId: id, id: bId, name });
                        setData((d) => (d ? { ...d, buildings: d.buildings.map((x) => (x.id === bId ? json.building : x)) } : d));
                        return 'Naziv lamele je sačuvan.';
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="pa-btn is-danger"
                    disabled={bFloors.length > 0}
                    title={bFloors.length ? 'Lamela ima spratove - prvo njih obrišite' : ''}
                    onClick={() => {
                      if (!window.confirm(`Obrisati „${buildingName(bId)}“ i njene slike?`)) return;
                      run('building', async () => {
                        await api('building-delete', { projectId: id, id: bId });
                        await load();
                        const rest = buildings.filter((x) => x.id !== bId);
                        if (rest[0]) pickBuilding(rest[0].id);
                        return 'Lamela je obrisana.';
                      });
                    }}
                  >
                    Obriši lamelu
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* 3) Kompleks iz vazduha - samo kad ima bar dve lamele */}
        {buildings.length > 1 && (
          <section className="pa-card">
            <h2>Kompleks iz vazduha</h2>
            <p className="pa-hint">
              Render ili snimak dronom celog kompleksa. Na njemu iscrtajte svaku lamelu - posetilac klikne na lamelu i otvara se njena fasada.
              Više slika iz različitih uglova = rotacija. Bez ove slike posetilac bira lamelu sa kartica.
            </p>
            <div className="pa-split">
              <ViewManager
                views={siteViews}
                activeId={activeSite?.id ?? null}
                busy={busy === 'view'}
                emptyText="Još nema slike kompleksa."
                addLabel="Otpremi sliku kompleksa"
                onSelect={(vid) => {
                  setDraw(null);
                  setViewSel((sel) => ({ ...sel, site: vid }));
                }}
                onAdd={addView('site', 'site')}
                onLabel={labelView}
                onMove={moveView}
                onReplace={replaceView}
                onDelete={deleteView}
              >
                {activeSite && (
                  <PolygonCanvas
                    imageUrl={activeSite.image_url}
                    shapes={siteShapes}
                    drawing={Boolean(drawingOn(activeSite.id))}
                    drawLabel={drawingOn(activeSite.id) ? shapeName('building', drawingOn(activeSite.id)!.id) : undefined}
                    onComplete={onPolygon}
                    onCancel={() => setDraw(null)}
                    onShapeClick={pickBuilding}
                    onEdit={(bid, poly) => onViewEdit(activeSite.id, 'building', bid, poly)}
                  />
                )}
              </ViewManager>
              <div className="pa-floors">
                {buildings.map((bb) => {
                  const has = shapeOf(activeSite?.id, 'building', bb.id);
                  return (
                    <div key={bb.id} className="pa-floor" aria-pressed={bb.id === bId} role="button" tabIndex={0} onClick={() => pickBuilding(bb.id)}>
                      <span>
                        <b>{bb.name}</b>
                        <br />
                        <small>{has ? 'na slici ✓' : 'nije na slici'}</small>
                      </span>
                      <span className="pa-row" style={{ gap: 4 }}>
                        <button
                          type="button"
                          className="pa-btn"
                          disabled={!activeSite || Boolean(draw)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeSite) setDraw({ on: 'view', viewId: activeSite.id, target: 'building', id: bb.id });
                          }}
                        >
                          {has ? 'Ponovo' : 'Iscrtaj'}
                        </button>
                        {has && activeSite && (
                          <button
                            type="button"
                            className="pa-btn"
                            aria-label={`Ukloni ${bb.name} sa slike`}
                            disabled={Boolean(draw)}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeShape(activeSite.id, 'building', bb.id);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 4) Fasada i spratovi (izabrane lamele) */}
        <section className="pa-card">
          <h2>{hasBuildings ? `Fasada i spratovi: ${buildingName(bId)}` : 'Fasada i spratovi'}</h2>
          <p className="pa-hint">
            Otpremite fotografiju ili render zgrade (može više slika iz različitih uglova - posetilac ih okreće strelicama). Na svakoj slici
            iscrtajte spratove, stanove ili oboje: klik na stan na fasadi kupcu odmah otvara karticu stana.
          </p>
          <div className="pa-row" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink-soft)' }}>Na slici crtam:</span>
            <div className="pa-seg" role="group" aria-label="Šta se crta na fasadi">
              <button
                type="button"
                aria-pressed={facadeMode === 'floors'}
                onClick={() => {
                  setDraw(null);
                  setFacadeMode('floors');
                }}
              >
                Spratove
              </button>
              <button
                type="button"
                aria-pressed={facadeMode === 'units'}
                onClick={() => {
                  setDraw(null);
                  setFacadeMode('units');
                }}
              >
                Stanove
              </button>
            </div>
          </div>
          <div className="pa-split">
            <ViewManager
              views={bViews}
              activeId={activeView?.id ?? null}
              busy={busy === 'view'}
              emptyText={hasBuildings ? `Još nema slike fasade za „${buildingName(bId)}“.` : 'Još nema slike fasade.'}
              addLabel="Otpremi sliku fasade"
              onSelect={(vid) => {
                setDraw(null);
                setViewSel((sel) => ({ ...sel, [groupKey]: vid }));
              }}
              onAdd={addView('building', groupKey)}
              onLabel={labelView}
              onMove={moveView}
              onReplace={replaceView}
              onDelete={deleteView}
            >
              {activeView && (
                <PolygonCanvas
                  imageUrl={activeView.image_url}
                  shapes={facadeShapes}
                  drawing={Boolean(drawingOn(activeView.id))}
                  drawLabel={drawingOn(activeView.id) ? shapeName(drawingOn(activeView.id)!.target, drawingOn(activeView.id)!.id) : undefined}
                  onComplete={onPolygon}
                  onCancel={() => setDraw(null)}
                  onEdit={(sid, poly) => onViewEdit(activeView.id, facadeMode === 'floors' ? 'floor' : 'unit', sid, poly)}
                  onShapeClick={(sid) => {
                    if (facadeMode === 'floors') {
                      setFloorId(sid);
                      setUnitId(null);
                    } else {
                      setUnitId(sid);
                      setFloorId(units.find((u) => u.id === sid)?.floor_id ?? floorId);
                    }
                  }}
                />
              )}
            </ViewManager>

            <div>
              {facadeMode === 'floors' ? (
                <>
              <div className="pa-floors">
                {floorsDesc.length === 0 && <div className="pa-empty">Nema spratova. Dodajte ih ispod ili uvezite tabelu stanova.</div>}
                {floorsDesc.map((f) => {
                  const count = units.filter((u) => u.floor_id === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="pa-floor"
                      aria-pressed={f.id === floorId}
                      onClick={() => {
                        setFloorId(f.id);
                        setUnitId(null);
                      }}
                    >
                      <span>
                        <b>{floorName(f.level, f.label)}</b>
                        <br />
                        <small>
                          {count} stanova · {freeOnFloor(f.id)} slob. · {shapeOf(activeView?.id, 'floor', f.id) ? 'na slici ✓' : 'nije na slici'} ·{' '}
                          {f.plan_url ? 'osnova ✓' : 'bez osnove'}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <form
                className="pa-row"
                style={{ marginTop: 10 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const levels = parseLevels(newLevel);
                  if (!levels) {
                    setMsg({ ok: false, text: 'Upišite sprat kao broj ili P za prizemlje - npr. „3“, „P“, „P, 1, 2“ ili „P-6“ za sve odjednom.' });
                    return;
                  }
                  run('floor-add', async () => {
                    const json = await api('floors-add', { projectId: id, levels, buildingId: bId });
                    const added = json.floors as FloorRow[];
                    setData((d) => (d ? { ...d, floors: [...d.floors, ...added].sort((a, b) => a.level - b.level) } : d));
                    if (added.length) setFloorId(added[added.length - 1].id);
                    setNewLevel('');
                    if (!added.length) return 'Ti spratovi već postoje.';
                    const names = added.map((f) => (f.level === 0 ? 'P' : String(f.level))).join(', ');
                    return `Dodato spratova: ${added.length} (${names})${json.skipped ? `, ${json.skipped} je već postojalo` : ''}.`;
                  });
                }}
              >
                <input
                  type="text"
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="npr. P-6 ili 3"
                  aria-label="Sprat ili raspon spratova"
                  style={{ maxWidth: 150 }}
                />
                <button className="pa-btn" type="submit" disabled={busy === 'floor-add' || !newLevel.trim()}>
                  {busy === 'floor-add' ? 'Dodajem...' : '+ Dodaj sprat'}
                </button>
              </form>
              <p className="pa-hint" style={{ margin: '6px 0 0' }}>
                Jedan sprat („3“, „P“) ili sve odjednom: „P-6“ pravi prizemlje i spratove 1-6.
              </p>

              {floor && (
                <div className="pa-card" style={{ marginTop: 12, marginBottom: 0, padding: 14 }}>
                  <b>{floorName(floor.level, floor.label)}</b>
                  <label className="pa-field" style={{ marginTop: 8 }}>
                    Naziv (opciono)
                    <input
                      type="text"
                      defaultValue={floor.label ?? ''}
                      key={floor.id}
                      placeholder={floorName(floor.level)}
                      onBlur={(e) => {
                        const label = e.target.value.trim();
                        if (label === (floor.label ?? '')) return;
                        run('floor-label', async () => {
                          const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, label });
                          patchFloor(json.floor);
                        });
                      }}
                    />
                  </label>
                  <div className="pa-row" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="pa-btn is-primary"
                      disabled={!activeView || Boolean(draw)}
                      title={activeView ? '' : 'Prvo otpremite sliku fasade'}
                      onClick={() => {
                        if (!activeView) return;
                        setFacadeMode('floors');
                        setDraw({ on: 'view', viewId: activeView.id, target: 'floor', id: floor.id });
                      }}
                    >
                      {shapeOf(activeView?.id, 'floor', floor.id) ? 'Iscrtaj ponovo' : 'Iscrtaj na slici'}
                    </button>
                    {activeView && shapeOf(activeView.id, 'floor', floor.id) && (
                      <button type="button" className="pa-btn" disabled={Boolean(draw)} onClick={() => removeShape(activeView.id, 'floor', floor.id)}>
                        Ukloni sa slike
                      </button>
                    )}
                    <button
                      type="button"
                      className="pa-btn is-danger"
                      onClick={() => {
                        const count = units.filter((u) => u.floor_id === floor.id).length;
                        if (!window.confirm(`Obrisati ${floorName(floor.level).toLowerCase()}${count ? ` i ${count} stanova na njemu` : ''}?`)) return;
                        run('floor-del', async () => {
                          await api('floor-delete', { projectId: id, id: floor.id });
                          setData((d) => {
                            if (!d) return d;
                            const gone = new Set(d.units.filter((u) => u.floor_id === floor.id).map((u) => u.id));
                            return {
                              ...d,
                              floors: d.floors.filter((x) => x.id !== floor.id),
                              units: d.units.filter((u) => u.floor_id !== floor.id),
                              shapes: d.shapes.filter((sh) => sh.floor_id !== floor.id && !(sh.unit_id && gone.has(sh.unit_id)))
                            };
                          });
                          setFloorId(null);
                          return 'Sprat je obrisan.';
                        });
                      }}
                    >
                      Obriši sprat
                    </button>
                  </div>
                </div>
              )}
                </>
              ) : (
                <div className="pa-floors">
                  {bUnits.length === 0 && <div className="pa-empty">Nema stanova. Dodajte ih u tabeli ispod ili uvezite iz Excela.</div>}
                  {bUnits.length > 0 && (
                    <p className="pa-hint" style={{ margin: '0 0 4px' }}>
                      Na slici: {bUnits.filter((u) => shapeOf(activeView?.id, 'unit', u.id)).length} od {bUnits.length} stanova. Stanovi koji se ne
                      vide sa ove strane mogu ostati neiscrtani - crtaju se na drugoj slici.
                    </p>
                  )}
                  {[...bUnits]
                    .sort((a, b) => {
                      const fa = floors.find((f) => f.id === a.floor_id);
                      const fb = floors.find((f) => f.id === b.floor_id);
                      const ba = buildingName(fa?.building_id ?? null);
                      const bb = buildingName(fb?.building_id ?? null);
                      return ba.localeCompare(bb, 'sr', { numeric: true }) || (fb?.level ?? 0) - (fa?.level ?? 0) || a.code.localeCompare(b.code, 'sr', { numeric: true });
                    })
                    .map((u) => {
                      const has = shapeOf(activeView?.id, 'unit', u.id);
                      const fl = floors.find((f) => f.id === u.floor_id);
                      return (
                        <div
                          key={u.id}
                          className="pa-floor"
                          aria-pressed={u.id === unitId}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setUnitId(u.id);
                            setFloorId(u.floor_id);
                          }}
                        >
                          <span>
                            <b>{u.code}</b> <small style={{ color: UNIT_STATUS_COLORS[u.status].text }}>{UNIT_STATUS_LABEL[u.status]}</small>
                            <br />
                            <small>
                              {fl ? floorName(fl.level, fl.label) : ''} · {has ? 'na slici ✓' : 'nije na slici'}
                            </small>
                          </span>
                          <span className="pa-row" style={{ gap: 4 }}>
                            <button
                              type="button"
                              className="pa-btn"
                              disabled={!activeView || Boolean(draw)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnitId(u.id);
                                if (activeView) setDraw({ on: 'view', viewId: activeView.id, target: 'unit', id: u.id });
                              }}
                            >
                              {has ? 'Ponovo' : 'Iscrtaj'}
                            </button>
                            {has && activeView && (
                              <button
                                type="button"
                                className="pa-btn"
                                aria-label={`Ukloni stan ${u.code} sa slike`}
                                disabled={Boolean(draw)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeShape(activeView.id, 'unit', u.id);
                                }}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3) Osnova izabranog sprata */}
        {floor && (
          <section className="pa-card">
            <h2>Osnova: {floorName(floor.level, floor.label)}</h2>
            <p className="pa-hint">Otpremite osnovu sprata (PDF od arhitekte sačuvajte kao sliku), pa za svaki stan kliknite „Iscrtaj“.</p>
            <div className="pa-split">
              <div>
                {floor.plan_url ? (
                  <PolygonCanvas
                    imageUrl={floor.plan_url}
                    shapes={planShapes}
                    drawing={draw?.on === 'plan'}
                    drawLabel={draw?.on === 'plan' ? `stan ${units.find((u) => u.id === draw.id)?.code ?? ''}` : undefined}
                    onComplete={onPolygon}
                    onCancel={() => setDraw(null)}
                    onShapeClick={setUnitId}
                    onEdit={onPlanEdit}
                  />
                ) : (
                  <div className="pa-empty">Još nema osnove ovog sprata.</div>
                )}
                <label className="pa-field" style={{ marginTop: 10 }}>
                  {floor.plan_url ? 'Zameni osnovu' : 'Osnova sprata (JPG, PNG, WEBP)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy === 'plan'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      run('plan', async () => {
                        const url = await upload(file, 'plan');
                        const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, plan_url: url });
                        patchFloor(json.floor);
                        return 'Osnova je postavljena.';
                      });
                    }}
                  />
                </label>
                <label className="pa-field" style={{ marginTop: 10 }}>
                  Pogled sa sprata (tura sa snimkom dronom na ovoj visini)
                  <select
                    value={floor.view_tour_id ?? ''}
                    onChange={(e) => {
                      const view_tour_id = e.target.value || null;
                      run('view', async () => {
                        const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, view_tour_id });
                        patchFloor(json.floor);
                        return 'Pogled sa sprata je sačuvan.';
                      });
                    }}
                  >
                    <option value="">— nema —</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || t.slug}
                        {t.published ? '' : ' (nije objavljena)'}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Tipski spratovi: jedna osnova i jedno crtanje za sve. */}
                {(floor.plan_url || floorUnits.some((u) => u.polygon)) && bFloors.length > 1 && (
                  <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
                    <b>Isti raspored i na drugim spratovima?</b>
                    <p className="pa-hint" style={{ margin: '4px 0 10px' }}>
                      Kopira osnovu i nacrtane stanove sa ovog sprata. Stanovi se uparuju po oznaci ({floorUnits[0]?.code ?? '2A'} →{' '}
                      {floorUnits[0] ? `${levelPrefix(floor.level + 1)}${unitSuffix(floorUnits[0].code, floor.level) ?? '…'}` : '3A'}). Status i cena
                      se ne diraju.
                    </p>
                    <form
                      className="pa-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const levels = parseLevels(copyLevels);
                        if (!levels) {
                          setMsg({ ok: false, text: 'Upišite spratove, npr. „2-6“ ili „3, 4, 5“.' });
                          return;
                        }
                        run('copy', async () => {
                          const json = await api('floor-copy', { projectId: id, sourceFloorId: floor.id, levels, createMissing: copyCreate });
                          await load();
                          setCopyLevels('');
                          const parts = [`Kopirano na spratova: ${json.floors}`];
                          if (json.matched) parts.push(`uparenih stanova: ${json.matched}`);
                          if (json.created) parts.push(`novih stanova: ${json.created}`);
                          let text = parts.join(', ') + '.';
                          if (json.missingFloors.length) text += `\nNema spratova: ${json.missingFloors.map((l: number) => levelPrefix(l)).join(', ')} - prvo ih dodajte.`;
                          if (json.unmatched.length) text += `\nNisu upareni: ${json.unmatched.slice(0, 12).join(', ')}${json.unmatched.length > 12 ? '…' : ''}.`;
                          return text;
                        });
                      }}
                    >
                      <input
                        type="text"
                        value={copyLevels}
                        onChange={(e) => setCopyLevels(e.target.value)}
                        placeholder={`npr. ${floor.level + 1}-${Math.max(...bFloors.map((f) => f.level))}`}
                        aria-label="Spratovi na koje se kopira"
                        style={{ maxWidth: 140 }}
                      />
                      <button type="submit" className="pa-btn is-primary" disabled={!copyLevels.trim() || busy === 'copy'}>
                        {busy === 'copy' ? 'Kopiram...' : 'Primeni na te spratove'}
                      </button>
                    </form>
                    <label className="pa-row" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                      <input type="checkbox" checked={copyCreate} onChange={(e) => setCopyCreate(e.target.checked)} />
                      Napravi stanove koji tamo još ne postoje (struktura i m² kao ovde, cena prazna, status slobodan)
                    </label>
                  </div>
                )}
              </div>
              <div className="pa-floors">
                {floorUnits.length === 0 && <div className="pa-empty">Na ovom spratu nema stanova. Dodajte ih u tabeli ispod.</div>}
                {floorUnits.map((u) => (
                  <div key={u.id} className="pa-floor" aria-pressed={u.id === unitId} onClick={() => setUnitId(u.id)} role="button" tabIndex={0}>
                    <span>
                      <b>{u.code}</b> <small style={{ color: UNIT_STATUS_COLORS[u.status].text }}>{UNIT_STATUS_LABEL[u.status]}</small>
                      <br />
                      <small>{u.polygon ? 'oblik ✓' : 'bez oblika'}</small>
                    </span>
                    <button
                      type="button"
                      className="pa-btn"
                      disabled={!floor.plan_url || Boolean(draw)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUnitId(u.id);
                        setDraw({ on: 'plan', id: u.id });
                      }}
                    >
                      {u.polygon ? 'Ponovo' : 'Iscrtaj'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4) Tabela stanova */}
        <section className="pa-card">
          <h2>Stanovi ({units.length})</h2>
          <p className="pa-hint">Promenite status ili cenu i kliknite „Sačuvaj“ u tom redu. Javna strana se osvežava odmah.</p>
          {units.length > 0 && (
            <div className="pa-table-wrap">
              <table className="pa-table">
                <thead>
                  <tr>
                    <th>Oznaka</th>
                    <th>Sprat</th>
                    <th>Struktura</th>
                    <th>m²</th>
                    <th>Terasa</th>
                    <th>Orijent.</th>
                    <th>Cena €</th>
                    <th>Status</th>
                    <th>360° tura</th>
                    <th>Beleška prodaje</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...units]
                    .sort((a, b) => {
                      const la = floors.find((f) => f.id === a.floor_id)?.level ?? 0;
                      const lb = floors.find((f) => f.id === b.floor_id)?.level ?? 0;
                      return lb - la || a.code.localeCompare(b.code, 'sr', { numeric: true });
                    })
                    .map((u) => {
                      const d = drafts[u.id] ?? toDraft(u);
                      const set = (patch: Partial<UnitDraft>) => setDrafts((all) => ({ ...all, [u.id]: { ...d, ...patch } }));
                      return (
                        <tr key={u.id} className={drafts[u.id] ? 'is-dirty' : undefined}>
                          <td><input type="text" value={d.code} onChange={(e) => set({ code: e.target.value })} style={{ width: 70 }} /></td>
                          <td>
                            <select value={d.floor_id} onChange={(e) => set({ floor_id: e.target.value })}>
                              {floors.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {hasBuildings ? `${buildingName(f.building_id)} · ` : ''}
                                  {f.level === 0 ? 'P' : f.level}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td><input type="text" value={d.structure} onChange={(e) => set({ structure: e.target.value })} style={{ width: 110 }} /></td>
                          <td><input type="text" inputMode="decimal" value={d.area_sqm} onChange={(e) => set({ area_sqm: e.target.value })} style={{ width: 64 }} /></td>
                          <td><input type="text" inputMode="decimal" value={d.terrace_sqm} onChange={(e) => set({ terrace_sqm: e.target.value })} style={{ width: 56 }} /></td>
                          <td><input type="text" value={d.orientation} onChange={(e) => set({ orientation: e.target.value })} style={{ width: 84 }} /></td>
                          <td><input type="text" inputMode="numeric" value={d.price} onChange={(e) => set({ price: e.target.value })} style={{ width: 90 }} /></td>
                          <td>
                            <select className="pa-status" value={d.status} style={{ color: UNIT_STATUS_COLORS[d.status].text }} onChange={(e) => set({ status: e.target.value as UnitStatus })}>
                              {UNIT_STATUSES.map((s) => (
                                <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select value={d.tour_id} onChange={(e) => set({ tour_id: e.target.value })} style={{ maxWidth: 160 }}>
                              <option value="">—</option>
                              {tours.map((t) => (
                                <option key={t.id} value={t.id}>{t.title || t.slug}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ maxWidth: 200, fontSize: 12 }}>
                            {data.unitNotes?.[u.id] ? (
                              <span style={{ color: data.unitNotes[u.id].important ? '#B45309' : 'var(--ink-soft)', fontWeight: data.unitNotes[u.id].important ? 700 : 400 }}>
                                {data.unitNotes[u.id].important ? '⚑ ' : ''}
                                {data.unitNotes[u.id].text}
                                <small style={{ display: 'block', fontWeight: 400, color: 'var(--ink-faint)' }}>{data.unitNotes[u.id].author}</small>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ink-faint)' }}>—</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="pa-btn is-primary"
                              disabled={!drafts[u.id] || busy === `unit-${u.id}`}
                              onClick={() =>
                                run(`unit-${u.id}`, async () => {
                                  const json = await api('unit-save', {
                                    projectId: id,
                                    id: u.id,
                                    fields: { ...d, tour_id: d.tour_id || null }
                                  });
                                  patchUnit(json.unit);
                                  setDrafts((all) => {
                                    const next = { ...all };
                                    delete next[u.id];
                                    return next;
                                  });
                                  return `Stan ${json.unit.code} je sačuvan.`;
                                })
                              }
                            >
                              Sačuvaj
                            </button>{' '}
                            <button
                              type="button"
                              className="pa-btn"
                              title="Osnova stana, 3D osnova, slike i prostorije"
                              onClick={() => setMediaUnitId(u.id)}
                            >
                              Detalji
                              {u.plan_url || cleanPhotos(u.photos).length || cleanRooms(u.rooms).length ? ' ✓' : ''}
                            </button>{' '}
                            <button
                              type="button"
                              className="pa-btn is-danger"
                              aria-label={`Obriši stan ${u.code}`}
                              onClick={() => {
                                if (!window.confirm(`Obrisati stan ${u.code}?`)) return;
                                run(`unit-${u.id}`, async () => {
                                  await api('unit-delete', { projectId: id, id: u.id });
                                  setData((dd) => (dd ? { ...dd, units: dd.units.filter((x) => x.id !== u.id), shapes: dd.shapes.filter((sh) => sh.unit_id !== u.id) } : dd));
                                  return `Stan ${u.code} je obrisan.`;
                                });
                              }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          {unitsDirty > 0 && (
            <p className="pa-hint" style={{ marginTop: 8 }}>
              Nesačuvanih redova: {unitsDirty}.
            </p>
          )}

          <div className="pa-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="pa-btn"
              disabled={!floor || busy === 'unit-add'}
              title={floor ? '' : 'Prvo izaberite ili dodajte sprat'}
              onClick={() => {
                if (!floor) return;
                const base = `${floor.level === 0 ? 'P' : floor.level}`;
                let n = floorUnits.length + 1;
                const taken = new Set(units.map((u) => u.code));
                while (taken.has(`${base}-${n}`)) n++;
                run('unit-add', async () => {
                  const json = await api('unit-save', { projectId: id, fields: { code: `${base}-${n}`, floor_id: floor.id } });
                  setData((dd) => (dd ? { ...dd, units: [...dd.units, json.unit] } : dd));
                  return `Dodat stan ${json.unit.code} na ${floorName(floor.level).toLowerCase()} - promenite mu oznaku i podatke u tabeli.`;
                });
              }}
            >
              + Novi stan {floor ? `(${floorName(floor.level).toLowerCase()})` : ''}
            </button>
          </div>

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Uvoz iz Excela</summary>
            <p className="pa-hint" style={{ marginTop: 8 }}>
              U Excelu označite kolone redom: <b>oznaka, sprat, struktura, m², terasa, orijentacija, cena, status</b> - kopirajte i nalepite ovde.
              Sprat „P“ je prizemlje; status je slobodan, rezervisan ili prodat. Postojeći stanovi (ista oznaka) se ažuriraju, a nacrtani oblici i
              ture ostaju.
              {hasBuildings && (
                <>
                  {' '}
                  Kompleks: deveta kolona može biti <b>lamela</b> („A“ ili „Lamela A“); redovi bez nje idu u lamelu izabranu ispod.
                </>
              )}
            </p>
            {hasBuildings && (
              <label className="pa-field" style={{ maxWidth: 260, marginBottom: 8 }}>
                Lamela za redove bez 9. kolone
                <select value={importBuilding || bId || ''} onChange={(e) => setImportBuilding(e.target.value)}>
                  {buildings.map((bb) => (
                    <option key={bb.id} value={bb.id}>
                      {bb.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={IMPORT_EXAMPLE} rows={7} style={{ fontFamily: 'ui-monospace, monospace' }} />
            <div className="pa-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="pa-btn is-primary"
                disabled={!importText.trim() || busy === 'import'}
                onClick={() =>
                  run('import', async () => {
                    const json = await api('units-import', { projectId: id, text: importText, buildingId: hasBuildings ? importBuilding || bId : null });
                    setImportText('');
                    setDrafts({});
                    await load();
                    return `Uvezeno stanova: ${json.imported}${json.floorsCreated ? `, novih spratova: ${json.floorsCreated}` : ''}.`;
                  })
                }
              >
                {busy === 'import' ? 'Uvozim...' : 'Uvezi tabelu'}
              </button>
            </div>
          </details>
        </section>

        <ProgressPanel projectId={id} tours={tours} />

        <EmbedCodePanel slug={project.slug} title={project.title} published={project.published} />

        <SalesAccessPanel
          projectId={id}
          notifySales={project.notify_sales}
          onNotifyChange={(value) => setData((d) => (d ? { ...d, project: { ...d.project, notify_sales: value } } : d))}
        />

        {mediaUnitId && units.find((u) => u.id === mediaUnitId) && (
          <UnitMediaModal
            key={mediaUnitId}
            unit={units.find((u) => u.id === mediaUnitId)!}
            projectId={id}
            api={api}
            upload={upload}
            onSaved={patchUnit}
            onClose={() => setMediaUnitId(null)}
            onCopied={load}
          />
        )}

        <section className="pa-card">
          <h2>Brisanje projekta</h2>
          <p className="pa-hint">Briše projekat, spratove i stanove. Ture ostaju netaknute.</p>
          <button
            type="button"
            className="pa-btn is-danger"
            onClick={() => {
              if (!window.confirm(`Trajno obrisati projekat „${project.title}“?`)) return;
              run('delete', async () => {
                await api('delete', { id });
                router.push('/admin/projekti');
              });
            }}
          >
            Obriši projekat
          </button>
        </section>
      </div>
    </main>
  );
}

function pickInfo(p: ProjectRow): InfoForm {
  return {
    title: p.title,
    developer_name: p.developer_name,
    address: p.address,
    city: p.city,
    move_in: p.move_in,
    description: p.description,
    contact_phone: p.contact_phone,
    contact_email: p.contact_email,
    title_en: p.title_en,
    description_en: p.description_en
  };
}
