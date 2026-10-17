'use client';

import { useMemo, useState } from 'react';
import { FORM, formBtnStyle } from '../../lib/formTheme';

/**
 * Pretraga, filteri i redosled za spisak tura u adminu (vlasnik, 17. 10. 2026:
 * "da mogu da se snalazim kad bude veći broj tura"). Sve se radi u pregledaču
 * nad već učitanim spiskom - API se ne menja.
 */

export type FilterableTour = {
  slug: string;
  agency_name: string | null;
  agent_name: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  published: boolean;
  status: 'active' | 'rented' | 'sold' | 'paused';
  created_at: string | null;
};

type Sort = 'newest' | 'oldest' | 'title';

type Filters = {
  query: string;
  agency: string;
  category: string;
  published: '' | 'yes' | 'no';
  status: string;
  city: string;
  sort: Sort;
};

const EMPTY: Filters = { query: '', agency: '', category: '', published: '', status: '', city: '', sort: 'newest' };

/** Oznaka za ture bez agencije u padajućem spisku (vrednost koja nije ime agencije). */
const NO_AGENCY = '__none__';

/** "17. 10. 2026." - datum kreiranja u tabeli; prazno kad ga baza nema. */
export function formatCreatedDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}.`;
}

/** Bez razlike između č/c, ć/c, š/s, ž/z, đ/dj i velikih/malih slova. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function useTourListFilter<T extends FilterableTour>(tours: T[], getTitle: (tour: T) => string) {
  const [filters, setFilters] = useState<Filters>(EMPTY);

  const options = useMemo(() => {
    const agencies = [...new Set(tours.map((t) => t.agency_name?.trim()).filter((a): a is string => Boolean(a)))].sort((a, b) =>
      a.localeCompare(b, 'sr')
    );
    const cities = [...new Set(tours.map((t) => t.city?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) =>
      a.localeCompare(b, 'sr')
    );
    return { agencies, cities, hasNoAgency: tours.some((t) => !t.agency_name?.trim()) };
  }, [tours]);

  const visible = useMemo(() => {
    const words = normalize(filters.query.trim()).split(/\s+/).filter(Boolean);
    const list = tours.filter((t) => {
      if (filters.agency === NO_AGENCY ? t.agency_name?.trim() : filters.agency && t.agency_name?.trim() !== filters.agency) return false;
      if (filters.category && (t.category || 'rent') !== filters.category) return false;
      if (filters.published === 'yes' && !t.published) return false;
      if (filters.published === 'no' && t.published) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.city && t.city?.trim() !== filters.city) return false;
      if (words.length) {
        const haystack = normalize([getTitle(t), t.slug, t.address, t.city, t.agency_name, t.agent_name].filter(Boolean).join(' '));
        if (!words.every((w) => haystack.includes(w))) return false;
      }
      return true;
    });
    const time = (t: T) => (t.created_at ? new Date(t.created_at).getTime() : 0);
    if (filters.sort === 'title') list.sort((a, b) => getTitle(a).localeCompare(getTitle(b), 'sr'));
    else if (filters.sort === 'oldest') list.sort((a, b) => time(a) - time(b));
    else list.sort((a, b) => time(b) - time(a));
    return list;
  }, [tours, filters, getTitle]);

  const active = Object.entries(filters).some(([key, value]) => key !== 'sort' && value !== '');

  return { filters, setFilters, options, visible, active, reset: () => setFilters(EMPTY) };
}

type Props = {
  state: ReturnType<typeof useTourListFilter<FilterableTour>>;
  total: number;
  categoryLabels: Record<string, string>;
  statusLabels: Record<FilterableTour['status'], string>;
};

export function TourFilterBar({ state, total, categoryLabels, statusLabels }: Props) {
  const { filters, setFilters, options, visible, active, reset } = state;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: '10px',
        padding: '14px',
        borderBottom: '1px solid ' + FORM.border
      }}
    >
      <label style={{ ...fieldStyle, flex: '1 1 220px' }}>
        <span style={labelStyle}>Pretraga</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder="Naziv, adresa, agencija, agent…"
          style={controlStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Agencija</span>
        <select value={filters.agency} onChange={(e) => set('agency', e.target.value)} style={controlStyle}>
          <option value="">Sve</option>
          {options.agencies.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
          {options.hasNoAgency && <option value={NO_AGENCY}>Bez agencije</option>}
        </select>
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Tip</span>
        <select value={filters.category} onChange={(e) => set('category', e.target.value)} style={controlStyle}>
          <option value="">Svi</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Stanje</span>
        <select value={filters.published} onChange={(e) => set('published', e.target.value as Filters['published'])} style={controlStyle}>
          <option value="">Sve</option>
          <option value="yes">Objavljena</option>
          <option value="no">U pripremi</option>
        </select>
      </label>

      <label style={fieldStyle}>
        <span style={labelStyle}>Nekretnina</span>
        <select value={filters.status} onChange={(e) => set('status', e.target.value)} style={controlStyle}>
          <option value="">Sve</option>
          {(Object.keys(statusLabels) as FilterableTour['status'][]).map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </label>

      {options.cities.length > 1 && (
        <label style={fieldStyle}>
          <span style={labelStyle}>Grad</span>
          <select value={filters.city} onChange={(e) => set('city', e.target.value)} style={controlStyle}>
            <option value="">Svi</option>
            {options.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      )}

      <label style={fieldStyle}>
        <span style={labelStyle}>Redosled</span>
        <select value={filters.sort} onChange={(e) => set('sort', e.target.value as Sort)} style={controlStyle}>
          <option value="newest">Najnovije prvo</option>
          <option value="oldest">Najstarije prvo</option>
          <option value="title">Naziv A–Ž</option>
        </select>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', minHeight: '38px' }}>
        <span style={{ fontSize: '13px', color: FORM.textSecondary, whiteSpace: 'nowrap' }}>
          {active ? `Prikazano ${visible.length} od ${total}` : `Ukupno ${total}`}
        </span>
        {active && (
          <button type="button" onClick={reset} style={{ ...formBtnStyle, padding: '7px 12px', fontSize: '13px' }}>
            Poništi filtere
          </button>
        )}
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 1 150px', minWidth: '120px' };

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  color: FORM.textSecondary
};

const controlStyle: React.CSSProperties = {
  height: '38px',
  padding: '0 10px',
  borderRadius: '10px',
  border: '1px solid ' + FORM.border,
  fontSize: '14px',
  fontFamily: 'inherit',
  background: FORM.surfaceAlt,
  color: FORM.textPrimary,
  width: '100%'
};
