-- ============================================================
-- 017: Terasa, parking, depozit i uknjiženost u tabeli činjenica
-- ============================================================
-- Isto pravilo kao migracije 014/015: agent bira sa zatvorene liste u
-- upitniku (/unos) ili u /admin/ture, aplikacija prevodi statičkim
-- rečnikom (TERRACE_LABELS, PARKING_LABELS, DEPOSIT_LABELS,
-- REGISTRATION_LABELS u app/tour/[slug]/translations.ts), AI ne dodiruje
-- nijedno od ovih polja.
--
-- Depozit ima smisla samo za izdavanje, uknjiženost samo za prodaju -
-- kolone su ipak zajedničke, prazno = red se ne prikazuje.
--
-- Zatečene ture ostaju prazne i popunjavaju se u /admin/ture.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists terrace text,
  add column if not exists parking text,
  add column if not exists deposit text,
  add column if not exists registration text;

comment on column public.tours.terrace is
  'Spoljni prostor, sa zatvorene liste (TERRACE_OPTIONS u app/lib/propertyTaxonomy.ts) - "Terasa", "Balkon", "Lođa", "Francuski balkon" ili "Nema". Prazno = red se ne prikazuje.';

comment on column public.tours.parking is
  'Parking, sa zatvorene liste (PARKING_OPTIONS) - "Garaža", "Parking mesto", "Ulični parking" ili "Nema". Prazno = red se ne prikazuje.';

comment on column public.tours.deposit is
  'Depozit kod izdavanja, sa zatvorene liste (DEPOSIT_OPTIONS) - "Bez depozita", "Jedna kirija", "Dve kirije" ili "Tri kirije". Prazno = red se ne prikazuje.';

comment on column public.tours.registration is
  'Uknjiženost kod prodaje, sa zatvorene liste (REGISTRATION_OPTIONS) - "Da", "Ne" ili "U procesu". Prazno = red se ne prikazuje.';
