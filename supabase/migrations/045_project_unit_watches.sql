-- "Obavesti me" (2026-11-01, maketa public/mockup/ObavestiMe.html): kupac na
-- kartici rezervisanog ili prodatog stana ostavi mejl, a kad se stan (ili
-- sličan, iste strukture) oslobodi, mejl mu ode sam (app/lib/unitWatch.ts).
-- Pišu i čitaju samo serverske rute (service_role); javnih prava nema.

create table if not exists public.project_unit_watches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_id uuid references public.project_units(id) on delete set null,
  unit_code text not null,
  -- Struktura stana u trenutku upisa; "sličan" = ista struktura.
  structure text,
  or_similar boolean not null default false,
  email text not null,
  phone text,
  lang text not null default 'sr' check (lang in ('sr', 'en')),
  embedded boolean not null default false,
  -- Oznake stanova o kojima je kupac već obavešten (ne javlja se dvaput).
  notified_codes text[] not null default '{}',
  last_mail_at timestamptz,
  unsubscribed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now()
);

-- Isti mejl za isti stan je jedna prijava (ponovni upis je samo produži).
create unique index if not exists project_unit_watches_unique on public.project_unit_watches (project_id, unit_code, lower(email));
create index if not exists project_unit_watches_project on public.project_unit_watches (project_id) where unsubscribed_at is null;

-- Svaki poslat mejl (za mesečni izveštaj: "Obavešteno ovog meseca").
create table if not exists public.project_watch_mails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  watch_id uuid references public.project_unit_watches(id) on delete set null,
  unit_codes text[] not null,
  sent_at timestamptz not null default now()
);
create index if not exists project_watch_mails_project on public.project_watch_mails (project_id, sent_at);

alter table public.project_unit_watches enable row level security;
alter table public.project_watch_mails enable row level security;

revoke all on public.project_unit_watches from anon, authenticated;
revoke all on public.project_watch_mails from anon, authenticated;
grant select, insert, update, delete on public.project_unit_watches to service_role;
grant select, insert, update, delete on public.project_watch_mails to service_role;
