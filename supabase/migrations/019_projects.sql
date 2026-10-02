-- ============================================================
-- 019: Novogradnja - projekat, spratovi, stanovi
-- ============================================================
-- Paket za investitore (izbor stana: zgrada -> sprat -> stan). Samo NOVE
-- tabele: tours i rooms se ne diraju. Stan i sprat na postojeću turu samo
-- pokazuju (tour_id), pa tura ostaje obična tura i radi kao i do sada.
--
-- Oblici (polygon) su nizovi tačaka [[x, y], ...] u udelu slike (0..1):
--   - sprat na slici fasade (projects.facade_url)
--   - stan na osnovi sprata (project_floors.plan_url)
-- Tako ne zavise od veličine slike na ekranu.
--
-- Upis ide SAMO kroz admin rute (service role, app/api/admin/projects),
-- pa za upis nema policy-ja. Anon čita samo objavljene projekte.
--
-- Bezbedno je pokrenuti više puta.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  developer_name text,
  address text,
  city text default 'Kragujevac',
  -- Slobodan tekst ("jun 2027"), jer investitori rok daju kao mesec ili kvartal.
  move_in text,
  description text,
  contact_phone text,
  contact_email text,
  facade_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_floors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- 0 = prizemlje, 1 = prvi sprat... (-1 za garažu ako zatreba)
  level integer not null,
  label text,
  polygon jsonb,
  plan_url text,
  -- "Pogled sa sprata": tura sa 360° snimkom dronom na visini ovog sprata.
  view_tour_id uuid references public.tours(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, level)
);

create table if not exists public.project_units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  floor_id uuid not null references public.project_floors(id) on delete cascade,
  -- Oznaka stana kako je investitor vodi ("3B", "S12").
  code text not null,
  structure text,
  area_sqm numeric,
  terrace_sqm numeric,
  orientation text,
  price numeric,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold')),
  polygon jsonb,
  -- 360° tura ovog stana (ili njegovog tipa - više stanova može na istu turu).
  tour_id uuid references public.tours(id) on delete set null,
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists project_floors_project_idx on public.project_floors(project_id);
create index if not exists project_units_project_idx on public.project_units(project_id);
create index if not exists project_units_floor_idx on public.project_units(floor_id);

comment on table public.projects is 'Novogradnja (paket za investitore). Javno samo kad je published.';
comment on column public.project_floors.polygon is 'Oblik sprata na slici fasade: [[x,y],...] u udelu slike (0..1).';
comment on column public.project_units.polygon is 'Oblik stana na osnovi sprata: [[x,y],...] u udelu slike (0..1).';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_floors enable row level security;
alter table public.project_units enable row level security;

drop policy if exists "Anon reads published projects" on public.projects;
create policy "Anon reads published projects"
  on public.projects for select to anon, authenticated
  using (published is true);

drop policy if exists "Anon reads floors of published projects" on public.project_floors;
create policy "Anon reads floors of published projects"
  on public.project_floors for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));

drop policy if exists "Anon reads units of published projects" on public.project_units;
create policy "Anon reads units of published projects"
  on public.project_units for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));
