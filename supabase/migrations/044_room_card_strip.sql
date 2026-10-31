-- ============================================================
-- 044: Traka panorame za karticu ture
-- ============================================================
-- Kartica ture na početnoj i na /ture umesto fotografije pokazuje panoramu
-- koja se polako okreće (components/CardPanorama). Cela panorama je
-- ~450 KB, pa se pravi uska traka: ceo krug, samo pojas od 70° oko
-- horizonta, 2400px širine, ~80 KB (app/lib/panoramaPreview.ts, makeCardStrip).
--
-- Prazno = kartica pokazuje običnu fotografiju, kao ranije. Nove panorame
-- dobijaju traku pri otpremanju (/api/upload-panorama/finish), postojeće
-- skripta scripts/backfill-card-strips.mjs.
--
-- Postojeća tabela: nove dozvole nisu potrebne. Bezbedno je pokrenuti više puta.

alter table public.rooms
  add column if not exists strip_url text;

comment on column public.rooms.strip_url is
  'Traka panorame za karticu ture: 360° x 70° oko horizonta, 2400px (WebP). Prazno = kartica pokazuje fotografiju.';
