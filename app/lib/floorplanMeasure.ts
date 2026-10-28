/**
 * Mere šematskog tlocrta (vlasnik, 28. 10. 2026): kad ima mere, upiše ih u
 * editoru, a kad nema - crta odokativno kao do sada.
 *
 * Plan ima jedno merilo (unitsPerMeter); postavlja ga prvi izmereni
 * pravougaonik. Metri se ne čuvaju posebno, nego se računaju iz veličine
 * pravougaonika, pa crtež i broj ne mogu da se raziđu. Prostorija bez
 * upisanih mera nikad ne dobija kvadraturu izračunatu iz merila - kupac ne
 * sme da vidi broj koji niko nije izmerio.
 *
 * Bez zavisnosti (samo tipovi), radi i u pregledaču i na serveru.
 */

import type { FloorplanLayout, PlanLang, PlanShape } from './floorplanLayout.ts';

/** Širina vrata kad plan ima merilo. */
export const DOOR_M = 0.8;
/** Mere u editoru se zaokružuju na 5 cm. */
export const METER_STEP = 0.05;

const MIN_M = 0.3;
const MAX_M = 50;

const step = (m: number) => Math.round(m / METER_STEP) * METER_STEP;
const tidy = (m: number) => Math.round(step(m) * 100) / 100;

/** Mere izmerenog pravougaonika u metrima (null ako nije izmeren ili plan nema merilo). */
export function shapeMeters(shape: PlanShape, upm: number | undefined): { w: number; h: number } | null {
  if (!shape.measured || !upm) return null;
  return { w: tidy(shape.w / upm), h: tidy(shape.h / upm) };
}

/** Površina prostorije u m² - samo ako su svi njeni delovi izmereni. */
export function groupAreaM2(layout: FloorplanLayout, groupId: string): number | null {
  const upm = layout.unitsPerMeter;
  const parts = layout.shapes.filter((s) => s.group === groupId);
  if (!upm || !parts.length || parts.some((s) => !s.measured)) return null;
  return parts.reduce((sum, s) => sum + (s.w / upm) * (s.h / upm), 0);
}

/** Zbir izmerenih prostorija (null kad nijedna nije potpuno izmerena). */
export function totalAreaM2(layout: FloorplanLayout): number | null {
  const areas = layout.groups.map((g) => groupAreaM2(layout, g.id)).filter((a): a is number => a !== null);
  return areas.length ? areas.reduce((a, b) => a + b, 0) : null;
}

/** "14,1 m²" (en "14.1 m²", ru "14,1 м²"). */
export function formatArea(m2: number, lang: PlanLang): string {
  const n = (Math.round(m2 * 10) / 10).toFixed(1);
  const num = lang === 'en' ? n : n.replace('.', ',');
  return `${num} ${lang === 'ru' ? 'м²' : 'm²'}`;
}

/** Metri iz polja u editoru ("3,40" ili "3.4"); null ako nije broj ili je van 0,3-50 m. */
export function parseMeters(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const m = Number(t);
  return m >= MIN_M && m <= MAX_M ? m : null;
}

/**
 * Upisane mere pravougaonika. Prvi unos u planu bez merila postavlja merilo
 * po trenutnoj širini (širina ostaje, visina se prilagodi); posle toga mere
 * menjaju veličinu. Gornji levi ugao ostaje na mestu.
 */
export function applyMeters(layout: FloorplanLayout, shapeId: string, wM: number, hM: number): FloorplanLayout {
  const target = layout.shapes.find((s) => s.id === shapeId);
  if (!target) return layout;
  // Zaokruženo, da JSON ostane čitljiv i da 220 / 4,4 bude 50, ne 49,999...
  const upm = layout.unitsPerMeter ?? Math.round((target.w / wM) * 1e4) / 1e4;
  const size = (m: number) => Math.round(m * upm * 10) / 10;
  return {
    ...layout,
    unitsPerMeter: upm,
    shapes: layout.shapes.map((s) => (s.id === shapeId ? { ...s, w: size(wM), h: size(hM), measured: true } : s))
  };
}

/** Briše mere pravougaonika; kad nijedan više nije izmeren, nestaje i merilo. */
export function clearMeters(layout: FloorplanLayout, shapeId: string): FloorplanLayout {
  const shapes: PlanShape[] = layout.shapes.map((s) => {
    if (s.id !== shapeId) return s;
    const rest = { ...s };
    delete rest.measured;
    return rest;
  });
  return withoutUnusedScale({ ...layout, shapes });
}

/** Merilo bez ijednog izmerenog dela ne važi (npr. obrisana jedina izmerena prostorija). */
export function withoutUnusedScale(layout: FloorplanLayout): FloorplanLayout {
  if (layout.unitsPerMeter === undefined || layout.shapes.some((s) => s.measured)) return layout;
  const next = { ...layout };
  delete next.unitsPerMeter;
  return next;
}
