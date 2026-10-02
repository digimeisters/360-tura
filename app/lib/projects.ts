/**
 * Novogradnja (paket za investitore): zajednički tipovi i pomoćne funkcije
 * za admin (/admin/projekti), admin API (/api/admin/projects) i javnu
 * stranu projekta (/novogradnja/[slug]). Tabele su iz migracije 019.
 *
 * Oblici su nizovi tačaka u udelu slike (0..1), pa ne zavise od toga
 * koliko je slika velika na ekranu.
 */

export type Point = [number, number];
export type Polygon = Point[];

export type UnitStatus = 'available' | 'reserved' | 'sold';

export const UNIT_STATUSES: UnitStatus[] = ['available', 'reserved', 'sold'];

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  available: 'Slobodan',
  reserved: 'Rezervisan',
  sold: 'Prodat'
};

/** Boje statusa - birane za svetlu pozadinu osnove (kartica je uvek svetla). */
export const UNIT_STATUS_COLORS: Record<UnitStatus, { fill: string; stroke: string; text: string; badge: string }> = {
  available: { fill: 'rgba(46,158,91,.30)', stroke: '#2E9E5B', text: '#1F7A45', badge: '#DCF3E4' },
  reserved: { fill: 'rgba(217,154,30,.32)', stroke: '#D99A1E', text: '#9A6A0B', badge: '#FCEFD3' },
  sold: { fill: 'rgba(120,120,120,.30)', stroke: '#9A9A9A', text: '#6B6B6B', badge: '#ECECEC' }
};

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  developer_name: string | null;
  address: string | null;
  city: string | null;
  move_in: string | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  facade_url: string | null;
  /** Telegram kad prodaja označi stan prodat/rezervisan (migracija 020). */
  notify_sales: boolean;
  /** Engleska strana projekta (migracija 021); prazno = srpski naziv / bez opisa. */
  title_en: string | null;
  description_en: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type FloorRow = {
  id: string;
  project_id: string;
  level: number;
  label: string | null;
  polygon: Polygon | null;
  plan_url: string | null;
  view_tour_id: string | null;
};

export type UnitRow = {
  id: string;
  project_id: string;
  floor_id: string;
  code: string;
  structure: string | null;
  area_sqm: number | null;
  terrace_sqm: number | null;
  orientation: string | null;
  price: number | null;
  status: UnitStatus;
  polygon: Polygon | null;
  tour_id: string | null;
  sort: number;
};

/** Tura na koju stan ili sprat može da pokazuje (izbor u adminu, link na javnoj strani). */
export type TourOption = { id: string; slug: string; title: string | null; published: boolean };

export type ProjectBundle = {
  project: ProjectRow;
  floors: FloorRow[];
  units: UnitRow[];
  tours: TourOption[];
};

export function floorName(level: number, label?: string | null): string {
  if (label && label.trim()) return label.trim();
  if (level === 0) return 'Prizemlje';
  if (level < 0) return level === -1 ? 'Podrum' : `${level}. podzemna etaža`;
  return `${level}. sprat`;
}

/** "sa 3. sprata" / "sa prizemlja" - za "Pogled sa ..." */
export function floorGenitive(level: number, label?: string | null): string {
  if (label && label.trim()) return label.trim().toLowerCase();
  if (level === 0) return 'prizemlja';
  return `${level}. sprata`;
}

export function formatEur(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return `${Math.round(Number(n)).toLocaleString('sr-RS')} €`;
}

export function formatSqm(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${Number.isInteger(v) ? v : v.toLocaleString('sr-RS', { maximumFractionDigits: 2 })} m²`;
}

/** Proverava i čisti oblik koji stiže od klijenta: 3+ tačke, sve u 0..1. */
export function cleanPolygon(value: unknown): Polygon | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || value.length < 3 || value.length > 200) return null;
  const out: Polygon = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push([Math.min(1, Math.max(0, Math.round(x * 10000) / 10000)), Math.min(1, Math.max(0, Math.round(y * 10000) / 10000))]);
  }
  return out;
}

export function polygonPoints(poly: Polygon, w: number, h: number): string {
  return poly.map(([x, y]) => `${(x * w).toFixed(1)},${(y * h).toFixed(1)}`).join(' ');
}

/** Težište oblika - za oznaku stana ili sprata unutar njega. */
export function polygonCenter(poly: Polygon): Point {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/**
 * Status iz Excela/tabele na srpskom ili engleskom ("slobodan", "rezervisan",
 * "prodat", "available"...). Nepoznato -> null, da uvoz javi grešku umesto
 * da tiho postavi pogrešan status.
 */
export function parseStatus(raw: string): UnitStatus | null {
  const v = raw.trim().toLowerCase();
  if (!v) return 'available';
  // "sold" počinje sa s, pa se prodat proverava pre slobodnog.
  if (/^(prod|sold|p$|ne$)/.test(v)) return 'sold';
  if (/^(rez|reserv|kapar|r$)/.test(v)) return 'reserved';
  if (/^(slob|avail|free|s$|da$)/.test(v)) return 'available';
  return null;
}

/** "54,5" / "54.5" / "54 m2" / "95.600 €" -> broj; prazno -> null. */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[€\s]|m2|m²/gi, '').trim();
  if (!s) return null;
  // Ako ima i tačku i zarez, poslednji je decimalni separator.
  let norm = s;
  if (s.includes('.') && s.includes(',')) {
    norm = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    norm = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "95.600" je hiljada, ne decimala.
    norm = s.replace(/\./g, '');
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** "P", "PR", "prizemlje", "0", "3", "3.", "3. sprat", "sprat 3" -> nivo sprata. */
export function parseLevel(raw: string): number | null {
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/sprat[a-z]*/g, '')
    .replace(/\s+/g, '')
    .replace(/\.$/, '');
  if (!v) return null;
  if (/^(p|pr|vp|prizemlje|ground)$/.test(v)) return 0;
  if (!/^-?\d{1,2}$/.test(v)) return null;
  return Number(v);
}

/**
 * Polje "Dodaj sprat": jedan sprat ("3", "P", "3. sprat"), spisak ("P, 1, 2")
 * ili raspon ("P-6", "1–5"). Vraća nivoe bez duplikata, ili null kad nešto
 * nije jasno - da admin dobije poruku umesto pogrešnih spratova.
 */
export function parseLevels(raw: string): number[] | null {
  const parts = raw.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const out = new Set<number>();
  for (const part of parts) {
    const range = part.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    // "-1" je podrum, ne raspon - raspon ima nešto i pre crtice.
    if (range && range[1].trim()) {
      const a = parseLevel(range[1]);
      const b = parseLevel(range[2]);
      if (a === null || b === null) return null;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      if (hi - lo > 60) return null;
      for (let l = lo; l <= hi; l++) out.add(l);
    } else {
      const l = parseLevel(part);
      if (l === null) return null;
      out.add(l);
    }
  }
  return [...out].sort((x, y) => x - y);
}

/** Oznaka sprata na početku oznake stana: "P" za prizemlje, inače broj ("3" u "3B"). */
export function levelPrefix(level: number): string {
  return level === 0 ? 'P' : String(level);
}

/**
 * Deo oznake stana posle oznake sprata: "3B" na 3. spratu -> "B", "2-1" ->
 * "-1", "PA" u prizemlju -> "A". Null kad oznaka ne počinje spratom (npr.
 * stanovi numerisani kroz celu zgradu: 1, 2... 28) - tada se stanovi
 * spratova ne mogu upariti po oznaci.
 */
export function unitSuffix(code: string, level: number): string | null {
  const prefix = levelPrefix(level);
  const c = code.trim();
  if (!c.toUpperCase().startsWith(prefix.toUpperCase())) return null;
  const rest = c.slice(prefix.length);
  // "12A" na 1. spratu nije "1" + "2A" - posle oznake sprata ne sme odmah
  // cifra. Isto i za "P1": na 4. spratu bi postao "41", pa takvi stanovi
  // idu na uparivanje redom (kad je broj stanova isti).
  if (!rest || /^\d/.test(rest)) return null;
  return rest;
}

/**
 * Saveti za naziv projekta pre nego što se napravi adresa strane (slug se
 * posle ne menja). Hvata ono što je vlasniku već promaklo („lepenicki cvet"):
 * malo početno slovo i česte reči bez kvačica. Samo savet - admin može da
 * nastavi i bez ispravke.
 */
export function projectNameAdvice(title: string): { warnings: string[]; suggestion: string | null } {
  const t = title.trim().replace(/\s+/g, ' ');
  const warnings: string[] = [];
  if (!t) return { warnings, suggestion: null };

  let fixed = t;
  if (/^\p{Ll}/u.test(t)) {
    warnings.push('Naziv počinje malim slovom.');
    fixed = fixed.charAt(0).toLocaleUpperCase('sr') + fixed.slice(1);
  }

  // Najčešći slučajevi bez kvačica u nazivima zgrada: -čki/-čka/-čko
  // (Lepenički, Šumarički), "dj" umesto "đ". Opšte upozorenje "nema kvačica"
  // namerno ne postoji - smetalo bi ispravnim nazivima („Rezidencija Lipa").
  const withHooks = fixed
    .replace(/(\p{L})cki\b/gu, '$1čki')
    .replace(/(\p{L})cka\b/gu, '$1čka')
    .replace(/(\p{L})cko\b/gu, '$1čko')
    .replace(/dj/g, 'đ')
    .replace(/Dj/g, 'Đ');
  if (withHooks !== fixed) {
    warnings.push('Izgleda da fale kvačice (č, ć, š, ž, đ).');
    fixed = withHooks;
  }

  return { warnings, suggestion: fixed !== t ? fixed : null };
}

export type ImportRow = {
  code: string;
  level: number;
  structure: string | null;
  area_sqm: number | null;
  terrace_sqm: number | null;
  orientation: string | null;
  price: number | null;
  status: UnitStatus;
};

/**
 * Tabela nalepljena iz Excela (kolone razdvojene tabom, ili ; / ,), redom:
 *   oznaka | sprat | struktura | m² | terasa m² | orijentacija | cena | status
 * Prvi red se preskače ako je zaglavlje. Vraća redove i greške po redu.
 */
export function parseUnitTable(text: string): { rows: ImportRow[]; errors: string[] } {
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  lines.forEach((line, i) => {
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const c = line.split(sep).map((x) => x.trim());
    const level = parseLevel(c[1] ?? '');
    if (i === 0 && level === null && /oznaka|stan|code|sprat/i.test(line)) return; // zaglavlje
    const n = i + 1;
    if (!c[0]) {
      errors.push(`Red ${n}: nema oznake stana.`);
      return;
    }
    if (level === null) {
      errors.push(`Red ${n} (${c[0]}): sprat "${c[1] ?? ''}" nije broj ni "P".`);
      return;
    }
    const status = parseStatus(c[7] ?? '');
    if (!status) {
      errors.push(`Red ${n} (${c[0]}): status "${c[7]}" - koristite slobodan / rezervisan / prodat.`);
      return;
    }
    rows.push({
      code: c[0].slice(0, 20),
      level,
      structure: c[2] ? c[2].slice(0, 60) : null,
      area_sqm: parseNumber(c[3] ?? ''),
      terrace_sqm: parseNumber(c[4] ?? ''),
      orientation: c[5] ? c[5].slice(0, 40) : null,
      price: parseNumber(c[6] ?? ''),
      status
    });
  });
  return { rows, errors };
}
