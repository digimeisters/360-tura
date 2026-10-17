-- ============================================================
-- 034: Logo investitora na strani projekta i PDF letku
-- ============================================================
-- projects.logo_url: logo investitora (R2/CDN, projekti/<id>/logo-...).
--   Stoji gore levo na strani projekta i stanova umesto znaka Kvadrat360 i
--   iznad naziva stana na PDF letku (vlasnik, 17. 10. 2026). Null = kao do
--   sada (znak Kvadrat360, investitor tekstom).
-- projects.logo_dark: logo je svetao (npr. beo) i treba mu tamna podloga.
-- Bezbedno je pokrenuti više puta.

alter table public.projects
  add column if not exists logo_url text,
  add column if not exists logo_dark boolean not null default false;

comment on column public.projects.logo_url is 'Logo investitora - zaglavlje strane projekta/stana i PDF letak.';
comment on column public.projects.logo_dark is 'Svetao logo - prikazuje se na tamnoj podlozi.';
