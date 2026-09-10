-- ============================================================
-- 002: Read policy za `authenticated` rolu na tours i rooms
-- ============================================================
-- Bez ovoga tura puca sa "Cannot coerce the result to a single JSON object"
-- (PGRST116/406) čim postoji admin sesija: anon rola ima public read, a
-- authenticated nema nijednu policy, pa PostgREST vrati 0 redova.
-- Bezbedno je pokrenuti više puta.

drop policy if exists "Allow authenticated read on tours" on public.tours;
create policy "Allow authenticated read on tours"
  on public.tours
  for select
  to authenticated
  using (true);

drop policy if exists "Allow authenticated read on rooms" on public.rooms;
create policy "Allow authenticated read on rooms"
  on public.rooms
  for select
  to authenticated
  using (true);
