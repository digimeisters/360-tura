'use client';

import { useState } from 'react';
import { adminAuthHeader } from '../../app/lib/authFetch';
import { NEARBY_CATEGORIES, NEARBY_ICONS, NEARBY_LABELS, parseNearby, walkMinutes, type NearbyPlace } from '../../app/lib/nearby';

/**
 * Admin projekta -> "Okolina na mapi": koordinate projekta (iz adrese ili
 * ručno) i dugme koje iz OpenStreetMap-a pronalazi škole, vrtiće,
 * prodavnice, apoteke, zdravstvo, autobus i parkove u krugu od 1,2 km.
 * Rezultat se čuva u bazi (migracija 022) i prikazuje na javnoj strani.
 */

type Props = {
  projectId: string;
  lat: number | null;
  lng: number | null;
  nearby: unknown;
  nearbyUpdatedAt: string | null;
  onChange: (patch: { lat: number | null; lng: number | null; nearby?: NearbyPlace[]; nearby_updated_at?: string }) => void;
};

async function call(payload: Record<string, unknown>) {
  const res = await fetch('/api/admin/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Greška na serveru.');
  return json;
}

export default function NearbyPanel({ projectId, lat, lng, nearby, nearbyUpdatedAt, onChange }: Props) {
  const places = parseNearby(nearby);
  const [coords, setCoords] = useState(lat !== null && lng !== null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveCoords = async () => {
    const parts = coords.split(/[,;\s]+/).filter(Boolean).map(Number);
    const clear = !coords.trim();
    if (!clear && (parts.length !== 2 || parts.some((n) => !Number.isFinite(n)))) {
      setMsg({ ok: false, text: 'Upišite koordinate kao „44.0128, 20.9114" (desni klik na mesto u Google mapama ih kopira).' });
      return;
    }
    setBusy('coords');
    setMsg(null);
    try {
      await call({ action: 'update', id: projectId, fields: clear ? { lat: null, lng: null } : { lat: parts[0], lng: parts[1] } });
      onChange(clear ? { lat: null, lng: null } : { lat: parts[0], lng: parts[1] });
      setMsg({ ok: true, text: clear ? 'Koordinate su obrisane.' : 'Koordinate su sačuvane. Kliknite „Pronađi okolinu" da se okolina osveži.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Nije sačuvano.' });
    } finally {
      setBusy('');
    }
  };

  const refresh = async () => {
    setBusy('nearby');
    setMsg(null);
    try {
      const json = await call({ action: 'nearby-refresh', id: projectId });
      onChange({ lat: json.lat, lng: json.lng, nearby: json.nearby, nearby_updated_at: json.nearby_updated_at });
      setCoords(`${Number(json.lat).toFixed(6)}, ${Number(json.lng).toFixed(6)}`);
      setMsg({ ok: true, text: `Pronađeno mesta u okolini: ${json.nearby.length}. Već se vide na strani projekta.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Okolina nije pronađena.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="pa-card">
      <h2>Okolina na mapi</h2>
      <p className="pa-hint">
        Mapa na strani projekta sa školama, vrtićima, prodavnicama, apotekama, zdravstvom, autobusom i parkovima u krugu od 1,2 km, i
        koliko je to minuta hoda. Podaci su iz OpenStreetMap-a; lokacija se uzima iz adrese projekta.
      </p>
      {msg && <p className={msg.ok ? 'pa-msg is-ok' : 'pa-msg is-err'}>{msg.text}</p>}

      <div className="pa-row" style={{ alignItems: 'flex-end' }}>
        <label className="pa-field" style={{ flex: '1 1 260px' }}>
          Koordinate (širina, dužina)
          <input type="text" value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="iz adrese - ili npr. 44.0128, 20.9114" />
        </label>
        <button type="button" className="pa-btn" onClick={saveCoords} disabled={busy === 'coords'}>
          Sačuvaj koordinate
        </button>
        {lat !== null && lng !== null && (
          <a className="pa-btn" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noreferrer">
            Proveri na mapi ↗
          </a>
        )}
        <button type="button" className="pa-btn is-primary" onClick={refresh} disabled={busy === 'nearby'}>
          {busy === 'nearby' ? 'Tražim (do 20 s)...' : places.length ? 'Osveži okolinu' : 'Pronađi okolinu'}
        </button>
      </div>

      {places.length > 0 ? (
        <div className="pa-grid" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {NEARBY_CATEGORIES.filter((c) => places.some((p) => p.cat === c)).map((c) => (
            <div key={c} style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px', fontSize: 13 }}>
              <b>
                {NEARBY_ICONS[c]} {NEARBY_LABELS.sr[c]}
              </b>
              {places
                .filter((p) => p.cat === c)
                .map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || NEARBY_LABELS.sr[c]}</span>
                    <span style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{walkMinutes(p.m)} min</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="pa-empty" style={{ marginTop: 14 }}>
          Okolina još nije pronađena.
        </div>
      )}
      {nearbyUpdatedAt && (
        <p className="pa-hint" style={{ margin: '8px 0 0' }}>
          Poslednji put: {new Date(nearbyUpdatedAt).toLocaleDateString('sr-RS')}. Ako nešto fali ili je pogrešno, to je u OpenStreetMap-u - posle
          ispravke tamo kliknite „Osveži okolinu“.
        </p>
      )}
    </section>
  );
}
