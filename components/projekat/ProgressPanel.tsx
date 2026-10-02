'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminAuthHeader } from '../../app/lib/authFetch';
import type { TourOption } from '../../app/lib/projects';

/**
 * Admin projekta -> "Gradilište po mesecima": za svaki mesec jedna 360°
 * tura gradilišta (obična tura iz /admin/ture) i kratka napomena. Na javnoj
 * strani ide ispod izbora stana, najnoviji mesec prvi. Mesec čija tura nije
 * objavljena se ne prikazuje.
 */

type Row = { id: string; month: string; tour_id: string | null; note: string | null };

const thisMonth = () => new Date().toISOString().slice(0, 7);

function monthText(month: string) {
  const d = new Date(`${month.slice(0, 10)}T12:00:00Z`);
  const s = d.toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProgressPanel({ projectId, tours }: { projectId: string; tours: TourOption[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [tourId, setTourId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const call = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ action, projectId, ...payload })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Greška na serveru.');
      return json;
    },
    [projectId]
  );

  const load = useCallback(async () => {
    try {
      const json = await call('progress-list', {});
      setRows(json.progress);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Nije učitano.' });
    }
  }, [call]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const tourName = (id: string | null) => {
    const t = tours.find((x) => x.id === id);
    return t ? `${t.title || t.slug}${t.published ? '' : ' (nije objavljena - ne vidi se)'}` : '—';
  };

  return (
    <section className="pa-card">
      <h2>Gradilište po mesecima</h2>
      <p className="pa-hint">
        Svakog meseca: snimi gradilište 360° (i dronom), napravi običnu turu u /admin/ture, pa je ovde dodaj uz mesec. Kupci koji su dali
        kaparu vide da radovi idu. Isti mesec ponovo = izmena.
      </p>
      {msg && <p className={msg.ok ? 'pa-msg is-ok' : 'pa-msg is-err'}>{msg.text}</p>}

      <form
        className="pa-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', alignItems: 'end' }}
        onSubmit={(e) => {
          e.preventDefault();
          setBusy('save');
          setMsg(null);
          call('progress-save', { month, tour_id: tourId, note })
            .then(async () => {
              setNote('');
              await load();
              setMsg({ ok: true, text: `${monthText(`${month}-01`)} je sačuvan.` });
            })
            .catch((err) => setMsg({ ok: false, text: err instanceof Error ? err.message : 'Nije sačuvano.' }))
            .finally(() => setBusy(''));
        }}
      >
        <label className="pa-field">
          Mesec
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required style={{ font: 'inherit', fontSize: 14, minHeight: 38 }} />
        </label>
        <label className="pa-field">
          Tura gradilišta
          <select value={tourId} onChange={(e) => setTourId(e.target.value)} required>
            <option value="">— izaberite —</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title || t.slug}
                {t.published ? '' : ' (nije objavljena)'}
              </option>
            ))}
          </select>
        </label>
        <label className="pa-field is-wide">
          Napomena (opciono, srpski)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. Završena konstrukcija 4. sprata" maxLength={500} />
        </label>
        <div>
          <button type="submit" className="pa-btn is-primary" disabled={!month || !tourId || busy === 'save'}>
            {busy === 'save' ? 'Čuvam...' : '+ Dodaj mesec'}
          </button>
        </div>
      </form>

      <div className="pa-list" style={{ marginTop: 12 }}>
        {rows === null && <p className="pa-hint">Učitavam...</p>}
        {rows?.length === 0 && <div className="pa-empty">Još nema snimaka gradilišta.</div>}
        {rows?.map((r) => (
          <div key={r.id} className="pa-item">
            <span>
              <b>{monthText(r.month)}</b>
              <small>
                {tourName(r.tour_id)}
                {r.note ? ` · ${r.note}` : ''}
              </small>
            </span>
            <button
              type="button"
              className="pa-btn is-danger"
              disabled={busy === r.id}
              onClick={() => {
                if (!window.confirm(`Ukloniti ${monthText(r.month).toLowerCase()} sa strane projekta? Tura ostaje.`)) return;
                setBusy(r.id);
                call('progress-delete', { id: r.id })
                  .then(load)
                  .catch((err) => setMsg({ ok: false, text: err instanceof Error ? err.message : 'Nije uklonjeno.' }))
                  .finally(() => setBusy(''));
              }}
            >
              Ukloni
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
