-- ============================================================
-- 023: Novogradnja - kratke beleške prodaje
-- ============================================================
-- Jedna kratka beleška po stanu i jedna po upitu (vlasnik, 2. 10. 2026:
-- „samo kratke beleške"). Nova zamenjuje staru; uz nju ko i kada; jedan
-- prekidač „važno". Bez istorije beleški.
--
-- Namerno POSEBNA tabela, a ne kolone na project_units: anon (javni ključ)
-- čita project_units objavljenih projekata, pa bi kolona sa beleškom
-- procurela kupcima. Ova tabela ima RLS bez ijednog policy-ja - čita je i
-- piše samo server (strana prodaje i admin).
--
-- Bezbedno je pokrenuti više puta.

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_id uuid unique references public.project_units(id) on delete cascade,
  inquiry_id uuid unique references public.project_inquiries(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 120),
  important boolean not null default false,
  author text not null,
  updated_at timestamptz not null default now(),
  check ((unit_id is null) <> (inquiry_id is null))
);

create index if not exists project_notes_project_idx on public.project_notes(project_id);

alter table public.project_notes enable row level security;
