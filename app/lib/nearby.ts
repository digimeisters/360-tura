/**
 * Okolina projekta novogradnje iz OpenStreetMap-a (Overpass API, besplatno,
 * bez ključa): škole, vrtići, prodavnice, apoteke, zdravstvo, autobus i
 * parkovi u krugu od RADIUS_M. Zove se SAMO iz admina (dugme „Pronađi
 * okolinu"), a rezultat se čuva u projects.nearby (migracija 022) - javna
 * strana ne zavisi od spoljnog servisa.
 *
 * Tipovi i kategorije su i za klijent (ProjectNearby) - ovaj fajl nema
 * serverskih uvoza.
 */

export type NearbyCategory = 'school' | 'kindergarten' | 'shop' | 'pharmacy' | 'health' | 'bus' | 'park';

export type NearbyPlace = { cat: NearbyCategory; name: string; lat: number; lng: number; m: number };

export const NEARBY_CATEGORIES: NearbyCategory[] = ['school', 'kindergarten', 'shop', 'pharmacy', 'health', 'bus', 'park'];

// de i ru su za ture (tura ima 4 jezika); novogradnja koristi sr i en.
export const NEARBY_LABELS: Record<'sr' | 'en' | 'de' | 'ru', Record<NearbyCategory, string>> = {
  sr: {
    school: 'Škola',
    kindergarten: 'Vrtić',
    shop: 'Prodavnica',
    pharmacy: 'Apoteka',
    health: 'Dom zdravlja',
    bus: 'Autobus',
    park: 'Park'
  },
  en: {
    school: 'School',
    kindergarten: 'Kindergarten',
    shop: 'Shop',
    pharmacy: 'Pharmacy',
    health: 'Health centre',
    bus: 'Bus stop',
    park: 'Park'
  },
  de: {
    school: 'Schule',
    kindergarten: 'Kindergarten',
    shop: 'Geschäft',
    pharmacy: 'Apotheke',
    health: 'Gesundheitszentrum',
    bus: 'Bushaltestelle',
    park: 'Park'
  },
  ru: {
    school: 'Школа',
    kindergarten: 'Детский сад',
    shop: 'Магазин',
    pharmacy: 'Аптека',
    health: 'Поликлиника',
    bus: 'Автобус',
    park: 'Парк'
  }
};

/** Vrste na kartici „Lokacija“ u turi - ono što kupci najčešće pitaju. */
export const TOUR_NEARBY_SUMMARY: NearbyCategory[] = ['shop', 'bus', 'school', 'pharmacy'];

/**
 * Šta posle čuvanja ture: `refresh` = pitati OpenStreetMap (nova lokacija ili
 * okoline još nema), `clear` = obrisati staru okolinu odmah, da kupac ne vidi
 * prodavnice iz starog kraja ako Overpass ne odgovori.
 */
export function nearbyChange(
  prev: { lat: number | null; lng: number | null; hasNearby: boolean },
  lat: number | null,
  lng: number | null
): { refresh: boolean; clear: boolean } {
  const moved = prev.lat !== lat || prev.lng !== lng;
  const located = lat != null && lng != null;
  return { refresh: located && (moved || !prev.hasNearby), clear: moved && prev.hasNearby };
}

/** Najbliže mesto po vrsti (za kratak pregled; vrsta bez mesta izostaje). */
export function nearestByCategory(places: NearbyPlace[]): Partial<Record<NearbyCategory, NearbyPlace>> {
  const out: Partial<Record<NearbyCategory, NearbyPlace>> = {};
  for (const p of places) {
    const cur = out[p.cat];
    if (!cur || p.m < cur.m) out[p.cat] = p;
  }
  return out;
}

export const NEARBY_ICONS: Record<NearbyCategory, string> = {
  school: '🏫',
  kindergarten: '🧸',
  shop: '🛒',
  pharmacy: '💊',
  health: '🩺',
  bus: '🚌',
  park: '🌳'
};

export const NEARBY_COLORS: Record<NearbyCategory, string> = {
  school: '#7C3AED',
  kindergarten: '#DB2777',
  shop: '#EA580C',
  pharmacy: '#059669',
  health: '#DC2626',
  bus: '#2563EB',
  park: '#16A34A'
};

export const RADIUS_M = 1200;

// 2. 10. 2026: kumi i private.coffee nisu odgovarali (timeout), maps.mail.ru jeste.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const PER_CATEGORY = 3;
// Najduže čekanje bez zadatog roka. 31. 10. 2026 za gust Dorćol: glavni server
// 504 posle 43 s, maps.mail.ru tačan odgovor posle 27 s.
const DEFAULT_WAIT_MS = 40_000;

/** Minuti hoda (≈80 m u minuti), najmanje 1. */
export const walkMinutes = (m: number) => Math.max(1, Math.round(m / 80));

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function categoryOf(tags: Record<string, string>): NearbyCategory | null {
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'kindergarten') return 'kindergarten';
  if (tags.shop === 'supermarket' || tags.shop === 'convenience') return 'shop';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'clinic' || tags.amenity === 'hospital' || tags.amenity === 'doctors') return 'health';
  if (tags.highway === 'bus_stop' || tags.public_transport === 'platform') return 'bus';
  if (tags.leisure === 'park') return 'park';
  return null;
}

// Imena u OSM-u za Srbiju su uglavnom na ćirilici, a sajt je na latinici.
const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj',
  м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č',
  џ: 'dž', ш: 'š'
};

/** Srpska ćirilica -> latinica, uz očuvana velika slova („Љубичица" -> „Ljubičica"). */
export function toLatin(text: string): string {
  return text
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      const lat = CYR[lower];
      if (lat === undefined) return ch;
      return ch === lower ? lat : lat.charAt(0).toUpperCase() + lat.slice(1);
    })
    .join('');
}

type OverpassElement ={ lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/**
 * Najbliža mesta po kategoriji (do PER_CATEGORY). Bez imena se zadržavaju
 * samo stajališta i parkovi (tada piše samo kategorija) - neimenovana škola
 * ili prodavnica u OSM-u je obično greška u podacima.
 *
 * Svi serveri se pitaju odjednom i pobeđuje prvi tačan odgovor; ostali se
 * prekidaju. `budgetMs` je ukupan rok (ture: funkcija ima ograničeno vreme),
 * bez njega DEFAULT_WAIT_MS. `fetchImpl` je samo za testove.
 */
export async function fetchNearby(
  lat: number,
  lng: number,
  opts: { budgetMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<NearbyPlace[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const around = `(around:${RADIUS_M},${lat},${lng})`;
  const query = `[out:json][timeout:25];
(
  nwr["amenity"~"^(school|kindergarten|pharmacy|clinic|hospital|doctors)$"]${around};
  nwr["shop"~"^(supermarket|convenience)$"]${around};
  node["highway"="bus_stop"]${around};
  nwr["leisure"="park"]${around};
);
out center tags;`;

  // Javni Overpass serveri umeju da budu preopterećeni (504, red čekanja pun)
  // ili spori za gust kraj - zato svi odjednom, umesto jedan za drugim.
  const stop = new AbortController();
  const timeout = AbortSignal.timeout(opts.budgetMs ?? DEFAULT_WAIT_MS);
  const signal = AbortSignal.any([stop.signal, timeout]);
  const ask = async (endpoint: string) => {
    const host = new URL(endpoint).host;
    try {
      const res = await doFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Kvadrat360/1.0 (https://kvadrat360.com; info@kvadrat360.com)'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal
      });
      if (!res.ok) throw new Error(`${host} ${res.status}`);
      return (await res.json()) as { elements?: OverpassElement[] };
    } catch (err) {
      if (timeout.aborted) throw new Error(`${host} rok istekao`);
      throw err instanceof Error && err.message.startsWith(host) ? err : new Error(`${host} ${err instanceof Error ? err.message : 'greška'}`);
    }
  };
  let json: { elements?: OverpassElement[] };
  try {
    json = await Promise.any(OVERPASS_ENDPOINTS.map(ask));
  } catch (err) {
    const reasons = err instanceof AggregateError ? err.errors.map((e) => (e instanceof Error ? e.message : String(e))) : [String(err)];
    throw new Error(`Overpass: ${reasons.join('; ')}`);
  } finally {
    stop.abort();
  }

  const byCat = new Map<NearbyCategory, NearbyPlace[]>();
  const seen = new Set<string>();
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const cat = categoryOf(tags);
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (!cat || pLat === undefined || pLng === undefined) continue;
    const name = (tags['name:sr-Latn'] || toLatin(tags.name || '')).trim();
    if (!name && cat !== 'bus' && cat !== 'park') continue;
    // Isto stajalište je često ucrtano dvaput (svaka strana ulice) - jedno je dovoljno.
    // Neimenovana mesta (park, stajalište) se pamte pod istim ključem po
    // kategoriji - ostaje samo najbliže, umesto tri puta „Park".
    const key = `${cat}:${name.toLowerCase()}`;
    const list0 = byCat.get(cat) ?? [];
    if (seen.has(key)) {
      if (name) continue;
      const prev = list0.find((p) => !p.name);
      const m = distanceM(lat, lng, pLat, pLng);
      if (prev && m < prev.m) Object.assign(prev, { lat: pLat, lng: pLng, m });
      continue;
    }
    seen.add(key);
    const list = byCat.get(cat) ?? [];
    list.push({ cat, name: name.slice(0, 80), lat: pLat, lng: pLng, m: distanceM(lat, lng, pLat, pLng) });
    byCat.set(cat, list);
  }

  const out: NearbyPlace[] = [];
  for (const cat of NEARBY_CATEGORIES) {
    const list = (byCat.get(cat) ?? []).sort((a, b) => a.m - b.m).slice(0, PER_CATEGORY);
    out.push(...list);
  }
  return out;
}

/** Proverava okolinu koja stiže iz baze (JSONB) pre prikaza. */
export function parseNearby(value: unknown): NearbyPlace[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (p): p is NearbyPlace =>
      p &&
      typeof p === 'object' &&
      NEARBY_CATEGORIES.includes((p as NearbyPlace).cat) &&
      Number.isFinite((p as NearbyPlace).lat) &&
      Number.isFinite((p as NearbyPlace).lng) &&
      Number.isFinite((p as NearbyPlace).m)
  );
}
