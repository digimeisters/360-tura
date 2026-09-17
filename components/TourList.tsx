'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { STRUCTURE_ORDER } from '../app/lib/propertyTaxonomy';
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
  district: 'Naselje',
  structure: 'Struktura',
  agency: 'Agencija',
  count: (shown: number, total: number) =>
    shown === total ? `Prikazano ${total} tura` : `Prikazano ${shown} od ${total} tura`,
  empty: 'Za izabrane filtere nema tura. Sklonite neki filter da vidite ostale.',
  reset: 'Poništi filtere'
};

type FilterKey = 'kategorija' | 'grad' | 'naselje' | 'struktura' | 'agencija';

const FILTER_KEYS: FilterKey[] = ['kategorija', 'grad', 'naselje', 'struktura', 'agencija'];

const NO_FILTERS = Object.fromEntries(FILTER_KEYS.map((k) => [k, null])) as Record<
  FilterKey,
  string | null
>;

const CATEGORY_ORDER: NonNullable<ShowcaseTour['category']>[] = ['sale', 'rent', 'booking'];

export default function TourList({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const labels = LABELS;
  const [filters, setFilters] = useState<Record<FilterKey, string | null>>(NO_FILTERS);

  // Adresa se čita tek u pregledaču: server pravi isti HTML za sve posetioce
  // (zbog keširanja strane), pa filter iz podeljenog linka stiže ovde.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(
      Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k)])) as Record<
        FilterKey,
        string | null
      >
    );
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
  // Naselja se vezuju za izabran grad: "Aerodrom" pored Beograda nema smisla,
  // a isto ime naselja ume da postoji u dva grada.
  const districts = useMemo(
    () =>
      [
        ...new Set(
          tours
            .filter((t) => !filters.grad || t.city === filters.grad)
            .map((t) => t.district)
            .filter((d): d is string => Boolean(d))
        )
      ].sort((a, b) => a.localeCompare(b, 'sr')),
    [tours, filters.grad]
  );
  // Struktura ide redom kojim se nudi u upitniku - po azbuci bi garsonjera
  // upala između četvorosobnog i dvosobnog stana.
  const structures = useMemo(
    () =>
      [...new Set(tours.map((t) => t.structure).filter((s): s is string => Boolean(s)))].sort(
        (a, b) => {
          const ia = STRUCTURE_ORDER.indexOf(a);
          const ib = STRUCTURE_ORDER.indexOf(b);
          if (ia === -1 || ib === -1) return ia === ib ? a.localeCompare(b, 'sr') : ia === -1 ? 1 : -1;
          return ia - ib;
        }
      ),
    [tours]
  );

  const shown = tours.filter(
    (tour) =>
      (!filters.kategorija || tour.category === filters.kategorija) &&
      (!filters.grad || tour.city === filters.grad) &&
      (!filters.naselje || tour.district === filters.naselje) &&
      (!filters.struktura || tour.structure === filters.struktura) &&
      (!filters.agencija || tour.agency === filters.agencija)
  );

  // Ponovni klik na izabran filter ga isključuje. Promena grada poništava
  // naselje - naselje iz prethodnog grada bi ostavilo prazan spisak.
  const pick = (key: FilterKey, value: string | null) => {
    const next = { ...filters, [key]: filters[key] === value ? null : value };
    if (key === 'grad') next.naselje = null;
    apply(next);
  };

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

  const anyFilter = FILTER_KEYS.some((key) => filters[key]);

  // Dok su sve ture iste vrste, u istom gradu, iste strukture i iste
  // agencije, nema nijednog reda - tada se ni okvir ne iscrtava, da ne
  // ostane prazan razmak.
  const rows = [
    row('kategorija', labels.category, categories, (v) => CARD_LABELS.category(v as NonNullable<ShowcaseTour['category']>)),
    row('grad', labels.city, cities, (v) => v),
    row('naselje', labels.district, districts, (v) => v),
    row('struktura', labels.structure, structures, (v) => v),
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
            onClick={() => apply(NO_FILTERS)}
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
