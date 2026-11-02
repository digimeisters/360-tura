'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { UNIT_STATUS_COLORS, type UnitStatus } from '../../app/lib/projects';
import { floorLabel, formatArea, formatPrice, PROJECT_TEXT, srPlural, statusLabel, structureText, type ProjectLang } from '../../app/lib/projectI18n';
import { activeFilterCount, EMPTY_FILTERS, type UnitFilters } from '../../app/lib/unitFilters';
import { RangeSlider, shortStructure } from './FacadeFullscreen';
import type { SelectorBuilding } from './ProjectSelector';

/**
 * Filteri izbora stana (ProjectSelector): traka sa padajućim izborima na
 * računaru, a na telefonu dugme „Filteri" sa čipovima i panel od dole.
 * Isto stanje filtera važi za zgradu i za listu; sprat i lamela su samo u
 * listi (listOnly).
 */

/** Panel filtera na telefonu. */
const MOBILE_TXT = {
  sr: {
    filters: 'Filteri',
    rooms: 'Broj soba',
    reset: 'Poništi',
    close: 'Zatvori',
    remove: 'Ukloni filter',
    noStatus: 'nijedan status',
    count: (n: number) => `${n} ${srPlural(n, 'stan', 'stana', 'stanova')}`,
    of: (n: number, all: number) => `${n} od ${all}`,
    show: (n: number) => `Prikaži ${n} ${srPlural(n, 'stan', 'stana', 'stanova')}`
  },
  en: {
    filters: 'Filters',
    rooms: 'Rooms',
    reset: 'Clear',
    close: 'Close',
    remove: 'Remove filter',
    noStatus: 'no status',
    count: (n: number) => `${n} ${n === 1 ? 'apartment' : 'apartments'}`,
    of: (n: number, all: number) => `${n} of ${all}`,
    show: (n: number) => `Show ${n} ${n === 1 ? 'apartment' : 'apartments'}`
  }
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const allStatuses: UnitStatus[] = ['available', 'reserved', 'sold'];

export default function SelectorFilters({
  lang,
  filters,
  setFilters,
  listOnly,
  isComplex,
  buildings,
  buildingName,
  structures,
  priceOptions,
  areaOptions,
  listLevels,
  levelSpan,
  areaSpan,
  priceSpan,
  scopeCount,
  shownCount
}: {
  lang: ProjectLang;
  filters: UnitFilters;
  setFilters: Dispatch<SetStateAction<UnitFilters>>;
  /** Lista svih stanova (ima i sprat i lamelu) ili zgrada. */
  listOnly: boolean;
  isComplex: boolean;
  buildings: SelectorBuilding[];
  buildingName: (id: string | null) => string;
  structures: string[];
  priceOptions: number[];
  areaOptions: number[];
  listLevels: number[];
  /** Opsezi klizača na telefonu (stvarne vrednosti projekta). */
  levelSpan: [number, number];
  areaSpan: [number, number];
  priceSpan: [number, number];
  /** Koliko stanova je u prikazu (zgrada ili lista) i koliko od njih prolazi filtere. */
  scopeCount: number;
  shownCount: number;
}) {
  const t = PROJECT_TEXT[lang];
  const mt = MOBILE_TXT[lang];
  const [sheet, setSheet] = useState(false);
  const { structure, maxPrice, minArea, onlyFree, listFloor, listBuilding, floorRange, areaRange, rooms, statuses } = filters;
  const set = <K extends keyof UnitFilters>(key: K, value: UnitFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const status = (s: UnitStatus) => statusLabel(s, lang);
  const activeCount = activeFilterCount(filters, listOnly);
  const resetFilters = () => setFilters(EMPTY_FILTERS);

  // Panel filtera na telefonu: strana se ne pomera ispod njega, Esc ga zatvara.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheet]);

  // ---------- traka filtera: ista za zgradu i za listu ----------
  const pill = (key: string, label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <label key={key} className={value ? 'inv-pill is-on' : 'inv-pill'}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t.any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const filterBar = (
    <div className="inv-fbar" role="group" aria-label={t.filters}>
      {structures.length > 1 &&
        pill(
          'structure',
          t.structure,
          structure ?? '',
          (v) => set('structure', v || null),
          structures.map((x) => ({ value: x, label: structureText(x, lang) || x }))
        )}
      {listOnly &&
        isComplex &&
        pill(
          'building',
          t.buildingCol,
          listBuilding ?? '',
          (v) => set('listBuilding', v || null),
          buildings.map((b) => ({ value: b.id, label: b.name }))
        )}
      {listOnly &&
        listLevels.length > 1 &&
        pill(
          'floor',
          t.floor,
          listFloor === null ? '' : String(listFloor),
          (v) => set('listFloor', v === '' ? null : Number(v)),
          listLevels.map((l) => ({ value: String(l), label: floorLabel(l, null, lang) }))
        )}
      {priceOptions.length > 0 &&
        pill(
          'price',
          t.priceTo,
          maxPrice === null ? '' : String(maxPrice),
          (v) => set('maxPrice', v ? Number(v) : null),
          priceOptions.map((p) => ({ value: String(p), label: formatPrice(p, lang) }))
        )}
      {areaOptions.length > 0 &&
        pill(
          'area',
          t.areaFrom,
          minArea === null ? '' : String(minArea),
          (v) => set('minArea', v ? Number(v) : null),
          areaOptions.map((a) => ({ value: String(a), label: formatArea(a, lang) }))
        )}
      <button type="button" className={onlyFree ? 'inv-pill is-on is-toggle' : 'inv-pill is-toggle'} aria-pressed={onlyFree} onClick={() => set('onlyFree', !onlyFree)}>
        <i aria-hidden="true" />
        {t.onlyFree}
      </button>
      {activeCount > 0 && (
        <button type="button" className="inv-reset" onClick={resetFilters}>
          {t.reset(activeCount)}
        </button>
      )}
    </div>
  );

  // ---------- telefon: dugme „Filteri" + čipovi + panel od dole ----------
  const fl = (v: number) => (v === 0 ? (lang === 'en' ? 'G' : 'P') : String(v));
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (floorRange) chips.push({ key: 'fr', label: `${t.floor} ${fl(floorRange[0])}–${fl(floorRange[1])}`, clear: () => set('floorRange', null) });
  if (listOnly && listFloor !== null) chips.push({ key: 'lf', label: floorLabel(listFloor, null, lang), clear: () => set('listFloor', null) });
  if (listOnly && listBuilding !== null) chips.push({ key: 'lb', label: buildingName(listBuilding), clear: () => set('listBuilding', null) });
  if (areaRange) chips.push({ key: 'ar', label: `${areaRange[0]}–${areaRange[1]} m²`, clear: () => set('areaRange', null) });
  if (minArea !== null) chips.push({ key: 'ma', label: `${t.areaFrom} ${formatArea(minArea, lang)}`, clear: () => set('minArea', null) });
  if (maxPrice !== null) chips.push({ key: 'mp', label: `${t.priceTo} ${formatPrice(maxPrice, lang)}`, clear: () => set('maxPrice', null) });
  if (rooms.length) chips.push({ key: 'ro', label: rooms.map((r) => structureText(r, lang) || r).join(', '), clear: () => set('rooms', []) });
  if (structure !== null) chips.push({ key: 'st', label: structureText(structure, lang) || structure, clear: () => set('structure', null) });
  if (statuses) chips.push({ key: 'ss', label: statuses.map((s) => status(s)).join(', ') || mt.noStatus, clear: () => set('statuses', null) });
  if (onlyFree) chips.push({ key: 'of', label: t.onlyFree, clear: () => set('onlyFree', false) });

  const mobileFilters = (
    <div className="inv-mf">
      <button type="button" className={activeCount ? 'inv-mf-btn is-on' : 'inv-mf-btn'} onClick={() => setSheet(true)} aria-haspopup="dialog">
        <span className="inv-mf-l">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {mt.filters}
          {activeCount > 0 && <span className="inv-mf-n">{activeCount}</span>}
        </span>
        <span className="inv-mf-r">{activeCount ? mt.of(shownCount, scopeCount) : mt.count(scopeCount)}</span>
      </button>
      {chips.length > 0 && (
        <div className="inv-mf-chips">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} aria-label={`${mt.remove}: ${c.label}`}>
              {c.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const filterSheet = sheet && (
    <div className="inv-sheet-wrap" role="dialog" aria-modal="true" aria-label={mt.filters}>
      <div className="inv-sheet-shade" onClick={() => setSheet(false)} />
      <div className="inv-sheet">
        <div className="inv-sheet-grab" aria-hidden="true" />
        <div className="inv-sheet-head">
          <b>{mt.filters}</b>
          <button type="button" onClick={() => setSheet(false)} aria-label={mt.close}>
            ×
          </button>
        </div>
        <div className="inv-sheet-body">
          {isComplex && listOnly && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">{t.buildingCol}</div>
              <div className="inv-sheet-seg" style={{ gridTemplateColumns: `repeat(${Math.min(4, buildings.length)}, minmax(0,1fr))` }}>
                {buildings.map((b) => (
                  <button key={b.id} type="button" aria-pressed={listBuilding === b.id} onClick={() => set('listBuilding', listBuilding === b.id ? null : b.id)}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {levelSpan[1] > levelSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.floor}
                <span className="inv-sheet-v">
                  {fl((floorRange ?? levelSpan)[0])} – {fl((floorRange ?? levelSpan)[1])}
                </span>
              </div>
              <RangeSlider
                className="is-light"
                min={levelSpan[0]}
                max={levelSpan[1]}
                value={floorRange ?? levelSpan}
                label={t.floor}
                format={fl}
                onChange={(v) => set('floorRange', v[0] === levelSpan[0] && v[1] === levelSpan[1] ? null : v)}
              />
            </div>
          )}
          {areaSpan[1] > areaSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.area}
                <span className="inv-sheet-v">
                  {(areaRange ?? areaSpan)[0]} m² – {(areaRange ?? areaSpan)[1]} m²
                </span>
              </div>
              <RangeSlider
                className="is-light"
                min={areaSpan[0]}
                max={areaSpan[1]}
                value={areaRange ?? areaSpan}
                label={t.area}
                format={(v) => `${v} m²`}
                onChange={(v) => set('areaRange', v[0] === areaSpan[0] && v[1] === areaSpan[1] ? null : v)}
              />
            </div>
          )}
          {priceSpan[1] > priceSpan[0] && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">
                {t.priceTo}
                <span className="inv-sheet-v">{maxPrice === null ? t.any : formatPrice(maxPrice, lang)}</span>
              </div>
              <div className="fs-range is-light">
                <div className="fs-range-track">
                  <i style={{ left: 0, width: `${(((maxPrice ?? priceSpan[1]) - priceSpan[0]) / (priceSpan[1] - priceSpan[0])) * 100}%` }} />
                  <input
                    type="range"
                    min={priceSpan[0]}
                    max={priceSpan[1]}
                    step={5000}
                    value={maxPrice ?? priceSpan[1]}
                    aria-label={t.priceTo}
                    onChange={(e) => set('maxPrice', Number(e.target.value) >= priceSpan[1] ? null : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
          {structures.length > 1 && (
            <div className="inv-sheet-grp">
              <div className="inv-sheet-l">{mt.rooms}</div>
              <div className="inv-sheet-seg" style={{ gridTemplateColumns: `repeat(${Math.min(5, structures.length)}, minmax(0,1fr))` }}>
                {structures.map((s) => (
                  <button key={s} type="button" aria-pressed={rooms.includes(s)} onClick={() => set('rooms', toggle(rooms, s))}>
                    {shortStructure(s)}
                    <small>{structureText(s, lang) || s}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="inv-sheet-grp">
            <div className="inv-sheet-l">{t.statusCol}</div>
            <div className="inv-sheet-st">
              {/* Ništa izabrano = bez filtera (prikazuju se svi). Prvi klik na status ga IZOLUJE
                  (prikazuje samo njega), ne isključuje ga iz pretpostavljenog "svi uključeni". */}
              {allStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={(statuses ?? []).includes(s)}
                  onClick={() => {
                    const next = toggle(statuses ?? [], s);
                    set('statuses', next.length === 0 || next.length === allStatuses.length ? null : next);
                  }}
                >
                  <i style={{ background: UNIT_STATUS_COLORS[s].stroke }} />
                  {status(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="inv-sheet-foot">
          <button type="button" className="is-reset" disabled={!activeCount} onClick={resetFilters}>
            {mt.reset}
          </button>
          <button type="button" className="is-go" onClick={() => setSheet(false)}>
            {mt.show(shownCount)}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {filterBar}
      {mobileFilters}
      {filterSheet}
    </>
  );
}
