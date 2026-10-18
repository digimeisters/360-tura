-- Pregled koda 17. 10. 2026: SELECT pravila za ulogu "authenticated" i dalje
-- su bila "using (true)" (migracije 002, 005, 008), a registracija na
-- Supabase-u je otvorena - bilo ko ko napravi nalog čitao je i neobjavljene
-- ture (telefon/mejl agenta) i svu statistiku. Isti obrazac kao 028: puna
-- prava samo za app_admins; običan prijavljen nalog vidi ono što i posetilac.

drop policy if exists "Allow authenticated read on tours" on public.tours;
create policy "Authenticated read published tours or admin" on public.tours
  for select to authenticated
  using (
    published is true
    or exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email')
  );

drop policy if exists "Authenticated can read tour events" on public.tour_events;
create policy "Admins read tour events" on public.tour_events
  for select to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "Authenticated can read site events" on public.site_events;
create policy "Admins read site events" on public.site_events
  for select to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));
