-- ============================================================
-- 028: RLS je tretirao "bilo koji prijavljen nalog" kao admina
-- ============================================================
-- Nađeno u code review-u 9. 10. 2026: contact_requests (SELECT) i rooms
-- (INSERT/UPDATE) su imali role "authenticated" sa qual=true - svaki
-- registrovan nalog (registracija na Supabase je otvorena) mogao je
-- direktno preko anon ključa da pročita sve zahteve za kontakt i da
-- prepiše sobe bilo koje ture, bez provere ADMIN_EMAILS (ta provera
-- postoji samo u /api/admin/* rutama, RLS je uopšte ne vidi).
--
-- app_admins: mala tabela dozvoljenih admin email adresa (ista lista kao
-- ADMIN_EMAILS u Vercel promenljivama - ovde se ručno održava jer baza ne
-- čita Vercel env). RLS bez ijedne policy-je - niko spolja je ne čita ni
-- piše (ista odbrana kao project_notes, migracija 023).

create table if not exists public.app_admins (
  email text primary key
);

comment on table public.app_admins is 'Dozvoljene admin email adrese za RLS proveru (auth.jwt() email) - ista lista kao ADMIN_EMAILS na Vercel-u, ručno se održava. Bez policy-ja - samo service role čita/piše.';

alter table public.app_admins enable row level security;

insert into public.app_admins (email) values ('kvadrat360.office@gmail.com')
  on conflict (email) do nothing;

-- contact_requests: čitanje samo za admina, ne za svakog prijavljenog.
drop policy if exists "Authenticated can read contact requests" on public.contact_requests;
create policy "Admins read contact requests"
  on public.contact_requests for select
  to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));

-- rooms: pisanje samo za admina. Postojale su dve UPDATE policy-je sa
-- istim efektom (stare migracije 006/018) - obe se brišu, jedna nova ih
-- zamenjuje za upis; čitanje (anon i authenticated) ostaje nepromenjeno.
drop policy if exists "Authenticated can insert rooms" on public.rooms;
drop policy if exists "Authenticated can update rooms" on public.rooms;
drop policy if exists "Authenticated write - rooms" on public.rooms;
create policy "Admins write rooms"
  on public.rooms for all
  to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));
