-- ============================================================
-- 011: Grad nekretnine - filter na javnom spisku tura (/ture)
-- ============================================================
-- Do sada se grad pogađao iz adrese (deo posle poslednjeg zareza), pa je
-- ispadao pogrešan čim agent napiše adresu drugačije: bez zareza, obrnutim
-- redom ili sa poštanskim brojem na kraju. Sada je grad zasebno polje:
-- agent ga upisuje u upitniku (/unos), AI ga sređuje, a /ture po njemu
-- pravi filter. Ture bez upisanog grada i dalje padaju na staro izvlačenje
-- iz adrese, pa ništa ne prestaje da radi.
--
-- Bezbedno je pokrenuti više puta.

alter table public.tours
  add column if not exists city text;

-- Zatečene ture: grad iz adrese, ali samo kad je očigledan - deo posle
-- poslednjeg zareza koji nema nijednu cifru (broj ulice ili poštanski broj
-- nije grad). Ostale ostaju prazne i popunjavaju se ručno u /admin/ture.
update public.tours
   set city = trim(regexp_replace(address, '^.*,\s*', ''))
 where city is null
   and address like '%,%'
   and trim(regexp_replace(address, '^.*,\s*', '')) !~ '[0-9]'
   and trim(regexp_replace(address, '^.*,\s*', '')) <> '';

comment on column public.tours.city is
  'Samo naziv grada ("Kragujevac"), bez ulice i poštanskog broja - filter na /ture grupiše ture po ovoj koloni, pa mora da bude isto napisan za sve ture istog grada. Prazno = tura se ne pojavljuje u filteru po gradu.';
