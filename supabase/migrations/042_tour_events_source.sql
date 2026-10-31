-- Odakle je posetilac došao u turu (2026-10-31): utm_source iz linka u oglasu
-- (npr. ?utm_source=4zida iz alata "Tekst oglasa") ili domen prethodne strane.
-- Upisuje se uz događaj 'open'; mesečni izveštaj agencije iz toga pravi
-- "Odakle dolaze posetioci". Postojeća tabela - prava se nasleđuju, nove
-- GRANT naredbe nisu potrebne.
alter table public.tour_events add column if not exists source text;
