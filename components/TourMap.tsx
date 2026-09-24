'use client';

import { useEffect, useRef } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { tourHref } from '../app/lib/tourHref';
import 'leaflet/dist/leaflet.css';

/**
 * Mapa sa pinom po turi (/ture, dugme "Mapa"). Leaflet + OpenStreetMap -
 * besplatno, bez API ključa. Uvezen direktno (ne default marker ikone iz
 * leaflet/dist/images, koje se lome kod bundlera) - pin je sopstveni SVG u
 * boji brenda, isti dijamant kao logo.
 *
 * Client-only (Leaflet dira window/document): stranica ovu komponentu
 * učitava kroz next/dynamic sa ssr:false.
 */

const CATEGORY_LABELS: Record<string, string> = { sale: 'Prodaja', rent: 'Izdavanje', booking: 'Stan na dan' };

function pinIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    html: `
      <div style="width:30px;height:30px;transform:translate(-15px,-27px)">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z" fill="#1E5AA8" stroke="#fff" stroke-width="1.5"/>
          <circle cx="15" cy="12" r="4" fill="#fff"/>
        </svg>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 27],
    popupAnchor: [0, -26]
  });
}

export default function TourMap({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);

  const located = tours.filter(
    (t): t is ShowcaseTour & { lat: number; lng: number } => t.lat !== null && t.lng !== null
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([44.0165, 21.0059], 7);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      const icon = pinIcon(L);
      const markers: import('leaflet').Marker[] = [];

      located.forEach((tour) => {
        const marker = L.marker([tour.lat, tour.lng], { icon }).addTo(map);
        const category = tour.category ? CATEGORY_LABELS[tour.category] : null;
        marker.bindPopup(
          `<div style="font-family:inherit;min-width:160px">
            ${tour.coverUrl ? `<img src="${tour.coverUrl}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ''}
            <div style="font-weight:700;font-size:13px;color:#111113;line-height:1.3">${escapeHtml(tour.title)}</div>
            ${category ? `<div style="font-size:11.5px;color:#797B81;margin-top:2px">${escapeHtml(category)}</div>` : ''}
            <a href="${tourHref(tour.slug, tour.languages, lang)}" style="display:inline-block;margin-top:6px;font-size:12.5px;font-weight:700;color:#1E5AA8;text-decoration:none">Otvori turu →</a>
          </div>`
        );
        markers.push(marker);
      });

      // Mapa pored filtera menja visinu kad se dodaju oznake izbora -
      // bez ovoga bi Leaflet ostavio sive pločice na novom delu.
      const container = containerRef.current;
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(container);
      resizeRef.current = observer;

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        if (markers.length === 1) {
          map.setView(group.getBounds().getCenter(), 14);
        } else {
          map.fitBounds(group.getBounds().pad(0.2));
        }
      }
    });

    return () => {
      cancelled = true;
      resizeRef.current?.disconnect();
      resizeRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
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

// Podaci idu u innerHTML (Leaflet popup ne prolazi kroz React) - naziv
// nekretnine upisuje agent, pa mora da se očisti pre umetanja u HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
