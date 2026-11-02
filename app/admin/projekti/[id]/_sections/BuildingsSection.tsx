'use client';

import { type EditorView } from '../editorState';

/** Zgrade i lamele (migracija 025). */
export default function BuildingsSection({ v }: { v: EditorView }) {
  const { id, setData, bId, newBuilding, setNewBuilding, firstBuilding, setFirstBuilding, busy, load, api, run, floors, units, buildings, hasBuildings, buildingName, bFloors, pickBuilding, addBuilding } = v;
  return (
    <>
      <section className="pa-card pa-anchor" id="sec-zgrade">
        <h2>Zgrade i lamele</h2>
        {!hasBuildings ? (
          <>
            <p className="pa-hint">
              Projekat je jedna zgrada. Ako investitor gradi više lamela ili zgrada, dodajte ih - posetilac tada prvo bira zgradu (na slici
              kompleksa iz vazduha ili iz spiska), pa sprat i stan.
            </p>
            <form
              className="pa-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (newBuilding.trim() && firstBuilding.trim()) addBuilding();
              }}
            >
              <label className="pa-field" style={{ maxWidth: 200 }}>
                Naziv postojeće zgrade
                <input type="text" value={firstBuilding} maxLength={40} onChange={(e) => setFirstBuilding(e.target.value)} />
              </label>
              <label className="pa-field" style={{ maxWidth: 200 }}>
                Nova lamela
                <input type="text" value={newBuilding} maxLength={40} placeholder="npr. Lamela B" onChange={(e) => setNewBuilding(e.target.value)} />
              </label>
              <button type="submit" className="pa-btn" style={{ alignSelf: 'flex-end' }} disabled={!newBuilding.trim() || !firstBuilding.trim() || busy === 'building'}>
                {busy === 'building' ? 'Dodajem...' : '+ Podeli na lamele'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="pa-hint">Izaberite lamelu koju uređujete - fasada, spratovi i osnove ispod su za nju. Stanovi svih lamela su u tabeli na dnu.</p>
            <div className="pa-bchips">
              {buildings.map((bb) => {
                const fl = floors.filter((f) => f.building_id === bb.id).map((f) => f.id);
                const count = units.filter((u) => fl.includes(u.floor_id)).length;
                return (
                  <button key={bb.id} type="button" className="pa-floor" aria-pressed={bb.id === bId} onClick={() => pickBuilding(bb.id)}>
                    <span>
                      <b>{bb.name}</b>
                      <br />
                      <small>
                        {fl.length} spratova · {count} stanova
                      </small>
                    </span>
                  </button>
                );
              })}
              <form
                className="pa-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newBuilding.trim()) addBuilding();
                }}
              >
                <input type="text" value={newBuilding} maxLength={40} placeholder="npr. Lamela C" aria-label="Naziv nove lamele" onChange={(e) => setNewBuilding(e.target.value)} style={{ maxWidth: 150 }} />
                <button type="submit" className="pa-btn" disabled={!newBuilding.trim() || busy === 'building'}>
                  + Lamela
                </button>
              </form>
            </div>
            {bId && (
              <div className="pa-row" style={{ marginTop: 10 }}>
                <input
                  key={bId}
                  type="text"
                  defaultValue={buildingName(bId)}
                  maxLength={40}
                  aria-label="Naziv lamele"
                  style={{ maxWidth: 200 }}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (!name || name === buildingName(bId)) return;
                    run('building', async () => {
                      const json = await api('building-save', { projectId: id, id: bId, name });
                      setData((d) => (d ? { ...d, buildings: d.buildings.map((x) => (x.id === bId ? json.building : x)) } : d));
                      return 'Naziv lamele je sačuvan.';
                    });
                  }}
                />
                <button
                  type="button"
                  className="pa-btn is-danger"
                  disabled={bFloors.length > 0}
                  title={bFloors.length ? 'Lamela ima spratove - prvo njih obrišite' : ''}
                  onClick={() => {
                    if (!window.confirm(`Obrisati „${buildingName(bId)}“ i njene slike?`)) return;
                    run('building', async () => {
                      await api('building-delete', { projectId: id, id: bId });
                      await load();
                      const rest = buildings.filter((x) => x.id !== bId);
                      if (rest[0]) pickBuilding(rest[0].id);
                      return 'Lamela je obrisana.';
                    });
                  }}
                >
                  Obriši lamelu
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
