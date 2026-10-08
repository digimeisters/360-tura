'use client';

import { useState } from 'react';
import {
  cleanPhotos,
  cleanRooms,
  MAX_UNIT_PHOTOS,
  parseRoomsText,
  roomsToText,
  type UnitRoom,
  type UnitRow
} from '../../app/lib/projects';
import { srPlural } from '../../app/lib/projectI18n';

/**
 * Admin -> tabela stanova -> „Detalji": kartica stana kao kod velikih
 * prodajnih sajtova (migracija 024): osnova stana, 3D osnova, slike i
 * kvadratura po prostorijama. „Primeni na iste stanove" prenosi sve to na
 * isti tip stana na drugim spratovima (2A -> 3A, 4A…), pa se ne radi stan
 * po stan.
 */

type Api = (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
type Upload = (file: File, kind: 'unit') => Promise<string>;

export default function UnitMediaModal({
  unit,
  projectId,
  api,
  upload,
  onSaved,
  onClose,
  onCopied
}: {
  unit: UnitRow;
  projectId: string;
  api: Api;
  upload: Upload;
  onSaved: (u: UnitRow) => void;
  onClose: () => void;
  /** Posle „Primeni na iste stanove" - roditelj ponovo učita stanove. */
  onCopied: () => Promise<void>;
}) {
  const [planUrl, setPlanUrl] = useState(unit.plan_url);
  const [plan3dUrl, setPlan3dUrl] = useState(unit.plan3d_url);
  const [photos, setPhotos] = useState<string[]>(cleanPhotos(unit.photos));
  const [roomsText, setRoomsText] = useState(roomsToText(cleanRooms(unit.rooms)));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [withTour, setWithTour] = useState(true);

  const parsed = parseRoomsText(roomsText);
  const total = Math.round(parsed.rooms.reduce((s, r) => s + r.m2, 0) * 100) / 100;
  const area = unit.area_sqm === null ? null : Number(unit.area_sqm);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Greška.' });
    } finally {
      setBusy('');
    }
  };

  const pickImage = (onUrl: (url: string) => void, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(label, async () => onUrl(await upload(file, 'unit')));
  };

  const aiFillRooms = () => {
    if (!planUrl) return;
    if (roomsText.trim() && !window.confirm('Ovo zamenjuje unetu listu prostorija predlogom AI-ja pročitanim sa osnove. Nastaviti?')) return;
    run('ai-rooms', async () => {
      const json = await api('rooms-from-plan', { projectId, imageUrl: planUrl, areaSqm: unit.area_sqm });
      const rooms = cleanRooms(json.rooms);
      const dims = Array.isArray(json.dims) ? (json.dims as string[]) : [];
      setRoomsText(roomsToText(rooms));
      // Pročitane mere uz svaku prostoriju - brza provera uz osnovu pre čuvanja.
      const lines = rooms.map((r, i) => `${r.name}${dims[i] ? `: ${dims[i]}` : ''} = ${String(r.m2).replace('.', ',')} m²`);
      return [
        `AI je pročitao ${rooms.length} ${srPlural(rooms.length, 'prostoriju', 'prostorije', 'prostorija')} sa osnove. Uporedite mere sa osnovom pa kliknite „Sačuvaj“:`,
        ...lines,
        json.backup ? 'Glavni model je bio zauzet, pa je čitao rezervni - proverite mere posebno pažljivo.' : ''
      ]
        .filter(Boolean)
        .join('\n');
    });
  };

  const save = () =>
    run('save', async () => {
      if (parsed.errors.length) throw new Error(parsed.errors.slice(0, 3).join('\n'));
      const rooms: UnitRoom[] = parsed.rooms;
      const json = await api('unit-save', { projectId, id: unit.id, fields: { plan_url: planUrl, plan3d_url: plan3dUrl, photos, rooms } });
      onSaved(json.unit as UnitRow);
      return `Stan ${unit.code} je sačuvan.`;
    });

  const copy = () =>
    run('copy', async () => {
      // Prvo sačuvaj ono što piše u prozoru, pa tek onda prenesi na druge stanove.
      if (parsed.errors.length) throw new Error(parsed.errors.slice(0, 3).join('\n'));
      const json = await api('unit-save', { projectId, id: unit.id, fields: { plan_url: planUrl, plan3d_url: plan3dUrl, photos, rooms: parsed.rooms } });
      onSaved(json.unit as UnitRow);
      const res = await api('unit-media-copy', { projectId, sourceId: unit.id, includeTour: withTour });
      await onCopied();
      return `Preneto na ${res.count} ${srPlural(res.count as number, 'stan', 'stana', 'stanova')}: ${(res.codes as string[]).join(', ')}.`;
    });

  const imageBlock = (title: string, hint: string, url: string | null, set: (v: string | null) => void, key: string) => (
    <div className="um-block">
      <b>{title}</b>
      <small>{hint}</small>
      {url ? (
        <div className="um-img">
          {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a */}
          <img src={url} alt="" />
          <button type="button" className="pa-btn is-danger" onClick={() => set(null)}>
            Ukloni
          </button>
        </div>
      ) : null}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy === key} onChange={pickImage((u) => set(u), key)} />
      {busy === key && <small>Otpremam…</small>}
    </div>
  );

  return (
    <div className="um-bg" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="um" role="dialog" aria-modal="true" aria-labelledby="um-title">
        <div className="pa-row" style={{ justifyContent: 'space-between' }}>
          <h2 id="um-title" style={{ margin: 0 }}>
            Stan {unit.code} · detalji
          </h2>
          <button type="button" className="pa-btn" onClick={onClose} disabled={Boolean(busy)}>
            Zatvori
          </button>
        </div>
        <p className="pa-hint" style={{ margin: '4px 0 12px' }}>
          Ovo kupac vidi u kartici stana: osnova, 3D osnova, slike i kvadratura po prostorijama. Prazno se ne prikazuje.
        </p>
        {msg && <p className={msg.ok ? 'pa-msg is-ok' : 'pa-msg is-err'}>{msg.text}</p>}

        <div className="um-grid">
          {imageBlock('Osnova stana', 'Tlocrt samo ovog stana (PNG/JPG), sa nameštajem ako ga arhitekta ima.', planUrl, setPlanUrl, 'plan')}
          {imageBlock('3D osnova', 'Render stana odozgo, ako postoji.', plan3dUrl, setPlan3dUrl, 'plan3d')}
        </div>

        <div className="um-block">
          <b>
            Slike stana ({photos.length}/{MAX_UNIT_PHOTOS})
          </b>
          <small>Renderi enterijera ili fotografije uzornog stana. Redosled = redosled prikaza.</small>
          {photos.length > 0 && (
            <div className="um-thumbs">
              {photos.map((p, i) => (
                <div key={p} className="um-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a */}
                  <img src={p} alt="" />
                  <span>
                    {i > 0 && (
                      <button type="button" title="Pomeri levo" onClick={() => setPhotos((ps) => ps.map((x, j) => (j === i - 1 ? ps[i] : j === i ? ps[i - 1] : x)))}>
                        ←
                      </button>
                    )}
                    <button type="button" title="Ukloni" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_UNIT_PHOTOS && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy === 'photos'}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, MAX_UNIT_PHOTOS - photos.length);
                e.target.value = '';
                if (!files.length) return;
                run('photos', async () => {
                  for (const f of files) {
                    const url = await upload(f, 'unit');
                    setPhotos((ps) => [...ps, url].slice(0, MAX_UNIT_PHOTOS));
                  }
                  return `Otpremljeno slika: ${files.length}. Kliknite „Sačuvaj“.`;
                });
              }}
            />
          )}
          {busy === 'photos' && <small>Otpremam slike…</small>}
        </div>

        <div className="um-block">
          <div className="pa-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <b>Prostorije i kvadratura</b>
              <small style={{ display: 'block' }}>Jedan red = jedna prostorija, kvadratura na kraju. Može da se nalepi iz Excela ili sa osnove arhitekte.</small>
            </div>
            <button
              type="button"
              className="pa-btn"
              disabled={!planUrl || Boolean(busy)}
              title={planUrl ? 'Čita mere sa otpremljene osnove stana i predlaže prostorije - proverite pre čuvanja' : 'Prvo otpremite osnovu stana gore'}
              onClick={aiFillRooms}
            >
              {busy === 'ai-rooms' ? 'Čitam osnovu…' : '✨ Popuni iz osnove'}
            </button>
          </div>
          <textarea
            value={roomsText}
            onChange={(e) => setRoomsText(e.target.value)}
            rows={7}
            placeholder={'Hodnik 15,17\nDnevna soba sa kuhinjom 28,44\nSpavaća soba 13,48\nKupatilo 5,20\nTerasa 9,26'}
            style={{ fontFamily: 'ui-monospace, monospace' }}
          />
          {parsed.errors.length > 0 ? (
            <small style={{ color: 'var(--danger)' }}>{parsed.errors[0]}</small>
          ) : parsed.rooms.length > 0 ? (
            <small>
              {parsed.rooms.length} prostorija · ukupno <b>{String(total).replace('.', ',')} m²</b>
              {area !== null && Math.abs(total - area) > 0.5 && (
                <span style={{ color: '#B45309' }}>
                  {' '}
                  - površina stana u tabeli je {String(area).replace('.', ',')} m²; proverite
                </span>
              )}
            </small>
          ) : null}
        </div>

        <div className="pa-row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <button type="button" className="pa-btn is-primary" onClick={save} disabled={Boolean(busy)}>
            {busy === 'save' ? 'Čuvam…' : 'Sačuvaj'}
          </button>
          <span className="pa-row">
            <label className="pa-row" style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>
              <input type="checkbox" checked={withTour} onChange={(e) => setWithTour(e.target.checked)} /> i 360° turu
            </label>
            <button type="button" className="pa-btn" onClick={copy} disabled={Boolean(busy)} title="Isti tip stana na drugim spratovima (2A → 3A, 4A…)">
              {busy === 'copy' ? 'Prenosim…' : 'Sačuvaj i primeni na iste stanove'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
