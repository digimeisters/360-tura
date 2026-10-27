'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NEARBY_COLORS, NEARBY_ICONS, NEARBY_LABELS, walkMinutes, type NearbyPlace } from '../../app/lib/nearby';
import { createMap, escapeHtml, htmlElement, loadMapLibre, setupMapControls } from '../maps/protomaps';

/**
 * Mapa okoline projekta (isti pristup kao TourMap na /ture: naša mapa Srbije
 * sa R2-a, MapLibre, sopstvene oznake). Zgrada je plavi pin, mesta su krugovi
 * u boji kategorije. Učitava se samo u pregledaču (ProjectNearby ->
 * next/dynamic, ssr:false), i to tek kad posetilac priđe mapi - ona je pri
 * dnu strane, a biblioteka je teška.
 */

const HOME = `
  <svg width="40" height="40" viewBox="0 0 30 30" fill="none" style="display:block">
    <path d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z" fill="#1E5AA8" stroke="#fff" stroke-width="1.5"/>
    <rect x="11" y="8" width="8" height="8" rx="2" transform="rotate(45 15 12)" fill="none" stroke="#fff" stroke-width="2"/>
  </svg>`;

export default function ProjectNearbyMap({
  lat,
  lng,
  title,
  places,
  lang,
  active,
  radiusM,
  fill = false
}: {
  lat: number;
  lng: number;
  title: string;
  places: NearbyPlace[];
  lang: 'sr' | 'en';
  /** Istaknuto mesto iz spiska (indeks u places) - mapa ga otvori. */
  active: number | null;
  /** Isprekidan krug oko nekretnine (okolina ture: RADIUS_M ≈ 15 min hoda). */
  radiusM?: number;
  /** Mapa popuni roditelja (okolina ture), umesto visine iz .inv-nearby-map. */
  fill?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [visible, setVisible] = useState(false);

  // Mapa se pravi tek kad je kutija blizu ekrana.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !boxRef.current) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadMapLibre().then(({ maplibregl, style }) => {
      if (cancelled || !boxRef.current) return;
      const map = createMap(maplibregl, boxRef.current, style, [lng, lat], 15, lang);
      if (!map) return;
      mapRef.current = map;
      setupMapControls(maplibregl, map);

      const bounds = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
      // title = ime tačke za čitač ekrana (oznaka je fokusabilno dugme bez teksta).
      new maplibregl.Marker({ element: htmlElement(HOME, title), anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 34 }).setHTML(`<b>${escapeHtml(title)}</b>`))
        .addTo(map);

      markersRef.current = places.map((p) => {
        const label = p.name || NEARBY_LABELS[lang][p.cat];
        const walk = lang === 'en' ? `${walkMinutes(p.m)} min walk` : `${walkMinutes(p.m)} min peške`;
        const el = htmlElement(
          `<div style="width:28px;height:28px;border-radius:50%;background:${NEARBY_COLORS[p.cat]};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px">${NEARBY_ICONS[p.cat]}</div>`,
          `${label} · ${walk}`
        );
        bounds.extend([p.lng, p.lat]);
        return new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16 }).setHTML(
              `<b>${escapeHtml(label)}</b><br><span style="color:#5B5D63">${escapeHtml(NEARBY_LABELS[lang][p.cat])} · ${walk}</span>`
            )
          )
          .addTo(map);
      });
      if (radiusM) {
        const ring = circleRing(lat, lng, radiusM);
        map.on('load', () => {
          map.addSource('nearby-radius', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } }
          });
          map.addLayer({
            id: 'nearby-radius',
            type: 'line',
            source: 'nearby-radius',
            paint: { 'line-color': '#1E5AA8', 'line-opacity': 0.45, 'line-width': 1.5, 'line-dasharray': [2, 2] }
          });
        });
      }
      // Kadar prati mesta (ne krug) - inače su tačke sitne i zbijene u sredini.
      if (places.length) map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });

      observer = new ResizeObserver(() => map.resize());
      observer.observe(boxRef.current);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [visible, lat, lng, title, places, lang, radiusM]);

  useEffect(() => {
    if (active === null) return;
    const marker = markersRef.current[active];
    const map = mapRef.current;
    if (marker && map) {
      map.panTo(marker.getLngLat());
      if (!marker.getPopup()?.isOpen()) marker.togglePopup();
    }
  }, [active]);

  return (
    <div
      ref={boxRef}
      className={fill ? undefined : 'inv-nearby-map'}
      style={fill ? { width: '100%', height: '100%' } : undefined}
      role="region"
      aria-label={lang === 'en' ? 'Map of the area' : 'Mapa okoline'}
    />
  );
}

/** Krug poluprečnika r metara oko tačke, kao zatvorena linija (64 tačke). */
function circleRing(lat: number, lng: number, r: number): [number, number][] {
  const dLat = r / 111320;
  const dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return pts;
}
