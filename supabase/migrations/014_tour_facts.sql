-- ============================================================
-- 014: Osnovne činjenice o nekretnini - tabela u Info modalu ture
-- ============================================================
-- Info modal je do sada bio jedan pasus koji AI sastavlja iz slobodnog
-- opisa - dugačak i, kad agent ne napiše dovoljno, nepouzdan. Zamenjuje ga
-- kratka tabela činjenica (sprat, lift, podrum, grejanje - uz već postojeće
-- naselje i kvadraturu iz migracija 012/013), koju agent bira ili kuca u
-- upitniku, BEZ AI obrade.
--
-- Namerno bez i18n kolona: sprat je broj, lift/podrum su da/ne, grejanje je
-- sa zatvorene liste (vidi app/lib/propertyTaxonomy.ts HEATING_OPTIONS) -
-- turu prevodi sama aplikacija, statičkim rečnikom
-- (app/tour/[slug]/translations.ts), isto kao "Prodaja/Izdavanje/Smeštaj".
-- Ni jedna od ovih vrednosti se ne šalje AI-ju na prevod.
--
-- Zatečene ture ostaju prazne i popunjavaju se u /admin/ture. Prazno polje
-- se u tabeli činjenica prosto ne prikazuje kao red.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists floor text,
  add column if not exists has_elevator text,
  add column if not exists has_basement text,
  add column if not exists heating text;

comment on column public.tours.floor is
  'Sprat, slobodan tekst ("3/6", "Prizemlje", "Potkrovlje") - red u tabeli činjenica (Info modal ture). Prazno = red se ne prikazuje.';

comment on column public.tours.has_elevator is
  'Lift - "Da" ili "Ne". Upitnik namerno ne nudi podrazumevanu vrednost (za razliku od Grejanja): pogrešan da/ne podatak je gori od praznog.';

comment on column public.tours.has_basement is
  'Podrum - "Da" ili "Ne". Isto pravilo kao has_elevator - bez podrazumevane vrednosti u upitniku.';

comment on column public.tours.heating is
  'Grejanje, sa zatvorene liste (vidi HEATING_OPTIONS u app/lib/propertyTaxonomy.ts) - "Centralno grejanje", "Gas", "Struja", "Klima", "Čvrsto gorivo" ili "Podno grejanje". Turu prevodi statički rečnik u aplikaciji, ne AI.';
