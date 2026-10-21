import type { ProjectPageData } from './projectData';
import type { Polygon, UnitStatus } from './projects';

/**
 * Podaci za priču na skrol "Od zgrade do upita" na /za-investitore
 * (vlasnik, 21. 10. 2026; maketa public/mockup/InvestitorPrica.html).
 * Sve dolazi iz projekta koji strana već učitava (getPublicProject): fasada
 * sa oblicima spratova, osnova izabranog sprata sa stanovima, kartica i 3D
 * prikaz izabranog stana. Nema novih upita bazi.
 *
 * Cena: ako stan nema cenu u bazi, prikazuje se PRIMER (EXAMPLE_PRICE_M2 po
 * m²) uz napomenu da nije ažurirana - vlasnik je tako odlučio, jer projekat
 * još nema cene.
 */
export const INVESTOR_STORY = { floorLevel: 2, unitCode: '25', examplePricePerM2: 2000 } as const;

const optimized = (src: string, width: 1200 | 2048) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

export type InvestorStoryData = {
  slug: string;
  facade: { phone: string; desktop: string };
  /** Oblici spratova na fasadi (0-1), odozdo nagore; `pick` = izabrani sprat. */
  floors: Polygon[];
  pick: number;
  floorLabel: string;
  plan: string;
  /** Stanovi izabranog sprata na osnovi (0-1); `unitPick` = izabrani stan. */
  units: { code: string; status: UnitStatus; polygon: Polygon }[];
  unitPick: number;
  unit: {
    code: string;
    structure: string | null;
    areaSqm: number | null;
    terraceSqm: number | null;
    status: UnitStatus;
    plan3d: string | null;
    /** Ukupna cena i cena po m²; `example` = cena je primer, ne iz baze. */
    price: { total: number; perM2: number; example: boolean } | null;
  };
};

export function buildInvestorStory(data: ProjectPageData | null): InvestorStoryData | null {
  if (!data) return null;
  const floor = data.floors.find((f) => f.level === INVESTOR_STORY.floorLevel);
  if (!floor?.planUrl) return null;
  const view = data.views.find((v) => v.kind === 'building' && v.shapes.some((s) => s.target === 'floor'));
  if (!view) return null;

  const levelOf = new Map(data.floors.map((f) => [f.id, f.level]));
  const floorShapes = view.shapes
    .filter((s) => s.target === 'floor' && levelOf.has(s.id))
    .sort((a, b) => (levelOf.get(a.id) ?? 0) - (levelOf.get(b.id) ?? 0));
  const pick = floorShapes.findIndex((s) => s.id === floor.id);
  if (pick < 0) return null;

  const units = data.units
    .filter((u) => u.floorId === floor.id && u.polygon && u.polygon.length > 2)
    .map((u) => ({ code: u.code, status: u.status, polygon: u.polygon as Polygon, row: u }));
  const unitPick = units.findIndex((u) => u.code === INVESTOR_STORY.unitCode);
  if (unitPick < 0) return null;
  const u = units[unitPick].row;

  const area = u.areaSqm;
  const price =
    u.price && area
      ? { total: u.price, perM2: Math.round(u.price / area), example: false }
      : area
        ? { total: Math.round(area * INVESTOR_STORY.examplePricePerM2), perM2: INVESTOR_STORY.examplePricePerM2, example: true }
        : null;

  return {
    slug: data.project.slug,
    facade: { phone: optimized(view.imageUrl, 1200), desktop: optimized(view.imageUrl, 2048) },
    floors: floorShapes.map((s) => s.polygon),
    pick,
    floorLabel: floor.label ?? `${floor.level}. sprat`,
    plan: optimized(floor.planUrl, 2048),
    units: units.map(({ code, status, polygon }) => ({ code, status, polygon })),
    unitPick,
    unit: {
      code: u.code,
      structure: u.structure,
      areaSqm: area,
      terraceSqm: u.terraceSqm,
      status: u.status,
      plan3d: u.plan3dUrl ? optimized(u.plan3dUrl, 1200) : null,
      price
    }
  };
}
