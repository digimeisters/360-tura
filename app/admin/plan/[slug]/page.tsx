'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { adminAuthHeader } from '../../../lib/authFetch';
import { FORM, FormThemeStyle, formBtnStyle } from '../../../lib/formTheme';
import { Logo } from '../../../tour/[slug]/Logo';
import {
  PLAN_STYLE,
  adjacentGroups,
  doorKey,
  groupWalls,
  labelArea,
  layoutBounds,
  markerPoints,
  renderFloorplanBody,
  type FloorplanLayout,
  type PlanShape
} from '../../../lib/floorplanLayout';

/**
 * Editor šematskog tlocrta ture: /admin/plan/[slug]
 *
 * Otvara se sa automatskim nacrtom (ili ranije sačuvanim planom). Vlasnik
 * povlači prostorije (pomeranje) i kružiće na ivicama (veličina); ivice se
 * lepe za zidove susednih prostorija i za mrežu. Za izabranu prostoriju:
 * naziv, "spoljni prostor", vrata ka susedima, dodatni deo (L-oblik) i
 * brisanje. "Sačuvaj" crta plan istom funkcijom kao ovde i postavlja ga u
 * turu (api/admin/floorplan).
 */

type RoomInfo = { id: string; title: string; links: string[] };
type TourInfo = { slug: string; title: string; floorplanUrl: string | null; hasCustomPlan: boolean };

type Drag = {
  mode: 'move' | 'resize' | 'marker' | 'label';
  /** Prostorija koja se pomera, soba ture čija se oznaka pomera, ili grupa čiji se natpis pomera. */
  shapeId: string;
  /** Ručno postavljene oznake u prostoriji koja se pomera - idu zajedno sa njom. */
  carried: { roomId: string; x: number; y: number }[];
  /** Ručno pomeren natpis prostorije koja se pomera - ide zajedno sa njom. */
  carriedLabel: { x: number; y: number } | null;
  /** Koje ivice se pomeraju pri promeni veličine. */
  edges: { l: boolean; r: boolean; t: boolean; b: boolean };
  start: { x: number; y: number };
  orig: PlanShape;
  /** Da li se prostorija stvarno pomerila (tek tada ima šta da se sačuva). */
  changed: boolean;
};

const GRID = 10;
const SNAP = 12;
const MIN_SIZE = 24;

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Najbliža ivica drugih prostorija (u toleranciji), inače mreža. */
function snap(value: number, candidates: number[]): number {
  let best = value;
  let bestDist = SNAP + 1;
  for (const c of candidates) {
    const d = Math.abs(c - value);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= SNAP ? best : Math.round(value / GRID) * GRID;
}

function viewBoxFor(layout: FloorplanLayout) {
  const b = layoutBounds(layout);
  const m = 90;
  return { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m };
}

export default function FloorplanEditorPage() {
  const params = useParams();
  const slug = String(params?.slug || '');

  const [session, setSession] = useState<'checking' | 'in' | 'out'>('checking');
  const [tour, setTour] = useState<TourInfo | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [layout, setLayout] = useState<FloorplanLayout | null>(null);
  const [draft, setDraft] = useState<FloorplanLayout | null>(null);
  const [fromSaved, setFromSaved] = useState(false);
  const [vb, setVb] = useState({ x: 0, y: 0, w: 1000, h: 800 });
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadError, setLoadError] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  // Širina platna na ekranu - da ručice budu iste veličine bez obzira na uvećanje.
  const [svgWidth, setSvgWidth] = useState(800);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'in' : 'out'));
  }, []);

  useEffect(() => {
    if (session !== 'in' || !slug) return;
    (async () => {
      const res = await fetch(`/api/admin/floorplan?slug=${encodeURIComponent(slug)}`, { headers: await adminAuthHeader() });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setLoadError(json?.error || 'Plan nije učitan.');
        return;
      }
      setTour(json.tour);
      setRooms(json.rooms);
      setDraft(json.draft);
      setFromSaved(json.fromSaved);
      if (json.layout) {
        setLayout(json.layout);
        setVb(viewBoxFor(json.layout));
      }
    })();
  }, [session, slug]);

  // Platno postoji tek kad se raspored učita - tada počinje merenje.
  const hasLayout = layout !== null;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setSvgWidth(svg.getBoundingClientRect().width || 800));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [hasLayout]);

  // Upozorenje pri napuštanju strane sa nesačuvanim izmenama.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const change = useCallback((fn: (l: FloorplanLayout) => FloorplanLayout) => {
    setLayout((l) => (l ? fn(l) : l));
    setDirty(true);
    setMessage(null);
  }, []);

  const body = useMemo(() => (layout ? renderFloorplanBody(layout) : ''), [layout]);
  const markers = useMemo(() => (layout ? markerPoints(layout) : []), [layout]);
  const roomTitle = useMemo(() => new Map(rooms.map((r) => [r.id, r.title])), [rooms]);
  const roomNumber = useMemo(() => new Map(rooms.map((r, i) => [r.id, i + 1])), [rooms]);
  const selectedShape = layout?.shapes.find((s) => s.id === selected) ?? null;
  const selectedGroup = selectedShape ? layout!.groups.find((g) => g.id === selectedShape.group) ?? null : null;

  // ---- Povlačenje ---------------------------------------------------------

  const toPlan = (e: React.PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const startDrag = (e: React.PointerEvent, shape: PlanShape, mode: Drag['mode'], edges: Drag['edges'] = { l: false, r: false, t: false, b: false }) => {
    e.stopPropagation();
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    setSelected(shape.id);
    const inside = (r: { x?: number; y?: number }) =>
      r.x !== undefined && r.y !== undefined && r.x >= shape.x && r.x <= shape.x + shape.w && r.y >= shape.y && r.y <= shape.y + shape.h;
    const carried =
      mode === 'move' && layout
        ? layout.rooms.filter((r) => r.group === shape.group && inside(r)).map((r) => ({ roomId: r.roomId, x: r.x!, y: r.y! }))
        : [];
    const g = layout?.groups.find((x) => x.id === shape.group);
    const carriedLabel = mode === 'move' && g && inside({ x: g.lx, y: g.ly }) ? { x: g.lx!, y: g.ly! } : null;
    dragRef.current = { mode, shapeId: shape.id, carried, carriedLabel, edges, start: toPlan(e), orig: { ...shape }, changed: false };
    setDragging(true);
  };

  // Oznaka panorame ili natpis prostorije: slobodno se prevlači, pamti se ručno mesto.
  const startPointDrag = (e: React.PointerEvent, mode: 'marker' | 'label', id: string, x: number, y: number) => {
    e.stopPropagation();
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      shapeId: id,
      carried: [],
      carriedLabel: null,
      edges: { l: false, r: false, t: false, b: false },
      start: toPlan(e),
      orig: { id, group: '', x, y, w: 0, h: 0 },
      changed: false
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !layout) return;
    const p = toPlan(e);
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;

    if (drag.mode === 'marker' || drag.mode === 'label') {
      const x = Math.round(drag.orig.x + dx);
      const y = Math.round(drag.orig.y + dy);
      if (x !== drag.orig.x || y !== drag.orig.y) drag.changed = true;
      setLayout((lay) =>
        !lay
          ? lay
          : drag.mode === 'marker'
            ? { ...lay, rooms: lay.rooms.map((r) => (r.roomId === drag.shapeId ? { ...r, x, y } : r)) }
            : { ...lay, groups: lay.groups.map((g) => (g.id === drag.shapeId ? { ...g, lx: x, ly: y } : g)) }
      );
      return;
    }

    const others = layout.shapes.filter((s) => s.id !== drag.shapeId);
    const xs = others.flatMap((s) => [s.x, s.x + s.w]);
    const ys = others.flatMap((s) => [s.y, s.y + s.h]);
    const o = drag.orig;

    let next: PlanShape;
    if (drag.mode === 'move') {
      // Leva ili desna ivica - koja je bliža nekom zidu.
      const lx = snap(o.x + dx, xs);
      const rx = snap(o.x + o.w + dx, xs) - o.w;
      const x = Math.abs(lx - (o.x + dx)) <= Math.abs(rx - (o.x + dx)) ? lx : rx;
      const ty = snap(o.y + dy, ys);
      const by = snap(o.y + o.h + dy, ys) - o.h;
      const y = Math.abs(ty - (o.y + dy)) <= Math.abs(by - (o.y + dy)) ? ty : by;
      next = { ...o, x, y };
    } else {
      let l = o.x;
      let r = o.x + o.w;
      let t = o.y;
      let b = o.y + o.h;
      if (drag.edges.l) l = Math.min(snap(o.x + dx, xs), r - MIN_SIZE);
      if (drag.edges.r) r = Math.max(snap(o.x + o.w + dx, xs), l + MIN_SIZE);
      if (drag.edges.t) t = Math.min(snap(o.y + dy, ys), b - MIN_SIZE);
      if (drag.edges.b) b = Math.max(snap(o.y + o.h + dy, ys), t + MIN_SIZE);
      next = { ...o, x: l, y: t, w: r - l, h: b - t };
    }
    if (next.x !== o.x || next.y !== o.y || next.w !== o.w || next.h !== o.h) drag.changed = true;
    const mx = next.x - o.x;
    const my = next.y - o.y;
    const carried = new Map(drag.carried.map((c) => [c.roomId, c]));
    const label = drag.carriedLabel;
    setLayout((lay) =>
      lay
        ? {
            ...lay,
            groups: label
              ? lay.groups.map((g) => (g.id === o.group ? { ...g, lx: label.x + mx, ly: label.y + my } : g))
              : lay.groups,
            shapes: lay.shapes.map((s) => (s.id === next.id ? next : s)),
            rooms: carried.size
              ? lay.rooms.map((r) => {
                  const c = carried.get(r.roomId);
                  return c ? { ...r, x: c.x + mx, y: c.y + my } : r;
                })
              : lay.rooms
          }
        : lay
    );
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    if (dragRef.current.changed) {
      setDirty(true);
      setMessage(null);
    }
    dragRef.current = null;
    setDragging(false);
    svgRef.current?.releasePointerCapture?.(e.pointerId);
  };

  // ---- Radnje nad prostorijom -------------------------------------------

  const setLabel = (label: string) =>
    selectedGroup && change((l) => ({ ...l, groups: l.groups.map((g) => (g.id === selectedGroup.id ? { ...g, label } : g)) }));

  const setOutdoor = (outdoor: boolean) =>
    selectedGroup && change((l) => ({ ...l, groups: l.groups.map((g) => (g.id === selectedGroup.id ? { ...g, outdoor } : g)) }));

  const toggleDoor = (other: string, on: boolean) =>
    selectedGroup &&
    change((l) => {
      const key = doorKey(selectedGroup.id, other);
      const doors = l.doors.filter(([a, b]) => doorKey(a, b) !== key);
      return { ...l, doors: on ? [...doors, [selectedGroup.id, other]] : doors };
    });

  // Vrata na drugi zajednički zid (kad ih prostorije dele više - npr. L-hodnik).
  const cycleDoorWall = (other: string) =>
    selectedGroup &&
    change((l) => ({
      ...l,
      doors: l.doors.map((d) =>
        doorKey(d[0], d[1]) === doorKey(selectedGroup.id, other) ? [d[0], d[1], ((d[2] ?? 0) + 1) % 20] : d
      )
    }));

  const addPart = () => {
    if (!selectedShape) return;
    const part: PlanShape = {
      id: newId('s'),
      group: selectedShape.group,
      x: selectedShape.x + selectedShape.w,
      y: selectedShape.y,
      w: Math.max(60, Math.round(selectedShape.w / 3 / GRID) * GRID),
      h: selectedShape.h
    };
    change((l) => ({ ...l, shapes: [...l.shapes, part] }));
    setSelected(part.id);
  };

  const deleteSelected = () => {
    if (!selectedShape || !layout) return;
    const parts = layout.shapes.filter((s) => s.group === selectedShape.group);
    if (parts.length > 1) {
      change((l) => ({ ...l, shapes: l.shapes.filter((s) => s.id !== selectedShape.id) }));
    } else {
      if (!confirm(`Obrisati prostoriju "${selectedGroup?.label}"? Panorame u njoj ostaju bez oznake na planu.`)) return;
      const g = selectedShape.group;
      change((l) => ({
        ...l,
        groups: l.groups.filter((x) => x.id !== g),
        shapes: l.shapes.filter((s) => s.group !== g),
        doors: l.doors.filter(([a, b]) => a !== g && b !== g),
        rooms: l.rooms.filter((r) => r.group !== g)
      }));
    }
    setSelected(null);
  };

  const addRoom = () => {
    const group = newId('g');
    const shape: PlanShape = {
      id: newId('s'),
      group,
      x: Math.round((vb.x + vb.w / 2 - 80) / GRID) * GRID,
      y: Math.round((vb.y + vb.h / 2 - 60) / GRID) * GRID,
      w: 160,
      h: 120
    };
    change((l) => ({ ...l, groups: [...l.groups, { id: group, label: 'Nova prostorija', outdoor: false }], shapes: [...l.shapes, shape] }));
    setSelected(shape.id);
  };

  // Nova prostorija -> oznaka se vraća na podrazumevano mesto (ispod naziva).
  const assignRoom = (roomId: string, group: string) =>
    change((l) => ({
      ...l,
      rooms: [...l.rooms.filter((r) => r.roomId !== roomId), ...(group ? [{ roomId, group }] : [])]
    }));

  const resetMarkers = () => change((l) => ({ ...l, rooms: l.rooms.map((r) => ({ roomId: r.roomId, group: r.group })) }));

  const resetLabel = () =>
    selectedGroup &&
    change((l) => ({ ...l, groups: l.groups.map((g) => (g.id === selectedGroup.id ? { id: g.id, label: g.label, outdoor: g.outdoor } : g)) }));

  const resetToDraft = () => {
    if (!draft || !confirm('Zameniti trenutni raspored novim automatskim nacrtom? Izmene koje niste sačuvali se gube.')) return;
    setLayout(draft);
    setVb(viewBoxFor(draft));
    setSelected(null);
    setDirty(true);
  };

  const save = async (replaceCustom = false) => {
    if (!layout) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ slug, layout, replaceCustom })
      });
      const json = await res.json().catch(() => null);
      if (res.status === 409 && json?.needsConfirm) {
        setSaving(false);
        if (confirm('Ova tura već ima pravi tlocrt (sliku). Zameniti ga šematskim planom?')) await save(true);
        return;
      }
      if (!res.ok || !json?.success) {
        setMessage({ ok: false, text: json?.error || 'Plan nije sačuvan.' });
        return;
      }
      setDirty(false);
      setFromSaved(true);
      setTour((t) => (t ? { ...t, floorplanUrl: json.floorplanUrl, hasCustomPlan: false } : t));
      setMessage({
        ok: true,
        text: json.markersFailed ? `Plan je sačuvan, ali ${json.markersFailed} oznaka nije upisano.` : 'Plan je sačuvan i postavljen u turu.'
      });
    } catch {
      setMessage({ ok: false, text: 'Nema veze sa serverom.' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Prikaz -------------------------------------------------------------

  const wrap: React.CSSProperties = { minHeight: '100dvh', background: FORM.bg, color: FORM.textPrimary, fontFamily: FORM.fontBody, padding: '16px 14px 48px' };

  if (session === 'checking') return <main className="k-form" style={wrap}><FormThemeStyle />Provera pristupa...</main>;
  if (session === 'out') {
    return (
      <main className="k-form" style={wrap}>
        <FormThemeStyle />
        <p>Prvo se prijavite u <a href="/admin/ture">admin</a>, pa se vratite ovde.</p>
      </main>
    );
  }

  // Oko 12 px na ekranu, bez obzira na uvećanje plana.
  const unit = vb.w / svgWidth;
  const handle = 11 * unit;

  const panel: React.CSSProperties = { background: FORM.surface, border: `1px solid ${FORM.border}`, borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' };
  const small: React.CSSProperties = { ...formBtnStyle, padding: '7px 12px', fontSize: '13px' };

  return (
    <main className="k-form" style={wrap}>
      <FormThemeStyle />
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo />
            <div>
              <h1 style={{ fontSize: '17px', margin: 0, fontFamily: FORM.fontDisplay }}>Šematski plan</h1>
              <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>{tour?.title ?? slug}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/admin/ture" style={{ ...small, textDecoration: 'none' }}>← Ture</a>
            <a href={`/tour/${slug}`} target="_blank" rel="noreferrer" style={{ ...small, textDecoration: 'none' }}>Otvori turu</a>
          </div>
        </header>

        {loadError && <p style={{ color: FORM.danger }}>{loadError}</p>}
        {!layout && !loadError && <p>Učitavanje...</p>}

        {layout && (
          <>
            <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary, lineHeight: 1.5 }}>
              {fromSaved ? 'Otvoren je sačuvan plan.' : 'Ovo je automatski nacrt — ispravite ga prema stanu.'} Povucite prostoriju da je
              pomerite, a plave kružiće da joj promenite veličinu. Ivice se same lepe za susedne zidove. Nazive prostorija možete prevući, a oznake panorama
              (tačke sa brojem, spisak je ispod plana) prevucite tačno tamo gde je snimljena panorama — prevučena tačka postaje plava.
              {tour?.hasCustomPlan && ' Pažnja: tura već ima pravi tlocrt — čuvanje ga zamenjuje (pitaće vas).'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={addRoom} style={small}>＋ Nova prostorija</button>
              <button type="button" onClick={() => setVb(viewBoxFor(layout))} style={small}>⤢ Uklopi u ekran</button>
              <button type="button" onClick={resetToDraft} style={small}>↺ Novi automatski nacrt</button>
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || !dirty}
                style={{ ...small, marginLeft: 'auto', background: dirty ? FORM.accent : FORM.surface, color: dirty ? '#fff' : FORM.textSecondary, borderColor: dirty ? FORM.accent : FORM.border, fontWeight: 700 }}
              >
                {saving ? 'Čuvanje...' : dirty ? 'Sačuvaj plan' : 'Sačuvano'}
              </button>
            </div>
            {message && <p style={{ margin: 0, fontSize: '13.5px', color: message.ok ? FORM.success : FORM.danger }}>{message.text}</p>}

            <div style={{ background: '#fff', border: `1px solid ${FORM.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              <svg
                ref={svgRef}
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                style={{ display: 'block', width: '100%', height: 'min(70vh, 720px)', touchAction: 'none', userSelect: 'none', cursor: dragging ? 'grabbing' : 'default' }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={() => setSelected(null)}
              >
                <defs>
                  <pattern id="grid" width={GRID * 2} height={GRID * 2} patternUnits="userSpaceOnUse">
                    <path d={`M ${GRID * 2} 0 L 0 0 0 ${GRID * 2}`} fill="none" stroke="#EDEDE8" strokeWidth={1 * unit} />
                  </pattern>
                </defs>
                <style>{PLAN_STYLE}</style>
                <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#grid)" />
                <g style={{ pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: body }} />

                {layout.shapes.map((s) => (
                  <rect
                    key={s.id}
                    x={s.x}
                    y={s.y}
                    width={s.w}
                    height={s.h}
                    fill="transparent"
                    style={{ cursor: 'move' }}
                    onPointerDown={(e) => startDrag(e, s, 'move')}
                  />
                ))}

                {selectedShape && (
                  <g>
                    <rect
                      x={selectedShape.x}
                      y={selectedShape.y}
                      width={selectedShape.w}
                      height={selectedShape.h}
                      fill="rgba(30, 90, 168, 0.08)"
                      stroke="#1E5AA8"
                      strokeWidth={2 * unit}
                      strokeDasharray={`${6 * unit} ${4 * unit}`}
                      style={{ pointerEvents: 'none' }}
                    />
                    {(
                      [
                        { cx: 0, cy: 0, l: true, t: true },
                        { cx: 0.5, cy: 0, t: true },
                        { cx: 1, cy: 0, r: true, t: true },
                        { cx: 1, cy: 0.5, r: true },
                        { cx: 1, cy: 1, r: true, b: true },
                        { cx: 0.5, cy: 1, b: true },
                        { cx: 0, cy: 1, l: true, b: true },
                        { cx: 0, cy: 0.5, l: true }
                      ] as { cx: number; cy: number; l?: boolean; r?: boolean; t?: boolean; b?: boolean }[]
                    ).map((h, i) => (
                      <circle
                        key={i}
                        cx={selectedShape.x + selectedShape.w * h.cx}
                        cy={selectedShape.y + selectedShape.h * h.cy}
                        r={handle}
                        fill="#1E5AA8"
                        stroke="#fff"
                        strokeWidth={2 * unit}
                        style={{ cursor: h.l || h.r ? (h.t || h.b ? 'nwse-resize' : 'ew-resize') : 'ns-resize' }}
                        onPointerDown={(e) =>
                          startDrag(e, selectedShape, 'resize', { l: Boolean(h.l), r: Boolean(h.r), t: Boolean(h.t), b: Boolean(h.b) })
                        }
                      />
                    ))}
                  </g>
                )}

                {/* Natpisi prostorija - prevlače se kao i oznake. */}
                {layout.groups.map((g) => {
                  const a = labelArea(layout, g.id);
                  if (!a) return null;
                  return (
                    <rect
                      key={g.id}
                      x={a.x}
                      y={a.y}
                      width={a.w}
                      height={a.h}
                      rx={4 * unit}
                      fill="transparent"
                      stroke={g.lx !== undefined ? '#1E5AA8' : 'transparent'}
                      strokeWidth={1 * unit}
                      strokeDasharray={`${3 * unit} ${3 * unit}`}
                      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                      onPointerDown={(e) => startPointDrag(e, 'label', g.id, a.cx, a.cy)}
                    >
                      <title>Prevucite naziv</title>
                    </rect>
                  );
                })}

                {/* Oznake panorama - prevlače se na tačno mesto u prostoriji. */}
                {/* Broj u tački = broj panorame u listi "Panorame na planu". */}
                {markers.map((m) => (
                  <g
                    key={m.roomId}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    onPointerDown={(e) => startPointDrag(e, 'marker', m.roomId, m.x, m.y)}
                  >
                    <title>{roomTitle.get(m.roomId) ?? ''}</title>
                    <circle cx={m.x} cy={m.y} r={22 * unit} fill="transparent" />
                    <circle cx={m.x} cy={m.y} r={15 * unit} fill={m.manual ? '#1E5AA8' : '#fff'} stroke="#1E5AA8" strokeWidth={2.5 * unit} />
                    <text
                      x={m.x}
                      y={m.y + 1 * unit}
                      fontSize={16 * unit}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontFamily: 'Inter, Arial, sans-serif', fontWeight: 700, fill: m.manual ? '#fff' : '#1E5AA8', pointerEvents: 'none' }}
                    >
                      {roomNumber.get(m.roomId) ?? ''}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              <section style={panel}>
                <h2 style={{ fontSize: '14.5px', margin: 0 }}>Izabrana prostorija</h2>
                {!selectedShape || !selectedGroup ? (
                  <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>Dodirnite prostoriju na planu.</p>
                ) : (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: FORM.textSecondary }}>
                      Naziv
                      <input
                        value={selectedGroup.label}
                        onChange={(e) => setLabel(e.target.value)}
                        maxLength={60}
                        style={{ padding: '9px 10px', fontSize: '15px', borderRadius: '10px', border: `1px solid ${FORM.borderStrong}`, background: FORM.surface, color: FORM.textPrimary }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input type="checkbox" checked={selectedGroup.outdoor} onChange={(e) => setOutdoor(e.target.checked)} />
                      Spoljni prostor (terasa, balkon)
                    </label>
                    <div style={{ fontSize: '12.5px', color: FORM.textSecondary }}>Vrata ka:</div>
                    {adjacentGroups(layout, selectedGroup.id).length === 0 ? (
                      <p style={{ margin: 0, fontSize: '13px', color: FORM.textSecondary }}>Nijedna prostorija ne deli zid sa ovom.</p>
                    ) : (
                      adjacentGroups(layout, selectedGroup.id).map((gid) => {
                        const g = layout.groups.find((x) => x.id === gid)!;
                        const on = layout.doors.some(([a, b]) => doorKey(a, b) === doorKey(selectedGroup.id, gid));
                        const manyWalls = groupWalls(layout, selectedGroup.id, gid).length > 1;
                        return (
                          <div key={gid} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="checkbox" checked={on} onChange={(e) => toggleDoor(gid, e.target.checked)} />
                              {g.label}
                            </label>
                            {on && manyWalls && (
                              <button type="button" onClick={() => cycleDoorWall(gid)} style={{ ...small, padding: '3px 9px', fontSize: '12px' }}>
                                ↻ drugi zid
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={addPart} style={small} title="Za prostoriju u obliku slova L - npr. hodnik">
                        ＋ Dodaj deo (L-oblik)
                      </button>
                      {selectedGroup.lx !== undefined && (
                        <button type="button" onClick={resetLabel} style={small}>
                          ↺ Naziv na sredinu
                        </button>
                      )}
                      <button type="button" onClick={deleteSelected} style={{ ...small, color: FORM.danger }}>
                        {layout.shapes.filter((s) => s.group === selectedShape.group).length > 1 ? 'Obriši ovaj deo' : 'Obriši prostoriju'}
                      </button>
                    </div>
                  </>
                )}
              </section>

              <section style={panel}>
                <h2 style={{ fontSize: '14.5px', margin: 0 }}>Panorame na planu</h2>
                <p style={{ margin: 0, fontSize: '12.5px', color: FORM.textSecondary }}>
                  U kojoj prostoriji stoji oznaka svake panorame (klik na nju u turi vodi u tu panoramu). Tačno mesto
                  birate prevlačenjem oznake na planu.
                </p>
                {layout.rooms.some((r) => r.x !== undefined) && (
                  <button type="button" onClick={resetMarkers} style={{ ...small, alignSelf: 'flex-start' }}>
                    ↺ Vrati oznake ispod naziva
                  </button>
                )}
                {rooms.map((r, i) => {
                  const current = layout.rooms.find((x) => x.roomId === r.id)?.group ?? '';
                  return (
                    <label key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center', fontSize: '13.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{ flex: '0 0 auto', width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #1E5AA8', color: '#1E5AA8', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {i + 1}
                        </span>
                        {r.title}
                      </span>
                      <select
                        value={current}
                        onChange={(e) => assignRoom(r.id, e.target.value)}
                        style={{ padding: '7px 8px', borderRadius: '9px', border: `1px solid ${current ? FORM.borderStrong : FORM.danger}`, background: FORM.surface, color: FORM.textPrimary, fontSize: '13.5px' }}
                      >
                        <option value="">— bez oznake —</option>
                        {layout.groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.label}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
