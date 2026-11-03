-- Napomene za AI popunu soba: ono što vlasnik zna, a na panorami se ne vidi
-- ("renovirano 2023", "klima ostaje"). Posebna tabela, ne kolona u tours,
-- jer je tours javno čitljiva. Čita je AI ruta i admin ruta (service role);
-- prijavljen nalog samo ako je u app_admins (isti obrazac kao 028/036).

create table if not exists public.tour_ai_notes (
  tour_slug text primary key references public.tours(slug) on update cascade on delete cascade,
  notes text not null default '',
  room_notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.tour_ai_notes is 'Interne napomene za AI popunu soba (cela tura + po sobi). Nisu javne.';

alter table public.tour_ai_notes enable row level security;

drop policy if exists "Admins manage ai notes" on public.tour_ai_notes;
create policy "Admins manage ai notes"
  on public.tour_ai_notes for all
  to authenticated
  using (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.app_admins a where a.email = auth.jwt() ->> 'email'));

grant select, insert, update, delete on public.tour_ai_notes to authenticated;
grant select, insert, update, delete on public.tour_ai_notes to service_role;
