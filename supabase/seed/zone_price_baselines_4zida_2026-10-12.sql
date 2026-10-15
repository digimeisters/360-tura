-- ============================================================
-- Cene po m² za kalkulator procene - PREDLOG iz javnih oglasa
-- ============================================================
-- Napravljeno: 2026-10-12, npm run prices:refresh (scripts/refresh-valuation-prices.mjs)
-- Izvor: oglasi za Kragujevac na 4zida.rs - prodaja-stanova 698, izdavanje-stanova 230, prodaja-kuca 456, izdavanje-kuca 38, prodaja-poslovnih-prostora 230, izdavanje-poslovnih-prostora 239
-- Pravilo i odbacivanje grešaka: vidi zaglavlje skripte.
-- Pregledati, pa pokrenuti u Supabase SQL editoru. Bezbedno je pokrenuti
-- više puta (upsert); naselja kojih nema u ovom fajlu zadržavaju staru cenu.

insert into public.zone_price_baselines
  (city, neighborhood, property_type, listing_type, price_per_sqm_low, price_per_sqm_high, updated_by)
values
  ('Kragujevac', 'Centar', 'apartment', 'sale', 1550, 1990, '4zida-oglasi-2026-10-12'), -- 316 oglasa
  ('Kragujevac', 'Erdoglija', 'apartment', 'sale', 1570, 1990, '4zida-oglasi-2026-10-12'), -- 70 oglasa
  ('Kragujevac', 'Aerodrom', 'apartment', 'sale', 1500, 1740, '4zida-oglasi-2026-10-12'), -- 40 oglasa
  ('Kragujevac', 'Bagremar', 'apartment', 'sale', 1320, 1740, '4zida-oglasi-2026-10-12'), -- 21 oglasa
  ('Kragujevac', 'Vašarište', 'apartment', 'sale', 1110, 1560, '4zida-oglasi-2026-10-12'), -- 18 oglasa
  ('Kragujevac', 'Stanovo', 'apartment', 'sale', 1490, 1700, '4zida-oglasi-2026-10-12'), -- 17 oglasa
  ('Kragujevac', 'Centralna radionica', 'apartment', 'sale', 1550, 1830, '4zida-oglasi-2026-10-12'), -- 14 oglasa
  ('Kragujevac', 'Pivara', 'apartment', 'sale', 1560, 1840, '4zida-oglasi-2026-10-12'), -- 10 oglasa
  ('Kragujevac', 'Centar preko Lepenice', 'apartment', 'sale', 1440, 1900, '4zida-oglasi-2026-10-12'), -- 8 oglasa
  ('Kragujevac', 'Bresnica', 'apartment', 'sale', 1440, 1620, '4zida-oglasi-2026-10-12'), -- 7 oglasa
  ('Kragujevac', 'Palilule', 'apartment', 'sale', 1380, 1660, '4zida-oglasi-2026-10-12'), -- 7 oglasa
  ('Kragujevac', 'Mala Vaga', 'apartment', 'sale', 1110, 1460, '4zida-oglasi-2026-10-12'), -- 7 oglasa
  ('Kragujevac', 'Sušica', 'apartment', 'sale', 1360, 1740, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Bresnica', 'house', 'sale', 620, 980, '4zida-oglasi-2026-10-12'), -- 44 oglasa
  ('Kragujevac', 'Centar', 'house', 'sale', 880, 1180, '4zida-oglasi-2026-10-12'), -- 34 oglasa
  ('Kragujevac', 'Stanovo', 'house', 'sale', 470, 710, '4zida-oglasi-2026-10-12'), -- 33 oglasa
  ('Kragujevac', 'Pivara', 'house', 'sale', 610, 820, '4zida-oglasi-2026-10-12'), -- 31 oglasa
  ('Kragujevac', 'Šumarice', 'house', 'sale', 550, 780, '4zida-oglasi-2026-10-12'), -- 23 oglasa
  ('Kragujevac', 'Aerodrom', 'house', 'sale', 630, 930, '4zida-oglasi-2026-10-12'), -- 17 oglasa
  ('Kragujevac', 'Sušica', 'house', 'sale', 740, 870, '4zida-oglasi-2026-10-12'), -- 16 oglasa
  ('Kragujevac', 'Petrovac', 'house', 'sale', 510, 800, '4zida-oglasi-2026-10-12'), -- 14 oglasa
  ('Kragujevac', 'Vašarište', 'house', 'sale', 780, 950, '4zida-oglasi-2026-10-12'), -- 14 oglasa
  ('Kragujevac', 'Erdoglija', 'house', 'sale', 750, 880, '4zida-oglasi-2026-10-12'), -- 13 oglasa
  ('Kragujevac', 'Beloševac', 'house', 'sale', 530, 950, '4zida-oglasi-2026-10-12'), -- 12 oglasa
  ('Kragujevac', 'Ilićevo', 'house', 'sale', 570, 760, '4zida-oglasi-2026-10-12'), -- 12 oglasa
  ('Kragujevac', 'Bagremar', 'house', 'sale', 500, 760, '4zida-oglasi-2026-10-12'), -- 11 oglasa
  ('Kragujevac', 'Mala Vaga', 'house', 'sale', 780, 1010, '4zida-oglasi-2026-10-12'), -- 11 oglasa
  ('Kragujevac', 'Korićani', 'house', 'sale', 630, 910, '4zida-oglasi-2026-10-12'), -- 10 oglasa
  ('Kragujevac', 'Denino brdo', 'house', 'sale', 530, 700, '4zida-oglasi-2026-10-12'), -- 10 oglasa
  ('Kragujevac', 'Maršić', 'house', 'sale', 660, 900, '4zida-oglasi-2026-10-12'), -- 10 oglasa
  ('Kragujevac', 'Vinogradi', 'house', 'sale', 640, 1070, '4zida-oglasi-2026-10-12'), -- 9 oglasa
  ('Kragujevac', 'Palilule', 'house', 'sale', 440, 770, '4zida-oglasi-2026-10-12'), -- 9 oglasa
  ('Kragujevac', 'Male Pčelice', 'house', 'sale', 650, 910, '4zida-oglasi-2026-10-12'), -- 7 oglasa
  ('Kragujevac', 'Grošnica', 'house', 'sale', 380, 690, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Zvezda', 'house', 'sale', 540, 700, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Erdeč', 'house', 'sale', 560, 680, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Centar', 'commercial', 'sale', 1200, 1850, '4zida-oglasi-2026-10-12'), -- 111 oglasa
  ('Kragujevac', 'Mala Vaga', 'commercial', 'sale', 1200, 1420, '4zida-oglasi-2026-10-12'), -- 15 oglasa
  ('Kragujevac', 'Centar preko Lepenice', 'commercial', 'sale', 840, 1220, '4zida-oglasi-2026-10-12'), -- 9 oglasa
  ('Kragujevac', 'Erdoglija', 'commercial', 'sale', 1280, 1430, '4zida-oglasi-2026-10-12'), -- 9 oglasa
  ('Kragujevac', 'Vašarište', 'commercial', 'sale', 1280, 1430, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Palilule', 'commercial', 'sale', 630, 820, '4zida-oglasi-2026-10-12'), -- 5 oglasa
  ('Kragujevac', 'Pivara', 'commercial', 'sale', 1890, 2130, '4zida-oglasi-2026-10-12'), -- 5 oglasa
  ('Kragujevac', 'Bresnica', 'commercial', 'sale', 1260, 1500, '4zida-oglasi-2026-10-12'), -- 5 oglasa
  ('Kragujevac', 'Centar', 'apartment', 'rent', 6.5, 7.8, '4zida-oglasi-2026-10-12'), -- 158 oglasa
  ('Kragujevac', 'Erdoglija', 'apartment', 'rent', 4.7, 6.3, '4zida-oglasi-2026-10-12'), -- 18 oglasa
  ('Kragujevac', 'Vašarište', 'apartment', 'rent', 5.8, 7.6, '4zida-oglasi-2026-10-12'), -- 18 oglasa
  ('Kragujevac', 'Mala Vaga', 'apartment', 'rent', 6.8, 7.5, '4zida-oglasi-2026-10-12'), -- 8 oglasa
  ('Kragujevac', 'Centar', 'house', 'rent', 7.2, 7.9, '4zida-oglasi-2026-10-12'), -- 11 oglasa
  ('Kragujevac', 'Centar', 'commercial', 'rent', 7.1, 9.4, '4zida-oglasi-2026-10-12'), -- 118 oglasa
  ('Kragujevac', 'Mala Vaga', 'commercial', 'rent', 6.7, 7.4, '4zida-oglasi-2026-10-12'), -- 13 oglasa
  ('Kragujevac', 'Aerodrom', 'commercial', 'rent', 4.5, 5.7, '4zida-oglasi-2026-10-12'), -- 10 oglasa
  ('Kragujevac', 'Stanovo', 'commercial', 'rent', 3.3, 4.5, '4zida-oglasi-2026-10-12'), -- 9 oglasa
  ('Kragujevac', 'Vašarište', 'commercial', 'rent', 8, 10, '4zida-oglasi-2026-10-12'), -- 7 oglasa
  ('Kragujevac', 'Bresnica', 'commercial', 'rent', 4.1, 4.8, '4zida-oglasi-2026-10-12'), -- 6 oglasa
  ('Kragujevac', 'Korićani', 'commercial', 'rent', 3.3, 5, '4zida-oglasi-2026-10-12'), -- 5 oglasa
  ('Kragujevac', 'Erdoglija', 'commercial', 'rent', 8, 8.8, '4zida-oglasi-2026-10-12') -- 5 oglasa
on conflict (lower(city), lower(neighborhood), property_type, listing_type) do update set
  price_per_sqm_low = excluded.price_per_sqm_low,
  price_per_sqm_high = excluded.price_per_sqm_high,
  updated_at = now(),
  updated_by = excluded.updated_by;
