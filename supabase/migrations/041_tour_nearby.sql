-- Okolina ture (27. 10. 2026) - isto kao projects.nearby (migracija 022):
-- škole, vrtići, prodavnice, apoteke, zdravstvo, autobus i parkovi iz
-- OpenStreetMap-a (Overpass) u krugu od 1,2 km. Puni je admin ruta za ture
-- posle čuvanja (after), a jednom i scripts/backfill-tour-nearby.mts.
-- Tura se čita sa select('*'), pa nove kolone nasleđuju postojeća prava.

alter table public.tours add column if not exists nearby jsonb;
alter table public.tours add column if not exists nearby_updated_at timestamptz;
