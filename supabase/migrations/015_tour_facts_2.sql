-- ============================================================
-- 015: Status gradnje i stanje - još dva reda u tabeli činjenica
-- ============================================================
-- Isto pravilo kao migracija 014: agent bira sa zatvorene liste u
-- upitniku, aplikacija prevodi statičkim rečnikom (BUILD_STATUS_LABELS,
-- FINISH_STATUS_LABELS u app/tour/[slug]/translations.ts), AI ne dodiruje
-- nijedno od ova dva polja.
--
-- Status gradnje ("Novogradnja") i stanje enterijera ("Siva faza") su
-- nezavisni - novogradnja ume da bude u sivoj fazi, starogradnja ume da
-- bude potpuno nameštena. Ranije je postojalo samo jedno spojeno polje
-- "Stanje objekta" (Novogradnja/Starogradnja/Renoviran/Siva gradnja), i
-- samo za Prodaju - zamenjuju ga ova dva, dostupna za sve vrste oglasa.
--
-- Zatečene ture (i one koje su ranije imale staro "Stanje objekta") ostaju
-- prazne za oba nova polja i popunjavaju se u /admin/ture.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists build_status text,
  add column if not exists finish_status text;

comment on column public.tours.build_status is
  'Status gradnje, sa zatvorene liste (BUILD_STATUS_OPTIONS u app/lib/propertyTaxonomy.ts) - "Novogradnja", "Starogradnja" ili "Starogradnja - renovirano". Red u tabeli činjenica (Info modal ture), prevodi ga aplikacija, ne AI. Prazno = red se ne prikazuje.';

comment on column public.tours.finish_status is
  'Stanje enterijera, sa zatvorene liste (FINISH_STATUS_OPTIONS) - "Siva faza", "Polunamešteno" ili "Namešteno". Nezavisno od build_status. Prazno = red se ne prikazuje.';
