-- ============================================================
-- 027: Logo agencije u turi (krug na mestu stativa, "nadir")
-- ============================================================
-- Agencija ne postoji kao zaseban red - ture je vezuju po nazivu
-- (tours.agency_name), kao i mesečni izveštaj. Logo se zato čuva po
-- nazivu agencije: otpremi se jednom (admin -> Ture -> Agencije) i važi za
-- sve njene ture, i za one napravljene kasnije. Tura bez loga agencije
-- prikazuje Kvadrat360 znak.
--
-- Upis ide samo kroz /api/admin/agency-logo (service role); anon čita.
-- Bezbedno je pokrenuti više puta.

create table if not exists public.agency_branding (
  agency_name text primary key,
  logo_url text not null,
  updated_at timestamptz not null default now()
);

comment on table public.agency_branding is 'Logo agencije po nazivu (tours.agency_name); krug na dnu panorame u turi.';

alter table public.agency_branding enable row level security;

drop policy if exists "Anon reads agency branding" on public.agency_branding;
create policy "Anon reads agency branding"
  on public.agency_branding for select
  using (true);

-- Logo je opcion po turi: klijent koji ne želi krug na dnu dobija turu bez
-- njega (admin -> izmena ture -> "Logo na mestu stativa"). Podrazumevano uključen.
alter table public.tours add column if not exists nadir_logo boolean not null default true;

comment on column public.tours.nadir_logo is 'Krug sa logom na mestu stativa (agencija ili Kvadrat360); false = tura bez loga, na zahtev klijenta.';
