'use client';

import PolygonCanvas from '../../../../../components/projekat/PolygonCanvas';
import ViewManager from '../../../../../components/projekat/ViewManager';
import { type EditorView } from '../editorState';

/** Kompleks iz vazduha - samo kad projekat ima bar dve lamele. */
export default function SiteSection({ v }: { v: EditorView }) {
  const { draw, setDraw, bId, setViewSel, busy, buildings, siteViews, activeSite, shapeOf, shapeName, removeShape, addView, labelView, moveView, replaceView, deleteView, pickBuilding, onPolygon, onViewEdit, siteShapes, drawingOn } = v;
  return (
    <>
      {buildings.length > 1 && (
        <section className="pa-card pa-anchor" id="sec-vazduh">
          <h2>Kompleks iz vazduha</h2>
          <p className="pa-hint">
            Render ili snimak dronom celog kompleksa. Na njemu iscrtajte svaku lamelu - posetilac klikne na lamelu i otvara se njena fasada.
            Više slika iz različitih uglova = rotacija. Bez ove slike posetilac bira lamelu sa kartica.
          </p>
          <div className="pa-split">
            <ViewManager
              views={siteViews}
              activeId={activeSite?.id ?? null}
              busy={busy === 'view'}
              emptyText="Još nema slike kompleksa."
              addLabel="Otpremi sliku kompleksa"
              onSelect={(vid) => {
                setDraw(null);
                setViewSel((sel) => ({ ...sel, site: vid }));
              }}
              onAdd={addView('site', 'site')}
              onLabel={labelView}
              onMove={moveView}
              onReplace={replaceView}
              onDelete={deleteView}
            >
              {activeSite && (
                <PolygonCanvas
                  imageUrl={activeSite.image_url}
                  shapes={siteShapes}
                  drawing={Boolean(drawingOn(activeSite.id))}
                  drawLabel={drawingOn(activeSite.id) ? shapeName('building', drawingOn(activeSite.id)!.id) : undefined}
                  onComplete={onPolygon}
                  onCancel={() => setDraw(null)}
                  onShapeClick={pickBuilding}
                  onEdit={(bid, poly) => onViewEdit(activeSite.id, 'building', bid, poly)}
                />
              )}
            </ViewManager>
            <div className="pa-floors">
              {buildings.map((bb) => {
                const has = shapeOf(activeSite?.id, 'building', bb.id);
                return (
                  <div key={bb.id} className="pa-floor" aria-pressed={bb.id === bId} role="button" tabIndex={0} onClick={() => pickBuilding(bb.id)}>
                    <span>
                      <b>{bb.name}</b>
                      <br />
                      <small>{has ? 'na slici ✓' : 'nije na slici'}</small>
                    </span>
                    <span className="pa-row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="pa-btn"
                        disabled={!activeSite || Boolean(draw)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeSite) setDraw({ on: 'view', viewId: activeSite.id, target: 'building', id: bb.id });
                        }}
                      >
                        {has ? 'Ponovo' : 'Iscrtaj'}
                      </button>
                      {has && activeSite && (
                        <button
                          type="button"
                          className="pa-btn"
                          aria-label={`Ukloni ${bb.name} sa slike`}
                          disabled={Boolean(draw)}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeShape(activeSite.id, 'building', bb.id);
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
          </div>
        </section>
      )}
    </>
  );
}
