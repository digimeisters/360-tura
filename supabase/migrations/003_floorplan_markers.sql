-- ============================================================
-- 003: Koordinate markera na tlocrtu (interaktivna skica)
-- ============================================================
-- Vrednosti su procenti (0-100) u odnosu na dimenzije slike tlocrta, pa
-- marker ostaje na mestu bez obzira na veličinu prikaza.
-- Bezbedno je pokrenuti više puta.

alter table public.rooms
  add column if not exists floorplan_x double precision,
  add column if not exists floorplan_y double precision;
