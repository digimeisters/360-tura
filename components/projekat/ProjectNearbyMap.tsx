'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { NEARBY_COLORS, NEARBY_ICONS, NEARBY_LABELS, walkMinutes, type NearbyPlace } from '../../app/lib/nearby';

/**
 * Leaflet mapa okoline projekta (isti pristup kao TourMap na /ture:
 * OpenStreetMap pločice, sopstvene ikone umesto Leaflet-ovih slika). Zgrada
 * je plavi pin, mesta su krugovi u boji kategorije. Učitava se samo u
 * pregledaču (ProjectNearby -> next/dynamic, ssr:false).
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function ProjectNearbyMap({
  lat,
  lng,
  title,
  places,
  lang,
  active
}: {
  lat: number;
  lng: number;
  title: string;
  places: NearbyPlace[];
  lang: 'sr' | 'en';
  /** Istaknuto mesto iz spiska (indeks u places) - mapa ga otvori. */
  active: number | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<import('leaflet').Marker[]>([]);

  useEffect(() => {
    if (!boxRef.current) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    import('leaflet').then((L) => {
      if (cancelled || !boxRef.current) return;
      const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      const home = L.divIcon({
        className: '',
        html: `<div style="width:40px;height:40px;transform:translate(-20px,-36px)">
          <svg width="40" height="40" viewBox="0 0 30 30" fill="none">
            <path d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z" fill="#1E5AA8" stroke="#fff" stroke-width="1.5"/>
            <rect x="11" y="8" width="8" height="8" rx="2" transform="rotate(45 15 12)" fill="none" stroke="#fff" stroke-width="2"/>
          </svg></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
        popupAnchor: [0, -34]
      });
      const bounds = L.latLngBounds([[lat, lng]]);
      L.marker([lat, lng], { icon: home, zIndexOffset: 1000 }).addTo(map).bindPopup(`<b>${esc(title)}</b>`);

      markersRef.current = places.map((p) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;transform:translate(-14px,-14px);border-radius:50%;background:${NEARBY_COLORS[p.cat]};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px">${NEARBY_ICONS[p.cat]}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });
        bounds.extend([p.lat, p.lng]);
        const label = p.name || NEARBY_LABELS[lang][p.cat];
        const walk = lang === 'en' ? `${walkMinutes(p.m)} min walk` : `${walkMinutes(p.m)} min peške`;
        return L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${esc(label)}</b><br><span style="color:#5B5D63">${esc(NEARBY_LABELS[lang][p.cat])} · ${walk}</span>`);
      });
      if (places.length) map.fitBounds(bounds.pad(0.12), { maxZoom: 16 });

      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(boxRef.current);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [lat, lng, title, places, lang]);

  useEffect(() => {
    if (active === null) return;
    const marker = markersRef.current[active];
    if (marker && mapRef.current) {
      mapRef.current.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }, [active]);

  return <div ref={boxRef} className="inv-nearby-map" role="region" aria-label={lang === 'en' ? 'Map of the area' : 'Mapa okoline'} />;
}
