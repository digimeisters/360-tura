-- ============================================================
-- 021: Novogradnja - upiti za prodaju, gradilište, engleski tekst
-- ============================================================
-- project_inquiries: upit za konkretan stan ide i na stranu prodaje
--   investitora (/prodaja/<kod>), ne samo vlasniku na Telegram. Prodaja ga
--   označava kao "javio sam se". Samo server (service role), bez policy-ja.
-- project_progress: gradilište po mesecima - jedna 360° tura po mesecu.
--   Anon vidi samo unose objavljenog projekta.
-- projects.title_en / description_en: engleska strana projekta.
--
-- Bezbedno je pokrenuti više puta.

create table if not exists public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_id uuid references public.project_units(id) on delete set null,
  unit_code text not null,
  name text not null,
  contact text not null,
  message text,
  -- Poslato sa sajta investitora (ugradnja), ne sa kvadrat360.com.
  embedded boolean not null default false,
  lang text not null default 'sr',
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by text
);

create index if not exists project_inquiries_project_idx on public.project_inquiries(project_id, created_at desc);

create table if not exists public.project_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Prvi dan meseca na koji se snimak odnosi.
  month date not null,
  tour_id uuid references public.tours(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (project_id, month)
);

alter table public.projects add column if not exists title_en text;
alter table public.projects add column if not exists description_en text;

alter table public.project_inquiries enable row level security;
alter table public.project_progress enable row level security;

drop policy if exists "Anon reads progress of published projects" on public.project_progress;
create policy "Anon reads progress of published projects"
  on public.project_progress for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.published is true));
