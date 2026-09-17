'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { STRUCTURE_ORDER } from '../app/lib/propertyTaxonomy';
import FilterMenu from './FilterMenu';
import TourCard, { type TourCardLabels } from './TourCard';

/**
 * Spisak tura sa filterima (/ture). Sve ture stižu sa servera i već su u
 * HTML-u (zbog Google-a); filteri samo skrivaju kartice u pregledaču.
 *
 * Svaki filter je padajući meni sa kvačicama i prima VIŠE vrednosti, koje
 * rade kao "ili": izborom dva naselja se vide ture iz oba. Više izabranih
 * vrednosti u adresi stoji razdvojeno zarezom, a zarez se ni u jednom
 * naselju ni strukturi ne pojavljuje (vidi app/lib/propertyTaxonomy.ts).
 *
 * Izabrani filteri se upisuju u adresu strane, pa agencija može da podeli
 * link samo sa svojim turama: /ture?agencija=Ime · /ture?naselje=Aerodrom,Pivara
 *
 * Meni se ne prikazuje ako ne može ništa da suzi (npr. sve ture su u istom
 * gradu) - prazan filter samo zbunjuje.
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
  reset: 'Poništi filtere',
  clearOne: 'Poništi izbor'
};

type FilterKey = 'kategorija' | 'grad' | 'naselje' | 'struktura' | 'agencija';

const FILTER_KEYS: FilterKey[] = ['kategorija', 'grad', 'naselje', 'struktura', 'agencija'];

type Filters = Record<FilterKey, string[]>;

const NO_FILTERS: Filters = {
  kategorija: [],
  grad: [],
  naselje: [],
  struktura: [],
  agencija: []
};

const CATEGORY_ORDER: NonNullable<ShowcaseTour['category']>[] = ['sale', 'rent', 'booking'];

/** Vrednost po kojoj filter poredi ture. */
const VALUE_OF: Record<FilterKey, (tour: ShowcaseTour) => string | null> = {
  kategorija: (t) => t.category,
  grad: (t) => t.city,
  naselje: (t) => t.district,
  struktura: (t) => t.structure,
  agencija: (t) => t.agency
};

function sortSr(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'sr'));
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

export default function TourList({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const labels = LABELS;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  // Adresa se čita tek u pregledaču: server pravi isti HTML za sve posetioce
  // (zbog keširanja strane), pa filter iz podeljenog linka stiže ovde.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(
      Object.fromEntries(
        FILTER_KEYS.map((key) => [
          key,
          (params.get(key) || '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        ])
      ) as Filters
    );
  }, []);

  /**
   * Adresa se upisuje SAMO kad posetilac klikne filter, nikad automatski iz
   * stanja: Next-ov ruter osluškuje history.replaceState, pa upis pri
   * učitavanju ponovo pokreće komponentu, koja onda pročita već obrisanu
   * adresu - i filter iz podeljenog linka nestane.
   */
  const apply = (next: Filters) => {
    setFilters(next);
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      if (next[key].length) params.set(key, next[key].join(','));
    });
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  };

  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => tours.some((t) => t.category === c)),
    [tours]
  );
  const cities = useMemo(() => sortSr(unique(tours.map((t) => t.city))), [tours]);
  const agencies = useMemo(() => sortSr(unique(tours.map((t) => t.agency))), [tours]);

  // Naselja se vezuju za izabran grad: "Aerodrom" pored Beograda nema smisla,
  // a isto ime naselja ume da postoji u dva grada.
  const districts = useMemo(
    () =>
      sortSr(
        unique(
          tours
            .filter((t) => !filters.grad.length || (t.city && filters.grad.includes(t.city)))
            .map((t) => t.district)
        )
      ),
    [tours, filters.grad]
  );

  // Struktura ide redom kojim se nudi u upitniku - po azbuci bi garsonjera
  // upala između četvorosobnog i dvosobnog stana.
  const structures = useMemo(
    () =>
      unique(tours.map((t) => t.structure)).sort((a, b) => {
        const ia = STRUCTURE_ORDER.indexOf(a);
        const ib = STRUCTURE_ORDER.indexOf(b);
        if (ia === -1 || ib === -1) return ia === ib ? a.localeCompare(b, 'sr') : ia === -1 ? 1 : -1;
        return ia - ib;
      }),
    [tours]
  );

  const shown = tours.filter((tour) =>
    FILTER_KEYS.every((key) => {
      const picked = filters[key];
      if (!picked.length) return true;
      const value = VALUE_OF[key](tour);
      return value !== null && picked.includes(value);
    })
  );

  /**
   * Kvačica se dodaje ili sklanja. Promena grada izbacuje naselja koja u
   * novom izboru gradova više ne postoje - inače bi naselje iz prethodnog
   * grada ostavilo prazan spisak, a posetilac ne bi video zašto.
   */
  const toggle = (key: FilterKey, value: string) => {
    const picked = filters[key];
    const next: Filters = {
      ...filters,
      [key]: picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value]
    };

    if (key === 'grad') {
      const allowed = new Set(
        unique(
          tours
            .filter((t) => !next.grad.length || (t.city && next.grad.includes(t.city)))
            .map((t) => t.district)
        )
      );
      next.naselje = next.naselje.filter((d) => allowed.has(d));
    }

    apply(next);
  };

  const clear = (key: FilterKey) => apply({ ...filters, [key]: [] });

  const menu = (
    key: FilterKey,
    title: string,
    options: string[],
    optionLabel?: (value: string) => string
  ) => {
    // Filter se prikazuje samo ako može nešto da suzi: ili ima bar dve
    // vrednosti, ili neka tura tu vrednost nema pa je izbor izbacuje.
    const narrows = options.length > 1 || tours.some((t) => !VALUE_OF[key](t));
    if (!options.length || !narrows) return null;

    return (
      <FilterMenu
        key={key}
        label={title}
        options={options}
        optionLabel={optionLabel}
        selected={filters[key]}
        onToggle={(value) => toggle(key, value)}
        onClear={() => clear(key)}
        clearLabel={labels.clearOne}
        allLabel={labels.all}
      />
    );
  };

  const anyFilter = FILTER_KEYS.some((key) => filters[key].length);

  // Dok su sve ture iste vrste, u istom gradu, iste strukture i iste
  // agencije, nema nijednog menija - tada se ni okvir ne iscrtava, da ne
  // ostane prazan razmak.
  const menus = [
    menu('kategorija', labels.category, categories, (v) =>
      CARD_LABELS.category(v as NonNullable<ShowcaseTour['category']>)
    ),
    menu('grad', labels.city, cities),
    menu('naselje', labels.district, districts),
    menu('struktura', labels.structure, structures),
    menu('agencija', labels.agency, agencies)
  ].filter(Boolean);

  return (
    <>
      {menus.length > 0 && <div className="filters">{menus}</div>}

      <p className="filter-count" role="status">
        {labels.count(shown.length, tours.length)}
        {anyFilter && (
          <button type="button" className="filter-reset" onClick={() => apply(NO_FILTERS)}>
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
