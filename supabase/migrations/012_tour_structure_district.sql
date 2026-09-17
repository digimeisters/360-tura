-- ============================================================
-- 012: Struktura i naselje - filteri na javnom spisku tura (/ture)
-- ============================================================
-- Do sada se nekretnina opisivala samo tipom ("Stan") i gradom, pa se na
-- /ture nije moglo izabrati ni "dvosoban" ni "Aerodrom" - a to su prve dve
-- stvari po kojima domaći kupac traži. Oba podatka agent sada bira iz
-- zatvorenog menija u upitniku (/unos), pa se pišu isto za sve ture i mogu
-- da posluže kao filter.
--
-- Namerno su odvojene kolone, a ne deo slobodnog `property_type`: filter
-- grupiše ture po tačnom tekstu, pa bi "Stan - dvosoban (2.0)" i
-- "dvosoban stan" ispali kao dve različite stavke.
--
-- Zatečene ture ostaju prazne - nastale su pre nego što su ova pitanja
-- postojala, pa se popunjavaju ručno u /admin/ture. Tura bez upisane
-- vrednosti se prosto ne pojavljuje u tom filteru.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists structure text,
  add column if not exists district text;

comment on column public.tours.structure is
  'Struktura nekretnine iz zatvorene liste u upitniku ("Dvosoban (2.0)", "Spratna (Pr+1)", "Ugostiteljski (HoReCa)") - vidi app/lib/propertyTaxonomy.ts. Filter na /ture grupiše ture po ovoj koloni, pa mora da bude isto napisana za sve ture iste strukture. Prazno = tura se ne pojavljuje u filteru po strukturi.';

comment on column public.tours.district is
  'Naselje ili deo grada ("Aerodrom", "Šumarice") - vidi NEIGHBOURHOODS u app/lib/propertyTaxonomy.ts. NIJE grad: grad stoji u koloni city. Prazno = tura se ne pojavljuje u filteru po naselju.';
