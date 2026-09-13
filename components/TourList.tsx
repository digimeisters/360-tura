'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import TourCard, { type TourCardLabels } from './TourCard';

/**
 * Spisak tura sa filterima (/ture). Sve ture stižu sa servera i već su u
 * HTML-u (zbog Google-a); filteri samo skrivaju kartice u pregledaču.
 *
 * Izabrani filteri se upisuju u adresu strane, pa agencija može da podeli
 * link samo sa svojim turama: /ture?agencija=Ime · /ture?grad=Kragujevac
 *
 * Red filtera se ne prikazuje ako nema šta da se bira (npr. sve ture su u
 * istom gradu) - prazan filter samo zbunjuje.
 */

/**
 * Natpisi stoje OVDE, a ne kao prop sa strane: između servera i pregledača
 * ne mogu da pređu funkcije (npr. "2 prostorije"), pa strana šalje samo
 * čist spisak tura. Strana je za sada samo srpska.
 */
const CARD_LABELS: TourCardLabels = {
  category: (category) => ({ sale: 'Prodaja', rent: 'Izdavanje', booking: 'Smeštaj' })[category],
  rooms: (count) => (count === 1 ? '1 prostorija' : `${count} prostorija`),
  open: 'Otvori turu →'
};

const LABELS = {
  all: 'Sve',
  category: 'Vrsta oglasa',
  city: 'Grad',
  agency: 'Agencija',
  count: (shown: number, total: number) =>
    shown === total ? `Prikazano ${total} tura` : `Prikazano ${shown} od ${total} tura`,
  empty: 'Za izabrane filtere nema tura. Sklonite neki filter da vidite ostale.',
  reset: 'Poništi filtere'
};

type FilterKey = 'kategorija' | 'grad' | 'agencija';

const CATEGORY_ORDER: NonNullable<ShowcaseTour['category']>[] = ['sale', 'rent', 'booking'];

export default function TourList({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const labels = LABELS;
  const [filters, setFilters] = useState<Record<FilterKey, string | null>>({
    kategorija: null,
    grad: null,
    agencija: null
  });

  // Adresa se čita tek u pregledaču: server pravi isti HTML za sve posetioce
  // (zbog keširanja strane), pa filter iz podeljenog linka stiže ovde.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      kategorija: params.get('kategorija'),
      grad: params.get('grad'),
      agencija: params.get('agencija')
    });
  }, []);

  /**
   * Adresa se upisuje SAMO kad posetilac klikne filter, nikad automatski iz
   * stanja: Next-ov ruter osluškuje history.replaceState, pa upis pri
   * učitavanju ponovo pokreće komponentu, koja onda pročita već obrisanu
   * adresu - i filter iz podeljenog linka nestane.
   */
  const apply = (next: Record<FilterKey, string | null>) => {
    setFilters(next);
    const params = new URLSearchParams();
    (Object.keys(next) as FilterKey[]).forEach((key) => {
      const value = next[key];
      if (value) params.set(key, value);
    });
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  };

  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => tours.some((t) => t.category === c)),
    [tours]
  );
  const cities = useMemo(
    () => [...new Set(tours.map((t) => t.city).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'sr')),
    [tours]
  );
  const agencies = useMemo(
    () => [...new Set(tours.map((t) => t.agency).filter((a): a is string => Boolean(a)))].sort((a, b) => a.localeCompare(b, 'sr')),
    [tours]
  );

  const shown = tours.filter(
    (tour) =>
      (!filters.kategorija || tour.category === filters.kategorija) &&
      (!filters.grad || tour.city === filters.grad) &&
      (!filters.agencija || tour.agency === filters.agencija)
  );

  // Ponovni klik na izabran filter ga isključuje.
  const pick = (key: FilterKey, value: string | null) =>
    apply({ ...filters, [key]: filters[key] === value ? null : value });

  const row = (key: FilterKey, title: string, values: string[], label: (value: string) => string) => {
    // Jedna vrednost znači da se nema šta birati - red se ne prikazuje.
    if (values.length < 2) return null;
    return (
      <div className="filter-row" key={key}>
        <span className="filter-label">{title}</span>
        <div className="filter-chips" role="group" aria-label={title}>
          <button
            type="button"
            className={`chip filter-chip${filters[key] === null ? ' on' : ''}`}
            aria-pressed={filters[key] === null}
            onClick={() => pick(key, null)}
          >
            {labels.all}
          </button>
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip filter-chip${filters[key] === value ? ' on' : ''}`}
              aria-pressed={filters[key] === value}
              onClick={() => pick(key, value)}
            >
              {label(value)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const anyFilter = Boolean(filters.kategorija || filters.grad || filters.agencija);

  // Dok su sve ture iste vrste, u istom gradu i iste agencije, nema nijednog
  // reda - tada se ni okvir ne iscrtava, da ne ostane prazan razmak.
  const rows = [
    row('kategorija', labels.category, categories, (v) => CARD_LABELS.category(v as NonNullable<ShowcaseTour['category']>)),
    row('grad', labels.city, cities, (v) => v),
    row('agencija', labels.agency, agencies, (v) => v)
  ].filter(Boolean);

  return (
    <>
      {rows.length > 0 && <div className="filters">{rows}</div>}

      <p className="filter-count" role="status">
        {labels.count(shown.length, tours.length)}
        {anyFilter && (
          <button
            type="button"
            className="filter-reset"
            onClick={() => apply({ kategorija: null, grad: null, agencija: null })}
          >
            {labels.reset}
          </button>
        )}
      </p>

      {shown.length > 0 ? (
        <div className={`tours-grid ${shown.length === 1 ? 'n-1' : shown.length === 2 || shown.length === 4 ? 'n-2' : 'n-3'}`}>
          {shown.map((tour) => (
            <TourCard key={tour.slug} tour={tour} labels={CARD_LABELS} lang={lang} />
          ))}
        </div>
      ) : (
        <p className="note">{labels.empty}</p>
      )}
    </>
  );
}
