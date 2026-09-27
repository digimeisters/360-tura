-- ============================================================
-- 018: Lakša panorama za telefone
-- ============================================================
-- Panorama je 8000x4000. U WebP-u je mala za preuzimanje (~1MB), ali je
-- telefon mora da raspakuje u ~128MB memorije po sobi - na starijim
-- iPhone-ima to ume da sruši Safari usred ture. Za telefone se zato pravi
-- još jedna kopija, 6000x3000 (~72MB): na ekranu telefona ista oštrina
-- (vidljivo polje je 65°, pa 6000px daje ~17 piksela po stepenu naspram
-- potrebnih ~18), a skoro upola manje memorije.
--
-- Prazno = soba nema lakšu kopiju, pa i telefon učitava punu panoramu.
-- Nove panorame je dobijaju pri otpremanju (/api/upload-panorama/finish),
-- postojeće skripta scripts/backfill-mobile-panoramas.mjs.
--
-- Bezbedno je pokrenuti više puta.

alter table public.rooms
  add column if not exists panorama_url_mobile text;

comment on column public.rooms.panorama_url_mobile is
  'Kopija panorame za telefone, 6000px širine (WebP). Prazno = telefon učitava panorama_url_cf.';
