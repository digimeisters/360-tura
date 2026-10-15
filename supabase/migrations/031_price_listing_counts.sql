-- ============================================================
-- 031: Broj oglasa uz svaku cenu po naselju (zone_price_baselines)
-- ============================================================
-- Strana /alati/cene-nekretnina-kragujevac uz svako naselje piše na koliko
-- oglasa se raspon zasniva, a naselja sa malo oglasa označava kao okvirna.
--   listing_count      - svi oglasi u naselju za tu vrstu i prodaju/izdavanje
--   independent_count  - nezavisni oglasi (ista ulica = jedan glas), po
--                        njima se računa raspon (scripts/refresh-valuation-prices.mjs)
-- Null = red upisan pre ove migracije ili ručno.
-- Bezbedno je pokrenuti više puta.

alter table public.zone_price_baselines
  add column if not exists listing_count integer,
  add column if not exists independent_count integer;

comment on column public.zone_price_baselines.listing_count is
  'Broj oglasa iz kojih je raspon izračunat (svi, i iz iste ulice).';
comment on column public.zone_price_baselines.independent_count is
  'Broj nezavisnih oglasa (oglasi iz iste ulice se broje kao jedan) - na njima je raspon.';
