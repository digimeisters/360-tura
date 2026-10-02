-- ============================================================
-- 025: Novogradnja - pogledi (rotacija), stanovi na fasadi, lamele
-- ============================================================
-- Do sada: jedna slika fasade (projects.facade_url) i oblik sprata na njoj
-- (project_floors.polygon). Sada:
--
--   project_buildings   lamele / zgrade kompleksa (prazno = jedna zgrada)
--   project_views       slike: 'site' = kompleks iz vazduha (lamele na njoj),
--                       'building' = fasada zgrade (ulica, dvorište...);
--                       više slika iste zgrade = rotacija strelicama
--   project_view_shapes oblik lamele, sprata ILI stana na jednoj slici
--
-- Postojeća fasada se prepisuje u prvi pogled (sa oblicima spratova), a
-- stare kolone facade_url i project_floors.polygon OSTAJU (više se ne
-- pišu) - stari kod na sajtu radi dok se novi ne objavi.
--
-- Sprat sada pripada lameli (building_id; null = projekat bez lamela), pa
-- je jedinstven nivo po lameli, ne po projektu.
--
-- Oblici su [[x, y], ...] u udelu slike (0..1), kao u 019.
-- Upis samo kroz admin rute (service role); anon čita objavljene projekte.
-- Bezbedno je pokrenuti više puta.

create table if not exists public.project_buildings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- "Lamela A", "Zgrada 2"
  name text not null check (char_length(name) between 1 and 40),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_buildings_project_idx on public.project_buildings(project_id);

alter table public.project_floors
  add column if not exists building_id uuid references public.project_buildings(id) on delete cascade;
create index if not exists project_floors_building_idx on public.project_floors(building_id);

-- Nivo je jedinstven po lameli (i po projektu kad lamela nema).
alter table public.project_floors drop constraint if exists project_floors_project_id_level_key;
create unique index if not exists project_floors_building_level_key
  on public.project_floors (project_id, coalesce(building_id, '00000000-0000-0000-0000-000000000000'::uuid), level);

create table if not exists public.project_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'building' check (kind in ('site', 'building')),
  -- Fasada lamele; null = projekat bez lamela. Pogled 'site' nema lamelu.
  building_id uuid references public.project_buildings(id) on delete cascade,
  -- "Ulica", "Dvorište" (prazno = bez natpisa)
  label text check (label is null or char_length(label) <= 40),
  image_url text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  constraint project_views_site_no_building check (kind = 'building' or building_id is null)
);
create index if not exists project_views_project_idx on public.project_views(project_id);

create table if not exists public.project_view_shapes (
  id uuid primary key default gen_random_uuid(),
  view_id uuid not null references public.project_views(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  building_id uuid references public.project_buildings(id) on delete cascade,
  floor_id uuid references public.project_floors(id) on delete cascade,
  unit_id uuid references public.project_units(id) on delete cascade,
  polygon jsonb not null,
  updated_at timestamptz not null default now(),
  constraint project_view_shapes_one_target check (num_nonnulls(building_id, floor_id, unit_id) = 1),
  constraint project_view_shapes_building_key unique (view_id, building_id),
  constraint project_view_shapes_floor_key unique (view_id, floor_id),
  constraint project_view_shapes_unit_key unique (view_id, unit_id)
);
create index if not exists project_view_shapes_project_idx on public.project_view_shapes(project_id);
create index if not exists project_view_shapes_building_idx on public.project_view_shapes(building_id);
create index if not exists project_view_shapes_floor_idx on public.project_view_shapes(floor_id);
create index if not exists project_view_shapes_unit_idx on public.project_view_shapes(unit_id);

comment on table public.project_buildings is 'Lamele kompleksa novogradnje. Prazno = projekat je jedna zgrada.';
comment on table public.project_views is 'Slike projekta: site = kompleks iz vazduha, building = fasada (više = rotacija).';
comment on table public.project_view_shapes is 'Oblik lamele, sprata ili stana na jednoj slici: [[x,y],...] u udelu slike (0..1).';
comment on column public.projects.facade_url is 'ZASTARELO od 025 - fasada je u project_views. Ne piše se više.';
comment on column public.project_floors.polygon is 'ZASTARELO od 025 - oblik sprata na fasadi je u project_view_shapes.';

-- ------------------------------------------------------------
-- RLS: anon čita samo objavljene projekte (kao 019)
-- ------------------------------------------------------------
alter table public.project_buildings enable row level security;
alter table public.project_views enable row level security;
alter table public.project_view_shapes enable row level security;

drop policy if exists "Anon reads buildings of published projects" on public.project_buildings;
create policy "Anon reads buildings of published projects"
  on public.project_buildings for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));

drop policy if exists "Anon reads views of published projects" on public.project_views;
create policy "Anon reads views of published projects"
  on public.project_views for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));

drop policy if exists "Anon reads view shapes of published projects" on public.project_view_shapes;
create policy "Anon reads view shapes of published projects"
  on public.project_view_shapes for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));

-- ------------------------------------------------------------
-- Postojeća fasada -> prvi pogled, oblici spratova -> oblici na njemu
-- ------------------------------------------------------------
insert into public.project_views (project_id, kind, image_url, sort)
select p.id, 'building', p.facade_url, 0
from public.projects p
where p.facade_url is not null
  and not exists (select 1 from public.project_views v where v.project_id = p.id);

insert into public.project_view_shapes (view_id, project_id, floor_id, polygon)
select v.id, f.project_id, f.id, f.polygon
from public.project_floors f
join public.project_views v
  on v.project_id = f.project_id and v.kind = 'building' and v.building_id is null and v.sort = 0
join public.projects p on p.id = f.project_id and p.facade_url = v.image_url
where f.polygon is not null
on conflict (view_id, floor_id) do nothing;
