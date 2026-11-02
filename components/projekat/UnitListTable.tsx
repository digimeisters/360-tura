'use client';

import type { KeyboardEvent } from 'react';
import type { UnitStatus } from '../../app/lib/projects';
import { floorLabel, formatArea, formatPrice, PROJECT_TEXT, statusLabel, structureText, type ProjectLang } from '../../app/lib/projectI18n';
import { perSqm, type SortKey, type UnitSort } from '../../app/lib/unitFilters';
import type { SelectorFloor, SelectorUnit } from './ProjectSelector';

/**
 * „Lista" u izboru stana: svi stanovi u tabeli, sortiranje klikom na
 * naslov kolone. Filtrira i sortira ProjectSelector (unitFilters.ts), ovde
 * je samo prikaz. Na telefonu red postaje kartica (data-l = naziv polja).
 */

const badgeOf = (s: UnitStatus) => (s === 'available' ? 's' : s === 'reserved' ? 'r' : 'p');

export default function UnitListTable({
  units,
  lang,
  isComplex,
  sort,
  onSort,
  floorOf,
  buildingName,
  onOpen
}: {
  /** Već filtrirano i sortirano. */
  units: SelectorUnit[];
  lang: ProjectLang;
  isComplex: boolean;
  sort: UnitSort;
  onSort: (key: SortKey) => void;
  floorOf: (u: SelectorUnit) => SelectorFloor | undefined;
  buildingName: (id: string | null) => string;
  onOpen: (u: SelectorUnit) => void;
}) {
  const t = PROJECT_TEXT[lang];
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    fn();
  };
  const th = (key: SortKey, label: string, cls?: string) => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(key)}>
        {label}
        <i aria-hidden="true">{sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</i>
      </button>
    </th>
  );

  return (
    <div className="inv-lst">
      {units.length === 0 ? (
        <p className="inv-muted">{t.noMatch}</p>
      ) : (
        <div className="inv-lst-wrap">
          <table className="inv-lst-table">
            <thead>
              <tr>
                {th('code', t.unit)}
                {isComplex && th('building', t.buildingCol)}
                {th('floor', t.floor)}
                {th('structure', t.structure)}
                {th('area', t.area, 'is-num')}
                {th('terrace', t.terrace, 'is-num')}
                {th('price', t.price, 'is-num')}
                {th('sqm', '€/m²', 'is-num')}
                {th('status', t.statusCol)}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const f = floorOf(u);
                const sqm = perSqm(u);
                return (
                  <tr key={u.id} tabIndex={0} onClick={() => onOpen(u)} onKeyDown={onKey(() => onOpen(u))} aria-label={`${t.unit} ${u.code}`}>
                    <td className="is-code">
                      <b>{u.code}</b>
                    </td>
                    {isComplex && <td data-l={t.buildingCol}>{buildingName(f?.buildingId ?? null)}</td>}
                    <td data-l={t.floor}>{f ? floorLabel(f.level, f.label, lang) : '—'}</td>
                    <td data-l={t.structure}>{structureText(u.structure, lang) || '—'}</td>
                    <td data-l={t.area} className="is-num">
                      {formatArea(u.areaSqm, lang)}
                    </td>
                    <td data-l={t.terrace} className="is-num">
                      {formatArea(u.terraceSqm, lang)}
                    </td>
                    <td data-l={t.price} className="is-num is-price">
                      {u.status === 'sold' ? '—' : u.price ? formatPrice(u.price, lang) : t.onRequest}
                    </td>
                    <td data-l="€/m²" className="is-num">
                      {u.status !== 'sold' && sqm ? formatPrice(sqm, lang) : '—'}
                    </td>
                    <td className="is-status">
                      <span className={`inv-badge is-${badgeOf(u.status)}`}>{statusLabel(u.status, lang)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
