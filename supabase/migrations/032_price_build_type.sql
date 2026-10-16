-- ============================================================
-- 032: Cene po m² posebno za novogradnju i starogradnju
-- ============================================================
-- zone_price_baselines.build_type:
--   'new' = novogradnja, 'old' = starogradnja, 'any' = zajedno (kuće,
--   lokali, kirije - novih ima premalo za poseban raspon).
-- Za sada se deli samo prodaja stanova (scripts/refresh-valuation-prices.mjs).
-- Postojeći redovi postaju 'any'. Red "Ceo grad" (neighborhood) je prosek
-- celog grada za tu kombinaciju - procena ga koristi za naselje bez reda.
--
-- Jedinstvenost sada uključuje build_type, da isto naselje može da ima i
-- novogradnju i starogradnju. Bezbedno je pokrenuti više puta.

alter table public.zone_price_baselines
  add column if not exists build_type text not null default 'any';

alter table public.zone_price_baselines
  drop constraint if exists zone_price_baselines_build_type_check;
alter table public.zone_price_baselines
  add constraint zone_price_baselines_build_type_check check (build_type in ('new', 'old', 'any'));

drop index if exists public.zone_price_baselines_unique_idx;
create unique index if not exists zone_price_baselines_unique_idx
  on public.zone_price_baselines (lower(city), lower(neighborhood), property_type, listing_type, build_type);

comment on column public.zone_price_baselines.build_type is
  'new = novogradnja, old = starogradnja, any = zajedno. Prodaja stanova se deli, ostalo je any.';
