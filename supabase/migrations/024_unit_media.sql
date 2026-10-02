-- ============================================================
-- 024: Novogradnja - osnova stana, 3D osnova, slike, prostorije
-- ============================================================
-- Kartica stana kao kod velikih prodajnih sajtova (vlasnik, 2. 10. 2026,
-- primer 3d.sokolis.rs): kartice Osnova / 360° tura / 3D osnova / Slike,
-- tabela kvadrature po prostorijama i PDF letak stana.
--
-- Javni podaci (vide se kupcu), pa stoje na project_units - za razliku od
-- beleški prodaje (project_notes, migracija 023).
--   plan_url   - osnova STANA (ne sprata), slika sa R2
--   plan3d_url - 3D osnova (render odozgo), slika sa R2
--   photos     - slike stana: ["url", ...]
--   rooms      - prostorije: [{"name": "Dnevna soba", "m2": 28.44}, ...]
--
-- Bezbedno je pokrenuti više puta.

alter table public.project_units add column if not exists plan_url text;
alter table public.project_units add column if not exists plan3d_url text;
alter table public.project_units add column if not exists photos jsonb;
alter table public.project_units add column if not exists rooms jsonb;
