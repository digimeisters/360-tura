import type { UnitStatus } from './projects';
import type { SelectorUnit } from '../../components/projekat/ProjectSelector';

/**
 * Filteri i sortiranje stanova u izboru stana (ProjectSelector): traka
 * filtera na računaru, panel „Filteri" na telefonu i tabela „Lista".
 * Čista logika, bez Reacta - testovi u unitFilters.test.ts.
 */

export type UnitFilters = {
  structure: string | null;
  maxPrice: number | null;
  minArea: number | null;
  onlyFree: boolean;
  /** Sprat i lamela - samo u listi svih stanova. */
  listFloor: number | null;
  listBuilding: string | null;
  // Telefon (panel „Filteri"): klizači od-do, više struktura, statusi. null = bez ograničenja.
  floorRange: [number, number] | null;
  areaRange: [number, number] | null;
  rooms: string[];
  statuses: UnitStatus[] | null;
};

export const EMPTY_FILTERS: UnitFilters = {
  structure: null,
  maxPrice: null,
  minArea: null,
  onlyFree: false,
  listFloor: null,
  listBuilding: null,
  floorRange: null,
  areaRange: null,
  rooms: [],
  statuses: null
};

export const PRICE_STEPS = [50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 120_000, 150_000, 200_000, 250_000, 300_000];
export const AREA_STEPS = [30, 40, 50, 60, 70, 80, 100, 120];

/** Filteri zajednički za zgradu i listu (bez sprata i lamele liste). */
export function matchesFilters(u: SelectorUnit, f: UnitFilters, levelOf: (u: SelectorUnit) => number): boolean {
  return (
    (f.structure === null || u.structure === f.structure) &&
    (f.maxPrice === null || (u.price !== null && u.price <= f.maxPrice && u.status !== 'sold')) &&
    (f.minArea === null || (u.areaSqm !== null && u.areaSqm >= f.minArea)) &&
    (!f.onlyFree || u.status === 'available') &&
    (f.floorRange === null || (levelOf(u) >= f.floorRange[0] && levelOf(u) <= f.floorRange[1])) &&
    (f.areaRange === null || (u.areaSqm !== null && u.areaSqm >= f.areaRange[0] && u.areaSqm <= f.areaRange[1])) &&
    (!f.rooms.length || (u.structure !== null && f.rooms.includes(u.structure))) &&
    (f.statuses === null || f.statuses.includes(u.status))
  );
}

export function hasAnyFilter(f: UnitFilters): boolean {
  return (
    f.structure !== null ||
    f.maxPrice !== null ||
    f.minArea !== null ||
    f.onlyFree ||
    f.floorRange !== null ||
    f.areaRange !== null ||
    f.rooms.length > 0 ||
    f.statuses !== null
  );
}

export function activeFilterCount(f: UnitFilters, listOnly: boolean): number {
  return (
    [f.structure, f.maxPrice, f.minArea, f.floorRange, f.areaRange, f.statuses].filter((v) => v !== null).length +
    (f.onlyFree ? 1 : 0) +
    (f.rooms.length ? 1 : 0) +
    (listOnly ? (f.listFloor !== null ? 1 : 0) + (f.listBuilding !== null ? 1 : 0) : 0)
  );
}

export type SortKey = 'code' | 'building' | 'floor' | 'structure' | 'area' | 'terrace' | 'price' | 'sqm' | 'status';
export type UnitSort = { key: SortKey; dir: 1 | -1 };

const STATUS_ORDER: Record<UnitStatus, number> = {
  available: 0,
  reserved: 1,
  sold: 2
};

export const perSqm = (u: SelectorUnit) => (u.price && u.areaSqm ? Math.round(u.price / u.areaSqm) : null);

/**
 * Tabela „Lista": prazne vrednosti (i cena prodatog stana) idu na kraj, a
 * isti ključ se dalje ređa po oznaci (brojevi prirodno: 2 pre 10).
 */
export function sortUnits(
  list: SelectorUnit[],
  sort: UnitSort,
  { levelOf, buildingOf }: { levelOf: (u: SelectorUnit) => number; buildingOf: (u: SelectorUnit) => string }
): SelectorUnit[] {
  const num = (x: number | null | undefined) => (x === null || x === undefined ? Number.POSITIVE_INFINITY : x);
  const price = (u: SelectorUnit) => (u.status === 'sold' ? null : u.price);
  const sqm = (u: SelectorUnit) => (u.status === 'sold' ? null : perSqm(u));
  return [...list].sort((a, b) => {
    let d = 0;
    switch (sort.key) {
      case 'building':
        d = buildingOf(a).localeCompare(buildingOf(b), 'sr', { numeric: true });
        break;
      case 'floor':
        d = levelOf(a) - levelOf(b);
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
}
