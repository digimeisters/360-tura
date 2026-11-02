'use client';

import { srPlural } from '../../../../lib/projectI18n';
import PolygonCanvas from '../../../../../components/projekat/PolygonCanvas';
import ViewManager from '../../../../../components/projekat/ViewManager';
import { floorName, parseLevels, UNIT_STATUS_COLORS, UNIT_STATUS_LABEL, type FloorRow } from '../../../../lib/projects';
import { type EditorView } from '../editorState';

/** Fasada izabrane zgrade: slike (rotacija) i oblici spratova ili stanova, ručno ili AI predlog. */
export default function FacadeSection({ v }: { v: EditorView }) {
  const { id, setData, floorId, setFloorId, unitId, setUnitId, draw, setDraw, newLevel, setNewLevel, bId, setViewSel, facadeMode, setFacadeMode, aiFloors, setAiFloors, setAiFloorSel, busy, setMsg, api, run, floors, units, hasBuildings, buildingName, bFloors, bUnits, groupKey, bViews, activeView, shapeOf, floor, floorsDesc, shapeName, removeShape, addView, labelView, moveView, replaceView, deleteView, patchFloor, onPolygon, onViewEdit, freeOnFloor, facadeShapes, drawingOn, previewOn, previewShapes, suggestFloors, suggestUnits, saveAiFloors } = v;
  return (
    <>
      <section className="pa-card pa-anchor" id="sec-fasada">
        <h2>{hasBuildings ? `Fasada i spratovi: ${buildingName(bId)}` : 'Fasada i spratovi'}</h2>
        <p className="pa-hint">
          Otpremite fotografiju ili render zgrade (može više slika iz različitih uglova - posetilac ih okreće strelicama). Na svakoj slici
          iscrtajte spratove, stanove ili oboje: klik na stan na fasadi kupcu odmah otvara karticu stana.
        </p>
        <div className="pa-row" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink-soft)' }}>Na slici crtam:</span>
          <div className="pa-seg" role="group" aria-label="Šta se crta na fasadi">
            <button
              type="button"
              aria-pressed={facadeMode === 'floors'}
              onClick={() => {
                setDraw(null);
                setFacadeMode('floors');
              }}
            >
              Spratove
            </button>
            <button
              type="button"
              aria-pressed={facadeMode === 'units'}
              onClick={() => {
                setDraw(null);
                setFacadeMode('units');
              }}
            >
              Stanove
            </button>
          </div>
          {facadeMode === 'units' && activeView && bUnits.length > 0 && !previewOn && (
            <button
              type="button"
              className="pa-btn"
              disabled={Boolean(busy) || Boolean(draw) || !bFloors.some((f) => shapeOf(activeView.id, 'floor', f.id))}
              title={
                bFloors.some((f) => shapeOf(activeView.id, 'floor', f.id))
                  ? 'AI podeli svaki sprat na stanove koji se vide na ovoj slici - vi ih proverite pre čuvanja'
                  : 'Prvo označite spratove na ovoj slici (Spratove → ✨ Predloži spratove)'
              }
              onClick={suggestUnits}
            >
              {busy === 'ai-floors' ? 'AI deli spratove na stanove…' : '✨ Predloži stanove (AI)'}
            </button>
          )}
          {facadeMode === 'floors' && activeView && bFloors.length > 0 && !previewOn && (
            <button
              type="button"
              className="pa-btn"
              disabled={Boolean(busy) || Boolean(draw)}
              title="AI pronađe spratove na ovoj slici i predloži njihove oblike - vi ih proverite pre čuvanja"
              onClick={suggestFloors}
            >
              {busy === 'ai-floors' ? 'AI traži spratove…' : '✨ Predloži spratove (AI)'}
            </button>
          )}
        </div>
        {previewOn && (
          <div className="pc-bar" style={{ background: 'color-mix(in srgb, #7C3AED 12%, transparent)', marginBottom: 10 }}>
            <span style={{ flex: '1 1 300px' }}>{aiFloors!.note}</span>
            <span className="pc-actions">
              <button type="button" className="is-primary" disabled={busy === 'ai-floors-save'} onClick={saveAiFloors}>
                {busy === 'ai-floors-save' ? 'Čuvam…' : `Sačuvaj predlog (${aiFloors!.items.length})`}
              </button>
              <button
                type="button"
                disabled={busy === 'ai-floors-save'}
                onClick={() => {
                  setAiFloors(null);
                  setAiFloorSel(null);
                }}
              >
                Odbaci
              </button>
            </span>
          </div>
        )}
        <div className="pa-split">
          <ViewManager
            views={bViews}
            activeId={activeView?.id ?? null}
            busy={busy === 'view'}
            emptyText={hasBuildings ? `Još nema slike fasade za „${buildingName(bId)}“.` : 'Još nema slike fasade.'}
            addLabel="Otpremi sliku fasade"
            onSelect={(vid) => {
              setDraw(null);
              setViewSel((sel) => ({ ...sel, [groupKey]: vid }));
            }}
            onAdd={addView('building', groupKey)}
            onLabel={labelView}
            onMove={moveView}
            onReplace={replaceView}
            onDelete={deleteView}
          >
            {activeView && (
              <PolygonCanvas
                imageUrl={activeView.image_url}
                shapes={previewOn ? previewShapes : facadeShapes}
                drawing={!previewOn && Boolean(drawingOn(activeView.id))}
                drawLabel={drawingOn(activeView.id) ? shapeName(drawingOn(activeView.id)!.target, drawingOn(activeView.id)!.id) : undefined}
                onComplete={onPolygon}
                onCancel={() => setDraw(null)}
                onEdit={(sid, poly) =>
                  previewOn
                    ? setAiFloors((a) => (a ? { ...a, items: a.items.map((it) => (it.id === sid ? { ...it, polygon: poly } : it)) } : a))
                    : onViewEdit(activeView.id, facadeMode === 'floors' ? 'floor' : 'unit', sid, poly)
                }
                onShapeClick={(sid) => {
                  if (previewOn) {
                    setAiFloorSel(sid);
                    return;
                  }
                  if (facadeMode === 'floors') {
                    setFloorId(sid);
                    setUnitId(null);
                  } else {
                    setUnitId(sid);
                    setFloorId(units.find((u) => u.id === sid)?.floor_id ?? floorId);
                  }
                }}
              />
            )}
          </ViewManager>

          <div>
            {facadeMode === 'floors' ? (
              <>
            <div className="pa-floors">
              {floorsDesc.length === 0 && <div className="pa-empty">Nema spratova. Dodajte ih ispod ili uvezite tabelu stanova.</div>}
              {floorsDesc.map((f) => {
                const count = units.filter((u) => u.floor_id === f.id).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="pa-floor"
                    aria-pressed={f.id === floorId}
                    onClick={() => {
                      setFloorId(f.id);
                      setUnitId(null);
                    }}
                  >
                    <span>
                      <b>{floorName(f.level, f.label)}</b>
                      <br />
                      <small>
                        {count} stanova · {freeOnFloor(f.id)} slob. · {shapeOf(activeView?.id, 'floor', f.id) ? 'na slici ✓' : 'nije na slici'} ·{' '}
                        {f.plan_url ? 'osnova ✓' : 'bez osnove'}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            <form
              className="pa-row"
              style={{ marginTop: 10 }}
              onSubmit={(e) => {
                e.preventDefault();
                const levels = parseLevels(newLevel);
                if (!levels) {
                  setMsg({ ok: false, text: 'Upišite sprat kao broj ili P za prizemlje - npr. „3“, „P“, „P, 1, 2“ ili „P-6“ za sve odjednom.' });
                  return;
                }
                run('floor-add', async () => {
                  const json = await api('floors-add', { projectId: id, levels, buildingId: bId });
                  const added = json.floors as FloorRow[];
                  setData((d) => (d ? { ...d, floors: [...d.floors, ...added].sort((a, b) => a.level - b.level) } : d));
                  if (added.length) setFloorId(added[added.length - 1].id);
                  setNewLevel('');
                  if (!added.length) return 'Ti spratovi već postoje.';
                  const names = added.map((f) => (f.level === 0 ? 'P' : String(f.level))).join(', ');
                  return `Dodato spratova: ${added.length} (${names})${json.skipped ? `, ${json.skipped} je već postojalo` : ''}.`;
                });
              }}
            >
              <input
                type="text"
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                placeholder="npr. P-6 ili 3"
                aria-label="Sprat ili raspon spratova"
                style={{ maxWidth: 150 }}
              />
              <button className="pa-btn" type="submit" disabled={busy === 'floor-add' || !newLevel.trim()}>
                {busy === 'floor-add' ? 'Dodajem...' : '+ Dodaj sprat'}
              </button>
            </form>
            <p className="pa-hint" style={{ margin: '6px 0 0' }}>
              Jedan sprat („3“, „P“) ili sve odjednom: „P-6“ pravi prizemlje i spratove 1-6.
            </p>

            {floor && (
              <div className="pa-card" style={{ marginTop: 12, marginBottom: 0, padding: 14 }}>
                <b>{floorName(floor.level, floor.label)}</b>
                <label className="pa-field" style={{ marginTop: 8 }}>
                  Naziv (opciono)
                  <input
                    type="text"
                    defaultValue={floor.label ?? ''}
                    key={floor.id}
                    placeholder={floorName(floor.level)}
                    onBlur={(e) => {
                      const label = e.target.value.trim();
                      if (label === (floor.label ?? '')) return;
                      run('floor-label', async () => {
                        const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, label });
                        patchFloor(json.floor);
                      });
                    }}
                  />
                </label>
                <div className="pa-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="pa-btn is-primary"
                    disabled={!activeView || Boolean(draw)}
                    title={activeView ? '' : 'Prvo otpremite sliku fasade'}
                    onClick={() => {
                      if (!activeView) return;
                      setFacadeMode('floors');
                      setDraw({ on: 'view', viewId: activeView.id, target: 'floor', id: floor.id });
                    }}
                  >
                    {shapeOf(activeView?.id, 'floor', floor.id) ? 'Iscrtaj ponovo' : 'Iscrtaj na slici'}
                  </button>
                  {activeView && shapeOf(activeView.id, 'floor', floor.id) && (
                    <button type="button" className="pa-btn" disabled={Boolean(draw)} onClick={() => removeShape(activeView.id, 'floor', floor.id)}>
                      Ukloni sa slike
                    </button>
                  )}
                  <button
                    type="button"
                    className="pa-btn is-danger"
                    onClick={() => {
                      const count = units.filter((u) => u.floor_id === floor.id).length;
                      if (!window.confirm(`Obrisati ${floorName(floor.level).toLowerCase()}${count ? ` i ${count} ${srPlural(count, 'stan', 'stana', 'stanova')} na njemu` : ''}?`)) return;
                      run('floor-del', async () => {
                        await api('floor-delete', { projectId: id, id: floor.id });
                        setData((d) => {
                          if (!d) return d;
                          const gone = new Set(d.units.filter((u) => u.floor_id === floor.id).map((u) => u.id));
                          return {
                            ...d,
                            floors: d.floors.filter((x) => x.id !== floor.id),
                            units: d.units.filter((u) => u.floor_id !== floor.id),
                            shapes: d.shapes.filter((sh) => sh.floor_id !== floor.id && !(sh.unit_id && gone.has(sh.unit_id)))
                          };
                        });
                        setFloorId(null);
                        return 'Sprat je obrisan.';
                      });
                    }}
                  >
                    Obriši sprat
                  </button>
                </div>
              </div>
            )}
              </>
            ) : (
              <div className="pa-floors">
                {bUnits.length === 0 && <div className="pa-empty">Nema stanova. Dodajte ih u tabeli ispod ili uvezite iz Excela.</div>}
                {bUnits.length > 0 && (
                  <p className="pa-hint" style={{ margin: '0 0 4px' }}>
                    Na slici: {bUnits.filter((u) => shapeOf(activeView?.id, 'unit', u.id)).length} od {bUnits.length} stanova. Stanovi koji se ne
                    vide sa ove strane mogu ostati neiscrtani - crtaju se na drugoj slici.
                  </p>
                )}
                {[...bUnits]
                  .sort((a, b) => {
                    const fa = floors.find((f) => f.id === a.floor_id);
                    const fb = floors.find((f) => f.id === b.floor_id);
                    const ba = buildingName(fa?.building_id ?? null);
                    const bb = buildingName(fb?.building_id ?? null);
                    return ba.localeCompare(bb, 'sr', { numeric: true }) || (fb?.level ?? 0) - (fa?.level ?? 0) || a.code.localeCompare(b.code, 'sr', { numeric: true });
                  })
                  .map((u) => {
                    const has = shapeOf(activeView?.id, 'unit', u.id);
                    const fl = floors.find((f) => f.id === u.floor_id);
                    return (
                      <div
                        key={u.id}
                        className="pa-floor"
                        aria-pressed={u.id === unitId}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setUnitId(u.id);
                          setFloorId(u.floor_id);
                        }}
                      >
                        <span>
                          <b>{u.code}</b> <small style={{ color: UNIT_STATUS_COLORS[u.status].text }}>{UNIT_STATUS_LABEL[u.status]}</small>
                          <br />
                          <small>
                            {fl ? floorName(fl.level, fl.label) : ''} · {has ? 'na slici ✓' : 'nije na slici'}
                          </small>
                        </span>
                        <span className="pa-row" style={{ gap: 4 }}>
                          <button
                            type="button"
                            className="pa-btn"
                            disabled={!activeView || Boolean(draw)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnitId(u.id);
                              if (activeView) setDraw({ on: 'view', viewId: activeView.id, target: 'unit', id: u.id });
                            }}
                          >
                            {has ? 'Ponovo' : 'Iscrtaj'}
                          </button>
                          {has && activeView && (
                            <button
                              type="button"
                              className="pa-btn"
                              aria-label={`Ukloni stan ${u.code} sa slike`}
                              disabled={Boolean(draw)}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeShape(activeView.id, 'unit', u.id);
                              }}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
