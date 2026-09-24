'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { STRUCTURE_ORDER } from '../app/lib/propertyTaxonomy';
import { listingPriceUnit } from '../app/lib/listingPrice';
import FilterMenu from './FilterMenu';
import RangeFilter from './RangeFilter';
import TourCard, { type TourCardLabels } from './TourCard';

// Leaflet dira window/document - učitava se samo u pregledaču, i tek kad
// zatreba (posetilac retko traži mapu, nema razloga da je svako skida).
const TourMap = dynamic(() => import('./TourMap'), { ssr: false });

/** Ista pribadača kao pinovi na mapi (TourMap) - dugme liči na ono što otvara. */
function PinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M15 29C15 29 4 19.2 4 12A11 11 0 0 1 26 12C26 19.2 15 29 15 29Z"
        fill="currentColor"
      />
      <circle cx="15" cy="12" r="4" fill="var(--surface)" />
    </svg>
  );
}

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

/**
 * Srpska množina uz broj: 1 tura, 2-4 ture, 5+ tura - ali 11-14 idu kao
 * 5+, a 21 opet kao 1. Bez ovoga bi na dugmetu pisalo "Prikaži 21 tura".
 */
function tourWord(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return 'turu';
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'ture';
  return 'tura';
}

// Isto, ali u nominativu: "1 tura", "4 ture", "5 tura" (za "Prikazano: ...").
function tourNoun(n: number): string {
  const word = tourWord(n);
  return word === 'turu' ? 'tura' : word;
}

const LABELS = {
  all: 'Sve',
  category: 'Vrsta oglasa',
  city: 'Grad',
  district: 'Naselje',
  structure: 'Struktura',
  agency: 'Agencija',
  area: 'Kvadratura',
  price: 'Cena',
  priceNeedsCategory: 'izaberite vrstu oglasa',
  count: (shown: number, total: number) =>
    shown === total ? `Prikazano: ${total} ${tourNoun(total)}` : `Prikazano: ${shown} od ${total}`,
  empty: 'Za izabrane filtere nema tura. Sklonite neki filter da vidite ostale.',
  reset: 'Poništi filtere',
  clearOne: 'Poništi',
  confirmOne: 'Potvrdi',
  filters: 'Filteri',
  close: 'Zatvori',
  show: (n: number) => `Prikaži ${n} ${tourWord(n)}`,
  // 2-4 ture "nemaju ... ostaju", a 1, 5+ i 21 "nema ... ostaje".
  missing: (n: number, what: string) => {
    if (n === 1) return `Jedna tura nema upisanu ${what} i ostaje na spisku.`;
    const few = tourNoun(n) === 'ture';
    return `${n} ${tourNoun(n)} ${few ? 'nemaju' : 'nema'} upisanu ${what} i ${few ? 'ostaju' : 'ostaje'} na spisku.`;
  }
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
  const [scrolledPast, setScrolledPast] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navHeight, setNavHeight] = useState<number | null>(null);
  // Mapa je otvorena od starta (vlasnik, 2026-09-24): lokacija je prvo što kupac proverava.
  const [showMap, setShowMap] = useState(true);
  const blockRef = useRef<HTMLDivElement>(null);

  // Pilula mora da stane ISPOD gornje trake, a traka nije uvek iste visine -
  // na uskom ekranu joj se linkovi prelome u dva reda. Zato se meri, umesto
  // da se visina pogađa brojem u CSS-u.
  useEffect(() => {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // ResizeObserver javi i zatečenu visinu čim počne da posmatra, pa se
    // ovde ništa ne meri ručno.
    const observer = new ResizeObserver(() => setNavHeight(nav.getBoundingClientRect().height));
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  // Pilula se pali tek kad ceo blok filtera ode iznad ekrana. Posmatra se
  // sam blok, pa prag prati njegovu stvarnu visinu - a ona se menja sa
  // brojem filtera koje ture uopšte nude.
  useEffect(() => {
    const block = blockRef.current;
    if (!block) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(block);
    return () => observer.disconnect();
  }, []);

  // Dok je prozor otvoren, strana iza njega ne sme da se pomera - inače se
  // na telefonu ispod prsta skrola spisak umesto sadržaja prozora.
  useEffect(() => {
    if (!sheetOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sheetOpen]);

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
   * pa jedan zajednički raspon ne bi značio ništa.
   *
   * Zato klizač cene postoji SAMO kad je izabrana tačno jedna vrsta oglasa:
   * noćenje (45 €), mesečna kirija (700 €) i prodajna cena (85.000 €) nisu
   * ista stvar i ne mogu na istu skalu. Bez granica nema ni filtera po
   * ceni, pa se ni cena iz podeljenog linka ne primenjuje dok vrsta nije
   * izabrana.
   */
  const priceCategory = filters.kategorija.length === 1 ? filters.kategorija[0] : null;

  const bounds = useMemo(() => {
    const pool = tours.filter(matchesMenus);
    return Object.fromEntries(
      RANGE_KEYS.map((key) => {
        if (key === 'cena' && !priceCategory) return [key, null];
        const numbers = pool.map(NUMBER_OF[key]).filter((n): n is number => n !== null);
        return [key, boundsFor(numbers, pool.length - numbers.length)];
      })
    ) as Record<RangeKey, Bounds | null>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, filters, priceCategory]);

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

  // Koliko od prikazanih tura ima pin na mapi - broj u dugmetu je konkretniji
  // poziv na klik nego prazan naziv "Mapa".
  const locatedCount = shown.filter((t) => t.lat !== null && t.lng !== null).length;

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

    // Druga vrsta oglasa = drugi red veličine cene; raspon od kirije nema
    // smisla na prodajnim cenama, pa se cena vraća na "bez filtera".
    apply(next, key === 'kategorija' ? { ...ranges, cena: null } : ranges);
  };

  const clear = (key: FilterKey) =>
    apply({ ...filters, [key]: [] }, key === 'kategorija' ? { ...ranges, cena: null } : ranges);

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
    FILTER_KEYS.some((key) => filters[key].length) || RANGE_KEYS.some((key) => ranges[key] && bounds[key]);

  // "Vrsta oglasa" stoji uvek i uvek sa sve tri mogućnosti: to je prvo po
  // čemu kupac bira, pa se ne skriva ni kad su sve ture iste vrste.
  const menus = [
    menu('kategorija', labels.category, [...CATEGORY_ORDER], (v) => FILTER_CATEGORY_LABELS[v], true),
    menu('grad', labels.city, cities),
    menu('naselje', labels.district, districts),
    menu('struktura', labels.structure, structures),
    menu('agencija', labels.agency, agencies)
  ].filter(Boolean);

  const priceUnit = listingPriceUnit(priceCategory, lang);

  // Dok vrsta oglasa nije izabrana, na mestu klizača cene stoji objašnjenje
  // zašto ga nema - ako bar neka tura ima cenu, pa bi klizač imao smisla.
  const priceHint =
    !priceCategory && tours.some((t) => t.price !== null) ? (
      <div key="cena" className="range-filter">
        <div className="range-head">
          <span className="range-label">{labels.price}</span>
          <span className="range-value">{labels.priceNeedsCategory}</span>
        </div>
      </div>
    ) : null;

  const sliders = [
    slider('kvadratura', labels.area, (v) => `${v}\u00a0m²`, 'kvadraturu'),
    slider(
      'cena',
      priceUnit ? `${labels.price} ${priceUnit}` : labels.price,
      // Jedinica (mesečno / noć) je u nazivu klizača, ne uz svaki broj.
      (v) => `${v.toLocaleString('sr-RS')} €`,
      'cenu'
    ) ?? priceHint
  ].filter(Boolean);

  // Broj UKLJUČENIH filtera, ne izabranih vrednosti: posetioca zanima
  // koliko uslova sužava spisak, a ne koliko je naselja štiklirao.
  const activeCount =
    FILTER_KEYS.filter((key) => filters[key].length).length +
    RANGE_KEYS.filter((key) => ranges[key] && bounds[key]).length;

  const controls = (
    <>
      {menus.length > 0 && <div className="filters">{menus}</div>}
      {sliders.length > 0 && <div className="filter-ranges">{sliders}</div>}
    </>
  );

  const hasControls = menus.length > 0 || sliders.length > 0;

  return (
    <>
      <div ref={blockRef}>{controls}</div>

      {/* Pilula se pojavljuje tek kad filteri odu iznad ekrana, i otvara ih
          na licu mesta - bez nje je posetilac morao da se vrati na vrh
          strane da bi promenio izbor usred razgledanja. */}
      {hasControls && (
        <div
          className={`filter-bar${scrolledPast ? ' show' : ''}`}
          aria-hidden={!scrolledPast}
          style={navHeight !== null ? { top: `${Math.round(navHeight) + 2}px` } : undefined}
        >
          <button
            type="button"
            className={`filter-bar-btn${activeCount ? ' on' : ''}`}
            onClick={() => setSheetOpen(true)}
            tabIndex={scrolledPast ? 0 : -1}
          >
            {labels.filters}
            {activeCount > 0 && <span className="filter-bar-count">{activeCount}</span>}
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="filter-sheet" role="dialog" aria-modal="true" aria-label={labels.filters}>
          <button
            type="button"
            className="filter-sheet-scrim"
            aria-label={labels.close}
            onClick={() => setSheetOpen(false)}
          />
          <div className="filter-sheet-panel">
            <div className="filter-sheet-head">
              <h2>{labels.filters}</h2>
              <button
                type="button"
                className="filter-sheet-close"
                aria-label={labels.close}
                onClick={() => setSheetOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="filter-sheet-body">{controls}</div>
            <div className="filter-sheet-foot">
              <button
                type="button"
                className="filter-reset"
                onClick={() => apply(NO_FILTERS, NO_RANGES)}
                disabled={!anyFilter}
              >
                {labels.reset}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSheetOpen(false)}
              >
                {labels.show(shown.length)}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="map-cta">
        <p className="map-cta-text">Proverite tačnu lokaciju pre nego što pozovete.</p>
        <button
          type="button"
          className={`map-toggle-btn map-toggle-btn-lg${showMap ? ' on' : ''}`}
          onClick={() => setShowMap((v) => !v)}
          aria-pressed={showMap}
        >
          <PinIcon size={19} />
          {showMap ? 'Sakrij mapu' : locatedCount > 0 ? `Mapa · ${locatedCount}` : 'Mapa'}
        </button>
      </div>

      {showMap && <TourMap tours={shown} lang={lang} />}

      {shown.length > 0 ? (
        <div className="tours-grid n-4">
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
