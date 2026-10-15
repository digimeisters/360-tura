-- ============================================================
-- Cene po m² za kalkulator procene - PREDLOG iz javnih oglasa
-- ============================================================
-- Napravljeno: 2026-10-15, npm run prices:refresh (scripts/refresh-valuation-prices.mjs)
-- Izvor: oglasi za Kragujevac na 4zida.rs - prodaja-stanova 695, izdavanje-stanova 221, prodaja-kuca 454, izdavanje-kuca 37, prodaja-poslovnih-prostora 228, izdavanje-poslovnih-prostora 239
-- Pravilo i odbacivanje grešaka: vidi zaglavlje skripte.
-- Pregledati, pa pokrenuti u Supabase SQL editoru. Bezbedno je pokrenuti
-- više puta (upsert); naselja kojih nema u ovom fajlu zadržavaju staru cenu.

insert into public.zone_price_baselines
  (city, neighborhood, property_type, listing_type, price_per_sqm_low, price_per_sqm_high, updated_by)
values
  ('Kragujevac', 'Centar', 'apartment', 'sale', 1590, 2090, '4zida-oglasi-2026-10-15'), -- 179 nezavisnih od 212 oglasa
  ('Kragujevac', 'Bubanj', 'apartment', 'sale', 1560, 1890, '4zida-oglasi-2026-10-15'), -- 51 nezavisnih od 105 oglasa
  ('Kragujevac', 'Erdoglija', 'apartment', 'sale', 1530, 1950, '4zida-oglasi-2026-10-15'), -- 45 nezavisnih od 66 oglasa
  ('Kragujevac', 'Aerodrom', 'apartment', 'sale', 1470, 1760, '4zida-oglasi-2026-10-15'), -- 27 nezavisnih od 40 oglasa
  ('Kragujevac', 'Bagremar', 'apartment', 'sale', 1330, 1820, '4zida-oglasi-2026-10-15'), -- 18 nezavisnih od 21 oglasa
  ('Kragujevac', 'Vašarište', 'apartment', 'sale', 1090, 1560, '4zida-oglasi-2026-10-15'), -- 16 nezavisnih od 18 oglasa
  ('Kragujevac', 'Centralna radionica', 'apartment', 'sale', 1570, 1850, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 16 oglasa
  ('Kragujevac', 'Stanovo', 'apartment', 'sale', 1520, 1700, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 17 oglasa
  ('Kragujevac', 'Mala Vaga', 'apartment', 'sale', 1110, 1540, '4zida-oglasi-2026-10-15'), -- 8 nezavisnih od 8 oglasa
  ('Kragujevac', 'Centar preko Lepenice', 'apartment', 'sale', 1440, 1900, '4zida-oglasi-2026-10-15'), -- 8 nezavisnih od 8 oglasa
  ('Kragujevac', 'Sušica', 'apartment', 'sale', 1360, 1740, '4zida-oglasi-2026-10-15'), -- 6 nezavisnih od 6 oglasa
  ('Kragujevac', 'Pivara', 'apartment', 'sale', 1590, 2000, '4zida-oglasi-2026-10-15'), -- 5 nezavisnih od 10 oglasa
  ('Kragujevac', 'Bresnica', 'house', 'sale', 640, 1000, '4zida-oglasi-2026-10-15'), -- 42 nezavisnih od 42 oglasa
  ('Kragujevac', 'Centar', 'house', 'sale', 880, 1170, '4zida-oglasi-2026-10-15'), -- 33 nezavisnih od 33 oglasa
  ('Kragujevac', 'Stanovo', 'house', 'sale', 520, 740, '4zida-oglasi-2026-10-15'), -- 31 nezavisnih od 33 oglasa
  ('Kragujevac', 'Pivara', 'house', 'sale', 600, 800, '4zida-oglasi-2026-10-15'), -- 30 nezavisnih od 30 oglasa
  ('Kragujevac', 'Šumarice', 'house', 'sale', 540, 780, '4zida-oglasi-2026-10-15'), -- 21 nezavisnih od 23 oglasa
  ('Kragujevac', 'Aerodrom', 'house', 'sale', 630, 930, '4zida-oglasi-2026-10-15'), -- 17 nezavisnih od 17 oglasa
  ('Kragujevac', 'Sušica', 'house', 'sale', 740, 870, '4zida-oglasi-2026-10-15'), -- 16 nezavisnih od 16 oglasa
  ('Kragujevac', 'Petrovac', 'house', 'sale', 510, 800, '4zida-oglasi-2026-10-15'), -- 14 nezavisnih od 14 oglasa
  ('Kragujevac', 'Erdoglija', 'house', 'sale', 750, 880, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 13 oglasa
  ('Kragujevac', 'Beloševac', 'house', 'sale', 510, 900, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 13 oglasa
  ('Kragujevac', 'Ilićevo', 'house', 'sale', 570, 760, '4zida-oglasi-2026-10-15'), -- 12 nezavisnih od 12 oglasa
  ('Kragujevac', 'Vašarište', 'house', 'sale', 770, 950, '4zida-oglasi-2026-10-15'), -- 12 nezavisnih od 14 oglasa
  ('Kragujevac', 'Mala Vaga', 'house', 'sale', 780, 1010, '4zida-oglasi-2026-10-15'), -- 11 nezavisnih od 11 oglasa
  ('Kragujevac', 'Bagremar', 'house', 'sale', 470, 770, '4zida-oglasi-2026-10-15'), -- 10 nezavisnih od 11 oglasa
  ('Kragujevac', 'Denino brdo', 'house', 'sale', 530, 700, '4zida-oglasi-2026-10-15'), -- 10 nezavisnih od 10 oglasa
  ('Kragujevac', 'Maršić', 'house', 'sale', 660, 900, '4zida-oglasi-2026-10-15'), -- 10 nezavisnih od 10 oglasa
  ('Kragujevac', 'Centar', 'commercial', 'sale', 1130, 1790, '4zida-oglasi-2026-10-15'), -- 96 nezavisnih od 101 oglasa
  ('Kragujevac', 'Mala Vaga', 'commercial', 'sale', 1180, 1410, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 14 oglasa
  ('Kragujevac', 'Centar', 'apartment', 'rent', 6.7, 7.6, '4zida-oglasi-2026-10-15'), -- 113 nezavisnih od 122 oglasa
  ('Kragujevac', 'Bubanj', 'apartment', 'rent', 7.7, 8.5, '4zida-oglasi-2026-10-15'), -- 17 nezavisnih od 24 oglasa
  ('Kragujevac', 'Vašarište', 'apartment', 'rent', 5.6, 7.5, '4zida-oglasi-2026-10-15'), -- 17 nezavisnih od 18 oglasa
  ('Kragujevac', 'Erdoglija', 'apartment', 'rent', 4.6, 5.6, '4zida-oglasi-2026-10-15'), -- 15 nezavisnih od 20 oglasa
  ('Kragujevac', 'Mala Vaga', 'apartment', 'rent', 6.8, 7.5, '4zida-oglasi-2026-10-15'), -- 8 nezavisnih od 8 oglasa
  ('Kragujevac', 'Aerodrom', 'apartment', 'rent', 5, 5.5, '4zida-oglasi-2026-10-15'), -- 5 nezavisnih od 5 oglasa
  ('Kragujevac', 'Centar', 'commercial', 'rent', 7.1, 8.7, '4zida-oglasi-2026-10-15'), -- 96 nezavisnih od 103 oglasa
  ('Kragujevac', 'Mala Vaga', 'commercial', 'rent', 6.7, 7.4, '4zida-oglasi-2026-10-15'), -- 13 nezavisnih od 13 oglasa
  ('Kragujevac', 'Aerodrom', 'commercial', 'rent', 4.5, 5.7, '4zida-oglasi-2026-10-15') -- 10 nezavisnih od 10 oglasa
on conflict (lower(city), lower(neighborhood), property_type, listing_type) do update set
  price_per_sqm_low = excluded.price_per_sqm_low,
  price_per_sqm_high = excluded.price_per_sqm_high,
  updated_at = now(),
  updated_by = excluded.updated_by;
