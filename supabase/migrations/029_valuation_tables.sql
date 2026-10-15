-- ============================================================
-- 029: Kalkulator procene vrednosti (/procena-vrednosti)
-- ============================================================
-- Dve tabele:
--   zone_price_baselines      - referentne cene po m² po naselju i tipu
--                               (puni agencija ručno, vidi supabase/seed/)
--   property_valuation_leads  - leadovi sa kalkulatora + snapshot procene
--
-- Obe su zatvorene za anon i za svakog prijavljenog osim admina
-- (app_admins, migracija 028): upis lead-a i čitanje cena radi
-- /api/valuation/estimate service role ključem. Namerno NEMA anon insert
-- policy-ja - preko njega bi bilo ko mogao da upiše lead sa izmišljenom
-- procenom direktno kroz anon ključ.
-- Bezbedno je pokrenuti više puta.

create table if not exists public.zone_price_baselines (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  neighborhood text not null,
  property_type text not null check (property_type in ('apartment', 'house', 'commercial')),
  price_per_sqm_low numeric not null check (price_per_sqm_low > 0),
  price_per_sqm_high numeric not null check (price_per_sqm_high >= price_per_sqm_low),
  updated_at timestamptz not null default now(),
  updated_by text
);

create unique index if not exists zone_price_baselines_unique_idx
  on public.zone_price_baselines (lower(city), lower(neighborhood), property_type);

comment on table public.zone_price_baselines is
  'Referentne cene (€/m²) po naselju i tipu nekretnine za kalkulator procene. Puni se ručno; kalkulator ne izmišlja cene.';

create table if not exists public.property_valuation_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- unos korisnika
  city text not null,
  neighborhood text not null,
  property_type text not null check (property_type in ('apartment', 'house', 'commercial')),
  sqm numeric not null check (sqm > 0),
  rooms numeric,
  floor_number integer,
  has_elevator boolean,
  build_year integer,
  condition text not null check (condition in ('needs_renovation', 'maintained', 'renovated', 'new_build')),
  has_parking boolean not null default false,
  has_terrace boolean not null default false,

  -- kontakt
  contact_name text not null,
  contact_phone text not null,
  contact_email text,

  -- snapshot procene u trenutku predaje (null = nema cena za lokaciju)
  estimated_low numeric,
  estimated_high numeric,
  price_per_sqm_used_low numeric,
  price_per_sqm_used_high numeric,
  baseline_source text check (baseline_source in ('exact', 'city_average')),

  -- vođenje lead-a
  status text not null default 'new'
    check (status in ('new', 'contacted', 'tour_offered', 'converted', 'lost')),
  agent_note text,

  -- poreklo
  source text not null default 'organic',
  utm_campaign text
);

create index if not exists idx_valuation_leads_status
  on public.property_valuation_leads (status);
create index if not exists idx_valuation_leads_created
  on public.property_valuation_leads (created_at desc);

alter table public.zone_price_baselines enable row level security;
alter table public.property_valuation_leads enable row level security;

-- Admin (ista provera kao u 028) čita i menja oba skupa, za budući admin panel.
drop policy if exists "Admins manage price baselines" on public.zone_price_baselines;
create policy "Admins manage price baselines"
  on public.zone_price_baselines for all
  to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "Admins manage valuation leads" on public.property_valuation_leads;
create policy "Admins manage valuation leads"
  on public.property_valuation_leads for all
  to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));
