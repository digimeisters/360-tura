-- ============================================================
-- Cene po m² za kalkulator procene - PREDLOG iz javnih oglasa
-- ============================================================
-- Napravljeno: 2026-10-16, npm run prices:refresh (scripts/refresh-valuation-prices.mjs)
-- Izvor: oglasi za Kragujevac na 4zida.rs - prodaja-stanova 687, izdavanje-stanova 219, prodaja-kuca 450, izdavanje-kuca 36, prodaja-poslovnih-prostora 229, izdavanje-poslovnih-prostora 242
-- Pravilo i odbacivanje grešaka: vidi zaglavlje skripte.
-- Ručno uklonjeni redovi Vašarište stan prodaja new (7) i old (5): ispod
-- MIN_SPLIT = 8 (pravilo dodato posle pokretanja, vlasnik 16. 10. 2026).
-- Pregledati, pa pokrenuti u Supabase SQL editoru. Bezbedno je pokrenuti
-- više puta (upsert). Na kraju se brišu redovi iz RANIJIH osvežavanja sa
-- oglasa koji ovog puta ne prolaze pravilo (vlasnik, 15. 10. 2026) - za ta
-- naselja procena računa iz proseka grada. Ručno uneti redovi ostaju.
-- Kolone listing_count / independent_count: migracija 031; build_type
-- (new = novogradnja, old = starogradnja, any = zajedno): migracija 032.

insert into public.zone_price_baselines
  (city, neighborhood, property_type, listing_type, build_type, price_per_sqm_low, price_per_sqm_high, listing_count, independent_count, updated_by)
values
  ('Kragujevac', 'Ceo grad', 'apartment', 'sale', 'new', 1620, 2010, 363, 173, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'apartment', 'sale', 'new', 1780, 2110, 155, 86, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bubanj', 'apartment', 'sale', 'new', 1530, 1880, 64, 27, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Erdoglija', 'apartment', 'sale', 'new', 1700, 2070, 77, 24, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Aerodrom', 'apartment', 'sale', 'new', 1530, 1770, 14, 9, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'apartment', 'sale', 'old', 1440, 1840, 203, 167, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'apartment', 'sale', 'old', 1490, 1900, 73, 70, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bubanj', 'apartment', 'sale', 'old', 1570, 1840, 27, 19, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Erdoglija', 'apartment', 'sale', 'old', 1380, 1710, 22, 16, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bagremar', 'apartment', 'sale', 'old', 1340, 1840, 13, 12, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Aerodrom', 'apartment', 'sale', 'old', 1500, 1770, 13, 11, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centralna radionica', 'apartment', 'sale', 'old', 1610, 2000, 13, 11, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Stanovo', 'apartment', 'sale', 'old', 1520, 1700, 12, 9, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'house', 'sale', 'any', 620, 860, 441, 406, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bresnica', 'house', 'sale', 'any', 630, 980, 42, 42, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'house', 'sale', 'any', 880, 1170, 33, 33, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Stanovo', 'house', 'sale', 'any', 520, 740, 33, 31, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Pivara', 'house', 'sale', 'any', 600, 800, 30, 30, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Šumarice', 'house', 'sale', 'any', 540, 780, 21, 19, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Sušica', 'house', 'sale', 'any', 740, 870, 16, 16, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Aerodrom', 'house', 'sale', 'any', 630, 870, 16, 16, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Petrovac', 'house', 'sale', 'any', 510, 800, 14, 14, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Erdoglija', 'house', 'sale', 'any', 750, 880, 13, 13, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Beloševac', 'house', 'sale', 'any', 530, 950, 12, 12, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ilićevo', 'house', 'sale', 'any', 570, 760, 12, 12, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Vašarište', 'house', 'sale', 'any', 780, 960, 14, 12, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Mala Vaga', 'house', 'sale', 'any', 780, 1010, 11, 11, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bagremar', 'house', 'sale', 'any', 470, 770, 11, 10, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Denino brdo', 'house', 'sale', 'any', 530, 700, 10, 10, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Maršić', 'house', 'sale', 'any', 660, 900, 10, 10, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'commercial', 'sale', 'any', 1080, 1510, 208, 182, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'commercial', 'sale', 'any', 1130, 1790, 101, 96, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Mala Vaga', 'commercial', 'sale', 'any', 1180, 1410, 14, 13, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'apartment', 'rent', 'any', 6.1, 7.5, 219, 187, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'apartment', 'rent', 'any', 6.7, 7.7, 121, 112, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Bubanj', 'apartment', 'rent', 'any', 7.7, 8.5, 24, 17, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Vašarište', 'apartment', 'rent', 'any', 5.6, 7.5, 18, 17, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Erdoglija', 'apartment', 'rent', 'any', 4.6, 5.6, 20, 15, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Mala Vaga', 'apartment', 'rent', 'any', 6.8, 7.5, 8, 8, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Aerodrom', 'apartment', 'rent', 'any', 5, 5.5, 5, 5, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'house', 'rent', 'any', 5, 7.5, 34, 33, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Ceo grad', 'commercial', 'rent', 'any', 5.6, 7.5, 223, 194, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Centar', 'commercial', 'rent', 'any', 7.1, 8.7, 104, 96, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Mala Vaga', 'commercial', 'rent', 'any', 6.7, 7.4, 13, 13, '4zida-oglasi-2026-10-16'),
  ('Kragujevac', 'Aerodrom', 'commercial', 'rent', 'any', 4.5, 5.7, 10, 10, '4zida-oglasi-2026-10-16')
on conflict (lower(city), lower(neighborhood), property_type, listing_type, build_type) do update set
  price_per_sqm_low = excluded.price_per_sqm_low,
  price_per_sqm_high = excluded.price_per_sqm_high,
  listing_count = excluded.listing_count,
  independent_count = excluded.independent_count,
  updated_at = now(),
  updated_by = excluded.updated_by;

delete from public.zone_price_baselines
where updated_by like '4zida-oglasi-%' and updated_by <> '4zida-oglasi-2026-10-16';
