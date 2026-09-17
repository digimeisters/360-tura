-- ============================================================
-- 013: Kvadratura i cena - klizači na javnom spisku tura (/ture)
-- ============================================================
-- Kvadratura i cena su do sada postojale samo kao slobodan tekst u
-- odgovorima iz upitnika ("58 m²", "1.200 EUR") i završavale u opisu i
-- FAQ-u. Filter po rasponu traži broj, pa se sada čuvaju i kao broj:
-- upitnik ih vadi iz odgovora (app/lib/tourNumbers.ts), a /ture po njima
-- pravi dva klizača.
--
-- Šta je `price` zavisi od vrste oglasa: kod prodaje ukupna cena, kod
-- izdavanja mesečna zakupnina, kod smeštaja cena po noćenju. Zato se
-- raspon na /ture računa tek unutar izabrane vrste oglasa - 60.000 i 450
-- u istom klizaču nemaju zajedničko merilo. Uvek u evrima.
--
-- Tura bez upisanog broja se NE sklanja sa spiska: prolazi kroz klizač kao
-- da ograničenja nema, jer nepoznata cena nije isto što i cena van raspona.
--
-- Zatečene ture ostaju prazne i popunjavaju se u /admin/ture.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists area_sqm numeric,
  add column if not exists price numeric;

comment on column public.tours.area_sqm is
  'Kvadratura u m², kao broj - klizač na /ture. Prazno = tura prolazi kroz klizač bez ograničenja.';

comment on column public.tours.price is
  'Cena u EVRIMA, kao broj. Značenje zavisi od kolone category: sale = ukupna cena, rent = mesečna zakupnina, booking = cena po noćenju. Zato se rasponi porede samo unutar iste vrste oglasa. Prazno = tura prolazi kroz klizač bez ograničenja.';
