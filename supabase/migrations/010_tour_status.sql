-- ============================================================
-- 010: Stanje nekretnine - aktivna / izdato / prodato / pauza
-- ============================================================
-- Odvojeno od `published` (migracija 007): `published` odlučuje da li tura
-- uopšte postoji za javnost (nacrt pre nego što je gotova - RLS je potpuno
-- blokira). `status` je za VEĆ objavljenu turu čija je nekretnina u
-- međuvremenu izdata/prodata - link i dalje "postoji", ali umesto ture
-- posetilac vidi kratku poruku i kontakt agenta (page.tsx), dok admin i
-- dalje vidi i uređuje turu preko ?admin=1. Menja se jednim klikom u
-- /admin/ture, bez novog snimanja ili gubitka podataka ture.
--
-- Postojeće ture kreću kao 'active', da ništa već objavljeno ne prestane
-- da radi. Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tours_status_check'
  ) then
    alter table public.tours
      add constraint tours_status_check check (status in ('active', 'rented', 'sold', 'paused'));
  end if;
end $$;

comment on column public.tours.status is
  'active = tura radi normalno. rented/sold/paused = nekretnina više nije dostupna; posetilac (osim admina) vidi poruku i kontakt agenta umesto ture (vidi page.tsx). Nezavisno od `published`.';
