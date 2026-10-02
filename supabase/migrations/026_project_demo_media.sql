-- ============================================================
-- 026: Novogradnja - prikaz za prezentaciju (sve kartice stana)
-- ============================================================
-- show_all_tabs: kartica stana i strana stana uvek imaju Osnova / 360° tura
-- / 3D osnova / Slike. Šta stan nema, popunjava se demo sadržajem (demo
-- tura, renderi zgrade) ili oznakom „uskoro". Za prezentaciju investitoru;
-- pravi projekti ostaju na false (prikazuje se samo ono što postoji).
-- demo_tour_id: tura koja se prikazuje stanovima bez svoje ture.
--
-- Samo dodavanje kolona. Bezbedno je pokrenuti više puta.

alter table public.projects
  add column if not exists show_all_tabs boolean not null default false,
  add column if not exists demo_tour_id uuid references public.tours(id) on delete set null;

comment on column public.projects.show_all_tabs is 'Prezentacija: sve kartice stana uvek vidljive, prazne popunjene demo sadržajem.';
comment on column public.projects.demo_tour_id is 'Tura za stanove bez svoje ture kad je show_all_tabs (prezentacija).';
