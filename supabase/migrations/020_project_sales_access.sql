-- ============================================================
-- 020: Pristup za prodaju investitora + zapis promena
-- ============================================================
-- Prodaja investitora menja status i cenu stanova preko ličnog linka
-- (/prodaja/<kod>), bez naloga i lozinke. Svaka osoba ima svoj link, koji
-- admin može da ugasi. U bazi se čuva samo SHA-256 otisak koda, ne sam kod.
--
-- project_unit_changes beleži svaku promenu statusa i cene - i iz linka za
-- prodaju i iz admina - da bi se znalo ko je, kada i šta promenio.
--
-- Obe tabele imaju RLS bez ijednog policy-ja: čitaju se i pišu samo kroz
-- server rute (service role). Anon ne vidi ni linkove ni istoriju.
--
-- Bezbedno je pokrenuti više puta.

create table if not exists public.project_sales_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_name text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists project_sales_links_project_idx on public.project_sales_links(project_id);

create table if not exists public.project_unit_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_id uuid references public.project_units(id) on delete set null,
  -- Oznaka se čuva i posebno, da zapis ostane čitljiv i kad se stan obriše.
  unit_code text not null,
  link_id uuid references public.project_sales_links(id) on delete set null,
  -- Ime osobe iz linka, ili 'Admin' kad menja vlasnik.
  actor text not null,
  field text not null check (field in ('status', 'price')),
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists project_unit_changes_project_idx on public.project_unit_changes(project_id, created_at desc);

-- Telegram obaveštenje kad prodaja označi stan kao prodat ili rezervisan.
alter table public.projects add column if not exists notify_sales boolean not null default true;

alter table public.project_sales_links enable row level security;
alter table public.project_unit_changes enable row level security;
