-- ============================================================
-- 001: Tabela za upite sa landing forme (kvadrat360.com)
-- ============================================================
-- Bezbedno je pokrenuti više puta.

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  contact text not null,
  "package" text,
  agency text,
  listing_type text,
  size text,
  message text,
  source text default 'landing',
  status text not null default 'new'
);

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;

-- Javna forma sme SAMO da upisuje. Namerno NEMA select policy za anon -
-- lead-ovi ne smeju da budu čitljivi bez prijave.
drop policy if exists "Anon can submit contact requests" on public.contact_requests;
create policy "Anon can submit contact requests"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (true);

-- Prijavljeni (admin) sme da čita upite, za budući admin panel.
drop policy if exists "Authenticated can read contact requests" on public.contact_requests;
create policy "Authenticated can read contact requests"
  on public.contact_requests
  for select
  to authenticated
  using (true);
