-- ============================================================
-- 008: Analitika početne strane (kvadrat360.com)
-- ============================================================
-- Beleži posete početnoj i klikove koji vode ka poslu: primer ture,
-- paketi, poziv / Viber / WhatsApp / mejl i poslat upit. Kao i kod
-- tour_events, nema ličnih podataka: session_id je nasumičan i živi samo
-- u tabu, a od izvora posete čuva se samo domen (npr. google.com) ili
-- utm_source oznaka iz linka kampanje.
-- Bezbedno je pokrenuti više puta.

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  -- Šta je kliknuto, npr. 'hero_tour', 'price_premium', 'viber',
  -- 'tour_card:stan-gasse-1'. Za page_view je prazno.
  target text,
  session_id text not null,
  -- 'mobile' ili 'desktop', po širini ekrana.
  device text,
  -- Odakle je posetilac došao: domen ili utm_source; prazno = direktno.
  source text,
  constraint site_events_type_check check (
    event_type in ('page_view', 'cta_click', 'contact_click', 'form_submit')
  )
);

create index if not exists site_events_created_idx
  on public.site_events (created_at desc);

alter table public.site_events enable row level security;

-- Upis ide isključivo preko /api/track sa service role ključem (zaobilazi
-- RLS), pa anon nema nijednu policy. Čitanje ide preko /api/analytics.
drop policy if exists "Authenticated can read site events" on public.site_events;
create policy "Authenticated can read site events"
  on public.site_events
  for select
  to authenticated
  using (true);
