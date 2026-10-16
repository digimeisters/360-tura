-- ============================================================
-- 033: Naselje projekta i učešće u statistici cena novogradnje
-- ============================================================
-- projects.neighborhood: naselje sa iste liste kao procena vrednosti
--   (app/lib/propertyTaxonomy.ts) - po njemu cenovnik projekta ulazi u cene
--   novogradnje za to naselje (app/lib/valuation/projectPrices.ts).
-- projects.include_in_price_stats: investitor može da isključi svoj
--   cenovnik iz statistike (zbirno, bez imena i pojedinačnih stanova).
--   Podrazumevano uključeno (vlasnik, 16. 10. 2026).
-- Bezbedno je pokrenuti više puta.

alter table public.projects
  add column if not exists neighborhood text,
  add column if not exists include_in_price_stats boolean not null default true;

comment on column public.projects.neighborhood is
  'Naselje (lista iz propertyTaxonomy) - za cene novogradnje po naseljima.';
comment on column public.projects.include_in_price_stats is
  'Da li cenovnik projekta ulazi u zbirnu statistiku cena novogradnje (procena, strana cena).';
