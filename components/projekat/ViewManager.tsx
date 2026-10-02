'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { MAX_VIEWS_PER_BUILDING, type ViewRow } from '../../app/lib/projects';

/**
 * Slike jedne zgrade (ili kompleksa iz vazduha) u adminu novogradnje
 * (migracija 025): kartice slika, dodavanje, natpis („Ulica", „Dvorište"),
 * redosled rotacije, zamena i brisanje. Platno za crtanje (PolygonCanvas)
 * dolazi kao children - crta se na izabranoj slici.
 *
 * Zamena slike čuva oblike: namenjena je novom renderu iz istog ugla.
 */
export default function ViewManager({
  views,
  activeId,
  busy,
  emptyText,
  addLabel,
  onSelect,
  onAdd,
  onLabel,
  onMove,
  onReplace,
  onDelete,
  children
}: {
  views: ViewRow[];
  activeId: string | null;
  busy: boolean;
  emptyText: string;
  addLabel: string;
  onSelect: (id: string) => void;
  onAdd: (file: File) => void;
  onLabel: (id: string, label: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onReplace: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  children?: ReactNode;
}) {
  const active = views.find((v) => v.id === activeId) ?? views[0] ?? null;
  const index = active ? views.indexOf(active) : -1;
  const pick = (fn: (file: File) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) fn(file);
  };

  return (
    <div className="pa-views">
      {views.length > 0 && (
        <div className="pa-vtabs" role="tablist" aria-label="Slike">
          {views.map((v, i) => (
            <button key={v.id} type="button" role="tab" aria-selected={v.id === active?.id} onClick={() => onSelect(v.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- sličica sa R2 CDN-a */}
              <img src={v.image_url} alt="" />
              <span>{v.label || `Slika ${i + 1}`}</span>
            </button>
          ))}
          {views.length < MAX_VIEWS_PER_BUILDING && (
            <label className="pa-vadd" title="Još jedna slika iste zgrade iz drugog ugla - posetilac je okreće strelicama">
              + Slika
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={pick(onAdd)} hidden />
            </label>
          )}
        </div>
      )}

      {active ? (
        children
      ) : (
        <label className="pa-empty pa-empty-upload">
          {emptyText}
          <span className="pa-btn is-primary">{addLabel}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={pick(onAdd)} hidden />
        </label>
      )}

      {active && (
        <div className="pa-row" style={{ marginTop: 10 }}>
          <input
            key={active.id}
            type="text"
            defaultValue={active.label ?? ''}
            placeholder="Natpis, npr. Ulica"
            aria-label="Natpis slike"
            maxLength={40}
            style={{ maxWidth: 180 }}
            onBlur={(e) => {
              const label = e.target.value.trim();
              if (label !== (active.label ?? '')) onLabel(active.id, label);
            }}
          />
          {views.length > 1 && (
            <>
              <button type="button" className="pa-btn" disabled={busy || index === 0} title="Ranije u rotaciji" onClick={() => onMove(active.id, -1)}>
                ←
              </button>
              <button type="button" className="pa-btn" disabled={busy || index === views.length - 1} title="Kasnije u rotaciji" onClick={() => onMove(active.id, 1)}>
                →
              </button>
            </>
          )}
          <label className="pa-btn" title="Nov render iz ISTOG ugla - nacrtani oblici ostaju">
            Zameni sliku
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={pick((f) => onReplace(active.id, f))} hidden />
          </label>
          <button
            type="button"
            className="pa-btn is-danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Obrisati sliku „${active.label || `Slika ${index + 1}`}“ i oblike nacrtane na njoj?`)) onDelete(active.id);
            }}
          >
            Obriši sliku
          </button>
        </div>
      )}
    </div>
  );
}
