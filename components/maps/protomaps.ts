import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';

/**
 * Sopstvena mapa sajta (od 12. 10. 2026, umesto OpenStreetMap pločica):
 * podaci za Srbiju u jednom PMTiles fajlu na našem R2/CDN-u, crtani u
 * pregledaču preko MapLibre-a. Bez naloga, ključa i računa kod trećih strana.
 *
 *  - Fajl: izvod Srbije iz Protomaps mape sveta (build 20261011, zoom 0-15),
 *    a ćirilična imena su preslovljena na srpsku latinicu pre postavljanja
 *    (skripta je opisana u docs/mapa.md). Novu verziju fajla postaviti pod
 *    novim imenom i promeniti MAP_FILE - stara adresa se dugo kešira.
 *  - Slova za natpise i ikonice: kopija Protomaps basemaps-assets na istom CDN-u.
 *  - Stil: @protomaps/basemaps, svetla varijanta, imena po „hr" (latinica);
 *    gde nema hrvatskog imena, ide lokalno (već preslovljeno).
 *
 * Teško je (~200 KB), pa se učitava tek kad mapa treba da se prikaže.
 */

const CDN = 'https://cdn.kvadrat360.com/mape';
export const MAP_FILE = `${CDN}/srbija-20261011-lat.pmtiles`;
const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>';

let protocolReady = false;

/** maplibre-gl + pmtiles protokol + stil; pmtiles protokol se registruje jednom po strani. */
export async function loadMapLibre() {
  const [maplibregl, { Protocol }, basemaps] = await Promise.all([import('maplibre-gl'), import('pmtiles'), import('@protomaps/basemaps')]);
  if (!protocolReady) {
    // Worker servira sam sajt (scripts/copy-maplibre-worker.mjs) - inače ga MapLibre posle pakovanja ne nađe.
    maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker-${maplibregl.getVersion()}.mjs`);
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    protocolReady = true;
  }
  const style: StyleSpecification = {
    version: 8,
    glyphs: `${CDN}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${CDN}/sprites/light`,
    sources: {
      protomaps: { type: 'vector', url: `pmtiles://${MAP_FILE}`, attribution: ATTRIBUTION }
    },
    layers: basemaps.layers('protomaps', basemaps.namedFlavor('light'), { lang: 'hr' })
  };
  return { maplibregl, style };
}

/**
 * Ponašanje kao ranija Leaflet mapa: točkić miša ne zumira (strana se
 * normalno skroluje), bez okretanja i naginjanja, dugmad + / − gore levo.
 */
export function setupMapControls(maplibregl: typeof import('maplibre-gl'), map: MlMap) {
  map.scrollZoom.disable();
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
}

/**
 * Pravi mapu; ako pregledač nema WebGL2 (stari uređaj, isključena grafika),
 * MapLibre baca grešku - tada u istoj kutiji ostaje poruka i link na tu
 * lokaciju na OpenStreetMap-u, umesto prazne sive površine.
 */
export function createMap(
  maplibregl: typeof import('maplibre-gl'),
  container: HTMLElement,
  style: StyleSpecification,
  center: [number, number],
  zoom: number,
  lang: string = 'sr'
): MlMap | null {
  try {
    const map = new maplibregl.Map({ container, style, center, zoom, attributionControl: { compact: true } });
    // Greške pločica/stila u konzolu (inače MapLibre ćuti i mapa ostane siva).
    map.on('error', (e) => console.warn('[mapa]', e.error?.message ?? e));
    // Natpis izvora (© OpenStreetMap · Protomaps) na početku sklopljen u dugme ⓘ - na telefonu bi pokrio dno mape.
    map.once('load', () => container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
    return map;
  } catch {
    const [lng, lat] = center;
    const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${Math.round(zoom)}/${lat}/${lng}`;
    const text = lang === 'en' ? 'This browser cannot display the map.' : 'Ovaj pregledač ne može da prikaže mapu.';
    const link = lang === 'en' ? 'Open the location on OpenStreetMap ↗' : 'Otvorite lokaciju na OpenStreetMap-u ↗';
    container.innerHTML = `<div style="height:100%;min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:#5B5D63;font-size:.92rem">${text}<a href="${href}" target="_blank" rel="noopener" style="color:#1E5AA8;font-weight:700;text-decoration:none">${link}</a></div>`;
    return null;
  }
}

/** Element sa HTML-om (oznaka na mapi). */
export function htmlElement(html: string, title?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  if (title) {
    el.title = title;
    el.setAttribute('aria-label', title);
  }
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.style.cursor = 'pointer';
  return el;
}

/** Tekst koji ide u HTML oznake i prozora (unosi ga agent) - čisti se pre umetanja. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
