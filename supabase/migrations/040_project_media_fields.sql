-- Strana projekta, faza 3 (spec 2026-10-25, odeljak 3): opis i video stana,
-- 3D render i video projekta. Sve je javni sadržaj strane projekta, pa stoji
-- na postojećim tabelama (postojeći GRANT-ovi i RLS važe i za nove kolone).
-- Prazno (null) = ne prikazuje se.

alter table public.project_units add column if not exists description text;
alter table public.project_units add column if not exists description_en text;
alter table public.project_units add column if not exists video_url text;

alter table public.project_units drop constraint if exists project_units_description_len;
alter table public.project_units add constraint project_units_description_len
  check (description is null or char_length(description) <= 600);
alter table public.project_units drop constraint if exists project_units_description_en_len;
alter table public.project_units add constraint project_units_description_en_len
  check (description_en is null or char_length(description_en) <= 600);

alter table public.projects add column if not exists render_url text;
alter table public.projects add column if not exists video_url text;
