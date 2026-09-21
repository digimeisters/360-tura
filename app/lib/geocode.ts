/**
 * Adresa -> koordinate, preko Nominatim-a (OpenStreetMap-ov besplatan
 * geokodiranje servis, bez API ključa). Koristi se SAMO kad admin sačuva
 * turu sa novom/izmenjenom adresom (retko, ručna akcija) - Nominatim-ova
 * politika korišćenja traži jasan User-Agent i najviše ~1 zahtev u sekundi,
 * što ovde nikad nije problem.
 *
 * "Best effort": pogrešna/nepotpuna adresa ili pad servisa ne obara čuvanje
 * ture - tura ostaje bez pina na mapi dok se adresa ne ispravi ili ponovo
 * ne pokuša.
 */

export type Coordinates = { lat: number; lng: number };

export async function geocodeAddress(
  address: string | null | undefined,
  city: string | null | undefined
): Promise<Coordinates | null> {
  const query = [address, city, 'Srbija'].filter((part) => part && part.trim()).join(', ');
  if (!query.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        // Nominatim traži da se pošiljalac jasno identifikuje - bez ovoga
        // ume da odbije zahtev.
        'User-Agent': 'Kvadrat360/1.0 (https://kvadrat360.com; info@kvadrat360.com)',
        'Accept-Language': 'sr'
      }
    });
    if (!res.ok) return null;

    const results = await res.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error('[geocode] Nominatim upit nije uspeo:', err);
    return null;
  }
}
