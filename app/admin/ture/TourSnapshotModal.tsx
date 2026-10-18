'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import { PanoRenderer, type PanoView } from '../../tour/[slug]/video/panoRenderer';
import type { Room, Tour } from '../../tour/[slug]/types';
import { getLocalizedText, normalizeYaw, parseEstablish } from '../../tour/[slug]/utils';
import { SITE_URL } from '../../lib/site';
import { drawBadge, loadImage, type BadgeCorner } from './snapshot/composeSnapshot';
import { storeZip } from './snapshot/storeZip';

/**
 * "Snimak iz ture" (vlasnik, 17. 10. 2026, po uzoru na PanoCool Snapshot):
 * ravna slika bilo kog kadra ture za oglas (4zida, Halo oglasi) ili mreže,
 * sa bedžom i linkom ture - svaka slika u oglasu postaje ulaz u turu.
 *
 * Kadar se crta iz ORIGINALNE panorame istim WebGL prikazom kao video
 * (panoRenderer), u punoj veličini formata - nije snimak ekrana. Bedž crta
 * composeSnapshot, isto za pregled i za preuzetu sliku.
 *
 * Svaka soba može da ima VIŠE kadrova (vlasnik, 17. 10. 2026): agent namesti
 * ugao i zum, klikne "+ Dodaj kadar" i ugao se sačuva u listu te sobe (sa
 * malim pregledom); zatim pomera dalje za sledeći ugao. "Sve sobe odjednom"
 * pravi ZIP sa SVIM sačuvanim kadrovima (02-dnevna-soba-a, -b...); soba bez
 * sačuvanog kadra ide sa jednim, početnim kadrom iz ture.
 * "Preuzmi samo ovu sliku" skida trenutni kadar, bez dodavanja u listu.
 */

type Format = { key: string; label: string; ratio: string; w: number; h: number };
const FORMATS: Format[] = [
  { key: 'oglas', label: 'Oglas', ratio: '4:3', w: 1600, h: 1200 },
  { key: 'instagram', label: 'Instagram', ratio: '4:5', w: 1080, h: 1350 },
  { key: 'prica', label: 'Priča', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'facebook', label: 'Facebook', ratio: '1.91:1', w: 1200, h: 630 },
  { key: 'kvadrat', label: 'Kvadrat', ratio: '1:1', w: 1080, h: 1080 }
];
const CORNERS: { key: BadgeCorner; label: string }[] = [
  { key: 'tl', label: '↖' },
  { key: 'tr', label: '↗' },
  { key: 'bl', label: '↙' },
  { key: 'br', label: '↘' }
];
const PREVIEW_MAX_W = 760;
const PREVIEW_MAX_H = 520;
const DEFAULT_HFOV = 95;

/** Pregled: kopija za telefone (brža); slika za preuzimanje: najveća panorama. */
const previewUrl = (r: Room) => r.panorama_url_mobile || r.panorama_url_cf || r.panorama_url || '';
const fullUrl = (r: Room) => r.panorama_url_cf || r.panorama_url || r.panorama_url_mobile || '';

const fileSafe = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'dj')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'soba';

/** "Prošetajte kroz stan/kuću/prostor u 360°" po strukturi iz upitnika. */
function ctaFor(structure: string | null | undefined): string {
  const s = (structure || '').toLowerCase();
  if (s.includes('kuć')) return 'Prošetajte kroz kuću u 360°';
  if (s.includes('poslovn') || s.includes('lokal')) return 'Prošetajte kroz prostor u 360°';
  if (s) return 'Prošetajte kroz stan u 360°';
  return 'Prošetajte kroz nekretninu u 360°';
}

/** Link ture za bedž, bez https:// i www. */
const linkFor = (slug: string) => `${SITE_URL.replace(/^https?:\/\/(www\.)?/, '')}/tour/${slug}`;

/** "Dvosoban, 54 m² · Širi centar" iz podataka ture; bez njih naziv ture. */
function lineFor(tour: Tour): string {
  const area = Number(tour.area_sqm);
  const what = [tour.structure?.replace(/\s*\(.*\)$/, ''), area > 0 ? `${area} m²` : null].filter(Boolean).join(', ');
  const place = tour.district?.trim() || tour.city?.trim() || '';
  const text = [what, place].filter(Boolean).join(' · ');
  return text || getLocalizedText(tour.title_i18n, 'sr');
}

function startView(room: Room): PanoView {
  const est = parseEstablish(room.establish_i18n);
  return { yaw: normalizeYaw(est.fromYaw ?? 0), pitch: 0, hfov: DEFAULT_HFOV, alpha: 1 };
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

type Loaded = { tour: Tour; rooms: Room[]; logo: HTMLImageElement | null };

/** Sačuvan kadar sobe: ugao/zum i mali pregled (data URL) za listu. */
type Shot = { id: string; view: PanoView; thumb: string };

/** a, b, c... za više kadrova iste sobe u imenu fajla. */
const letter = (i: number) => (i < 26 ? String.fromCharCode(97 + i) : String(i + 1));

export default function TourSnapshotModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Greška pri preuzimanju ide pored dugmadi - ne briše prozor i sačuvane kadrove.
  const [exportError, setExportError] = useState<string | null>(null);
  const [roomIdx, setRoomIdx] = useState(0);
  const [fmtIdx, setFmtIdx] = useState(0);
  const [badgeOn, setBadgeOn] = useState(true);
  const [corner, setCorner] = useState<BadgeCorner>('br');
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  // Koja panorama je spremna u pregledu - dok nije ona izabrane sobe, piše "Učitavam".
  const [loadedUrl, setLoadedUrl] = useState('');
  // Sačuvani kadrovi po sobi (id sobe -> lista) - ulaze u "Sve sobe odjednom".
  const [shotsByRoom, setShotsByRoom] = useState<Map<string, Shot[]>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PanoRenderer | null>(null);
  const viewsRef = useRef<Map<string, PanoView>>(new Map());
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const frameRef = useRef(0);

  // --- učitavanje ture, soba i loga agencije ---
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [tourRes, roomsRes] = await Promise.all([
        supabase.from('tours').select('*').eq('slug', slug).single(),
        supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true })
      ]);
      if (cancelled) return;
      if (tourRes.error || !tourRes.data) {
        setError('Tura nije mogla da se učita. Proverite da li ste prijavljeni i pokušajte ponovo.');
        return;
      }
      const tour = tourRes.data as unknown as Tour;
      const rooms = ((roomsRes.data ?? []) as unknown as Room[]).filter((r) => previewUrl(r));
      if (!rooms.length) {
        setError('Tura još nema nijednu panoramu.');
        return;
      }
      let logo: HTMLImageElement | null = null;
      if (tour.agency_name) {
        const { data: branding } = await supabase.from('agency_branding').select('logo_url').eq('agency_name', tour.agency_name).maybeSingle();
        if (branding?.logo_url) logo = await loadImage(branding.logo_url).catch(() => null);
      }
      if (cancelled) return;
      try {
        rendererRef.current ??= new PanoRenderer(PREVIEW_MAX_W, PREVIEW_MAX_H);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'WebGL nije dostupan - otvorite admin u Chrome-u na računaru.');
        return;
      }
      setData({ tour, rooms, logo });
    })().catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Greška pri učitavanju.'));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fmt = FORMATS[fmtIdx];
  const room = data?.rooms[roomIdx] ?? null;
  const loadingPano = !!room && loadedUrl !== previewUrl(room);
  const preview = useMemo(() => {
    let w = PREVIEW_MAX_W;
    let h = (w * fmt.h) / fmt.w;
    if (h > PREVIEW_MAX_H) {
      h = PREVIEW_MAX_H;
      w = (h * fmt.w) / fmt.h;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }, [fmt]);

  const badgeFor = useCallback(
    (d: Loaded) => ({
      logo: d.logo,
      brand: d.tour.agency_name?.trim() || 'Kvadrat360',
      line: lineFor(d.tour),
      cta: ctaFor(d.tour.structure),
      link: linkFor(d.tour.slug),
      corner,
      scale
    }),
    [corner, scale]
  );

  const viewOf = useCallback((r: Room) => {
    const key = String(r.id);
    if (!viewsRef.current.has(key)) viewsRef.current.set(key, startView(r));
    return viewsRef.current.get(key)!;
  }, []);


  // --- pregled: WebGL kadar + bedž na vidljivom canvasu ---
  const draw = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !canvas || !data || !room) return;
      renderer.render([{ url: previewUrl(room), view: viewOf(room) }]);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(renderer.canvas, 0, 0, canvas.width, canvas.height);
      if (badgeOn) drawBadge(ctx, canvas.width, canvas.height, badgeFor(data));
    });
  }, [data, room, badgeOn, badgeFor, viewOf]);

  useEffect(() => {
    if (!data || !room) return;
    // Renderer se pravi pri učitavanju ture (tamo se javlja i greška bez WebGL2).
    if (!rendererRef.current) return;
    rendererRef.current.resize(preview.w, preview.h);
    let cancelled = false;
    const url = previewUrl(room);
    rendererRef.current
      .load(url)
      .then(() => {
        if (cancelled) return;
        setLoadedUrl(url);
        draw();
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Panorama nije učitana.'));
    return () => {
      cancelled = true;
    };
  }, [data, room, preview, draw]);

  // --- pomeranje kadra mišem/prstom i zum točkićem ---
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!room) return;
    const v = viewOf(room);
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: v.yaw, pitch: v.pitch };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || !room) return;
    const v = viewOf(room);
    const degPerPx = v.hfov / preview.w;
    v.yaw = normalizeYaw(d.yaw - (e.clientX - d.x) * degPerPx);
    v.pitch = Math.max(-80, Math.min(80, d.pitch + (e.clientY - d.y) * degPerPx));
    draw();
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!room) return;
      e.preventDefault();
      const v = viewOf(room);
      v.hfov = Math.max(40, Math.min(120, v.hfov + Math.sign(e.deltaY) * 4));
      draw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [room, draw, viewOf]);

  // --- izvoz u punoj veličini formata ---
  const exportRenderer = useRef<PanoRenderer | null>(null);
  const renderFull = useCallback(
    async (d: Loaded, r: Room, view: PanoView): Promise<Blob> => {
      if (!exportRenderer.current) exportRenderer.current = new PanoRenderer(fmt.w, fmt.h);
      else exportRenderer.current.resize(fmt.w, fmt.h);
      const url = fullUrl(r);
      exportRenderer.current.keepOnly(url);
      await exportRenderer.current.load(url);
      exportRenderer.current.render([{ url, view }]);
      if (exportRenderer.current.lost) {
        exportRenderer.current = null;
        throw new Error('Grafičkoj kartici je ponestalo memorije. Zatvorite druge kartice pregledača i pokušajte ponovo.');
      }
      const out = document.createElement('canvas');
      out.width = fmt.w;
      out.height = fmt.h;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Canvas nije dostupan.');
      ctx.drawImage(exportRenderer.current.canvas, 0, 0);
      if (badgeOn) drawBadge(ctx, fmt.w, fmt.h, badgeFor(d));
      return new Promise((resolve, reject) =>
        out.toBlob((b) => (b ? resolve(b) : reject(new Error('Slika nije napravljena.'))), 'image/jpeg', 0.92)
      );
    },
    [fmt, badgeOn, badgeFor]
  );

  const roomName = (r: Room, i: number) => getLocalizedText(r.title_i18n, 'sr') || `Soba ${i + 1}`;

  // --- sačuvani kadrovi ---
  const roomShots = room ? (shotsByRoom.get(String(room.id)) ?? []) : [];

  /** Trenutni ugao sobe ide u njenu listu; pregled je čist kadar (bez bedža) iz renderera. */
  const addShot = () => {
    if (!room || !rendererRef.current) return;
    const src = rendererRef.current.canvas;
    const thumb = document.createElement('canvas');
    thumb.height = 72;
    thumb.width = Math.round((72 * src.width) / Math.max(1, src.height));
    thumb.getContext('2d')?.drawImage(src, 0, 0, thumb.width, thumb.height);
    // Kopija ugla - inače bi dalje pomeranje menjalo i već sačuvan kadar.
    const shot: Shot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      view: { ...viewOf(room) },
      thumb: thumb.toDataURL('image/jpeg', 0.7)
    };
    const key = String(room.id);
    setShotsByRoom((prev) => new Map(prev).set(key, [...(prev.get(key) ?? []), shot]));
  };

  const removeShot = (shotId: string) => {
    if (!room) return;
    const key = String(room.id);
    setShotsByRoom((prev) => new Map(prev).set(key, (prev.get(key) ?? []).filter((x) => x.id !== shotId)));
  };

  /** Klik na sačuvan kadar vraća taj ugao u pregled (za proveru ili kao polazište za sledeći). */
  const showShot = (shot: Shot) => {
    if (!room) return;
    viewsRef.current.set(String(room.id), { ...shot.view });
    draw();
  };

  // Sve sobe: sačuvani kadrovi, a soba bez njih jedan početni kadar.
  const shotsFor = (r: Room): PanoView[] => {
    const saved = shotsByRoom.get(String(r.id)) ?? [];
    return saved.length ? saved.map((x) => x.view) : [startView(r)];
  };
  const totalImages = data ? data.rooms.reduce((n, r) => n + shotsFor(r).length, 0) : 0;
  const roomsWithShots = data ? data.rooms.filter((r) => (shotsByRoom.get(String(r.id)) ?? []).length > 0).length : 0;

  // Oba WebGL konteksta (pregled i izvoz) se oslobađaju kad se prozor zatvori.
  useEffect(
    () => () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      exportRenderer.current?.dispose();
      exportRenderer.current = null;
    },
    []
  );

  const downloadOne = async () => {
    if (!data || !room) return;
    setExportError(null);
    setBusy('one');
    try {
      const blob = await renderFull(data, room, viewOf(room));
      download(blob, `${slug}-${fileSafe(roomName(room, roomIdx))}-${fmt.key}.jpg`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Slika nije napravljena.');
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    if (!data) return;
    setExportError(null);
    setBusy('all');
    try {
      const files: { name: string; blob: Blob }[] = [];
      let done = 0;
      for (let i = 0; i < data.rooms.length; i++) {
        const r = data.rooms[i];
        const views = shotsFor(r);
        for (let j = 0; j < views.length; j++) {
          setBusy(`all:${++done}/${totalImages}`);
          const suffix = views.length > 1 ? `-${letter(j)}` : '';
          files.push({
            name: `${String(i + 1).padStart(2, '0')}-${fileSafe(roomName(r, i))}${suffix}-${fmt.key}.jpg`,
            blob: await renderFull(data, r, views[j])
          });
        }
      }
      download(await storeZip(files), `${slug}-${fmt.key}.zip`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Slike nisu napravljene.');
    } finally {
      setBusy(null);
    }
  };

  const chip = (on: boolean): React.CSSProperties => ({
    ...formBtnStyle,
    padding: '6px 11px',
    fontSize: '12.5px',
    borderRadius: '999px',
    ...(on ? { background: FORM.accent, color: '#fff', borderColor: FORM.accent } : {})
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,17,19,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label="Snimak iz ture"
    >
      <div style={{ background: FORM.surface, borderRadius: 18, width: 'min(1180px, 100%)', maxHeight: '100%', overflow: 'auto', boxShadow: '0 30px 70px -30px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${FORM.border}` }}>
          <div>
            <b style={{ fontSize: 17 }}>📸 Snimak iz ture</b>
            {data && <span style={{ color: FORM.textMuted, marginLeft: 8, fontSize: 14 }}>{getLocalizedText(data.tour.title_i18n, 'sr')}</span>}
          </div>
          <button onClick={onClose} aria-label="Zatvori" style={{ ...formBtnStyle, width: 34, height: 34, padding: 0, borderRadius: '50%' }}>
            ×
          </button>
        </div>

        {error ? (
          <p style={{ margin: 0, padding: 24, color: FORM.danger }}>{error}</p>
        ) : !data ? (
          <p style={{ margin: 0, padding: 24, color: FORM.textMuted }}>Učitavam turu…</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 560px', background: '#1A1A1E', display: 'grid', placeItems: 'center', padding: 20, minHeight: 560, position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width={preview.w}
                height={preview.h}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ width: preview.w, maxWidth: '100%', height: 'auto', boxShadow: '0 0 0 2px rgba(255,255,255,.85)', cursor: 'grab', touchAction: 'none' }}
              />
              <span style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, borderRadius: 999, padding: '5px 12px', pointerEvents: 'none' }}>
                {loadingPano ? 'Učitavam panoramu…' : 'Prevucite da namestite kadar · točkić za zum'}
              </span>
            </div>

            <div style={{ flex: '0 1 320px', padding: 18, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: `1px solid ${FORM.border}` }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted }}>Soba</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {data.rooms.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => setRoomIdx(i)}
                      aria-pressed={roomIdx === i}
                      title={roomName(r, i)}
                      style={{ border: `2px solid ${roomIdx === i ? FORM.accent : 'transparent'}`, borderRadius: 10, padding: 0, overflow: 'hidden', background: '#F1F1EC', aspectRatio: '4/3', position: 'relative', cursor: 'pointer' }}
                    >
                      {r.preview_url && (
                        // eslint-disable-next-line @next/next/no-img-element -- sličica sobe sa R2 CDN-a
                        <img src={r.preview_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.7))', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '10px 5px 4px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {roomName(r, i)}
                      </span>
                      {(shotsByRoom.get(String(r.id))?.length ?? 0) > 0 && (
                        <span
                          title="Sačuvanih kadrova"
                          style={{ position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: FORM.success, color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', lineHeight: 1 }}
                        >
                          {shotsByRoom.get(String(r.id))?.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {room && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted }}>
                    Kadrovi: {roomName(room, roomIdx)}
                  </p>
                  {roomShots.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {roomShots.map((shot, j) => (
                        <span key={shot.id} style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => showShot(shot)}
                            title={`Kadar ${letter(j)} - prikaži ga u pregledu`}
                            style={{ border: `1.5px solid ${FORM.border}`, borderRadius: 8, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'block', background: '#000' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- mali pregled sačuvanog kadra (data URL) */}
                            <img src={shot.thumb} alt={`Kadar ${letter(j)}`} style={{ height: 54, display: 'block' }} />
                          </button>
                          <span style={{ position: 'absolute', left: 5, bottom: 3, color: '#fff', fontSize: 11, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,.8)', pointerEvents: 'none' }}>
                            {letter(j)}
                          </span>
                          <button
                            onClick={() => removeShot(shot.id)}
                            aria-label={`Obriši kadar ${letter(j)}`}
                            title="Obriši kadar"
                            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 0, background: FORM.danger, color: '#fff', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: FORM.textMuted, lineHeight: 1.45 }}>
                      Još nema sačuvanih kadrova. Namestite ugao i kliknite „+ Dodaj kadar“. Bez toga ova soba ulazi u ZIP sa početnim kadrom iz
                      ture.
                    </p>
                  )}
                  <button
                    onClick={addShot}
                    disabled={loadingPano || !!busy}
                    style={{ ...formBtnStyle, marginTop: 10, width: '100%', padding: '10px', fontWeight: 800, background: FORM.accentSoft, color: FORM.accent, borderColor: FORM.accent }}
                  >
                    + Dodaj kadar{roomShots.length ? ` (${letter(roomShots.length)})` : ''}
                  </button>
                </div>
              )}

              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: FORM.textMuted }}>Format</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FORMATS.map((f, i) => (
                    <button key={f.key} onClick={() => setFmtIdx(i)} aria-pressed={fmtIdx === i} style={chip(fmtIdx === i)}>
                      {f.label} <span style={{ opacity: 0.7, fontWeight: 500 }}>{f.ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                  Bedž sa linkom ture
                  <input type="checkbox" checked={badgeOn} onChange={(e) => setBadgeOn(e.target.checked)} />
                </label>
                <div style={{ opacity: badgeOn ? 1 : 0.4, pointerEvents: badgeOn ? 'auto' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 8 }}>
                    {CORNERS.map((c) => (
                      <button key={c.key} onClick={() => setCorner(c.key)} aria-pressed={corner === c.key} aria-label={`Ugao ${c.label}`} style={{ ...chip(corner === c.key), borderRadius: 8 }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '10px 0 2px', fontSize: 12.5, color: FORM.textMuted, fontWeight: 600 }}>Veličina bedža</p>
                  <input type="range" min={0.7} max={1.4} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: '100%' }} />
                  <p style={{ margin: '4px 0 0', fontSize: 11.5, color: FORM.textMuted, lineHeight: 1.45 }}>
                    Link ture: {linkFor(data.tour.slug)}.
                    {data.logo ? ' U bedžu je logo agencije.' : ' Logo agencije (dugme „Logo“ uz agenciju) ide u bedž kad se doda.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, marginTop: 'auto' }}>
                <button
                  onClick={() => void downloadOne()}
                  disabled={!!busy || loadingPano}
                  style={{ ...formBtnStyle, background: FORM.accent, color: '#fff', borderColor: FORM.accent, padding: '12px', fontWeight: 800 }}
                >
                  {busy === 'one' ? 'Pravim sliku…' : `Preuzmi samo ovu sliku (JPG, ${fmt.w} × ${fmt.h})`}
                </button>
                <button onClick={() => void downloadAll()} disabled={!!busy} style={{ ...formBtnStyle, padding: '11px', fontWeight: 700 }}>
                  {busy?.startsWith('all') ? `Pravim slike… ${busy.split(':')[1] ?? ''}` : `Sve sobe odjednom (ZIP, ${totalImages} slika)`}
                </button>
                <p style={{ margin: 0, fontSize: 11.5, color: FORM.textMuted, lineHeight: 1.45 }}>
                  {exportError && <span style={{ display: 'block', color: FORM.danger, fontWeight: 600, marginBottom: 6 }}>{exportError}</span>}
                  Slike se prave u punoj oštrini iz originalne panorame. U ZIP ulaze svi sačuvani kadrovi
                  {roomsWithShots ? ` (${roomsWithShots}/${data.rooms.length} soba obrađeno)` : ''}, a sobe bez njih sa početnim kadrom iz ture.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
