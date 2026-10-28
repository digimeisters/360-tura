'use client';

import { useState } from 'react';
import { FORM, formBtnStyle } from '../../../lib/formTheme';
import type { FloorplanLayout, ForeignLang, PlanDoor, PlanGroup, PlanShape } from '../../../lib/floorplanLayout';
import { formatArea, groupAreaM2, parseMeters, shapeMeters } from '../../../lib/floorplanMeasure';

/**
 * Delovi panela editora šematskog plana (28. 10. 2026): mere prostorije,
 * nazivi na jezicima ture i izabrana vrata. Stanje rasporeda drži stranica
 * (page.tsx); ovde su samo polja i dugmad.
 */

const small: React.CSSProperties = { ...formBtnStyle, padding: '6px 11px', fontSize: '13px' };
const input: React.CSSProperties = {
  padding: '7px 8px',
  fontSize: '14px',
  borderRadius: '9px',
  border: `1px solid ${FORM.borderStrong}`,
  background: FORM.surface,
  color: FORM.textPrimary
};
const hint: React.CSSProperties = { margin: 0, fontSize: '12px', color: FORM.textSecondary };
const fmt = (m: number) => m.toFixed(2).replace('.', ',');

/** Š × D u metrima za izabrani pravougaonik; prazno = crta se odokativno. */
export function MetersFields({
  layout,
  shape,
  onApply,
  onClear
}: {
  layout: FloorplanLayout;
  shape: PlanShape;
  onApply: (wM: number, hM: number) => void;
  onClear: () => void;
}) {
  const meters = shapeMeters(shape, layout.unitsPerMeter);
  // Dok se kuca, polja pokazuju ukucano; inače mere iz crteža (prate povlačenje ivice).
  const [typed, setTyped] = useState<{ w: string; h: string } | null>(null);
  const [error, setError] = useState('');
  const w = typed?.w ?? (meters ? fmt(meters.w) : '');
  const h = typed?.h ?? (meters ? fmt(meters.h) : '');
  const type = (field: 'w' | 'h', value: string) => setTyped({ w, h, [field]: value });

  const apply = () => {
    if (!typed) return;
    if (!typed.w.trim() && !typed.h.trim()) {
      setTyped(null);
      return;
    }
    const wm = parseMeters(typed.w);
    const hm = parseMeters(typed.h);
    if (wm === null || hm === null) {
      setError('Upišite mere u metrima, npr. 3,40');
      return;
    }
    setError('');
    setTyped(null);
    onApply(wm, hm);
  };

  const area = groupAreaM2(layout, shape.group);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '12.5px', color: FORM.textSecondary }}>Mere (nisu obavezne)</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <input
          value={w}
          onChange={(e) => type('w', e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          inputMode="decimal"
          placeholder="širina"
          aria-label="Širina u metrima"
          style={{ ...input, width: '78px', textAlign: 'center' }}
        />
        ×
        <input
          value={h}
          onChange={(e) => type('h', e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          inputMode="decimal"
          placeholder="dužina"
          aria-label="Dužina u metrima"
          style={{ ...input, width: '78px', textAlign: 'center' }}
        />
        m
        {meters && (
          <button
            type="button"
            onClick={() => {
              setTyped(null);
              onClear();
            }}
            style={{ ...small, marginLeft: 'auto' }}
          >
            Ukloni mere
          </button>
        )}
      </div>
      {error && <p style={{ ...hint, color: FORM.danger }}>{error}</p>}
      {area !== null ? (
        <p style={hint}>
          Površina: <b style={{ color: FORM.textPrimary }}>{formatArea(area, 'sr')}</b>
        </p>
      ) : meters ? (
        <p style={hint}>Prostorija ima još delova bez mera - m² se prikazuje kad se izmere svi.</p>
      ) : !layout.unitsPerMeter ? (
        <p style={hint}>Prve upisane mere postavljaju razmeru celog plana.</p>
      ) : null}
    </div>
  );
}

const LANG_LABEL: Record<ForeignLang, string> = { en: 'EN', de: 'DE', ru: 'RU' };

/** Naziv prostorije na jezicima ture: automatski popunjen, vlasnik može da ispravi. */
export function LabelLanguages({
  group,
  languages,
  onChange
}: {
  group: PlanGroup;
  languages: ForeignLang[];
  onChange: (lang: ForeignLang, text: string) => void;
}) {
  if (!languages.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: '6px', alignItems: 'center', fontSize: '12.5px' }}>
      {languages.map((lang) => {
        const manual = group.labelsManual?.includes(lang);
        const value = group.labels?.[lang] ?? '';
        return (
          <label key={lang} style={{ display: 'contents' }}>
            <span style={{ color: FORM.textSecondary, fontWeight: 600 }}>{LANG_LABEL[lang]}</span>
            <input
              value={value}
              onChange={(e) => onChange(lang, e.target.value)}
              maxLength={60}
              placeholder="prevod pri čuvanju"
              title={manual ? 'Ručno upisano' : 'Automatski - možete ispraviti'}
              style={{ ...input, padding: '6px 8px', fontSize: '13.5px', color: manual ? FORM.textPrimary : FORM.textSecondary }}
            />
          </label>
        );
      })}
      <span />
      <p style={hint}>Sivo = automatski prevod. Obrišite polje da se ponovo prevede.</p>
    </div>
  );
}

/** Izabrana vrata: vrsta, u koju prostoriju se otvaraju, strana šarke. */
export function DoorPanel({
  layout,
  door,
  onChange,
  onDelete
}: {
  layout: FloorplanLayout;
  door: PlanDoor;
  onChange: (door: PlanDoor) => void;
  onDelete: () => void;
}) {
  const name = (id: string) => layout.groups.find((g) => g.id === id)?.label ?? '';
  const kind = door.kind ?? 'opening';
  const into = door.into ?? door.b;
  const on = (active: boolean): React.CSSProperties =>
    active ? { ...small, backgroundColor: FORM.accent, border: `1px solid ${FORM.accent}`, color: '#fff', fontWeight: 700 } : small;
  return (
    <>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
        {name(door.a)} ↔ {name(door.b)}
      </p>
      <p style={hint}>Prevucite vrata na planu duž zida.</p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', color: FORM.textSecondary, width: '90px' }}>Vrsta</span>
        <button type="button" style={on(kind === 'door')} onClick={() => onChange({ ...door, kind: 'door', into, hinge: door.hinge ?? 'start' })}>
          Vrata
        </button>
        <button type="button" style={on(kind === 'opening')} onClick={() => onChange({ ...door, kind: 'opening' })}>
          Prolaz
        </button>
      </div>
      {kind === 'door' && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', color: FORM.textSecondary, width: '90px' }}>Otvaraju se u</span>
          {[door.a, door.b].map((g) => (
            <button key={g} type="button" style={on(into === g)} onClick={() => onChange({ ...door, into: g })}>
              {name(g)}
            </button>
          ))}
          <button
            type="button"
            style={small}
            title="Šarka na drugu stranu otvora"
            onClick={() => onChange({ ...door, hinge: door.hinge === 'end' ? 'start' : 'end' })}
          >
            ⇄ Šarka
          </button>
        </div>
      )}
      <button type="button" onClick={onDelete} style={{ ...small, color: FORM.danger, alignSelf: 'flex-start' }}>
        Obriši vrata
      </button>
    </>
  );
}
