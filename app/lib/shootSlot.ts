// Željeni termin snimanja iz forme za kontakt. To je želja posetioca, a ne
// rezervacija: termin se potvrđuje pozivom, pa nema kalendara u pozadini.
// Bez uvoza - koristi ga i forma (klijent) i /api/contact (server).

// Delovi dana u okviru radnog vremena (Pon–Sub, 08–20h).
export const SLOT_WINDOWS = ['08-11', '11-14', '14-17', '17-20'] as const;
export type SlotWindow = (typeof SLOT_WINDOWS)[number];

// Koliko radnih dana unapred se nudi - dve sedmice bez nedelja.
export const SLOT_DAYS_AHEAD = 12;

// Server prihvata i nešto širi raspon, za slučaj da je strana dugo otvorena.
const MAX_DAYS_AHEAD = 30;

const SUNDAY = 0;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ShootDay = { iso: string; weekday: number; day: number; month: number };

// Datum "danas" po beogradskom vremenu (YYYY-MM-DD), bez obzira gde je posetilac.
function belgradeToday(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  return new Date(`${iso}T12:00:00Z`);
}

/** Naredni radni dani (bez nedelje), počev od sutra. */
export function upcomingShootDays(count = SLOT_DAYS_AHEAD): ShootDay[] {
  const cursor = belgradeToday();
  const days: ShootDay[] = [];
  while (days.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() === SUNDAY) continue;
    days.push({
      iso: cursor.toISOString().slice(0, 10),
      weekday: cursor.getUTCDay(),
      day: cursor.getUTCDate(),
      month: cursor.getUTCMonth() + 1
    });
  }
  return days;
}

export function isSlotWindow(value: unknown): value is SlotWindow {
  return typeof value === 'string' && (SLOT_WINDOWS as readonly string[]).includes(value);
}

const DAY_NAMES_SR = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];
const MONTHS_SR = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];

/**
 * Proverava termin koji je stigao sa forme i vraća ga kao tekst na srpskom
 * (za Telegram i bazu), npr. "Utorak, 15. septembra · 11–14h". Neispravan
 * termin vraća null - upit se tada prima bez termina, ne odbija se.
 */
export function describeSlot(date: unknown, window: unknown): string | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDay() === SUNDAY) return null;

  const ahead = Math.round((d.getTime() - belgradeToday().getTime()) / DAY_MS);
  if (ahead < 0 || ahead > MAX_DAYS_AHEAD) return null;

  const name = DAY_NAMES_SR[d.getUTCDay()];
  const day = `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${d.getUTCDate()}. ${MONTHS_SR[d.getUTCMonth()]}`;
  return isSlotWindow(window) ? `${day} · ${window.replace('-', '–')}h` : `${day} · bilo kad tog dana`;
}
