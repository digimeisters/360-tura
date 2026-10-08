'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { polygonCenter, type Polygon, type UnitStatus } from '../../app/lib/projects';
import { floorLabel, formatArea, formatPrice, orientationText, PROJECT_TEXT, statusLabel, structureText, trackKey, type ProjectLang } from '../../app/lib/projectI18n';
import { trackSiteEvent } from '../../app/lib/track';
import type { DemoMedia } from '../../app/lib/projectData';
import PaymentCalculator from './PaymentCalculator';
import UnitMedia, { UnitRooms, UnitThumb } from './UnitMedia';
import UnitInquiry from './UnitInquiry';
import type { SelectorBuilding, SelectorFloor, SelectorProject, SelectorUnit, SelectorView } from './ProjectSelector';

/**
 * Izbor stana preko celog ekrana (računar, po uzoru na 3d.sokolis.rs):
 * fotografija zgrade preko celog prozora, stanovi obojeni po statusu
 * (zeleno slobodan, narandžasto rezervisan, crveno prodat), filteri u traci
 * na dnu, strelice za okretanje zgrade, kartica stana u fioci sa desne strane.
 *
 * Otvara se iz ProjectSelector-a (dugme „Ceo ekran" i „Izaberite stan" na
 * računaru); na telefonu ostaje obični izbor. Stanovi moraju biti iscrtani na
 * slici fasade (admin: „✨ Predloži stanove"); bez njih slika pokazuje
 * spratove, a klik na sprat otvara spisak stanova tog sprata.
 */

const TXT = {
  sr: {
    full: 'Ceo ekran',
    building: 'Zgrada',
    floorF: 'Sprat',
    area: 'Površina',
    rooms: 'Broj soba',
    status: 'Status',
    reset: 'Reset',
    resetAll: 'Poništi sve filtere',
    st: { available: 'Dostupni', reserved: 'Rezervisani', sold: 'Prodati' } as Record<UnitStatus, string>,
    match: (n: number, all: number) => `${n} od ${all} stanova odgovara`,
    free: (n: number) => `${n} slobodnih`,
    close: 'Zatvori',
    hint: 'Pređite mišem preko stana, kliknite za detalje',
    hintFloors: 'Kliknite sprat da vidite stanove',
    floorUnits: 'Stanovi na spratu'
  },
  en: {
    full: 'Full screen',
    building: 'Building',
    floorF: 'Floor',
    area: 'Size',
    rooms: 'Rooms',
    status: 'Status',
    reset: 'Reset',
    resetAll: 'Clear all filters',
    st: { available: 'Available', reserved: 'Reserved', sold: 'Sold' } as Record<UnitStatus, string>,
    match: (n: number, all: number) => `${n} of ${all} apartments match`,
    free: (n: number) => `${n} available`,
    close: 'Close',
    hint: 'Hover over an apartment, click for details',
    hintFloors: 'Click a floor to see its apartments',
    floorUnits: 'Apartments on this floor'
  }
};

/** Jače boje nego na svetloj kartici: preko fotografije moraju da se vide. */
const FS_COLORS: Record<UnitStatus, string> = {
  available: '#16A34A',
  reserved: '#F59E0B',
  sold: '#DC2626'
};
const STATUSES: UnitStatus[] = ['available', 'reserved', 'sold'];

/** „Dvoiposoban" → „2.5", „Lokal" → „L": kratko, kao dugmad 2 / 3 / 4 kod Sokolisa. */
const ROOM_WORDS: [RegExp, string][] = [
  [/^garsonjer|^studio/i, '0.5'],
  [/^jednoiposob|^1[.,]5/i, '1.5'],
  [/^jednosob|^1\b|^one/i, '1'],
  [/^dvoiposob|^2[.,]5/i, '2.5'],
  [/^dvosob|^2\b|^two/i, '2'],
  [/^troiposob|^3[.,]5/i, '3.5'],
  [/^trosob|^3\b|^three/i, '3'],
  [/^četvoroiposob|^cetvoroiposob|^4[.,]5/i, '4.5'],
  [/^četvorosob|^cetvorosob|^4\b|^four/i, '4'],
  [/^petosob|^5\b/i, '5'],
  [/^lokal|^shop|^poslovn/i, 'L']
];
export const shortStructure = (s: string) => ROOM_WORDS.find(([re]) => re.test(s.trim()))?.[1] ?? s.slice(0, 3);

/** Klizač sa dve ručice (od - do). Svetla varijanta (className "is-light") je u panelu filtera na telefonu. */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  format,
  className
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  label: string;
  format: (v: number) => string;
  className?: string;
}) {
  const span = max - min || 1;
  const a = ((value[0] - min) / span) * 100;
  const b = ((value[1] - min) / span) * 100;
  return (
    <div className={className ? `fs-range ${className}` : "fs-range"}>
      <div className="fs-range-track">
        <i style={{ left: `${a}%`, width: `${b - a}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          aria-label={`${label} od`}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          aria-label={`${label} do`}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
        />
      </div>
      <span className="fs-range-val">
        {format(value[0])} – {format(value[1])}
      </span>
    </div>
  );
}

export default function FacadeFullscreen({
  project,
  floors,
  units,
  buildings,
  views,
  lang,
  letakBase,
  demoMedia,
  startBuildingId,
  onClose,
  onList
}: {
  project: SelectorProject;
  floors: SelectorFloor[];
  units: SelectorUnit[];
  buildings: SelectorBuilding[];
  views: SelectorView[];
  lang: ProjectLang;
  letakBase: string | null;
  demoMedia: DemoMedia | null;
  startBuildingId: string | null;
  onClose: () => void;
  onList: () => void;
}) {
  const t = PROJECT_TEXT[lang];
  const x = TXT[lang];
  const isComplex = buildings.length > 1;
  const [buildingId, setBuildingId] = useState<string | null>(startBuildingId ?? (buildings.length === 1 ? buildings[0].id : null));
  const [viewIdx, setViewIdx] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<Record<string, [number, number]>>({});
  const [win, setWin] = useState<[number, number]>([1600, 900]);
  const rootRef = useRef<HTMLDivElement>(null);
  // Traka sa filterima dole (fs-bar) je preko slike, ne ispod nje - na niskom
  // ekranu (npr. 13" laptop) bi prekrila donje spratove. Njena visina se meri
  // (prelama se u više redova na uskom/niskom prozoru) i oduzima od prostora
  // za sliku, da zgrada uvek stane cela iznad trake.
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);

  const floorById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);
  const levels = useMemo(() => [...new Set(floors.map((f) => f.level))].sort((a, b) => a - b), [floors]);
  const areas = units.filter((u) => u.areaSqm).map((u) => u.areaSqm as number);
  const areaMin = areas.length ? Math.floor(Math.min(...areas)) : 0;
  const areaMax = areas.length ? Math.ceil(Math.max(...areas)) : 0;
  const structures = useMemo(() => {
    const avg = new Map<string, number[]>();
    for (const u of units) if (u.structure) avg.set(u.structure, [...(avg.get(u.structure) ?? []), u.areaSqm ?? 0]);
    const mean = (k: string) => avg.get(k)!.reduce((a, b) => a + b, 0) / avg.get(k)!.length;
    return [...avg.keys()].sort((a, b) => mean(a) - mean(b));
  }, [units]);

  const fullLevels: [number, number] = [levels[0] ?? 0, levels[levels.length - 1] ?? 0];
  const [floorRange, setFloorRange] = useState<[number, number]>(fullLevels);
  const [areaRange, setAreaRange] = useState<[number, number]>([areaMin, areaMax]);
  const [rooms, setRooms] = useState<string[]>([]);
  // Prazno = bez filtera (prikazuju se svi); prvi klik na status ga izoluje (vidi handler dole).
  const [statuses, setStatuses] = useState<UnitStatus[]>([]);

  const levelOf = (u: SelectorUnit) => floorById.get(u.floorId)?.level ?? 0;
  const areaFull = areaRange[0] <= areaMin && areaRange[1] >= areaMax;
  const matches = (u: SelectorUnit) =>
    levelOf(u) >= floorRange[0] &&
    levelOf(u) <= floorRange[1] &&
    (areaFull || (u.areaSqm !== null && u.areaSqm >= areaRange[0] && u.areaSqm <= areaRange[1])) &&
    (!rooms.length || (u.structure !== null && rooms.includes(u.structure))) &&
    (!statuses.length || statuses.includes(u.status));
  const anyFilter =
    floorRange[0] !== fullLevels[0] || floorRange[1] !== fullLevels[1] || !areaFull || rooms.length > 0 || statuses.length > 0;
  const resetFilters = () => {
    setFloorRange(fullLevels);
    setAreaRange([areaMin, areaMax]);
    setRooms([]);
    setStatuses([]);
  };

  // Zaključan skrol strane, Esc zatvara (prvo karticu, pa ceo prikaz), veličina prozora za uklapanje slike.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    const size = () => setWin([window.innerWidth, window.innerHeight]);
    size();
    window.addEventListener('resize', size);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('resize', size);
    };
  }, []);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const escRef = useRef<() => void>(() => {});
  useEffect(() => {
    escRef.current = () => {
      if (unitId || floorId) {
        setUnitId(null);
        setFloorId(null);
      } else onClose();
    };
  });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') escRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const atComplex = isComplex && buildingId === null;
  const list = atComplex
    ? views.filter((v) => v.kind === 'site')
    : views.filter((v) => v.kind === 'building' && (buildings.length ? v.buildingId === buildingId : true));
  const key = atComplex ? 'site' : (buildingId ?? 'main');
  const i = Math.min(viewIdx[key] ?? 0, Math.max(0, list.length - 1));
  const view = list[i] ?? null;
  const go = (d: number) => setViewIdx((all) => ({ ...all, [key]: (i + d + list.length) % list.length }));

  // Prirodna veličina slike, da oblici (udeo slike) tačno leže preko nje.
  useEffect(() => {
    if (!view || imgSize[view.imageUrl]) return;
    const img = new Image();
    img.onload = () => setImgSize((all) => ({ ...all, [view.imageUrl]: [img.naturalWidth, img.naturalHeight] }));
    img.src = view.imageUrl;
  }, [view, imgSize]);
  const [W, H] = (view && imgSize[view.imageUrl]) ?? [1600, 900];
  const drawerOpen = Boolean(unitId || floorId);
  const drawerW = Math.min(440, Math.round(win[0] * 0.92));
  const viewW = Math.max(320, drawerOpen ? win[0] - drawerW : win[0]);
  // Visina dostupna slici: ceo prozor minus traka sa filterima dole (kad je vidljiva).
  const stageH = Math.max(1, win[1] - (drawerOpen ? 0 : barH));
  // Popuni ekran kad se odseca malo (do 18 %), inače cela slika sa zamućenom pozadinom.
  const arImg = W / H;
  const arWin = viewW / stageH;
  const fit = Math.min(arImg / arWin, arWin / arImg) >= 0.82 ? 'xMidYMid slice' : 'xMidYMid meet';

  const unitsOfBuilding = (bid: string) => units.filter((u) => floorById.get(u.floorId)?.buildingId === bid);
  const unit = units.find((u) => u.id === unitId) ?? null;
  const floor = floorId ? (floorById.get(floorId) ?? null) : null;
  const buildingName = (id: string | null) => buildings.find((b) => b.id === id)?.name ?? '';
  const fName = (f: SelectorFloor) => floorLabel(f.level, f.label, lang);
  const fShort = (level: number) => (level === 0 ? (lang === 'en' ? 'G' : 'P') : String(level));
  const scope = atComplex ? units : buildings.length ? unitsOfBuilding(buildingId!) : units;
  const matchCount = scope.filter(matches).length;

  const openUnit = (u: SelectorUnit) => {
    setUnitId(u.id);
    setFloorId(u.floorId);
    setHover(null);
    trackSiteEvent('cta_click', trackKey('pu', project.slug, u.code));
  };
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
  const hoverAt = (id: string) => ({
    onMouseMove: (e: React.MouseEvent) => setHover({ id, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => setHover(null)
  });
  const pts = (poly: Polygon) => poly.map(([px, py]) => `${px * W},${py * H}`).join(' ');

  // ---------- oblici na slici ----------
  const shapes = view?.shapes ?? [];
  const unitShapes = atComplex ? [] : shapes.filter((s) => s.target === 'unit' && units.some((u) => u.id === s.id));
  const floorShapes = atComplex || unitShapes.length ? [] : shapes.filter((s) => s.target === 'floor' && floorById.has(s.id));
  const buildingShapes = atComplex ? shapes.filter((s) => s.target === 'building' && buildings.some((b) => b.id === s.id)) : [];

  const polys = (
    <>
      {buildingShapes.map((s) => {
        const free = unitsOfBuilding(s.id).filter((u) => u.status === 'available' && matches(u)).length;
        const on = hover?.id === s.id;
        return (
          <polygon
            key={s.id}
            className="fs-poly"
            points={pts(s.polygon)}
            fill={free ? FS_COLORS.available : '#64748B'}
            fillOpacity={on ? 0.6 : 0.35}
            stroke="#FFFFFF"
            strokeWidth={on ? 3 : 1.5}
            vectorEffect="non-scaling-stroke"
            role="button"
            tabIndex={0}
            aria-label={`${buildingName(s.id)}, ${free ? t.freeLong(free) : t.none}`}
            onClick={() => setBuildingId(s.id)}
            onKeyDown={onKey(() => setBuildingId(s.id))}
            {...hoverAt(s.id)}
          />
        );
      })}
      {floorShapes.map((s) => {
        const f = floorById.get(s.id)!;
        const fu = units.filter((u) => u.floorId === f.id);
        const free = fu.filter((u) => u.status === 'available' && matches(u)).length;
        const dim = anyFilter && !fu.some(matches);
        const on = hover?.id === f.id || floorId === f.id;
        return (
          <polygon
            key={s.id}
            className="fs-poly"
            points={pts(s.polygon)}
            fill={dim ? '#FFFFFF' : free ? FS_COLORS.available : FS_COLORS.sold}
            fillOpacity={dim ? 0.06 : on ? 0.62 : 0.38}
            stroke="#FFFFFF"
            strokeWidth={on ? 3 : 1.2}
            vectorEffect="non-scaling-stroke"
            role="button"
            tabIndex={0}
            aria-label={`${fName(f)}, ${free ? t.freeLong(free) : t.none}`}
            onClick={() => {
              setFloorId(f.id);
              setUnitId(null);
            }}
            onKeyDown={onKey(() => setFloorId(f.id))}
            {...hoverAt(f.id)}
          />
        );
      })}
      {unitShapes.map((s) => {
        const u = units.find((y) => y.id === s.id)!;
        const ok = matches(u);
        const on = hover?.id === u.id || unitId === u.id;
        return (
          <polygon
            key={s.id}
            className="fs-poly"
            points={pts(s.polygon)}
            fill={ok ? FS_COLORS[u.status] : '#FFFFFF'}
            fillOpacity={ok ? (on ? 0.72 : 0.46) : 0.05}
            stroke="#FFFFFF"
            strokeOpacity={ok ? 0.95 : 0.45}
            strokeWidth={unitId === u.id ? 4 : on ? 3 : 1.2}
            vectorEffect="non-scaling-stroke"
            role="button"
            tabIndex={0}
            aria-label={`${t.unit} ${u.code}, ${statusLabel(u.status, lang)}`}
            onClick={() => openUnit(u)}
            onKeyDown={onKey(() => openUnit(u))}
            {...hoverAt(u.id)}
          />
        );
      })}
    </>
  );

  // Natpisi lamela i spratova (stanovi imaju oblačić na prelaz mišem).
  const tags = [
    ...buildingShapes.map((s) => ({ id: s.id, poly: s.polygon, text: buildingName(s.id) })),
    ...floorShapes.map((s) => ({ id: s.id, poly: s.polygon, text: fShort(floorById.get(s.id)!.level) }))
  ];
  const toScreen = ([px, py]: [number, number]) => {
    // Ista računica kao preserveAspectRatio, da natpis stoji na obliku.
    const scale = fit === 'xMidYMid slice' ? Math.max(viewW / W, stageH / H) : Math.min(viewW / W, stageH / H);
    return [(viewW - W * scale) / 2 + px * W * scale, (stageH - H * scale) / 2 + py * H * scale];
  };

  // ---------- oblačić ----------
  const tip = (() => {
    if (!hover) return null;
    const u = units.find((y) => y.id === hover.id);
    const f = floorById.get(hover.id);
    const b = buildings.find((y) => y.id === hover.id);
    let title = '';
    let lines: string[] = [];
    let badge: UnitStatus | null = null;
    if (u) {
      const uf = floorById.get(u.floorId);
      title = `${t.unit} ${u.code}`;
      lines = [
        [isComplex ? buildingName(uf?.buildingId ?? null) : null, uf ? fName(uf) : null].filter(Boolean).join(' · '),
        [structureText(u.structure, lang), u.areaSqm ? formatArea(u.areaSqm, lang) : null].filter(Boolean).join(' · ')
      ];
      if (u.status !== 'sold' && u.price) lines.push(formatPrice(u.price, lang));
      badge = u.status;
    } else if (f) {
      const fu = units.filter((y) => y.floorId === f.id);
      title = fName(f);
      lines = [x.free(fu.filter((y) => y.status === 'available').length) + ` / ${fu.length}`];
    } else if (b) {
      const bu = unitsOfBuilding(b.id);
      title = b.name;
      lines = [x.free(bu.filter((y) => y.status === 'available').length) + ` / ${bu.length}`];
    } else return null;
    const left = Math.min(hover.x + 18, win[0] - 250);
    const top = Math.min(hover.y + 18, win[1] - 170);
    return (
      <div className="fs-tip" style={{ left, top }}>
        <b>{title}</b>
        {lines.filter(Boolean).map((l) => (
          <span key={l}>{l}</span>
        ))}
        {badge && (
          <i className="fs-tip-badge" style={{ background: FS_COLORS[badge] }}>
            {statusLabel(badge, lang)}
          </i>
        )}
      </div>
    );
  })();

  // ---------- fioka: stan ili spisak stanova sprata ----------
  let drawer = null;
  if (unit) {
    const uf = floorById.get(unit.floorId)!;
    const sqm = unit.price && unit.areaSqm ? Math.round(unit.price / unit.areaSqm) : null;
    const fallbackPlan = !unit.planUrl && uf.planUrl && unit.polygon ? { src: uf.planUrl, polygon: unit.polygon } : null;
    const hasMedia = Boolean(demoMedia || unit.planUrl || fallbackPlan || unit.plan3dUrl || unit.photos.length || unit.tourHref);
    const unitPage = letakBase ? `${letakBase}/${encodeURIComponent(unit.code)}` : null;
    drawer = (
      <>
        <div className="inv-unit-head">
          <span className="inv-eyebrow">
            {[isComplex ? buildingName(uf.buildingId) : null, fName(uf), orientationText(unit.orientation, lang)].filter(Boolean).join(' · ')}
          </span>
          <span className="fs-badge" style={{ background: FS_COLORS[unit.status] }}>
            {statusLabel(unit.status, lang)}
          </span>
        </div>
        <div className="inv-title">
          {t.unit} {unit.code}
        </div>
        {unit.structure && <p className="inv-muted">{structureText(unit.structure, lang)}</p>}
        {/* Sa stranom stana fioka je kratak pregled; sve kartice, prostorije, PDF i plan plaćanja su na strani stana. */}
        {unitPage ? (
          <UnitThumb href={unitPage} planUrl={unit.planUrl} plan3dUrl={unit.plan3dUrl} fallbackPlan={fallbackPlan} code={unit.code} lang={lang} />
        ) : (
          hasMedia && (
            <UnitMedia
              key={`fs-media-${unit.id}`}
              planUrl={unit.planUrl}
              plan3dUrl={unit.plan3dUrl}
              photos={unit.photos}
              tourHref={unit.tourHref}
              code={unit.code}
              lang={lang}
              fallbackPlan={fallbackPlan}
              demo={demoMedia}
            />
          )
        )}
        <div className="inv-facts">
          <div>
            <small>{t.area}</small>
            <b>{formatArea(unit.areaSqm, lang)}</b>
          </div>
          <div>
            <small>{t.terrace}</small>
            <b>{formatArea(unit.terraceSqm, lang)}</b>
          </div>
          <div>
            <small>{t.structure}</small>
            <b>{structureText(unit.structure, lang) || '—'}</b>
          </div>
          <div>
            <small>{t.orientation}</small>
            <b>{orientationText(unit.orientation, lang) || '—'}</b>
          </div>
        </div>
        <div className="inv-price">
          <span>
            {unit.status === 'sold' ? t.soldNote : t.price}
            {unit.status !== 'sold' && sqm ? (
              <small style={{ display: 'block', fontSize: '.78rem' }}>
                {formatPrice(sqm, lang)} {t.perSqm}
              </small>
            ) : null}
          </span>
          <b>{unit.status === 'sold' ? '—' : unit.price ? formatPrice(unit.price, lang) : t.onRequest}</b>
        </div>
        {unitPage ? (
          <>
            <a className="inv-open" href={unitPage} data-track="cta:project_unit_page">
              {t.openUnitPage(unit.code)} <span aria-hidden="true">→</span>
            </a>
            {unit.tourHref && (
              <a
                className="inv-cta is-out"
                href={lang === 'en' ? `${unit.tourHref}?lang=en` : unit.tourHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 10, textDecoration: 'none' }}
                data-track="cta:project_unit_tour"
              >
                360° {t.walk} ↗
              </a>
            )}
          </>
        ) : (
          <>
            <UnitRooms rooms={unit.rooms} lang={lang} />
            {unit.status !== 'sold' && unit.price ? <PaymentCalculator key={`fs-pay-${unit.id}`} price={unit.price} lang={lang} /> : null}
          </>
        )}
        <UnitInquiry
          key={`fs-inq-${unit.id}`}
          slug={project.slug}
          projectTitle={project.title}
          unitId={unit.id}
          code={unit.code}
          status={unit.status}
          where={[isComplex ? buildingName(uf.buildingId) : null, floorLabel(uf.level, uf.label, 'sr')].filter(Boolean).join(' · ')}
          lang={lang}
        />
      </>
    );
  } else if (floor) {
    const fu = units.filter((u) => u.floorId === floor.id).sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }));
    drawer = (
      <>
        <span className="inv-eyebrow">{[isComplex ? buildingName(floor.buildingId) : null, x.floorUnits].filter(Boolean).join(' · ')}</span>
        <div className="inv-title">{fName(floor)}</div>
        <div className="inv-list" style={{ marginTop: 14 }}>
          {fu.map((u) => (
            <button key={u.id} type="button" className="inv-frow" style={{ opacity: matches(u) ? 1 : 0.45 }} onClick={() => openUnit(u)}>
              <span className="inv-frow-n" style={{ background: FS_COLORS[u.status], color: '#FFFFFF' }}>
                {u.code}
              </span>
              <span className="inv-frow-main">
                <b>
                  {t.unit} {u.code}
                </b>
                <small>
                  {[structureText(u.structure, lang), u.areaSqm ? formatArea(u.areaSqm, lang) : null, u.status !== 'sold' && u.price ? formatPrice(u.price, lang) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <span className="fs-badge" style={{ background: FS_COLORS[u.status] }}>
                {statusLabel(u.status, lang)}
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const back = () => {
    if (!atComplex && isComplex) {
      setBuildingId(null);
      setUnitId(null);
      setFloorId(null);
    } else onClose();
  };

  return (
    <div className="inv-fs" ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${project.title} - ${x.building}`}>
      {view && <div className="fs-bg" style={{ backgroundImage: `url(${view.imageUrl})` }} aria-hidden="true" />}
      <div className="fs-view" style={{ right: drawerOpen ? drawerW : 0, bottom: drawerOpen ? 0 : barH }}>
        {view && (
          <svg className="fs-stage" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio={fit}>
            <image href={view.imageUrl} width={W} height={H} />
            {polys}
          </svg>
        )}
        {tags.map((tg) => {
          const [cx, cy] = polygonCenter(tg.poly);
          const [sx, sy] = toScreen([cx, cy]);
          return (
            <span key={`tg-${tg.id}`} className="fs-tag" style={{ left: sx, top: sy }}>
              {tg.text}
            </span>
          );
        })}
        {list.length > 1 && (
          <>
            <button type="button" className="fs-rot is-l" aria-label={t.rotatePrev} onClick={() => go(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button type="button" className="fs-rot is-r" aria-label={t.rotateNext} onClick={() => go(1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
      {tip}

      <div className="fs-top" style={{ right: drawerOpen ? drawerW : 0 }}>
        <button type="button" className="fs-back" onClick={back} aria-label={!atComplex && isComplex ? t.complex : x.close}>
          <span aria-hidden="true">‹</span> {!atComplex && isComplex ? buildingName(buildingId) : project.title}
        </button>
        <span className="fs-count" aria-live="polite">
          {anyFilter ? x.match(matchCount, scope.length) : unitShapes.length ? x.hint : floorShapes.length ? x.hintFloors : ''}
        </span>
        <div className="fs-modes">
          <button type="button" onClick={onList}>
            {t.tabList.split(' ')[0].toUpperCase()}
          </button>
          <button type="button" className="is-on" aria-pressed="true">
            {x.building.toUpperCase()}
          </button>
          <button type="button" className="fs-x" onClick={onClose} aria-label={x.close}>
            ×
          </button>
        </div>
      </div>

      {/* Dok je kartica otvorena, filteri se sklanjaju (i dalje važe) - slika ostaje vidljiva. */}
      <div className="fs-bar" ref={barRef} role="group" aria-label={t.filters} hidden={drawerOpen}>
        {levels.length > 1 && (
          <div className="fs-grp">
            <label>{x.floorF}:</label>
            <RangeSlider min={fullLevels[0]} max={fullLevels[1]} value={floorRange} onChange={setFloorRange} label={x.floorF} format={fShort} />
          </div>
        )}
        {areaMax > areaMin && (
          <div className="fs-grp">
            <label>{x.area}:</label>
            <RangeSlider
              min={areaMin}
              max={areaMax}
              value={areaRange}
              onChange={setAreaRange}
              label={x.area}
              format={(v) => `${v} m²`}
            />
          </div>
        )}
        {structures.length > 1 && (
          <div className="fs-grp">
            <label>{x.rooms}:</label>
            <div className="fs-chips">
              {structures.map((s) => (
                <button
                  key={s}
                  type="button"
                  title={structureText(s, lang) ?? s}
                  aria-pressed={rooms.includes(s)}
                  onClick={() => setRooms((r) => (r.includes(s) ? r.filter((y) => y !== s) : [...r, s]))}
                >
                  {shortStructure(s)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="fs-grp">
          <label>{x.status}:</label>
          <div className="fs-sts">
            {STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={statuses.includes(st)}
                onClick={() =>
                  setStatuses((all) => {
                    const next = all.includes(st) ? all.filter((y) => y !== st) : [...all, st];
                    return next.length === STATUSES.length ? [] : next;
                  })
                }
              >
                <i style={{ background: FS_COLORS[st] }} />
                {x.st[st]}
              </button>
            ))}
          </div>
        </div>
        <div className="fs-grp">
          <label>{x.reset}:</label>
          <button type="button" className="fs-reset" disabled={!anyFilter} onClick={resetFilters}>
            {x.resetAll}
          </button>
        </div>
      </div>

      {drawer && (
        <aside className="fs-drawer" style={{ width: drawerW }} aria-live="polite">
          <button
            type="button"
            className="fs-drawer-x"
            aria-label={x.close}
            onClick={() => {
              if (unit && floor && !unitShapes.length) setUnitId(null);
              else {
                setUnitId(null);
                setFloorId(null);
              }
            }}
          >
            ×
          </button>
          {drawer}
        </aside>
      )}
    </div>
  );
}
