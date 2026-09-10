-- ============================================================
-- 006: Dozvola za upis u rooms iz admin režima
-- ============================================================
-- Admin uređuje sobe direktno iz ture (dodavanje sobe, hotspotovi, prevodi,
-- marker na tlocrtu), a to ide iz pretraživača sa prijavljenom sesijom.
-- rooms je imao samo read policy, pa je svaki takav upis padao sa
-- "new row violates row-level security policy for table rooms".
--
-- VAŽNO: ove policy-je važe za SVAKOG prijavljenog korisnika. Zato javna
-- registracija na Supabase projektu mora biti isključena
-- (Authentication -> Sign In / Providers -> Email -> Allow new users to
-- sign up = OFF), inače bi svako ko napravi nalog mogao da menja ture.
--
-- Bezbedno je pokrenuti više puta.

drop policy if exists "Authenticated can insert rooms" on public.rooms;
create policy "Authenticated can insert rooms"
  on public.rooms
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update rooms" on public.rooms;
create policy "Authenticated can update rooms"
  on public.rooms
  for update
  to authenticated
  using (true)
  with check (true);
