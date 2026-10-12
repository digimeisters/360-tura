'use client';

import { useEffect, useRef } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { tourHref } from '../app/lib/tourHref';
import { createMap, escapeHtml, htmlElement, loadMapLibre, setupMapControls } from './maps/protomaps';

/**
 * Mapa sa pinom po turi (/ture, dugme "Mapa"). Naša mapa Srbije sa R2-a
 * (components/maps/protomaps.ts), crtana MapLibre-om. Pin je sopstveni SVG u
 * boji brenda, prozor sa slikom i linkom kao ranije.
 *
 * Client-only (MapLibre dira window/document): stranica ovu komponentu
 * učitava kroz next/dynamic sa ssr:false.
 */

const CATEGORY_LABELS: Record<string, string> = { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Stan na dan' };

const PIN = `
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" style="display:block">
    <path d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z" fill="#1E5AA8" stroke="#fff" stroke-width="1.5"/>
    <circle cx="15" cy="12" r="4" fill="#fff"/>
  </svg>`;

export default function TourMap({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);

  const located = tours.filter(
    (t): t is ShowcaseTour & { lat: number; lng: number } => t.lat !== null && t.lng !== null
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    loadMapLibre().then(({ maplibregl, style }) => {
      if (cancelled || !containerRef.current) return;
      const map = createMap(maplibregl, containerRef.current, style, [21.0059, 44.0165], 6, lang);
      if (!map) return;
      mapRef.current = map;
      setupMapControls(maplibregl, map);

      const bounds = new maplibregl.LngLatBounds();
      located.forEach((tour) => {
        const category = tour.category ? CATEGORY_LABELS[tour.category] : null;
        const popup = new maplibregl.Popup({ offset: 26, maxWidth: '240px' }).setHTML(
          `<div style="font-family:inherit;min-width:160px">
            ${tour.coverUrl ? `<img src="${tour.coverUrl}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ''}
            <div style="font-weight:700;font-size:13px;color:#111113;line-height:1.3">${escapeHtml(tour.title)}</div>
            ${category ? `<div style="font-size:11.5px;color:#686A70;margin-top:2px">${escapeHtml(category)}</div>` : ''}
            <a href="${tourHref(tour.slug, tour.languages, lang)}" style="display:inline-block;margin-top:6px;font-size:12.5px;font-weight:700;color:#1E5AA8;text-decoration:none">Otvori turu →</a>
          </div>`
        );
        const el = htmlElement(PIN, tour.title);
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([tour.lng, tour.lat]).setPopup(popup).addTo(map);
        bounds.extend([tour.lng, tour.lat]);
      });

      if (located.length === 1) map.jumpTo({ center: bounds.getCenter(), zoom: 14 });
      else if (located.length > 1) map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });

      // Mapa pored filtera menja visinu kad se dodaju oznake izbora.
      observer = new ResizeObserver(() => map.resize());
      observer.observe(containerRef.current);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located.map((t) => `${t.slug}:${t.lat}:${t.lng}`).join(',')]);

  if (located.length === 0) {
    return (
      <div className="tour-map-empty">
        Za prikazane ture još nema sačuvanih koordinata.
      </div>
    );
  }

  return <div ref={containerRef} className="tour-map" />;
}
