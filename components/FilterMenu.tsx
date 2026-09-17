'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Jedan filter na spisku tura (/ture) kao padajući meni sa kvačicama.
 *
 * Zašto meni, a ne red pilula: Kragujevac ima skoro četrdeset naselja, pa
 * bi ih red pilula razvukao preko pola ekrana pre nego što se vidi ijedna
 * tura. Meni zauzima jedno dugme dok se ne otvori.
 *
 * Više izabranih vrednosti radi kao "ili": izborom dva naselja se vide ture
 * iz oba, jer kupac retko traži baš jedno naselje.
 */

export type FilterMenuProps = {
  label: string;
  options: string[];
  /** Izabrane vrednosti - prazno znači "sve". */
  selected: string[];
  /** Natpis stavke, kad se u meniju piše drugačije nego u bazi. */
  optionLabel?: (value: string) => string;
  onToggle: (value: string) => void;
  onClear: () => void;
  clearLabel: string;
  /** Zatvara meni - izbor je već primenjen, ovo je "gotov sam ovde". */
  confirmLabel: string;
  allLabel: string;
};

export default function FilterMenu({
  label,
  options,
  selected,
  optionLabel = (v) => v,
  onToggle,
  onClear,
  clearLabel,
  confirmLabel,
  allLabel
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Meni ostaje otvoren dok se kvačice postavljaju - zatvara ga tek klik
  // izvan njega ili Escape, jer se bira više vrednosti odjednom.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Na dugmetu piše šta je izabrano, da se izbor vidi i kad je meni zatvoren.
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? optionLabel(selected[0])
        : `${selected.length} izabrano`;

  return (
    <div className="filter-menu" ref={wrapRef}>
      <button
        type="button"
        className={`filter-toggle${selected.length ? ' on' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="filter-toggle-label">{label}</span>
        <span className="filter-toggle-value">{summary}</span>
        <span className="filter-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="filter-panel" role="group" aria-label={label}>
          {options.map((value) => (
            <label className="filter-opt" key={value}>
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={() => onToggle(value)}
              />
              <span>{optionLabel(value)}</span>
            </label>
          ))}

          {/* Kvačice se primenjuju odmah, pa je "Potvrdi" zapravo "gotov sam
              ovde" - zatvara meni da posetilac ide na sledeći filter ili na
              same ture. "Poništi" briše izbor, ali ostavlja meni otvoren,
              da može odmah da izabere drugo. */}
          <div className="filter-panel-foot">
            <button
              type="button"
              className="filter-panel-clear"
              onClick={onClear}
              disabled={selected.length === 0}
            >
              {clearLabel}
            </button>
            <button
              type="button"
              className="filter-panel-done"
              onClick={() => setOpen(false)}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
