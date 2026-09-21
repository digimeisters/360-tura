-- Geografska širina/dužina po turi, za mapu na /ture. Upisuje se
-- automatski (geokodiranje adrese preko Nominatim-a, app/lib/geocode.ts)
-- kad admin sačuva turu sa adresom - nema ručnog unosa koordinata.
alter table public.tours add column if not exists lat double precision;
alter table public.tours add column if not exists lng double precision;
