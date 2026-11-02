'use client';

import PolygonCanvas from '../../../../../components/projekat/PolygonCanvas';
import { floorName, parseLevels, levelPrefix, unitSuffix, UNIT_STATUS_COLORS, UNIT_STATUS_LABEL } from '../../../../lib/projects';
import { type EditorView } from '../editorState';

/** Osnova izabranog sprata: slika i oblik svakog stana, ručno ili AI predlog. */
export default function FloorPlanSection({ v }: { v: EditorView }) {
  const { id, unitId, setUnitId, draw, setDraw, copyLevels, setCopyLevels, copyCreate, setCopyCreate, aiPlanUnits, setAiPlanUnits, setAiPlanSel, busy, setMsg, load, api, run, upload, units, bFloors, floor, floorUnits, patchFloor, onPolygon, onPlanEdit, tours, suggestPlanUnits, saveAiPlanUnits, planShapes, planPreviewOn, planPreviewShapes } = v;
  return (
    <>
      {floor && (
        <section className="pa-card pa-anchor" id="sec-osnova">
          <h2>Osnova: {floorName(floor.level, floor.label)}</h2>
          <p className="pa-hint">Otpremite osnovu sprata (PDF od arhitekte sačuvajte kao sliku), pa za svaki stan kliknite „Iscrtaj“ - ili probajte AI predlog ako je svaki stan već obeležen natpisom na osnovi.</p>
          <div className="pa-split">
            <div>
              {floor.plan_url && floorUnits.length > 0 && !planPreviewOn && (
                <div className="pa-row" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className="pa-btn"
                    disabled={Boolean(busy) || Boolean(draw)}
                    title="AI pronađe obeležene stanove na ovoj osnovi i predloži njihove oblike - vi ih proverite pre čuvanja"
                    onClick={suggestPlanUnits}
                  >
                    {busy === 'ai-plan-units' ? 'AI traži stanove…' : '✨ Predloži stanove (AI)'}
                  </button>
                </div>
              )}
              {planPreviewOn && (
                <div className="pc-bar" style={{ background: 'color-mix(in srgb, #7C3AED 12%, transparent)', marginBottom: 10 }}>
                  <span style={{ flex: '1 1 300px' }}>{aiPlanUnits!.note}</span>
                  <span className="pc-actions">
                    <button type="button" className="is-primary" disabled={busy === 'ai-plan-units-save'} onClick={saveAiPlanUnits}>
                      {busy === 'ai-plan-units-save' ? 'Čuvam…' : `Sačuvaj predlog (${aiPlanUnits!.items.length})`}
                    </button>
                    <button
                      type="button"
                      disabled={busy === 'ai-plan-units-save'}
                      onClick={() => {
                        setAiPlanUnits(null);
                        setAiPlanSel(null);
                      }}
                    >
                      Odbaci
                    </button>
                  </span>
                </div>
              )}
              {floor.plan_url ? (
                <PolygonCanvas
                  imageUrl={floor.plan_url}
                  shapes={planPreviewOn ? planPreviewShapes : planShapes}
                  drawing={!planPreviewOn && draw?.on === 'plan'}
                  drawLabel={draw?.on === 'plan' ? `stan ${units.find((u) => u.id === draw.id)?.code ?? ''}` : undefined}
                  onComplete={onPolygon}
                  onCancel={() => setDraw(null)}
                  onShapeClick={planPreviewOn ? setAiPlanSel : setUnitId}
                  onEdit={
                    planPreviewOn
                      ? (sid, poly) =>
                          setAiPlanUnits((a) => (a ? { ...a, items: a.items.map((it) => (it.id === sid ? { ...it, polygon: poly } : it)) } : a))
                      : onPlanEdit
                  }
                />
              ) : (
                <div className="pa-empty">Još nema osnove ovog sprata.</div>
              )}
              <label className="pa-field" style={{ marginTop: 10 }}>
                {floor.plan_url ? 'Zameni osnovu' : 'Osnova sprata (JPG, PNG, WEBP)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy === 'plan'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    run('plan', async () => {
                      const url = await upload(file, 'plan');
                      const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, plan_url: url });
                      patchFloor(json.floor);
                      return 'Osnova je postavljena.';
                    });
                  }}
                />
              </label>
              <label className="pa-field" style={{ marginTop: 10 }}>
                Pogled sa sprata (tura sa snimkom dronom na ovoj visini)
                <select
                  value={floor.view_tour_id ?? ''}
                  onChange={(e) => {
                    const view_tour_id = e.target.value || null;
                    run('view', async () => {
                      const json = await api('floor-save', { projectId: id, id: floor.id, level: floor.level, view_tour_id });
                      patchFloor(json.floor);
                      return 'Pogled sa sprata je sačuvan.';
                    });
                  }}
                >
                  <option value="">— nema —</option>
                  {tours.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title || t.slug}
                      {t.published ? '' : ' (nije objavljena)'}
                    </option>
                  ))}
                </select>
              </label>

              {/* Tipski spratovi: jedna osnova i jedno crtanje za sve. */}
              {(floor.plan_url || floorUnits.some((u) => u.polygon)) && bFloors.length > 1 && (
                <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
                  <b>Isti raspored i na drugim spratovima?</b>
                  <p className="pa-hint" style={{ margin: '4px 0 10px' }}>
                    Kopira osnovu i nacrtane stanove sa ovog sprata. Stanovi se uparuju po oznaci ({floorUnits[0]?.code ?? '2A'} →{' '}
                    {floorUnits[0] ? `${levelPrefix(floor.level + 1)}${unitSuffix(floorUnits[0].code, floor.level) ?? '…'}` : '3A'}). Status i cena
                    se ne diraju.
                  </p>
                  <form
                    className="pa-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const levels = parseLevels(copyLevels);
                      if (!levels) {
                        setMsg({ ok: false, text: 'Upišite spratove, npr. „2-6“ ili „3, 4, 5“.' });
                        return;
                      }
                      run('copy', async () => {
                        const json = await api('floor-copy', { projectId: id, sourceFloorId: floor.id, levels, createMissing: copyCreate });
                        await load();
                        setCopyLevels('');
                        const parts = [`Kopirano na spratova: ${json.floors}`];
                        if (json.matched) parts.push(`uparenih stanova: ${json.matched}`);
                        if (json.created) parts.push(`novih stanova: ${json.created}`);
                        let text = parts.join(', ') + '.';
                        if (json.missingFloors.length) text += `\nNema spratova: ${json.missingFloors.map((l: number) => levelPrefix(l)).join(', ')} - prvo ih dodajte.`;
                        if (json.unmatched.length) text += `\nNisu upareni: ${json.unmatched.slice(0, 12).join(', ')}${json.unmatched.length > 12 ? '…' : ''}.`;
                        return text;
                      });
                    }}
                  >
                    <input
                      type="text"
                      value={copyLevels}
                      onChange={(e) => setCopyLevels(e.target.value)}
                      placeholder={`npr. ${floor.level + 1}-${Math.max(...bFloors.map((f) => f.level))}`}
                      aria-label="Spratovi na koje se kopira"
                      style={{ maxWidth: 140 }}
                    />
                    <button type="submit" className="pa-btn is-primary" disabled={!copyLevels.trim() || busy === 'copy'}>
                      {busy === 'copy' ? 'Kopiram...' : 'Primeni na te spratove'}
                    </button>
                  </form>
                  <label className="pa-row" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    <input type="checkbox" checked={copyCreate} onChange={(e) => setCopyCreate(e.target.checked)} />
                    Napravi stanove koji tamo još ne postoje (struktura i m² kao ovde, cena prazna, status slobodan)
                  </label>
                </div>
              )}
            </div>
            <div className="pa-floors">
              {floorUnits.length === 0 && <div className="pa-empty">Na ovom spratu nema stanova. Dodajte ih u tabeli ispod.</div>}
              {floorUnits.map((u) => (
                <div key={u.id} className="pa-floor" aria-pressed={u.id === unitId} onClick={() => setUnitId(u.id)} role="button" tabIndex={0}>
                  <span>
                    <b>{u.code}</b> <small style={{ color: UNIT_STATUS_COLORS[u.status].text }}>{UNIT_STATUS_LABEL[u.status]}</small>
                    <br />
                    <small>{u.polygon ? 'oblik ✓' : 'bez oblika'}</small>
                  </span>
                  <button
                    type="button"
                    className="pa-btn"
                    disabled={!floor.plan_url || Boolean(draw) || planPreviewOn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnitId(u.id);
                      setDraw({ on: 'plan', id: u.id });
                    }}
                  >
                    {u.polygon ? 'Ponovo' : 'Iscrtaj'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
