-- "Pozovite me za snimanje" posle procene vrednosti (2026-10-31): vlasnik
-- jednim klikom traži poziv za 360° turu. Zahtev ide na vrh spiska u adminu
-- (Procene). Postojeća tabela - prava se nasleđuju, nove GRANT naredbe nisu potrebne.
alter table public.property_valuation_leads
  add column if not exists callback_requested_at timestamptz;
