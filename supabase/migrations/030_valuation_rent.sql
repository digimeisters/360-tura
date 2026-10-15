-- ============================================================
-- 030: Kalkulator procene - i izdavanje, ne samo prodaja
-- ============================================================
-- zone_price_baselines.listing_type: 'sale' = prodajna cena €/m²,
-- 'rent' = kirija €/m² MESEČNO, za NAMEŠTENU nekretninu (nameštenost
-- umanjuje kiriju u kodu, vidi app/lib/valuation/calculateEstimate.ts).
-- Postojeći redovi su prodajni (default 'sale').
--
-- Jedinstvenost sada uključuje listing_type, da isto naselje može da ima
-- i prodajnu cenu i kiriju.
--
-- property_valuation_leads: listing_type i furnishing (samo izdavanje).
-- estimated_low/high za izdavanje su € mesečno.
-- Bezbedno je pokrenuti više puta.

alter table public.zone_price_baselines
  add column if not exists listing_type text not null default 'sale';

alter table public.zone_price_baselines
  drop constraint if exists zone_price_baselines_listing_type_check;
alter table public.zone_price_baselines
  add constraint zone_price_baselines_listing_type_check check (listing_type in ('sale', 'rent'));

drop index if exists public.zone_price_baselines_unique_idx;
create unique index if not exists zone_price_baselines_unique_idx
  on public.zone_price_baselines (lower(city), lower(neighborhood), property_type, listing_type);

comment on column public.zone_price_baselines.listing_type is
  'sale = prodajna cena €/m²; rent = kirija €/m² mesečno za nameštenu nekretninu.';

alter table public.property_valuation_leads
  add column if not exists listing_type text not null default 'sale',
  add column if not exists furnishing text;

alter table public.property_valuation_leads
  drop constraint if exists property_valuation_leads_listing_type_check;
alter table public.property_valuation_leads
  add constraint property_valuation_leads_listing_type_check check (listing_type in ('sale', 'rent'));

alter table public.property_valuation_leads
  drop constraint if exists property_valuation_leads_furnishing_check;
alter table public.property_valuation_leads
  add constraint property_valuation_leads_furnishing_check
  check (furnishing is null or furnishing in ('furnished', 'semi_furnished', 'unfurnished'));

comment on column public.property_valuation_leads.listing_type is
  'sale = procena prodajne cene; rent = procena mesečne kirije (estimated_* su tada € mesečno).';
