'use client';

import { useState } from 'react';
import { FORM, formBtnStyle } from '../../lib/formTheme';

/**
 * Polje "Agencija" u formi ture: bira se iz agencija koje već postoje, a nova
 * se upisuje samo kad se izabere "+ Nova agencija". Izveštaj i logo agencije
 * vezani su za tačan naziv (lib/agencyReport.ts), pa bi "Centar" i "centar "
 * bile dve agencije sa dva odvojena linka (vlasnik, 17. 10. 2026).
 */

const NONE = '';
const NEW = '__new__';

/** Za poređenje: bez razlike u velikim slovima, kvačicama i razmacima. */
function key(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AgencyPicker({
  value,
  agencies,
  onChange,
  inputStyle
}: {
  value: string;
  /** Agencije koje već imaju bar jednu turu, bez duplikata. */
  agencies: string[];
  onChange: (value: string) => void;
  inputStyle: React.CSSProperties;
}) {
  // Nova agencija se kuca; postojeća (ili prazno) se bira. Pri izmeni ture čija
  // agencija iz nekog razloga nije u spisku, polje odmah prikazuje upisan naziv.
  const isKnown = (v: string) => v === '' || agencies.includes(v);
  const [typing, setTyping] = useState(!isKnown(value));
  // Vrednost koju je ovo polje poslednje poslalo. Kad stigne neka druga, formu
  // je promenio neko spolja (nova tura, izmena druge ture, posle čuvanja) -
  // tada se režim postavlja iz nove vrednosti. Poređenje tokom iscrtavanja.
  const [emitted, setEmitted] = useState<string | null>(null);
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    if (value !== emitted) setTyping(!isKnown(value));
  }
  const emit = (v: string) => {
    setEmitted(v);
    onChange(v);
  };

  const trimmed = value.trim();
  const twin = typing && trimmed ? agencies.find((a) => a !== value && key(a) === key(trimmed)) : undefined;

  if (!typing) {
    return (
      <select
        id="tour-agency"
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW) {
            setTyping(true);
            emit('');
          } else {
            emit(e.target.value);
          }
        }}
        style={inputStyle}
      >
        <option value={NONE}>— Bez agencije —</option>
        {agencies.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
        <option value={NEW}>+ Nova agencija…</option>
      </select>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          id="tour-agency"
          value={value}
          onChange={(e) => emit(e.target.value)}
          placeholder="Tačan naziv nove agencije"
          autoFocus
          style={{ ...inputStyle, flex: 1 }}
        />
        {agencies.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setTyping(false);
              emit('');
            }}
            style={{ ...formBtnStyle, padding: '0 12px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
          >
            Izaberi postojeću
          </button>
        )}
      </div>
      {twin && (
        <span style={{ fontSize: '12.5px', color: FORM.danger }}>
          Već postoji „{twin}“.{' '}
          <button
            type="button"
            onClick={() => {
              setTyping(false);
              emit(twin);
            }}
            style={{ border: 'none', background: 'none', padding: 0, color: FORM.accent, fontWeight: 700, cursor: 'pointer', fontSize: '12.5px' }}
          >
            Koristi nju
          </button>
        </span>
      )}
    </div>
  );
}
