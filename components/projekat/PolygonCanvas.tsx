'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { polygonCenter, type Point, type Polygon } from '../../app/lib/projects';

/**
 * Slika (fasada ili osnova sprata) sa oblicima preko nje: crtanje novog
 * oblika klik po klik i ispravka postojećeg povlačenjem uglova. Koristi je
 * admin novogradnje (/admin/projekti/[id]).
 *
 * Tačke su u udelu slike (0..1). SVG je rastegnut preko slike
 * (preserveAspectRatio="none"), pa su linije non-scaling, a natpisi i
 * ručice su HTML iznad SVG-a da se ne izobliče.
 *
 * Ispravka (kad je data onEdit): izabrani oblik dobija ručice na uglovima.
 * Povuci ugao = pomeri ga; povuci malu tačku na sredini ivice = novi ugao;
 * dvoklik na ugao = obriši ga (ostaju najmanje 3). Čuva se po puštanju.
 */

export type CanvasShape = {
  id: string;
  label: string;
  polygon: Polygon;
  fill: string;
  stroke: string;
  active?: boolean;
};

type Drag = { id: string; index: number; poly: Polygon; moved: boolean };

export default function PolygonCanvas({
  imageUrl,
  shapes,
  drawing,
  drawLabel,
  onComplete,
  onCancel,
  onShapeClick,
  onEdit
}: {
  imageUrl: string;
  shapes: CanvasShape[];
  /** Kad je true, klik na sliku dodaje tačku novog oblika. */
  drawing: boolean;
  /** Šta se crta ("sprat 3", "stan 3B") - piše u traci iznad slike. */
  drawLabel?: string;
  onComplete: (poly: Polygon) => void;
  onCancel: () => void;
  onShapeClick?: (id: string) => void;
  /** Ispravljen oblik izabranog (active) oblika, posle puštanja ručice. */
  onEdit?: (id: string, poly: Polygon) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Novo crtanje uvek kreće od nule (podešavanje stanja tokom crtanja
  // komponente, ne u efektu - vidi "storing information from previous renders").
  const drawKey = `${drawing}|${drawLabel ?? ''}`;
  const [prevKey, setPrevKey] = useState(drawKey);
  if (prevKey !== drawKey) {
    setPrevKey(drawKey);
    setPoints([]);
    setCursor(null);
    setDrag(null);
  }

  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && points.length >= 3) onComplete(points);
      if ((e.key === 'Backspace' || e.key === 'z') && points.length) {
        e.preventDefault();
        setPoints((p) => p.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawing, points, onCancel, onComplete]);

  const toPoint = (e: MouseEvent): Point | null => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
    return [x, y];
  };

  const onClick = (e: MouseEvent) => {
    if (!drawing) return;
    const p = toPoint(e);
    if (!p) return;
    // Klik blizu prve tačke zatvara oblik.
    if (points.length >= 3) {
      const box = boxRef.current!.getBoundingClientRect();
      const dx = (p[0] - points[0][0]) * box.width;
      const dy = (p[1] - points[0][1]) * box.height;
      if (Math.hypot(dx, dy) < 12) {
        onComplete(points);
        return;
      }
    }
    setPoints((prev) => [...prev, p]);
  };

  // ---------- ispravka postojećeg oblika ----------
  const editable = !drawing && onEdit ? shapes.find((s) => s.active) ?? null : null;

  // Dvoklik na ugao se prepoznaje ovde, na dva brza pritiska: zbog
  // setPointerCapture pregledač šalje dblclick slici, ne ručici.
  const lastDown = useRef<{ id: string; index: number; at: number } | null>(null);

  const startDrag = (e: PointerEvent, shape: CanvasShape, index: number, insert: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!insert) {
      const prev = lastDown.current;
      const now = e.timeStamp;
      lastDown.current = { id: shape.id, index, at: now };
      if (prev && prev.id === shape.id && prev.index === index && now - prev.at < 400) {
        lastDown.current = null;
        removeVertex(shape, index);
        return;
      }
    }
    boxRef.current?.setPointerCapture(e.pointerId);
    const poly = shape.polygon.map((p) => [p[0], p[1]] as Point);
    if (insert) {
      const a = poly[index];
      const b = poly[(index + 1) % poly.length];
      poly.splice(index + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      index += 1;
    }
    setDrag({ id: shape.id, index, poly, moved: insert });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (drawing) {
      setCursor(toPoint(e));
      return;
    }
    if (!drag) return;
    const p = toPoint(e);
    if (!p) return;
    const poly = drag.poly.slice();
    poly[drag.index] = p;
    setDrag({ ...drag, poly, moved: true });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag) return;
    boxRef.current?.releasePointerCapture?.(e.pointerId);
    if (drag.moved && onEdit) onEdit(drag.id, drag.poly);
    setDrag(null);
  };

  const removeVertex = (shape: CanvasShape, index: number) => {
    if (!onEdit || shape.polygon.length <= 3) return;
    onEdit(
      shape.id,
      shape.polygon.filter((_, i) => i !== index)
    );
  };

  const polyOf = (s: CanvasShape) => (drag && drag.id === s.id ? drag.poly : s.polygon);
  const pts = (poly: Point[]) => poly.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div>
      {drawing && (
        <div className="pc-bar">
          <span>
            Crtate <b>{drawLabel}</b>: kliknite redom na uglove. Klik na prvu tačku ili <kbd>Enter</kbd> zatvara oblik.
          </span>
          <span className="pc-actions">
            <button type="button" onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>
              ↶ Poništi tačku
            </button>
            <button type="button" onClick={() => onComplete(points)} disabled={points.length < 3} className="is-primary">
              Završi oblik
            </button>
            <button type="button" onClick={onCancel}>
              Otkaži
            </button>
          </span>
        </div>
      )}
      {editable && (
        <div className="pc-bar is-edit">
          <span>
            <b>{editable.label}</b>: povucite ugao da ga pomerite · povucite malu tačku na ivici za novi ugao · dvoklik na ugao ga briše.
            Čuva se čim pustite.
          </span>
        </div>
      )}
      <div
        ref={boxRef}
        className={drawing ? 'pc-box is-drawing' : drag ? 'pc-box is-dragging' : 'pc-box'}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onMouseLeave={() => setCursor(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- slika sa R2 CDN-a, prirodne proporcije */}
        <img src={imageUrl} alt="" draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {shapes.map((s) => (
            <polygon
              key={s.id}
              points={pts(polyOf(s))}
              fill={s.fill}
              stroke={s.active ? '#1E5AA8' : s.stroke}
              strokeWidth={s.active ? 3 : 1.6}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: !drawing && onShapeClick ? 'pointer' : undefined, pointerEvents: drawing || drag ? 'none' : 'auto' }}
              onClick={(e) => {
                if (drawing || !onShapeClick) return;
                e.stopPropagation();
                onShapeClick(s.id);
              }}
            />
          ))}
          {drawing && points.length > 0 && (
            <polyline
              points={pts(cursor ? [...points, cursor] : points)}
              fill="rgba(30,90,168,.18)"
              stroke="#1E5AA8"
              strokeWidth={2}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {shapes.map((s) => {
          const [cx, cy] = polygonCenter(polyOf(s));
          return (
            <span key={`l-${s.id}`} className={s.active ? 'pc-label is-active' : 'pc-label'} style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
              {s.label}
            </span>
          );
        })}
        {editable &&
          polyOf(editable).map((p, i, poly) => {
            const q = poly[(i + 1) % poly.length];
            return (
              <span key={`h-${i}`}>
                {/* Sredina ivice: povlačenje ubacuje novi ugao. Dok se vuče, sakrivene su. */}
                {!drag && (
                  <span
                    className="pc-mid"
                    title="Povucite za novi ugao"
                    style={{ left: `${((p[0] + q[0]) / 2) * 100}%`, top: `${((p[1] + q[1]) / 2) * 100}%` }}
                    onPointerDown={(e) => startDrag(e, editable, i, true)}
                  />
                )}
                <span
                  className={drag && drag.index === i ? 'pc-handle is-active' : 'pc-handle'}
                  title="Povucite ugao · dvoklik briše"
                  style={{ left: `${p[0] * 100}%`, top: `${p[1] * 100}%` }}
                  onPointerDown={(e) => startDrag(e, editable, i, false)}
                />
              </span>
            );
          })}
        {drawing &&
          points.map(([x, y], i) => (
            <span key={i} className={i === 0 ? 'pc-dot is-first' : 'pc-dot'} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
          ))}
      </div>
    </div>
  );
}
