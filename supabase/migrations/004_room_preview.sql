-- ============================================================
-- 004: Preview slika sobe (za share/OG karticu)
-- ============================================================
-- Panorame su 8000x4000 i 2-8MB, pa se ne mogu koristiti direktno kao
-- thumbnail. Ovde se čuva URL malog 1200x630 isečka oko horizonta koji
-- se generiše pri uploadu panorame.
-- Bezbedno je pokrenuti više puta.

alter table public.rooms
  add column if not exists preview_url text;
