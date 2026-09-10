-- ============================================================
-- 005: Analitika - sirovi događaji u turi
-- ============================================================
-- Čuvaju se pojedinačni događaji (a ne samo brojači) da bi se kasnije
-- mogao rekonstruisati put posetioca kroz turu bez ponovnog merenja.
-- Nema ličnih podataka: session_id je nasumičan i živi samo u tabu.
-- Bezbedno je pokrenuti više puta.

create table if not exists public.tour_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tour_slug text not null,
  -- Namerno bez foreign key-a na rooms: brisanje sobe ne sme da obori
  -- upis događaja niti da povuče istoriju sa sobom.
  room_id uuid,
  event_type text not null,
  session_id text not null,
  duration_ms integer,
  lang text,
  constraint tour_events_type_check check (
    event_type in ('open', 'start', 'room_view', 'share', 'contact')
  )
);

create index if not exists tour_events_tour_created_idx
  on public.tour_events (tour_slug, created_at desc);

create index if not exists tour_events_created_idx
  on public.tour_events (created_at desc);

alter table public.tour_events enable row level security;

-- Upis ide isključivo preko /api/track sa service role ključem, koji
-- zaobilazi RLS - zato anon nema nijednu policy. Čitanje ide preko
-- /api/analytics, uz proveru prijavljenog korisnika.
drop policy if exists "Authenticated can read tour events" on public.tour_events;
create policy "Authenticated can read tour events"
  on public.tour_events
  for select
  to authenticated
  using (true);
