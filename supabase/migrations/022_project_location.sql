-- ============================================================
-- 022: Novogradnja - lokacija projekta i okolina na mapi
-- ============================================================
-- lat/lng: geokodirano iz adrese (Nominatim) pri čuvanju podataka projekta,
--   ili ručno upisano u adminu.
-- nearby: okolina iz OpenStreetMap-a (Overpass) - škole, vrtići, prodavnice,
--   apoteke, zdravstvo, autobus, parkovi - sa udaljenošću u metrima. Puni je
--   admin dugmetom „Pronađi okolinu"; javna strana samo čita (ne zavisi od
--   spoljnog servisa dok je posetilac gleda).
--
-- Bezbedno je pokrenuti više puta.

alter table public.projects add column if not exists lat double precision;
alter table public.projects add column if not exists lng double precision;
alter table public.projects add column if not exists nearby jsonb;
alter table public.projects add column if not exists nearby_updated_at timestamptz;

comment on column public.projects.nearby is 'Okolina iz OSM-a: [{cat, name, lat, lng, m}] - cat: school|kindergarten|shop|pharmacy|health|bus|park.';
