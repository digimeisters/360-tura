-- ============================================================
-- 009: Putanja automatskog vodiča
-- ============================================================
-- Redni brojevi soba (rooms.order_index), odvojeni zarezom, npr.
-- "1,2,3,2,4,2,5" - vodič ide tim redom, a soba se u putanji sme ponoviti
-- (npr. hodnik kao prolaz između grana). Prazno/NULL = tura nema automatskog
-- vodiča; dugme se tada u turi ne prikazuje.
-- Piše se isključivo iz admin panela (TourAdminTools -> "Putanja vodiča"),
-- koji pre čuvanja proverava da između svaka dva uzastopna broja postoji
-- prava tačka za prelaz (vidi app/tour/[slug]/guidePath.ts).
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists guide_path text;
