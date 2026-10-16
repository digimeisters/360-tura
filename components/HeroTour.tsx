'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ShowcaseRoom, ShowcaseTour } from '../app/lib/showcaseTours';
import type { HomeLang } from '../app/lib/homeCopy';
import { tourHref as buildTourHref } from '../app/lib/tourHref';
import { IconPlay } from './SiteIcons';

const LABELS: Record<
  HomeLang,
  { empty: string; sample: string; open: string; drag: string; pick: string; plan: string; view: string; prev: string; next: string; position: string }
> = {
  sr: {
    empty: 'Primer ture stiže uskoro.',
    sample: 'Primer · {city}',
    open: 'Otvori celu turu',
    drag: 'Prevucite da pogledate okolo',
    pick: 'Izaberite tačku na tlocrtu',
    plan: 'Tlocrt - izaberite prostoriju',
    view: '360° pogled: {room}. Strelice levo i desno okreću pogled.',
    prev: 'Prethodna prostorija',
    next: 'Sledeća prostorija',
    position: '{current} od {total}'
  },
  en: {
    empty: 'A sample tour is coming soon.',
    sample: 'Sample · {city}',
    open: 'Open the full tour',
    drag: 'Drag to look around',
    pick: 'Pick a dot on the floor plan',
    plan: 'Floor plan - pick a room',
    view: '360° view: {room}. Left and right arrows turn the view.',
    prev: 'Previous room',
    next: 'Next room',
    position: '{current} of {total}'
  }
};

// Panorama je visoka ZOOM puta koliko i kadar: vidi se samo pojas oko
// horizonta, gde je slika 2:1 najmanje izobličena (bez pravog 3D prikaza -
// on je u turi, a ovde bi doneo ceo preglednik na početnu).
const ZOOM = 2.6;
// Lagano okretanje dok posetilac ne dirne kadar (px po sličici).
const DRIFT = 0.22;
const KEY_STEP = 80;

/**
 * Vrh početne strane: prava tura preko cele širine. Prvo se pokaže sličica
 * sobe (brzo, ona je "glavni sadržaj" za Google - vidi lib/heroPreload), pa
 * se u pozadini učita panorama i kadar postaje pomerljiv: prevlačenje mišem
 * ili prstom, strelice na tastaturi. Tačke na tlocrtu menjaju sobu, isto kao
 * mali tlocrt u samoj turi (app/tour/[slug]/FloorplanMiniMap).
 */
export default function HeroTour({ tour, lang = 'sr' }: { tour: ShowcaseTour | null; lang?: HomeLang }) {
  const t = LABELS[lang];
  const rooms = tour?.rooms ?? [];
  const [activeId, setActiveId] = useState<string | null>(tour?.coverRoomId ?? rooms[0]?.id ?? null);
  // Soba čija je panorama učitana i prikazana (null = još se vidi sličica).
  const [panoId, setPanoId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // Poruka "izaberite tačku" stoji dok posetilac prvi put ne promeni sobu.
  const [picked, setPicked] = useState(false);
  const panoRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const latest = useRef<string | null>(null);

  const room = rooms.find((r) => r.id === activeId) ?? rooms[0];

  const setOffset = useCallback((value: number) => {
    offset.current = value;
    if (panoRef.current) panoRef.current.style.backgroundPositionX = `${value}px`;
  }, []);

  // Panorama sobe se prvo skine, pa tek onda prikaže - do tada se vidi
  // sličica, pa kadar nikad ne ostane prazan. Dekodiranje se čeka najviše
  // pola sekunde: slika od 6000px se na sporijem telefonu (ili u kartici u
  // pozadini) dekodira dugo, a onload je dovoljan da je pregledač nacrta.
  const loadPanorama = useCallback(
    (target: ShowcaseRoom) => {
      if (!target.panoramaUrl) return;
      latest.current = target.id;
      const img = new Image();
      img.onload = () => {
        const show = () => {
          if (latest.current !== target.id) return;
          setOffset(0);
          setPanoId(target.id);
        };
        Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 500))]).then(show);
      };
      img.src = target.panoramaUrl;
    },
    [setOffset]
  );

  // Prva panorama tek kad je strana učitana - ne takmiči se sa sličicom i fontovima.
  useEffect(() => {
    if (!room) return;
    const start = () => loadPanorama(room);
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
    // Samo pri prvom prikazu; kasnije sobe učitava selectRoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jedini pokret koji niko nije pokrenuo: sporo okretanje dok posetilac ne dirne kadar.
  useEffect(() => {
    if (touched || !panoId) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = requestAnimationFrame(function step() {
      setOffset(offset.current - DRIFT);
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [touched, panoId, setOffset]);

  if (!tour || !room) {
    return (
      <div className="ht-media ht-empty">
        <p>{t.empty}</p>
      </div>
    );
  }

  const selectRoom = (id: string | undefined) => {
    const target = rooms.find((r) => r.id === id);
    if (!target || target.id === room.id) return;
    setTouched(true);
    setPicked(true);
    setActiveId(target.id);
    setPanoId(null);
    loadPanorama(target);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!panoId) return;
    setTouched(true);
    drag.current = { x: e.clientX, start: offset.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setOffset(drag.current.start + (e.clientX - drag.current.x));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!panoId || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    setTouched(true);
    setOffset(offset.current + (e.key === 'ArrowLeft' ? KEY_STEP : -KEY_STEP));
  };

  const showPano = panoId === room.id && room.panoramaUrl;
  const marked = rooms.filter((r) => r.planX !== null && r.planY !== null);
  const hasPlan = Boolean(tour.floorplanUrl) && marked.length > 1;
  const index = rooms.findIndex((r) => r.id === room.id);
  const href = buildTourHref(tour.slug, tour.languages, lang);

  return (
    <div className={`ht-media${touched ? ' is-touched' : ''}`}>
      {/* Sličica je najveći element na ekranu (LCP) - visok prioritet, strana je
          unapred učita (lib/heroPreload). Ostaje ispod panorame kao podloga. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 1200x630 JPG sa CDN-a, nema šta da se optimizuje */}
      <img className="ht-still" src={room.previewUrl} alt="" fetchPriority="high" />
      <div
        ref={panoRef}
        className={`ht-pano${showPano ? ' is-ready' : ''}`}
        style={showPano ? { backgroundImage: `url(${room.panoramaUrl})`, backgroundSize: `auto ${ZOOM * 100}%` } : undefined}
        role="img"
        aria-label={t.view.replace('{room}', room.title)}
        tabIndex={showPano ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      />
      {showPano && <span className="ht-hint" aria-hidden="true">{t.drag}</span>}

      <div className="ht-card">
        <div className="ht-card-head">
          {/* Jasno da je ovo primer i odakle je - ne nečiji aktuelni oglas. */}
          <span className="ht-sample">{tour.city ? t.sample.replace('{city}', tour.city) : tour.title}</span>
          <strong>{room.title}</strong>
        </div>

        {hasPlan && !picked && (
          <p className="ht-pick" aria-hidden="true">
            <i />
            {t.pick}
          </p>
        )}
        {hasPlan ? (
          <div className="ht-plan" role="group" aria-label={t.plan}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG tlocrt sa CDN-a */}
            <img src={tour.floorplanUrl as string} alt="" />
            {marked.map((r) => (
              <button
                key={r.id}
                type="button"
                className="ht-dot"
                data-on={r.id === room.id || undefined}
                style={{ left: `${r.planX}%`, top: `${r.planY}%` }}
                onClick={() => selectRoom(r.id)}
                aria-label={r.title}
                aria-pressed={r.id === room.id}
                title={r.title}
              />
            ))}
          </div>
        ) : (
          <div className="ht-steps">
            <button type="button" onClick={() => selectRoom(rooms[index - 1]?.id)} disabled={index <= 0} aria-label={t.prev}>‹</button>
            <span>{t.position.replace('{current}', String(index + 1)).replace('{total}', String(rooms.length))}</span>
            <button type="button" onClick={() => selectRoom(rooms[index + 1]?.id)} disabled={index >= rooms.length - 1} aria-label={t.next}>›</button>
          </div>
        )}

        <a className="ht-open" href={href} data-track="cta:hero_device_tour">
          <IconPlay /> {t.open}
        </a>
      </div>
    </div>
  );
}
