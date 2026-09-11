-- ============================================================
-- 007: Stanje ture - objavljena ili u pripremi
-- ============================================================
-- Do sada je tura bila javna u trenutku kreiranja: pre nego što ijedna soba
-- dobije panoramu, link već radi i sitemap je nudi Google-u. Ovim dobija
-- prekidač, a javno čitanje se vezuje za njega.
--
-- Postojeće ture ostaju objavljene (default true), da ništa što je već
-- podeljeno ne prestane da radi. Nove ture rute upisuju sa published = false.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists published boolean not null default true;

comment on column public.tours.published is
  'Da li je tura javno vidljiva. Nove ture kreću kao false dok se ne otpreme panorame.';

-- ------------------------------------------------------------
-- RLS: anon vidi samo objavljene ture
-- ------------------------------------------------------------
-- Policy bez uključenog RLS-a ne radi ništa, pa se prvo uključuje. Prijavljen
-- admin i dalje čita sve (policy iz 002), a service role ključ ionako
-- zaobilazi RLS - dakle ni /api/track ni /api/unos ovim ne gube pristup.

alter table public.tours enable row level security;

-- Policy-ji se sabiraju (OR), pa dodavanje uslovne policy ne znači ništa dok
-- postoji starija koja pušta sve. Zato se prvo uklanjaju sve postojeće SELECT
-- policy-je za anon rolu na ovoj tabeli, pa se pravi jedna, jasna.

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tours'
      and cmd = 'SELECT'
      and (roles @> array['anon']::name[] or roles @> array['public']::name[])
  loop
    execute format('drop policy %I on public.tours', pol.policyname);
  end loop;
end $$;

create policy "Anon reads published tours"
  on public.tours
  for select
  to anon
  using (published is true);

-- Prijavljen administrator i dalje vidi sve, uključujući ture u pripremi -
-- to je policy iz migracije 002, koja se ovim ne dira.
