'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { polygonCenter, UNIT_STATUS_COLORS, type Polygon, type UnitStatus } from '../../app/lib/projects';
import {
  floorFrom,
  floorLabel,
  formatArea,
  formatPrice,
  orientationText,
  PROJECT_TEXT,
  statusLabel,
  structureText,
  trackKey,
  type ProjectLang
} from '../../app/lib/projectI18n';
import { trackSiteEvent } from '../../app/lib/track';
import PaymentCalculator from './PaymentCalculator';
import UnitMedia, { UnitRooms } from './UnitMedia';
import UnitInquiry from './UnitInquiry';
import FacadeFullscreen, { RangeSlider, shortStructure } from './FacadeFullscreen';
import type { DemoMedia } from '../../app/lib/projectData';

/**
 * Izbor stana na javnoj strani projekta (/novogradnja/[slug], engleski na
 * /en/novogradnja/[slug], i ugradnja):
 *
 *   [kompleks iz vazduha -> lamela] -> fasada -> sprat -> stan -> upit
 *
 * - Kompleks (migracija 025): kad projekat ima 2+ lamele, prvo se bira
 *   lamela - na slici iz vazduha ili iz spiska.
 * - Fasada: više slika iste zgrade = rotacija strelicama (ili prevlačenjem
 *   na telefonu). Na slici mogu biti spratovi, stanovi ili oboje; klik na
 *   stan na fasadi odmah otvara karticu stana.
 * - „Lista": svi stanovi u tabeli sa filterima i sortiranjem.
 *
 * Isti izgled kao primer na /za-investitore (klase .inv-*,
 * components/projekat/selectorStyles.ts). Bez slika radi i samo spisak.
 *
 * Merenje (izveštaj po stanu u adminu): otvaranje strane = cta_click
 * `pv:<slug>`, otvaranje stana = `pu:<slug>:<oznaka>` (vidi trackKey).
 */

export type SelectorFloor = {
  id: string;
  level: number;
  label: string | null;
  /** Lamela (migracija 025); null = projekat bez lamela. */
  buildingId: string | null;
  planUrl: string | null;
  /** Link ka turi "pogled sa sprata" (dron), ako postoji i objavljena je. */
  viewHref: string | null;
};

export type SelectorUnit = {
  id: string;
  floorId: string;
  code: string;
  structure: string | null;
  areaSqm: number | null;
  terraceSqm: number | null;
  orientation: string | null;
  price: number | null;
  status: UnitStatus;
  /** Oblik na osnovi sprata. */
  polygon: Polygon | null;
  /** Link ka 360° turi stana, ako postoji i objavljena je. */
  tourHref: string | null;
  tourPreview: string | null;
  /** Kartica stana (migracija 024): osnova, 3D osnova, slike, prostorije. */
  planUrl: string | null;
  plan3dUrl: string | null;
  photos: string[];
  rooms: { name: string; m2: number }[];
};

export type SelectorBuilding = { id: string; name: string };

export type SelectorShape = {
  target: 'building' | 'floor' | 'unit';
  id: string;
  polygon: Polygon;
};

/** Slika projekta: 'site' = kompleks iz vazduha, 'building' = fasada (više = rotacija). */
export type SelectorView = {
  id: string;
  kind: 'site' | 'building';
  buildingId: string | null;
  label: string | null;
  imageUrl: string;
  shapes: SelectorShape[];
};

export type SelectorProject = {
  slug: string;
  title: string;
  developer: string | null;
  address: string | null;
  city: string | null;
  moveIn: string | null;
};

type SortKey = 'code' | 'building' | 'floor' | 'structure' | 'area' | 'terrace' | 'price' | 'sqm' | 'status';

const PRICE_STEPS = [50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 120_000, 150_000, 200_000, 250_000, 300_000];
const AREA_STEPS = [30, 40, 50, 60, 70, 80, 100, 120];
const STATUS_ORDER: Record<UnitStatus, number> = {
  available: 0,
  reserved: 1,
  sold: 2
};
/** Panel filtera na telefonu. */
const MOBILE_TXT = {
  sr: {
    filters: 'Filteri',
    rooms: 'Broj soba',
    reset: 'Poništi',
    close: 'Zatvori',
    remove: 'Ukloni filter',
    noStatus: 'nijedan status',
    count: (n: number) => `${n} ${n === 1 ? 'stan' : 'stanova'}`,
    of: (n: number, all: number) => `${n} od ${all}`,
    show: (n: number) => `Prikaži ${n} ${n === 1 ? 'stan' : 'stanova'}`
  },
  en: {
    filters: 'Filters',
    rooms: 'Rooms',
    reset: 'Clear',
    close: 'Close',
    remove: 'Remove filter',
    noStatus: 'no status',
    count: (n: number) => `${n} ${n === 1 ? 'apartment' : 'apartments'}`,
    of: (n: number, all: number) => `${n} of ${all}`,
    show: (n: number) => `Show ${n} ${n === 1 ? 'apartment' : 'apartments'}`
  }
};
const pts = (poly: Polygon) => poly.map(([x, y]) => `${x},${y}`).join(' ');
const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches;

export default function ProjectSelector({
  project,
  floors,
  units,
  buildings = [],
  views = [],
  embedded = false,
  lang = 'sr',
  letakBase = null,
  demoMedia = null
}: {
  project: SelectorProject;
  floors: SelectorFloor[];
  units: SelectorUnit[];
  buildings?: SelectorBuilding[];
  views?: SelectorView[];
  /** Ugrađeno na sajt investitora (/novogradnja/[slug]/ugradnja) - upit to javlja na Telegramu. */
  embedded?: boolean;
  lang?: ProjectLang;
  /** Npr. „/novogradnja/<slug>/stan" - odatle „/<oznaka>/letak" (PDF letak). Null = bez dugmeta (pregled pre objave). */
  letakBase?: string | null;
  /** Prezentacija (migracija 026): sve kartice stana, prazne popunjene demo sadržajem. */
  demoMedia?: DemoMedia | null;
}) {
  const t = PROJECT_TEXT[lang];
  const isComplex = buildings.length > 1;
  const [mode, setMode] = useState<'building' | 'list'>('building');
  // Jedna lamela = odmah njena fasada; više lamela = prvo kompleks (null).
  const [buildingId, setBuildingId] = useState<string | null>(buildings.length === 1 ? buildings[0].id : null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  // Stan izabran na fasadi (ili sprat bez osnove): pozornica ostaje na fasadi.
  const [onFacade, setOnFacade] = useState(false);
  const [viewIdx, setViewIdx] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [structure, setStructure] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [listFloor, setListFloor] = useState<number | null>(null);
  const [listBuilding, setListBuilding] = useState<string | null>(null);
  // Telefon (panel „Filteri"): klizači od-do, više struktura, statusi. null = bez ograničenja.
  const [floorRange, setFloorRange] = useState<[number, number] | null>(null);
  const [areaRange, setAreaRange] = useState<[number, number] | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<UnitStatus[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'floor',
    dir: 1
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const swipeX = useRef<number | null>(null);
  // Ceo ekran (FacadeFullscreen): samo računar, samo kad ima slike zgrade; u ugradnji (iframe) ne.
  const [full, setFull] = useState(false);
  const canFull = !embedded && views.some((v) => v.kind === 'building');

  useEffect(() => {
    trackSiteEvent('cta_click', trackKey('pv', project.slug));
  }, [project.slug]);

  // Računar: „Izaberite stan" (link na #izbor) i adresa sa #ceo-ekran (link za prezentaciju) otvaraju izbor preko celog ekrana.
  useEffect(() => {
    if (!canFull) return;
    const sync = () => {
      if (window.location.hash === '#ceo-ekran' && !narrow()) setFull(true);
    };
    sync();
    window.addEventListener('hashchange', sync);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#izbor"]');
      if (a && !narrow()) setFull(true);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', sync);
    };
  }, [canFull]);

  // Panel filtera na telefonu: strana se ne pomera ispod njega, Esc ga zatvara.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheet]);

  // „#lista" u adresi (dugme „Lista svih stanova" u vrhu strane) otvara listu.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#lista') setMode('list');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const floorById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);
  const buildingName = (id: string | null) => buildings.find((b) => b.id === id)?.name ?? '';
  const buildingOfUnit = (u: SelectorUnit) => floorById.get(u.floorId)?.buildingId ?? null;

  // Strukture od najmanje ka najvećoj (prosečna kvadratura), ne po abecedi.
  const structures = useMemo(() => {
    const avg = new Map<string, number[]>();
    for (const u of units) if (u.structure) avg.set(u.structure, [...(avg.get(u.structure) ?? []), u.areaSqm ?? 0]);
    const mean = (k: string) => avg.get(k)!.reduce((a, b) => a + b, 0) / avg.get(k)!.length;
    return [...avg.keys()].sort((a, b) => mean(a) - mean(b) || a.localeCompare(b, 'sr'));
  }, [units]);
  // Ponuđeni pragovi samo u opsegu stvarnih cena i kvadratura, da filter ne nudi prazne izbore.
  const priceOptions = useMemo(() => {
    const prices = units.filter((u) => u.status !== 'sold' && u.price).map((u) => u.price as number);
    if (prices.length < 2) return [];
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return PRICE_STEPS.filter((p) => p > lo && p < hi);
  }, [units]);
  const areaOptions = useMemo(() => {
    const areas = units.filter((u) => u.areaSqm).map((u) => u.areaSqm as number);
    if (areas.length < 2) return [];
    const lo = Math.min(...areas);
    const hi = Math.max(...areas);
    return AREA_STEPS.filter((a) => a > lo && a < hi);
  }, [units]);

  // Opsezi za klizače na telefonu (stvarne vrednosti projekta).
  const levelSpan = useMemo<[number, number]>(() => {
    const ls = floors.map((f) => f.level);
    return ls.length ? [Math.min(...ls), Math.max(...ls)] : [0, 0];
  }, [floors]);
  const areaSpan = useMemo<[number, number]>(() => {
    const as = units.filter((u) => u.areaSqm).map((u) => u.areaSqm as number);
    return as.length ? [Math.floor(Math.min(...as)), Math.ceil(Math.max(...as))] : [0, 0];
  }, [units]);
  const priceSpan = useMemo<[number, number]>(() => {
    const ps = units.filter((u) => u.status !== 'sold' && u.price).map((u) => u.price as number);
    return ps.length > 1 ? [Math.floor(Math.min(...ps) / 5000) * 5000, Math.ceil(Math.max(...ps) / 5000) * 5000] : [0, 0];
  }, [units]);

  const levelOfUnit = (u: SelectorUnit) => floorById.get(u.floorId)?.level ?? 0;
  const matches = (u: SelectorUnit) =>
    (structure === null || u.structure === structure) &&
    (maxPrice === null || (u.price !== null && u.price <= maxPrice && u.status !== 'sold')) &&
    (minArea === null || (u.areaSqm !== null && u.areaSqm >= minArea)) &&
    (!onlyFree || u.status === 'available') &&
    (floorRange === null || (levelOfUnit(u) >= floorRange[0] && levelOfUnit(u) <= floorRange[1])) &&
    (areaRange === null || (u.areaSqm !== null && u.areaSqm >= areaRange[0] && u.areaSqm <= areaRange[1])) &&
    (!rooms.length || (u.structure !== null && rooms.includes(u.structure))) &&
    (statuses === null || statuses.includes(u.status));
  const anyFilter =
    structure !== null ||
    maxPrice !== null ||
    minArea !== null ||
    onlyFree ||
    floorRange !== null ||
    areaRange !== null ||
    rooms.length > 0 ||
    statuses !== null;

  // Trenutna zgrada: spratovi, stanovi i slike samo te lamele.
  const inBuilding = (f: SelectorFloor) => (buildings.length ? f.buildingId === buildingId : true);
  const bFloors = floors.filter(inBuilding);
  const floorsDesc = [...bFloors].sort((a, b) => b.level - a.level);
  const bFloorIds = new Set(bFloors.map((f) => f.id));
  const bUnits = units.filter((u) => bFloorIds.has(u.floorId));
  const siteViews = views.filter((v) => v.kind === 'site');
  const bViews = views.filter((v) => v.kind === 'building' && (buildings.length ? v.buildingId === buildingId : true));
  const atComplex = isComplex && buildingId === null;

  const unitsOn = (fid: string) => units.filter((u) => u.floorId === fid).sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }));
  const freeIn = (list: SelectorUnit[]) => list.filter((u) => u.status === 'available' && matches(u)).length;
  const freeOn = (fid: string) => freeIn(units.filter((u) => u.floorId === fid));
  const unitsOfBuilding = (bid: string) => units.filter((u) => buildingOfUnit(u) === bid);
  const minPriceOf = (list: SelectorUnit[]) => {
    const prices = list.filter((u) => u.status !== 'sold' && u.price && matches(u)).map((u) => u.price as number);
    return prices.length ? Math.min(...prices) : null;
  };
  const perSqm = (u: SelectorUnit) => (u.price && u.areaSqm ? Math.round(u.price / u.areaSqm) : null);

  const floor = floorId ? (floorById.get(floorId) ?? null) : null;
  const unit = units.find((u) => u.id === unitId) ?? null;
  const fName = (f: SelectorFloor) => floorLabel(f.level, f.label, lang);
  const fShort = (level: number) => (level === 0 ? (lang === 'en' ? 'G' : 'P') : String(level));
  const status = (s: UnitStatus) => statusLabel(s, lang);
  const badgeOf = (s: UnitStatus) => (s === 'available' ? 's' : s === 'reserved' ? 'r' : 'p');

  // Sledeće slike rotacije se učitavaju unapred, da strelica odmah prikaže sliku.
  useEffect(() => {
    for (const v of views) {
      const img = new Image();
      img.src = v.imageUrl;
    }
  }, [views]);

  const scrollToPanel = () => {
    if (narrow())
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      );
  };
  const scrollToStage = () => {
    // Telefon: izbor iz spiska (ispod slike) vraća pogled na sliku.
    if (narrow()) {
      requestAnimationFrame(() => {
        const box = stageRef.current?.getBoundingClientRect();
        if (box && box.top < 0)
          stageRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
      });
    }
  };
  const track = (u: SelectorUnit) => trackSiteEvent('cta_click', trackKey('pu', project.slug, u.code));

  const pickBuilding = (bid: string | null) => {
    setBuildingId(bid);
    setFloorId(null);
    setUnitId(null);
    setOnFacade(false);
    setHover(null);
    scrollToStage();
  };
  const pickFloor = (fid: string | null) => {
    setFloorId(fid);
    setUnitId(null);
    setHover(null);
    // Sprat bez osnove ostaje na fasadi - spisak stanova je u panelu.
    setOnFacade(Boolean(fid && !floorById.get(fid)?.planUrl && bViews.length));
    scrollToStage();
  };
  const pickUnit = (uid: string | null) => {
    setUnitId(uid);
    if (uid) {
      const u = units.find((x) => x.id === uid);
      if (u) track(u);
      scrollToPanel();
    }
  };
  // Klik na stan na fasadi: kartica stana odmah, slika fasade ostaje.
  const pickUnitOnFacade = (u: SelectorUnit) => {
    setFloorId(u.floorId);
    setUnitId(u.id);
    setOnFacade(true);
    setHover(null);
    track(u);
    scrollToPanel();
  };
  // Iz liste: otvara stan u prikazu zgrade (osnova sprata ako postoji).
  const openFromList = (u: SelectorUnit) => {
    const f = floorById.get(u.floorId);
    setMode('building');
    if (buildings.length) setBuildingId(f?.buildingId ?? null);
    setFloorId(u.floorId);
    setUnitId(u.id);
    // Sprat bez osnove: stan se pokazuje na fasadi (ako lamela ima sliku).
    setOnFacade(!f?.planUrl && views.some((v) => v.kind === 'building' && (buildings.length ? v.buildingId === f?.buildingId : true)));
    setHover(null);
    track(u);
    requestAnimationFrame(() =>
      (narrow() ? panelRef : rootRef).current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    );
  };

  // ---------- traka filtera: ista za zgradu i za listu ----------
  const listLevels = [...new Set(floors.map((f) => f.level))].sort((a, b) => a - b);
  const listOnly = mode === 'list';
  const activeCount =
    [structure, maxPrice, minArea, floorRange, areaRange, statuses].filter((v) => v !== null).length +
    (onlyFree ? 1 : 0) +
    (rooms.length ? 1 : 0) +
    (listOnly ? (listFloor !== null ? 1 : 0) + (listBuilding !== null ? 1 : 0) : 0);
  const resetFilters = () => {
    setStructure(null);
    setMaxPrice(null);
    setMinArea(null);
    setOnlyFree(false);
    setListFloor(null);
    setListBuilding(null);
    setFloorRange(null);
    setAreaRange(null);
    setRooms([]);
    setStatuses(null);
  };
  const pill = (key: string, label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <label key={key} className={value ? 'inv-pill is-on' : 'inv-pill'}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t.any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const filterBar = (
    <div className="inv-fbar" role="group" aria-label={t.filters}>
      {structures.length > 1 &&
        pill(
          'structure',
          t.structure,
          structure ?? '',
          (v) => setStructure(v || null),
          structures.map((x) => ({ value: x, label: structureText(x, lang) || x }))
        )}
      {listOnly &&
        isComplex &&
        pill(
          'building',
          t.buildingCol,
          listBuilding ?? '',
          (v) => setListBuilding(v || null),
          buildings.map((b) => ({ value: b.id, label: b.name }))
        )}
      {listOnly &&
        listLevels.length > 1 &&
        pill(
          'floor',
          t.floor,
          listFloor === null ? '' : String(listFloor),
          (v) => setListFloor(v === '' ? null : Number(v)),
          listLevels.map((l) => ({ value: String(l), label: floorLabel(l, null, lang) }))
        )}
      {priceOptions.length > 0 &&
        pill(
          'price',
          t.priceTo,
          maxPrice === null ? '' : String(maxPrice),
          (v) => setMaxPrice(v ? Number(v) : null),
          priceOptions.map((p) => ({ value: String(p), label: formatPrice(p, lang) }))
        )}
      {areaOptions.length > 0 &&
        pill(
          'area',
          t.areaFrom,
          minArea === null ? '' : String(minArea),
          (v) => setMinArea(v ? Number(v) : null),
          areaOptions.map((a) => ({ value: String(a), label: formatArea(a, lang) }))
        )}
      <button type="button" className={onlyFree ? 'inv-pill is-on is-toggle' : 'inv-pill is-toggle'} aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)}>
        <i aria-hidden="true" />
        {t.onlyFree}
      </button>
      {activeCount > 0 && (
        <button type="button" className="inv-reset" onClick={resetFilters}>
          {t.reset(activeCount)}
        </button>
      )}
    </div>
  );

  // ---------- telefon: dugme „Filteri" + čipovi + panel od dole ----------
  const mt = MOBILE_TXT[lang];
  const scopeUnits = listOnly || atComplex ? units : bUnits;
  const scopeMatch = (u: SelectorUnit) =>
    matches(u) &&
    (!listOnly || listBuilding === null || floorById.get(u.floorId)?.buildingId === listBuilding) &&
    (!listOnly || listFloor === null || floorById.get(u.floorId)?.level === listFloor);
  const shownCount = scopeUnits.filter(scopeMatch).length;
  const fl = (v: number) => (v === 0 ? (lang === 'en' ? 'G' : 'P') : String(v));
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (floorRange) chips.push({ key: 'fr', label: `${t.floor} ${fl(floorRange[0])}–${fl(floorRange[1])}`, clear: () => setFloorRange(null) });
  if (listOnly && listFloor !== null) chips.push({ key: 'lf', label: floorLabel(listFloor, null, lang), clear: () => setListFloor(null) });
  if (listOnly && listBuilding !== null) chips.push({ key: 'lb', label: buildingName(listBuilding), clear: () => setListBuilding(null) });
  if (areaRange) chips.push({ key: 'ar', label: `${areaRange[0]}–${areaRange[1]} m²`, clear: () => setAreaRange(null) });
  if (minArea !== null) chips.push({ key: 'ma', label: `${t.areaFrom} ${formatArea(minArea, lang)}`, clear: () => setMinArea(null) });
  if (maxPrice !== null) chips.push({ key: 'mp', label: `${t.priceTo} ${formatPrice(maxPrice, lang)}`, clear: () => setMaxPrice(null) });
  if (rooms.length) chips.push({ key: 'ro', label: rooms.map((r) => structureText(r, lang) || r).join(', '), clear: () => setRooms([]) });
  if (structure !== null) chips.push({ key: 'st', label: structureText(structure, lang) || structure, clear: () => setStructure(null) });
  if (statuses) chips.push({ key: 'ss', label: statuses.map((s) => status(s)).join(', ') || mt.noStatus, clear: () => setStatuses(null) });
  if (onlyFree) chips.push({ key: 'of', label: t.onlyFree, clear: () => setOnlyFree(false) });

  const mobileFilters = (
    <div className="inv-mf">
      <button type="button" className={activeCount ? 'inv-mf-btn is-on' : 'inv-mf-btn'} onClick={() => setSheet(true)} aria-haspopup="dialog">
        <span className="inv-mf-l">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {mt.filters}
          {activeCount > 0 && <span className="inv-mf-n">{activeCount}</span>}
        </span>
        <span className="inv-mf-r">{activeCount ? mt.of(shownCount, scopeUnits.length) : mt.count(scopeUnits.length)}</span>
      </button>
      {chips.length > 0 && (
        <div className="inv-mf-chips">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} aria-label={`${mt.remove}: ${c.label}`}>
              {c.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const allStatuses: UnitStatus[] = ['available', 'reserved', 'sold'];
  const filterSheet = sheet && (
    <div className="inv-sheet-wrap" role="dialog" aria-modal="true" aria-label={mt.filters}>
      <div className="inv-sheet-shade" onClick={() => setSheet(false)} />
      <div className="inv-sheet">
        <div className="inv-sheet-grab" aria-hidden="true" />
        <div className="inv-sheet-head">
          <b>{mt.filters}</b>
          <button type="button" onClick={() => setSheet(false)} aria-label={mt.close}>
            ×
          </button>
        </div>
        <div className="inv-sheet-body">
          {isComplex && listOnly && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">{t.buildingCol}</div>
              <div className="inv-sheet-seg" style={{ gridTemplateColumns: `repeat(${Math.min(4, buildings.length)}, minmax(0,1fr))` }}>
                {buildings.map((b) => (
                  <button key={b.id} type="button" aria-pressed={listBuilding === b.id} onClick={() => setListBuilding(listBuilding === b.id ? null : b.id)}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {levelSpan[1] > levelSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.floor}
                <span className="inv-sheet-v">
                  {fl((floorRange ?? levelSpan)[0])} – {fl((floorRange ?? levelSpan)[1])}
                </span>
              </div>
              <RangeSlider
                className="is-light"
                min={levelSpan[0]}
                max={levelSpan[1]}
                value={floorRange ?? levelSpan}
                label={t.floor}
                format={fl}
                onChange={(v) => setFloorRange(v[0] === levelSpan[0] && v[1] === levelSpan[1] ? null : v)}
              />
            </div>
          )}
          {areaSpan[1] > areaSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.area}
                <span className="inv-sheet-v">
                  {(areaRange ?? areaSpan)[0]} m² – {(areaRange ?? areaSpan)[1]} m²
                </span>
              </div>
              <RangeSlider
                className="is-light"
                min={areaSpan[0]}
                max={areaSpan[1]}
                value={areaRange ?? areaSpan}
                label={t.area}
                format={(v) => `${v} m²`}
                onChange={(v) => setAreaRange(v[0] === areaSpan[0] && v[1] === areaSpan[1] ? null : v)}
              />
            </div>
          )}
          {priceSpan[1] > priceSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.priceTo}
                <span className="inv-sheet-v">{maxPrice === null ? t.any : formatPrice(maxPrice, lang)}</span>
              </div>
              <div className="fs-range is-light">
                <div className="fs-range-track">
                  <i style={{ left: 0, width: `${(((maxPrice ?? priceSpan[1]) - priceSpan[0]) / (priceSpan[1] - priceSpan[0])) * 100}%` }} />
                  <input
                    type="range"
                    min={priceSpan[0]}
                    max={priceSpan[1]}
                    step={5000}
                    value={maxPrice ?? priceSpan[1]}
                    aria-label={t.priceTo}
                    onChange={(e) => setMaxPrice(Number(e.target.value) >= priceSpan[1] ? null : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
          {structures.length > 1 && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">{mt.rooms}</div>
              <div className="inv-sheet-seg" style={{ gridTemplateColumns: `repeat(${Math.min(5, structures.length)}, minmax(0,1fr))` }}>
                {structures.map((s) => (
                  <button key={s} type="button" aria-pressed={rooms.includes(s)} onClick={() => setRooms((r) => toggle(r, s))}>
                    {shortStructure(s)}
                    <small>{structureText(s, lang) || s}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="inv-sheet-grp">
            <div className="inv-sheet-l">{t.statusCol}</div>
            <div className="inv-sheet-st">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={(statuses ?? allStatuses).includes(s)}
                  onClick={() => {
                    const next = toggle(statuses ?? allStatuses, s);
                    setStatuses(next.length === allStatuses.length ? null : next);
                  }}
                >
                  <i style={{ background: UNIT_STATUS_COLORS[s].stroke }} />
                  {status(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="inv-sheet-foot">
          <button type="button" className="is-reset" disabled={!activeCount} onClick={resetFilters}>
            {mt.reset}
          </button>
          <button type="button" className="is-go" onClick={() => setSheet(false)}>
            {mt.show(shownCount)}
          </button>
        </div>
      </div>
    </div>
  );

  // Traka zauzetosti: slobodno / rezervisano / prodato.
  const occupancy = (list: SelectorUnit[]) => {
    const n = list.length || 1;
    const c = (st: UnitStatus) => list.filter((u) => u.status === st).length;
    return (
      <span className="inv-occ" aria-hidden="true">
        <i className="is-s" style={{ width: `${(c('available') / n) * 100}%` }} />
        <i className="is-r" style={{ width: `${(c('reserved') / n) * 100}%` }} />
        <i className="is-p" style={{ width: `${(c('sold') / n) * 100}%` }} />
      </span>
    );
  };

  const legend = (
    <div className="inv-legend">
      {(['available', 'reserved', 'sold'] as UnitStatus[]).map((s) => (
        <span key={s}>
          <i
            style={{
              background: UNIT_STATUS_COLORS[s].badge,
              borderColor: UNIT_STATUS_COLORS[s].stroke
            }}
          />
          {status(s)}
        </span>
      ))}
    </div>
  );

  // Telefon: spratovi kao red velikih dugmadi odmah uz sliku. Trake spratova
  // na fotografiji zgrade su na uskom ekranu tanke i teško se pogađaju
  // prstom, a spisak u panelu je ispod slike, van ekrana. Na računaru se ne
  // prikazuje (CSS .inv-floorchips) - tamo služe zgrada i spisak pored nje.
  const floorChips = bFloors.length > 0 && (
    <div className="inv-floorchips" role="group" aria-label={t.floorList}>
      {floorsDesc.map((f) => {
        const free = freeOn(f.id);
        return (
          <button
            key={f.id}
            type="button"
            className={free ? 'inv-fchip' : 'inv-fchip is-none'}
            aria-pressed={f.id === floorId}
            aria-label={`${fName(f)}, ${free ? t.freeLong(free) : t.none}`}
            onClick={() => pickFloor(f.id)}
          >
            <b>{fShort(f.level)}</b>
            <small>{free ? t.freeShort(free) : t.none}</small>
          </button>
        );
      })}
    </div>
  );

  /**
   * Slika sa rotacijom: strelice levo/desno, natpis pogleda i prevlačenje
   * prstom. `key` čuva izabran pogled posebno za kompleks i svaku lamelu.
   */
  const rotator = (key: string, list: SelectorView[], render: (v: SelectorView) => { svg: ReactNode; tags: ReactNode }) => {
    if (!list.length) return null;
    const i = Math.min(viewIdx[key] ?? 0, list.length - 1);
    const view = list[i];
    const go = (d: number) =>
      setViewIdx((all) => ({
        ...all,
        [key]: (i + d + list.length) % list.length
      }));
    const { svg, tags } = render(view);
    return (
      <div className="inv-art">
        <div
          className="inv-imgbox"
          onTouchStart={(e) => (swipeX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const start = swipeX.current;
            swipeX.current = null;
            if (start === null || list.length < 2) return;
            const dx = e.changedTouches[0].clientX - start;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a */}
          <img src={view.imageUrl} alt={view.label ? `${project.title} - ${view.label}` : project.title} />
          {svg}
          {tags}
          {canFull && (
            <button type="button" className="inv-fullbtn is-onimg" onClick={() => setFull(true)}>
              <span aria-hidden="true">⛶</span> {lang === 'en' ? 'Full screen' : 'Prikaz preko celog ekrana'}
            </button>
          )}
          {list.length > 1 && (
            <>
              <button type="button" className="inv-rot is-l" aria-label={t.rotatePrev} onClick={() => go(-1)}>
                ‹
              </button>
              <button type="button" className="inv-rot is-r" aria-label={t.rotateNext} onClick={() => go(1)}>
                ›
              </button>
              <span className="inv-rot-label" aria-live="polite">
                {view.label ? `${view.label} · ` : ''}
                {i + 1}/{list.length}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  // ---------- slika kompleksa: lamele ----------
  const renderSite = (v: SelectorView) => {
    const shapes = v.shapes.filter((s) => s.target === 'building' && buildings.some((b) => b.id === s.id));
    return {
      svg: (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" role="group" aria-label={t.pickBuilding}>
          {shapes.map((s) => {
            const free = freeIn(unitsOfBuilding(s.id));
            const on = hover === s.id;
            return (
              <polygon
                key={s.id}
                className="inv-poly"
                points={pts(s.polygon)}
                fill={on ? 'rgba(30,90,168,.42)' : free ? 'rgba(30,90,168,.16)' : 'rgba(255,255,255,.45)'}
                stroke={on ? '#1E5AA8' : 'rgba(255,255,255,.85)'}
                strokeWidth={on ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`${buildingName(s.id)}, ${free ? t.freeLong(free) : t.none}`}
                onClick={() => pickBuilding(s.id)}
                onKeyDown={onKey(() => pickBuilding(s.id))}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.id)}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </svg>
      ),
      tags: shapes.map((s) => {
        const free = freeIn(unitsOfBuilding(s.id));
        const [cx, cy] = polygonCenter(s.polygon);
        return (
          <span key={`t-${s.id}`} className={free ? 'inv-tag' : 'inv-tag is-none'} style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
            {buildingName(s.id)}
            <small>{free ? t.freeShort(free) : t.none}</small>
          </span>
        );
      })
    };
  };

  // ---------- fasada: spratovi i/ili stanovi ----------
  const renderFacade = (v: SelectorView) => {
    const floorShapes = v.shapes.filter((s) => s.target === 'floor' && bFloorIds.has(s.id));
    const unitShapes = v.shapes.filter((s) => s.target === 'unit' && bUnits.some((u) => u.id === s.id));
    const unitOf = (id: string) => units.find((u) => u.id === id)!;
    const hovered = unitShapes.find((s) => s.id === hover || (s.id === unitId && onFacade));
    return {
      svg: (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" role="group" aria-label={unitShapes.length ? t.pickUnit : t.floorList}>
          {floorShapes.map((s) => {
            const f = floorById.get(s.id)!;
            const free = freeOn(f.id);
            const on = hover === f.id || f.id === floorId;
            return (
              <polygon
                key={s.id}
                className="inv-poly"
                points={pts(s.polygon)}
                fill={on ? 'rgba(30,90,168,.38)' : free ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,.45)'}
                stroke={on ? '#1E5AA8' : 'rgba(255,255,255,.7)'}
                strokeWidth={on ? 2.5 : 1}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`${fName(f)}, ${free ? t.freeLong(free) : t.none}`}
                onClick={() => pickFloor(f.id)}
                onKeyDown={onKey(() => pickFloor(f.id))}
                onMouseEnter={() => setHover(f.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(f.id)}
                onBlur={() => setHover(null)}
              />
            );
          })}
          {unitShapes.map((s) => {
            const u = unitOf(s.id);
            const c = UNIT_STATUS_COLORS[u.status];
            const sel = u.id === unitId;
            const on = hover === u.id;
            return (
              <polygon
                key={s.id}
                className="inv-poly"
                points={pts(s.polygon)}
                fill={on || sel ? 'rgba(30,90,168,.45)' : c.fill}
                fillOpacity={matches(u) ? 0.75 : 0.18}
                stroke={sel || on ? '#1E5AA8' : c.stroke}
                strokeWidth={sel ? 3 : on ? 2.5 : 1.5}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-pressed={sel}
                aria-label={`${t.unit} ${u.code}, ${fName(floorById.get(u.floorId)!)}, ${status(u.status)}`}
                onClick={() => pickUnitOnFacade(u)}
                onKeyDown={onKey(() => pickUnitOnFacade(u))}
                onMouseEnter={() => setHover(u.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(u.id)}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </svg>
      ),
      tags: (
        <>
          {/* Oznake spratova samo kad na slici nema stanova - inače bi bilo pretrpano. */}
          {!unitShapes.length &&
            floorShapes.map((s) => {
              const f = floorById.get(s.id)!;
              const free = freeOn(f.id);
              const [, cy] = polygonCenter(s.polygon);
              const maxX = Math.max(...s.polygon.map((p) => p[0]));
              return (
                <span
                  key={`t-${s.id}`}
                  className={free ? 'inv-tag' : 'inv-tag is-none'}
                  style={{
                    left: `${Math.min(bViews.length > 1 ? 84 : 92, maxX * 100)}%`,
                    top: `${cy * 100}%`
                  }}
                >
                  {fShort(f.level)}
                  <small>{free ? t.freeShort(free) : t.none}</small>
                </span>
              );
            })}
          {hovered &&
            (() => {
              const u = unitOf(hovered.id);
              const [cx] = polygonCenter(hovered.polygon);
              const top = Math.min(...hovered.polygon.map((p) => p[1]));
              return (
                <span
                  className="inv-tag is-unit"
                  style={{
                    left: `${Math.min(88, Math.max(12, cx * 100))}%`,
                    top: `${Math.max(4, top * 100)}%`
                  }}
                >
                  {u.code}
                  <small className={`is-${badgeOf(u.status)}`}>
                    {u.status === 'available' && u.price ? formatPrice(u.price, lang) : status(u.status)}
                  </small>
                </span>
              );
            })()}
        </>
      )
    };
  };

  // ---------- leva strana ----------
  let stage: ReactNode;
  if (atComplex) {
    stage = (
      <>
        <div className="inv-stagehd">
          <h3>{t.pickBuilding}</h3>
        </div>
        <p className="inv-muted">{siteViews.length ? t.pickBuildingHint : t.pickBuildingList}</p>
        {siteViews.length > 0 ? (
          rotator('site', siteViews, renderSite)
        ) : (
          <div className="inv-bcards">
            {buildings.map((b) => {
              const cover = views.find((v) => v.kind === 'building' && v.buildingId === b.id);
              const free = freeIn(unitsOfBuilding(b.id));
              return (
                <button key={b.id} type="button" className="inv-bcard" onClick={() => pickBuilding(b.id)}>
                  <span className="inv-bcard-img" style={cover ? { backgroundImage: `url(${cover.imageUrl})` } : undefined} />
                  <b>{b.name}</b>
                  <small className={free ? '' : 'is-none'}>{free ? t.freeLong(free) : t.none}</small>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  } else if (!floor || onFacade) {
    const current = bViews[Math.min(viewIdx[buildingId ?? 'main'] ?? 0, Math.max(0, bViews.length - 1))];
    const facadeHasUnits = Boolean(current?.shapes.some((s) => s.target === 'unit'));
    const facadeHasFloors = Boolean(current?.shapes.some((s) => s.target === 'floor'));
    stage = (
      <>
        <div className="inv-stagehd">
          {floor ? (
            <button type="button" className="inv-back" onClick={() => pickFloor(null)}>
              {t.backToBuilding}
            </button>
          ) : isComplex ? (
            <button type="button" className="inv-back" onClick={() => pickBuilding(null)}>
              {t.complex}
            </button>
          ) : null}
          <h3>{floor ? fName(floor) : isComplex ? buildingName(buildingId) : facadeHasUnits ? t.pickUnit : t.pickFloor}</h3>
          {floor?.planUrl ? (
            <button type="button" className="inv-back" onClick={() => setOnFacade(false)}>
              {t.floorPlan}
            </button>
          ) : (
            <span />
          )}
        </div>
        {!floor && (
          <p className="inv-muted">
            {facadeHasUnits ? (facadeHasFloors ? t.pickOnFacade : t.pickUnitOnFacade) : facadeHasFloors ? t.pickFloorHint : t.pickFloorList}
          </p>
        )}
        {rotator(buildingId ?? 'main', bViews, renderFacade)}
        {facadeHasUnits && legend}
        {floorChips}
      </>
    );
  } else {
    const idx = floorsDesc.findIndex((f) => f.id === floor.id);
    const above = idx > 0 ? floorsDesc[idx - 1] : null;
    const below = idx < floorsDesc.length - 1 ? floorsDesc[idx + 1] : null;
    const shaped = unitsOn(floor.id).filter((u) => u.polygon);
    stage = (
      <>
        <div className="inv-stagehd">
          <button type="button" className="inv-back" onClick={() => pickFloor(null)}>
            {isComplex ? `← ${buildingName(buildingId)}` : t.building}
          </button>
          <h3>{fName(floor)}</h3>
          <div className="inv-flsw">
            <button type="button" disabled={!below} aria-label={t.floorDown} onClick={() => below && pickFloor(below.id)}>
              ↓
            </button>
            <button type="button" disabled={!above} aria-label={t.floorUp} onClick={() => above && pickFloor(above.id)}>
              ↑
            </button>
          </div>
        </div>
        {floorChips}
        {floor.planUrl ? (
          <div className="inv-art">
            <div className="inv-imgbox" style={{ background: '#FFFFFF' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- osnova sprata sa R2 CDN-a */}
              <img src={floor.planUrl} alt={fName(floor)} />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" role="group" aria-label={t.pickUnit}>
                {shaped.map((u) => {
                  const c = UNIT_STATUS_COLORS[u.status];
                  const sel = u.id === unitId;
                  return (
                    <polygon
                      key={u.id}
                      className="inv-poly"
                      points={pts(u.polygon!)}
                      fill={c.fill}
                      fillOpacity={matches(u) ? 1 : 0.3}
                      stroke={sel ? '#1E5AA8' : c.stroke}
                      strokeWidth={sel ? 3.5 : 2}
                      vectorEffect="non-scaling-stroke"
                      role="button"
                      tabIndex={0}
                      aria-pressed={sel}
                      aria-label={`${t.unit} ${u.code}, ${status(u.status)}`}
                      onClick={() => pickUnit(u.id)}
                      onKeyDown={onKey(() => pickUnit(u.id))}
                    />
                  );
                })}
              </svg>
              {shaped.map((u) => {
                const [cx, cy] = polygonCenter(u.polygon!);
                return (
                  <span key={`t-${u.id}`} className="inv-tag" style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
                    {u.code}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="inv-muted">{t.pickUnitList}</p>
        )}
        {legend}
      </>
    );
  }

  // ---------- desna strana ----------
  const projectHead = (
    <>
      <span className="inv-eyebrow">
        {t.newBuild}
        {project.city ? ` · ${project.city}` : ''}
      </span>
      <div className="inv-title">{project.title}</div>
      {(project.address || project.developer) && (
        <p className="inv-muted">{[project.address, project.developer && `${t.investor}: ${project.developer}`].filter(Boolean).join(' · ')}</p>
      )}
    </>
  );
  const statsOf = (list: SelectorUnit[]) => (
    <div className="inv-stats">
      <div>
        <b>{list.length}</b>
        <small>{t.units}</small>
      </div>
      <div>
        <b className="is-ok">{list.filter((u) => u.status === 'available').length}</b>
        <small>{t.free}</small>
      </div>
      <div>
        <b>{project.moveIn || '—'}</b>
        <small>{t.moveIn}</small>
      </div>
    </div>
  );

  // Na strani projekta naslov i brojke su već u vrhu strane - ovde samo u ugradnji.
  const panelHead = (title: string, hint: string, list: SelectorUnit[]) =>
    embedded ? (
      <>
        {projectHead}
        {statsOf(list)}
      </>
    ) : (
      <div className="inv-phead">
        <div className="inv-title">{title}</div>
        <p className="inv-muted">{hint}</p>
      </div>
    );
  const rowFree = (n: number) => <span className={n ? 'inv-badge is-s' : 'inv-badge is-p'}>{n ? t.freeLong(n) : t.none}</span>;

  let panel: ReactNode;
  if (atComplex) {
    panel = (
      <>
        {panelHead(t.pickBuilding, t.occHint, units)}
        <div className="inv-list">
          {buildings.map((b) => {
            const list = unitsOfBuilding(b.id);
            const n = freeIn(list);
            const from = minPriceOf(list);
            return (
              <button
                key={b.id}
                type="button"
                className={hover === b.id ? 'inv-frow is-hover' : 'inv-frow'}
                style={anyFilter && !n ? { opacity: 0.5 } : undefined}
                onClick={() => pickBuilding(b.id)}
                onMouseEnter={() => setHover(b.id)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="inv-frow-n">{b.name.split(/\s+/).pop()}</span>
                <span className="inv-frow-main">
                  <b>{b.name}</b>
                  <small>{from ? t.from(formatPrice(from, lang)) : t.unitsCount(list.length)}</small>
                  {occupancy(list)}
                </span>
                {rowFree(n)}
              </button>
            );
          })}
        </div>
        {anyFilter && !units.some((u) => u.status === 'available' && matches(u)) && <p className="inv-muted">{t.noMatch}</p>}
      </>
    );
  } else if (!floor) {
    panel = (
      <>
        {panelHead(isComplex ? buildingName(buildingId) : t.floorsTitle, t.occHint, isComplex ? bUnits : units)}
        <div className="inv-list">
          {floorsDesc.map((f) => {
            const n = freeOn(f.id);
            const from = minPriceOf(units.filter((u) => u.floorId === f.id));
            return (
              <button
                key={f.id}
                type="button"
                className={hover === f.id ? 'inv-frow is-hover' : 'inv-frow'}
                style={anyFilter && !n ? { opacity: 0.5 } : undefined}
                onClick={() => pickFloor(f.id)}
                onMouseEnter={() => setHover(f.id)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="inv-frow-n">{fShort(f.level)}</span>
                <span className="inv-frow-main">
                  <b>{fName(f)}</b>
                  <small>{from ? t.from(formatPrice(from, lang)) : t.unitsCount(unitsOn(f.id).length)}</small>
                  {occupancy(unitsOn(f.id))}
                </span>
                {rowFree(n)}
              </button>
            );
          })}
        </div>
        {anyFilter && !bUnits.some((u) => u.status === 'available' && matches(u)) && <p className="inv-muted">{t.noMatch}</p>}
      </>
    );
  } else if (!unit) {
    panel = (
      <>
        <span className="inv-eyebrow">{[isComplex ? buildingName(floor.buildingId) : null, fName(floor)].filter(Boolean).join(' · ')}</span>
        <div className="inv-title">{t.pickUnit}</div>
        <p className="inv-muted">{floor.planUrl && !onFacade ? t.pickUnitHint : t.pickUnitList}</p>
        <div className="inv-list">
          {unitsOn(floor.id).map((u) => (
            <button
              key={u.id}
              type="button"
              className={hover === u.id ? 'inv-frow is-hover' : 'inv-frow'}
              style={{ opacity: matches(u) ? 1 : 0.45 }}
              onClick={() => pickUnit(u.id)}
              onMouseEnter={() => setHover(u.id)}
              onMouseLeave={() => setHover(null)}
            >
              <span className={`inv-frow-n is-${badgeOf(u.status)}`}>{u.code}</span>
              <span className="inv-frow-main">
                <b>
                  {t.unit} {u.code}
                </b>
                <small>
                  {[
                    structureText(u.structure, lang),
                    u.areaSqm ? formatArea(u.areaSqm, lang) : null,
                    u.status === 'sold' ? null : u.price ? formatPrice(u.price, lang) : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <span className={`inv-badge is-${badgeOf(u.status)}`}>{status(u.status)}</span>
            </button>
          ))}
        </div>
        {floor.viewHref && (
          <a
            className="inv-cta is-out"
            href={floor.viewHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 12, textDecoration: 'none' }}
          >
            {t.viewFrom(floorFrom(floor.level, floor.label, lang))} ↗
          </a>
        )}
      </>
    );
  } else {
    const sqm = perSqm(unit);
    // Osnova / 3D / slike -> kartice (UnitMedia, u kojima je i 360° tura);
    // bez njih ostaje staro dugme „Prošetajte kroz stan".
    // Stan bez svoje osnove, a iscrtan na osnovi sprata: isečak osnove sprata.
    const fallbackPlan = !unit.planUrl && floor.planUrl && unit.polygon ? { src: floor.planUrl, polygon: unit.polygon } : null;
    const hasExtraMedia = Boolean(demoMedia || unit.planUrl || fallbackPlan || unit.plan3dUrl || unit.photos.length);
    const unitPage = letakBase ? `${letakBase}/${encodeURIComponent(unit.code)}` : null;
    panel = (
      <>
        <div className="inv-unit-head">
          <span className="inv-eyebrow">
            {[isComplex ? buildingName(floor.buildingId) : null, fName(floor)].filter(Boolean).join(' · ')}
            {unit.orientation ? ` · ${orientationText(unit.orientation, lang)}` : ''}
          </span>
          <span className={`inv-badge is-${badgeOf(unit.status)}`}>{status(unit.status)}</span>
        </div>
        <div className="inv-title">
          {t.unit} {unit.code}
        </div>
        {unit.structure && <p className="inv-muted">{structureText(unit.structure, lang)}</p>}
        {hasExtraMedia && (
          <UnitMedia
            key={`media-${unit.id}`}
            planUrl={unit.planUrl}
            plan3dUrl={unit.plan3dUrl}
            photos={unit.photos}
            tourHref={unit.tourHref}
            code={unit.code}
            lang={lang}
            fallbackPlan={fallbackPlan}
            demo={demoMedia}
          />
        )}
        {unitPage && (
          <a className="inv-open" href={unitPage} data-track="cta:project_unit_page">
            {t.openUnitPage} <span aria-hidden="true">→</span>
          </a>
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
        <UnitRooms rooms={unit.rooms} lang={lang} />
        {letakBase && (
          <a
            className="inv-pdf"
            href={`${letakBase}/${encodeURIComponent(unit.code)}/letak`}
            target="_blank"
            rel="noopener"
            data-track="cta:project_unit_pdf"
          >
            <span aria-hidden="true">PDF</span> {t.pdf}
          </a>
        )}
        {/* Plan plaćanja samo za stan koji se prodaje i ima cenu. */}
        {unit.status !== 'sold' && unit.price ? <PaymentCalculator key={`pay-${unit.id}`} price={unit.price} lang={lang} /> : null}
        {((unit.tourHref && !hasExtraMedia) || floor.viewHref) && (
          <div className="inv-media" style={!(unit.tourHref && !hasExtraMedia) || !floor.viewHref ? { gridTemplateColumns: '1fr' } : undefined}>
            {unit.tourHref && !hasExtraMedia && (
              <a
                className="inv-mbtn"
                href={lang === 'en' ? `${unit.tourHref}?lang=en` : unit.tourHref}
                target="_blank"
                rel="noopener noreferrer"
                style={unit.tourPreview ? { backgroundImage: `url(${unit.tourPreview})` } : undefined}
                data-track="cta:project_unit_tour"
              >
                <span className="inv-sheet-v">360°</span>
                <span>{t.walk}</span>
              </a>
            )}
            {floor.viewHref && (
              <a className="inv-mbtn is-drone" href={floor.viewHref} target="_blank" rel="noopener noreferrer" data-track="cta:project_floor_view">
                <em>{lang === 'en' ? 'Drone' : 'Dron'}</em>
                <span>{t.viewFrom(floorFrom(floor.level, floor.label, lang))}</span>
              </a>
            )}
          </div>
        )}

        <UnitInquiry
          key={`inq-${unit.id}`}
          slug={project.slug}
          projectTitle={project.title}
          unitId={unit.id}
          code={unit.code}
          status={unit.status}
          where={[isComplex ? buildingName(floor.buildingId) : null, floorLabel(floor.level, floor.label, 'sr')].filter(Boolean).join(' · ')}
          embedded={embedded}
          lang={lang}
        />
        {/* Sa fasade nazad na zgradu, sa osnove na ostale stanove sprata. */}
        <button type="button" className="inv-cta is-out" onClick={() => (onFacade ? pickFloor(null) : pickUnit(null))}>
          {onFacade ? t.backToBuilding : t.otherUnits}
        </button>
      </>
    );
  }

  // ---------- lista svih stanova ----------
  const listUnits = units
    .filter((u) => {
      const f = floorById.get(u.floorId);
      return (
        matches(u) &&
        (listFloor === null || f?.level === listFloor) &&
        (listBuilding === null || f?.buildingId === listBuilding)
      );
    })
    .sort((a, b) => {
      const fa = floorById.get(a.floorId);
      const fb = floorById.get(b.floorId);
      const num = (x: number | null | undefined) => (x === null || x === undefined ? Number.POSITIVE_INFINITY : x);
      const price = (u: SelectorUnit) => (u.status === 'sold' ? null : u.price);
      const sqm = (u: SelectorUnit) => (u.status === 'sold' ? null : perSqm(u));
      let d = 0;
      switch (sort.key) {
        case 'building':
          d = buildingName(fa?.buildingId ?? null).localeCompare(buildingName(fb?.buildingId ?? null), 'sr', { numeric: true });
          break;
        case 'floor':
          d = (fa?.level ?? 0) - (fb?.level ?? 0);
          break;
        case 'structure':
          d = (a.structure ?? '').localeCompare(b.structure ?? '', 'sr');
          break;
        case 'area':
          d = num(a.areaSqm) - num(b.areaSqm);
          break;
        case 'terrace':
          d = num(a.terraceSqm) - num(b.terraceSqm);
          break;
        case 'price':
          d = num(price(a)) - num(price(b));
          break;
        case 'sqm':
          d = num(sqm(a)) - num(sqm(b));
          break;
        case 'status':
          d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
      }
      if (Number.isNaN(d)) d = 0;
      return d * sort.dir || a.code.localeCompare(b.code, 'sr', { numeric: true });
    });
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const th = (key: SortKey, label: string, cls?: string) => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => sortBy(key)}>
        {label}
        <i aria-hidden="true">{sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</i>
      </button>
    </th>
  );

  const list = (
    <div className="inv-lst">
      {listUnits.length === 0 ? (
        <p className="inv-muted">{t.noMatch}</p>
      ) : (
        <div className="inv-lst-wrap">
          <table className="inv-lst-table">
            <thead>
              <tr>
                {th('code', t.unit)}
                {isComplex && th('building', t.buildingCol)}
                {th('floor', t.floor)}
                {th('structure', t.structure)}
                {th('area', t.area, 'is-num')}
                {th('terrace', t.terrace, 'is-num')}
                {th('price', t.price, 'is-num')}
                {th('sqm', '€/m²', 'is-num')}
                {th('status', t.statusCol)}
              </tr>
            </thead>
            <tbody>
              {listUnits.map((u) => {
                const f = floorById.get(u.floorId);
                const sqm = perSqm(u);
                return (
                  <tr
                    key={u.id}
                    tabIndex={0}
                    onClick={() => openFromList(u)}
                    onKeyDown={onKey(() => openFromList(u))}
                    aria-label={`${t.unit} ${u.code}`}
                  >
                    <td className="is-code">
                      <b>{u.code}</b>
                    </td>
                    {isComplex && <td data-l={t.buildingCol}>{buildingName(f?.buildingId ?? null)}</td>}
                    <td data-l={t.floor}>{f ? fName(f) : '—'}</td>
                    <td data-l={t.structure}>{structureText(u.structure, lang) || '—'}</td>
                    <td data-l={t.area} className="is-num">
                      {formatArea(u.areaSqm, lang)}
                    </td>
                    <td data-l={t.terrace} className="is-num">
                      {formatArea(u.terraceSqm, lang)}
                    </td>
                    <td data-l={t.price} className="is-num is-price">
                      {u.status === 'sold' ? '—' : u.price ? formatPrice(u.price, lang) : t.onRequest}
                    </td>
                    <td data-l="€/m²" className="is-num">
                      {u.status !== 'sold' && sqm ? formatPrice(sqm, lang) : '—'}
                    </td>
                    <td className="is-status">
                      <span className={`inv-badge is-${badgeOf(u.status)}`}>{status(u.status)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="inv-demo" ref={rootRef}>
      {/* Lista tek kad ima stanova - pre toga je prazna. */}
      {units.length > 0 && (
        <div className="inv-modebar">
          <div className="inv-tabs" role="tablist" aria-label={t.viewMode}>
            <button type="button" role="tab" aria-selected={mode === 'building'} onClick={() => setMode('building')}>
              {isComplex ? t.tabComplex : t.tabBuilding}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'list'} onClick={() => setMode('list')}>
              {t.tabList} <small>{units.length}</small>
            </button>
          </div>
          <span className="inv-count" aria-live="polite">
            {listOnly ? t.shownOf(listUnits.length, units.length) : anyFilter ? t.matchOf(units.filter(matches).length, units.length) : ''}
          </span>
          {canFull && (
            <button type="button" className="inv-fullbtn" onClick={() => setFull(true)}>
              <span aria-hidden="true">⛶</span> {lang === 'en' ? 'Full screen' : 'Ceo ekran'}
            </button>
          )}
        </div>
      )}
      {full && (
        <FacadeFullscreen
          project={project}
          floors={floors}
          units={units}
          buildings={buildings}
          views={views}
          lang={lang}
          letakBase={letakBase}
          demoMedia={demoMedia}
          startBuildingId={buildingId}
          onClose={() => setFull(false)}
          onList={() => {
            setFull(false);
            setMode('list');
            requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
          }}
        />
      )}
      {units.length > 1 && (
        <>
          {filterBar}
          {mobileFilters}
          {filterSheet}
        </>
      )}
      {mode === 'list' && units.length > 0 ? (
        list
      ) : (
        <div className="inv-grid">
          <div className="inv-stage" ref={stageRef}>
            {stage}
          </div>
          <div className="inv-panel" aria-live="polite" ref={panelRef}>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}
