-- Pregled 23. 10. 2026: sobe su bile čitljive svima ("Public read - rooms",
-- anon, using (true) - pravljeno u dashboard-u, nije bilo u migracijama) i
-- svakom prijavljenom nalogu (002, using (true)). Migracija 036 je zatvorila
-- neobjavljene ture, ali ne i njihove sobe: javnim ključem su se čitali
-- naslovi, tekstovi, tačke i adrese panorama ture pre objave.
-- Sada: posetilac vidi sobe samo objavljenih tura; administrator sve.

drop policy if exists "Public read - rooms" on public.rooms;
drop policy if exists "Allow authenticated read on rooms" on public.rooms;

create policy "Anon read rooms of published tours" on public.rooms
  for select to anon
  using (exists (select 1 from public.tours t where t.slug = rooms.tour_slug and t.published is true));

create policy "Authenticated read rooms of published tours or admin" on public.rooms
  for select to authenticated
  using (
    exists (select 1 from public.tours t where t.slug = rooms.tour_slug and t.published is true)
    or exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email')
  );
