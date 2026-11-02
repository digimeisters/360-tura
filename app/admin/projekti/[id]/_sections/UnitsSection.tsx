'use client';

import PriceListReader from '../../../../../components/projekat/PriceListReader';
import { floorName, cleanPhotos, cleanRooms, UNIT_STATUSES, UNIT_STATUS_COLORS, UNIT_STATUS_LABEL, type UnitStatus } from '../../../../lib/projects';
import { type UnitDraft, toDraft, IMPORT_EXAMPLE, type EditorView } from '../editorState';

/** Tabela stanova: status, cena, tura, kopiranje rasporeda i uvoz iz Excela. */
export default function UnitsSection({ v }: { v: EditorView }) {
  const { id, data, setData, drafts, setDrafts, importText, setImportText, setMediaUnitId, bId, importBuilding, setImportBuilding, importOpen, setImportOpen, busy, setMsg, load, api, run, floors, units, buildings, hasBuildings, buildingName, floor, floorUnits, patchUnit, tours, unitsDirty } = v;
  return (
    <>
      <section className="pa-card pa-anchor" id="sec-stanovi">
        <h2>Stanovi ({units.length})</h2>
        <p className="pa-hint">Promenite status ili cenu i kliknite „Sačuvaj“ u tom redu. Javna strana se osvežava odmah.</p>
        {units.length > 0 && (
          <div className="pa-table-wrap">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Oznaka</th>
                  <th>Sprat</th>
                  <th>Struktura</th>
                  <th>m²</th>
                  <th>Terasa</th>
                  <th>Orijent.</th>
                  <th>Cena €</th>
                  <th>Status</th>
                  <th>360° tura</th>
                  <th>Beleška prodaje</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...units]
                  .sort((a, b) => {
                    const la = floors.find((f) => f.id === a.floor_id)?.level ?? 0;
                    const lb = floors.find((f) => f.id === b.floor_id)?.level ?? 0;
                    return lb - la || a.code.localeCompare(b.code, 'sr', { numeric: true });
                  })
                  .map((u) => {
                    const d = drafts[u.id] ?? toDraft(u);
                    const set = (patch: Partial<UnitDraft>) => setDrafts((all) => ({ ...all, [u.id]: { ...d, ...patch } }));
                    return (
                      <tr key={u.id} className={drafts[u.id] ? 'is-dirty' : undefined}>
                        <td><input type="text" value={d.code} onChange={(e) => set({ code: e.target.value })} style={{ width: 70 }} /></td>
                        <td>
                          <select value={d.floor_id} onChange={(e) => set({ floor_id: e.target.value })}>
                            {floors.map((f) => (
                              <option key={f.id} value={f.id}>
                                {hasBuildings ? `${buildingName(f.building_id)} · ` : ''}
                                {f.level === 0 ? 'P' : f.level}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td><input type="text" value={d.structure} onChange={(e) => set({ structure: e.target.value })} style={{ width: 110 }} /></td>
                        <td><input type="text" inputMode="decimal" value={d.area_sqm} onChange={(e) => set({ area_sqm: e.target.value })} style={{ width: 64 }} /></td>
                        <td><input type="text" inputMode="decimal" value={d.terrace_sqm} onChange={(e) => set({ terrace_sqm: e.target.value })} style={{ width: 56 }} /></td>
                        <td><input type="text" value={d.orientation} onChange={(e) => set({ orientation: e.target.value })} style={{ width: 84 }} /></td>
                        <td><input type="text" inputMode="numeric" value={d.price} onChange={(e) => set({ price: e.target.value })} style={{ width: 90 }} /></td>
                        <td>
                          <select className="pa-status" value={d.status} style={{ color: UNIT_STATUS_COLORS[d.status].text }} onChange={(e) => set({ status: e.target.value as UnitStatus })}>
                            {UNIT_STATUSES.map((s) => (
                              <option key={s} value={s}>{UNIT_STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select value={d.tour_id} onChange={(e) => set({ tour_id: e.target.value })} style={{ maxWidth: 160 }}>
                            <option value="">—</option>
                            {tours.map((t) => (
                              <option key={t.id} value={t.id}>{t.title || t.slug}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 12 }}>
                          {data.unitNotes?.[u.id] ? (
                            <span style={{ color: data.unitNotes[u.id].important ? '#B45309' : 'var(--ink-soft)', fontWeight: data.unitNotes[u.id].important ? 700 : 400 }}>
                              {data.unitNotes[u.id].important ? '⚑ ' : ''}
                              {data.unitNotes[u.id].text}
                              <small style={{ display: 'block', fontWeight: 400, color: 'var(--ink-faint)' }}>{data.unitNotes[u.id].author}</small>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ink-faint)' }}>—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="pa-btn is-primary"
                            disabled={!drafts[u.id] || busy === `unit-${u.id}`}
                            onClick={() =>
                              run(`unit-${u.id}`, async () => {
                                // Samo izmenjena polja: status i cena sa učitane strane bi
                                // inače pregazili ono što je prodavac u međuvremenu
                                // promenio na /prodaja (npr. "prodat" nazad u "slobodan").
                                const base = toDraft(u);
                                const changed = Object.fromEntries(
                                  (Object.keys(d) as (keyof UnitDraft)[]).filter((k) => d[k] !== base[k]).map((k) => [k, d[k]])
                                ) as Partial<UnitDraft>;
                                const json = await api('unit-save', {
                                  projectId: id,
                                  id: u.id,
                                  fields: 'tour_id' in changed ? { ...changed, tour_id: changed.tour_id || null } : changed
                                });
                                patchUnit(json.unit);
                                setDrafts((all) => {
                                  const next = { ...all };
                                  delete next[u.id];
                                  return next;
                                });
                                return `Stan ${json.unit.code} je sačuvan.`;
                              })
                            }
                          >
                            Sačuvaj
                          </button>{' '}
                          <button
                            type="button"
                            className="pa-btn"
                            title="Osnova stana, 3D osnova, slike i prostorije"
                            onClick={() => setMediaUnitId(u.id)}
                          >
                            Detalji
                            {u.plan_url || cleanPhotos(u.photos).length || cleanRooms(u.rooms).length ? ' ✓' : ''}
                          </button>{' '}
                          <button
                            type="button"
                            className="pa-btn is-danger"
                            aria-label={`Obriši stan ${u.code}`}
                            onClick={() => {
                              if (!window.confirm(`Obrisati stan ${u.code}?`)) return;
                              run(`unit-${u.id}`, async () => {
                                await api('unit-delete', { projectId: id, id: u.id });
                                setData((dd) => (dd ? { ...dd, units: dd.units.filter((x) => x.id !== u.id), shapes: dd.shapes.filter((sh) => sh.unit_id !== u.id) } : dd));
                                return `Stan ${u.code} je obrisan.`;
                              });
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        {unitsDirty > 0 && (
          <p className="pa-hint" style={{ marginTop: 8 }}>
            Nesačuvanih redova: {unitsDirty}.
          </p>
        )}

        <div className="pa-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pa-btn"
            disabled={!floor || busy === 'unit-add'}
            title={floor ? '' : 'Prvo izaberite ili dodajte sprat'}
            onClick={() => {
              if (!floor) return;
              const base = `${floor.level === 0 ? 'P' : floor.level}`;
              let n = floorUnits.length + 1;
              const taken = new Set(units.map((u) => u.code));
              while (taken.has(`${base}-${n}`)) n++;
              run('unit-add', async () => {
                const json = await api('unit-save', { projectId: id, fields: { code: `${base}-${n}`, floor_id: floor.id } });
                setData((dd) => (dd ? { ...dd, units: [...dd.units, json.unit] } : dd));
                return `Dodat stan ${json.unit.code} na ${floorName(floor.level).toLowerCase()} - promenite mu oznaku i podatke u tabeli.`;
              });
            }}
          >
            + Novi stan {floor ? `(${floorName(floor.level).toLowerCase()})` : ''}
          </button>
        </div>

        <details style={{ marginTop: 14 }} open={importOpen} onToggle={(e) => setImportOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Uvoz iz Excela ili cenovnika</summary>
          <p className="pa-hint" style={{ marginTop: 8 }}>
            U Excelu označite kolone redom: <b>oznaka, sprat, struktura, m², terasa, orijentacija, cena, status</b> - kopirajte i nalepite ovde.
            Sprat „P“ je prizemlje; status je slobodan, rezervisan ili prodat. Postojeći stanovi (ista oznaka) se ažuriraju, a nacrtani oblici i
            ture ostaju.
            {hasBuildings && (
              <>
                {' '}
                Kompleks: deveta kolona može biti <b>lamela</b> („A“ ili „Lamela A“); redovi bez nje idu u lamelu izabranu ispod.
              </>
            )}
          </p>
          {hasBuildings && (
            <label className="pa-field" style={{ maxWidth: 260, marginBottom: 8 }}>
              Lamela za redove bez 9. kolone
              <select value={importBuilding || bId || ''} onChange={(e) => setImportBuilding(e.target.value)}>
                {buildings.map((bb) => (
                  <option key={bb.id} value={bb.id}>
                    {bb.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <PriceListReader
            projectId={id}
            api={api}
            onText={(text, info) => {
              setImportText(text);
              setMsg({ ok: true, text: info });
            }}
          />
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={IMPORT_EXAMPLE} rows={7} style={{ fontFamily: 'ui-monospace, monospace' }} />
          <div className="pa-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="pa-btn is-primary"
              disabled={!importText.trim() || busy === 'import'}
              onClick={() =>
                run('import', async () => {
                  const json = await api('units-import', { projectId: id, text: importText, buildingId: hasBuildings ? importBuilding || bId : null });
                  setImportText('');
                  setDrafts({});
                  await load();
                  return `Uvezeno stanova: ${json.imported}${json.floorsCreated ? `, novih spratova: ${json.floorsCreated}` : ''}.`;
                })
              }
            >
              {busy === 'import' ? 'Uvozim...' : 'Uvezi tabelu'}
            </button>
          </div>
        </details>
      </section>
    </>
  );
}
