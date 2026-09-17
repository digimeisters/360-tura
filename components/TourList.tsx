'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { STRUCTURE_ORDER } from '../app/lib/propertyTaxonomy';
import FilterMenu from './FilterMenu';
import RangeFilter from './RangeFilter';
import TourCard, { type TourCardLabels } from './TourCard';

/**
 * Spisak tura sa filterima (/ture). Sve ture stižu sa servera i već su u
 * HTML-u (zbog Google-a); filteri samo skrivaju kartice u pregledaču.
 *
 * Meniji primaju VIŠE vrednosti, koje rade kao "ili": izborom dva naselja
 * se vide ture iz oba. Klizači (kvadratura, cena) rade kao raspon, ali tura
 * kojoj vrednost nije upisana kroz njih uvek prolazi - nepoznata cena nije
 * isto što i cena van raspona.
 *
 * Izabrani filteri se upisuju u adresu strane, pa agencija može da podeli
 * link samo sa svojim turama: /ture?agencija=Ime · /ture?naselje=Aerodrom,Pivara
 * Više vrednosti razdvaja zarez, granice raspona crtica ("?cena=200-500").
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

/** U filteru piše "Stan na dan", isto kao u upitniku - na kartici je kraće. */
const FILTER_CATEGORY_LABELS: Record<string, string> = {
  rent: 'Izdavanje',
  sale: 'Prodaja',
  booking: 'Stan na dan'
};

const LABELS = {
  all: 'Sve',
  category: 'Vrsta oglasa',
  city: 'Grad',
  district: 'Naselje',
  structure: 'Struktura',
  agency: 'Agencija',
  area: 'Kvadratura',
  price: 'Cena',
  count: (shown: number, total: number) =>
    shown === total ? `Prikazano ${total} tura` : `Prikazano ${shown} od ${total} tura`,
  empty: 'Za izabrane filtere nema tura. Sklonite neki filter da vidite ostale.',
  reset: 'Poništi filtere',
  clearOne: 'Poništi',
  confirmOne: 'Potvrdi',
  missing: (n: number, what: string) =>
    n === 1
      ? `Jedna tura nema upisanu ${what} i ostaje na spisku.`
      : `${n} tura nema upisanu ${what} i ostaju na spisku.`
};

type FilterKey = 'kategorija' | 'grad' | 'naselje' | 'struktura' | 'agencija';
type RangeKey = 'kvadratura' | 'cena';

const FILTER_KEYS: FilterKey[] = ['kategorija', 'grad', 'naselje', 'struktura', 'agencija'];
const RANGE_KEYS: RangeKey[] = ['kvadratura', 'cena'];

type Filters = Record<FilterKey, string[]>;
/** null = klizač nije pomeren, pa raspon prati trenutne granice. */
type Ranges = Record<RangeKey, [number, number] | null>;

const NO_FILTERS: Filters = {
  kategorija: [],
  grad: [],
  naselje: [],
  struktura: [],
  agencija: []
};

const NO_RANGES: Ranges = { kvadratura: null, cena: null };

// Redom kojim ih kupac traži: izdavanje, prodaja, pa kratkoročni smeštaj.
const CATEGORY_ORDER: NonNullable<ShowcaseTour['category']>[] = ['rent', 'sale', 'booking'];

/** Vrednost po kojoj meni poredi ture. */
const VALUE_OF: Record<FilterKey, (tour: ShowcaseTour) => string | null> = {
  kategorija: (t) => t.category,
  grad: (t) => t.city,
  naselje: (t) => t.district,
  struktura: (t) => t.structure,
  agencija: (t) => t.agency
};

/** Broj po kome klizač poredi ture. */
const NUMBER_OF: Record<RangeKey, (tour: ShowcaseTour) => number | null> = {
  kvadratura: (t) => t.areaSqm,
  cena: (t) => t.price
};

type Bounds = { min: number; max: number; step: number; missing: number };

function sortSr(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'sr'));
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

/**
 * Korak klizača prema širini raspona: kod kvadrature to je metar ili dva,
 * kod prodajne cene hiljade - jedan evro na rasponu od 80.000 ne bi značio
 * ništa, a ručica bi morala da pređe stotine koraka.
 */
function niceStep(span: number): number {
  const rough = span / 40;
  const scales = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  return scales.find((s) => s >= rough) ?? 10_000;
}

function boundsFor(values: number[], missing: number): Bounds | null {
  // Jedna jedina vrednost nema šta da suzi - klizač se tada ne prikazuje.
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo === hi) return null;

  const step = niceStep(hi - lo);
  return {
    min: Math.floor(lo / step) * step,
    max: Math.ceil(hi / step) * step,
    step,
    missing
  };
}

/**
 * Granice se menjaju kad se promeni izbor u menijima (druga vrsta oglasa =
 * sasvim drugi red veličine cene), pa se zapamćen raspon skraćuje na nove
 * granice pri čitanju. Tako ne mora da se pipa stanje iz efekta.
 */
function clampRange(range: [number, number] | null, bounds: Bounds): [number, number] {
  if (!range) return [bounds.min, bounds.max];
  const low = Math.max(bounds.min, Math.min(range[0], bounds.max));
  const high = Math.min(bounds.max, Math.max(range[1], bounds.min));
  return low <= high ? [low, high] : [bounds.min, bounds.max];
}

export default function TourList({ tours, lang = 'sr' }: { tours: ShowcaseTour[]; lang?: string }) {
  const labels = LABELS;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [ranges, setRanges] = useState<Ranges>(NO_RANGES);

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

    setRanges(
      Object.fromEntries(
        RANGE_KEYS.map((key) => {
          const parts = (params.get(key) || '').split('-').map((v) => Number(v.trim()));
          const valid = parts.length === 2 && parts.every((n) => Number.isFinite(n));
          return [key, valid ? ([parts[0], parts[1]] as [number, number]) : null];
        })
      ) as Ranges
    );
  }, []);

  /**
   * Adresa se upisuje SAMO kad posetilac pomeri filter, nikad automatski iz
   * stanja: Next-ov ruter osluškuje history.replaceState, pa upis pri
   * učitavanju ponovo pokreće komponentu, koja onda pročita već obrisanu
   * adresu - i filter iz podeljenog linka nestane.
   */
  const apply = (nextFilters: Filters, nextRanges: Ranges) => {
    setFilters(nextFilters);
    setRanges(nextRanges);

    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      if (nextFilters[key].length) params.set(key, nextFilters[key].join(','));
    });
    RANGE_KEYS.forEach((key) => {
      const range = nextRanges[key];
      if (range) params.set(key, `${range[0]}-${range[1]}`);
    });

    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  };

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

  const matchesMenus = (tour: ShowcaseTour) =>
    FILTER_KEYS.every((key) => {
      const picked = filters[key];
      if (!picked.length) return true;
      const value = VALUE_OF[key](tour);
      return value !== null && picked.includes(value);
    });

  /**
   * Granice klizača se računaju iz tura koje su prošle menije, a ne iz svih:
   * cena kod prodaje ide u desetinama hiljada, a kod izdavanja u stotinama,
   * pa jedan zajednički raspon ne bi značio ništa. Čim posetilac izabere
   * vrstu oglasa, klizač se svede na njen red veličine.
   */
  const bounds = useMemo(() => {
    const pool = tours.filter(matchesMenus);
    return Object.fromEntries(
      RANGE_KEYS.map((key) => {
        const numbers = pool.map(NUMBER_OF[key]).filter((n): n is number => n !== null);
        return [key, boundsFor(numbers, pool.length - numbers.length)];
      })
    ) as Record<RangeKey, Bounds | null>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, filters]);

  const shown = tours.filter((tour) => {
    if (!matchesMenus(tour)) return false;

    return RANGE_KEYS.every((key) => {
      const limit = bounds[key];
      const range = ranges[key];
      if (!limit || !range) return true;

      const value = NUMBER_OF[key](tour);
      // Tura bez upisanog broja ostaje na spisku - vidi komentar na vrhu.
      if (value === null) return true;

      const [low, high] = clampRange(range, limit);
      return value >= low && value <= high;
    });
  });

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

    apply(next, ranges);
  };

  const clear = (key: FilterKey) => apply({ ...filters, [key]: [] }, ranges);

  const setRange = (key: RangeKey, range: [number, number]) => {
    const limit = bounds[key];
    // Vraćen na pune granice znači "bez filtera" - tada ispada i iz adrese.
    const full = limit && range[0] <= limit.min && range[1] >= limit.max;
    apply(filters, { ...ranges, [key]: full ? null : range });
  };

  const menu = (
    key: FilterKey,
    title: string,
    options: string[],
    optionLabel?: (value: string) => string,
    alwaysShow = false
  ) => {
    // Filter se inače prikazuje samo ako može nešto da suzi: ili ima bar dve
    // vrednosti, ili neka tura tu vrednost nema pa je izbor izbacuje.
    const narrows = options.length > 1 || tours.some((t) => !VALUE_OF[key](t));
    if (!options.length || (!narrows && !alwaysShow)) return null;

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
        confirmLabel={labels.confirmOne}
        allLabel={labels.all}
      />
    );
  };

  const slider = (
    key: RangeKey,
    title: string,
    format: (value: number) => string,
    missingWhat: string
  ) => {
    const limit = bounds[key];
    if (!limit) return null;

    return (
      <RangeFilter
        key={key}
        label={title}
        min={limit.min}
        max={limit.max}
        step={limit.step}
        value={clampRange(ranges[key], limit)}
        onChange={(range) => setRange(key, range)}
        format={format}
        note={limit.missing > 0 ? labels.missing(limit.missing, missingWhat) : undefined}
      />
    );
  };

  const anyFilter =
    FILTER_KEYS.some((key) => filters[key].length) || RANGE_KEYS.some((key) => ranges[key]);

  // "Vrsta oglasa" stoji uvek i uvek sa sve tri mogućnosti: to je prvo po
  // čemu kupac bira, pa se ne skriva ni kad su sve ture iste vrste.
  const menus = [
    menu('kategorija', labels.category, [...CATEGORY_ORDER], (v) => FILTER_CATEGORY_LABELS[v], true),
    menu('grad', labels.city, cities),
    menu('naselje', labels.district, districts),
    menu('struktura', labels.structure, structures),
    menu('agencija', labels.agency, agencies)
  ].filter(Boolean);

  const sliders = [
    slider('kvadratura', labels.area, (v) => `${v} m²`, 'kvadraturu'),
    slider('cena', labels.price, (v) => `${v.toLocaleString('sr-RS')} €`, 'cenu')
  ].filter(Boolean);

  return (
    <>
      {menus.length > 0 && <div className="filters">{menus}</div>}
      {sliders.length > 0 && <div className="filter-ranges">{sliders}</div>}

      <p className="filter-count" role="status">
        {labels.count(shown.length, tours.length)}
        {anyFilter && (
          <button
            type="button"
            className="filter-reset"
            onClick={() => apply(NO_FILTERS, NO_RANGES)}
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
