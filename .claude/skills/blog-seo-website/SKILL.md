---
name: blog-seo-website
description: "Dodaje novi SEO blog post NA SAM SAJT kvadrat360.com (app/blog) - ne meša se sa 'blog-post' skillom, koji piše markdown za spoljni marketinški sadržaj. Koristi se kad korisnik traži novi blog tekst za sajt, novi članak na /blog, ili SEO tekst koji treba da bude uživo na kvadrat360.com."
---

# blog-seo-website — novi blog post na kvadrat360.com

Dodaje jedan novi, publish-ready blog post direktno na sajt (`/blog/[slug]`), sa ispravnom SEO strukturom, schema markup-om i internim linkovima. Ovo NIJE isto što i skill "blog-post" (koji piše .md fajlove za spoljni marketing content) - ovaj skill menja kod ovog repozitorijuma.

## Gde sve živi

- **`app/lib/blogPosts.ts`** - sav sadržaj postova, kao TypeScript objekti (`BLOG_POSTS` niz). Ovde se dodaje novi post - jedan objekat tipa `BlogPost`.
- **`app/blog/page.tsx`** - spisak svih postova, čita automatski iz `BLOG_POSTS`. Ne treba ništa ručno menjati kad se doda post.
- **`app/blog/[slug]/page.tsx`** - renderuje pojedinačni post, generiše metadata i BreadcrumbList + BlogPosting schema automatski iz podataka u `blogPosts.ts`.
- **`app/sitemap.ts`** - automatski uključuje svaki post iz `BLOG_POSTS` (mapira preko `BLOG_POSTS`). Ne treba ručno dodavati url.
- Navigacija (`Blog` link) već postoji na `/`, `/ture` i `/za-agencije` - ne treba ponovo dodavati.

**Znači: da se doda novi post, MENJA SE SAMO `app/lib/blogPosts.ts`** (osim ako post treba nešto posebno, npr. živu cenu - vidi ispod).

## Pre pisanja

Pročitaj `CLAUDE.md` (ton, ciljna publika, pravila) i `keyword-map.md` ako postoji (koja ključna reč je sledeća na redu za blog). Proveri i `MEMORY.md` za trenutno stanje projekta (npr. da li je promocija aktivna, da li se menjao cenovnik).

Ako nije jasno iz zahteva, pitaj:
- Ciljna ključna reč ili tema
- Da li post cilja lokalno tržište (grad) ili je opštije informativan

## Oblik podataka (`BlogPost` tip u `blogPosts.ts`)

```ts
{
  slug: 'kebab-case-slug',
  title: 'Naslov sa ključnom reči',
  description: 'Meta opis, 150-160 karaktera.',
  excerpt: 'Kratak rezime za /blog spisak, 1-2 rečenice.',
  publishedAt: 'YYYY-MM-DD',
  sections: [ /* niz BlogSection */ ],
  relatedLinks: [ { href: '/', label: '...' }, { href: '/za-agencije', label: '...' } ]
}
```

Svaki `BlogSection` može imati (kombinuj po potrebi, ne moraju sva polja):
- `heading?` - H2 podnaslov
- `paragraphs` - niz pasusa (kratki, 2-4 rečenice)
- `bullets?` - obična nabrajajuća lista (kad god se u tekstu nabraja 3+ stavke)
- `list?` - definiciona lista `{ term, text }[]` (termin + objašnjenje, renderuje se kao `<dl>`)
- `variant: 'callout'` - izdvojen okvir (koristi se za "Ukratko" sekciju)

## Struktura teksta (isto pravilo za svaki novi post)

1. **Naslov** sa ključnom reči prirodno uklopljenom.
2. **Excerpt/lede** - jasno kaže o čemu je tekst i zašto da čitalac ostane.
3. **Uvodni pasus(i)** - konkretan problem ili scenario, nikad generično uvodno "U današnje vreme...".
4. **"Ukratko" callout odmah posle uvoda** - 2-4 bulleta, glavna poenta teksta u pilulama. Obavezno za svaki novi post.
5. **Oštri, specifični H2 podnaslovi** - ne uopšteni. Gde prirodno ide, ubaci grad (Kragujevac) ili konkretnu situaciju direktno u podnaslov.
6. **Bullet liste umesto zbijenih nabrajanja** - čim se u rečenici nabraja 3+ stavke, razbij u `bullets`.
7. **Interni linkovi na kraju** (`relatedLinks`) - uvek bar jedan ka `/` ili `/#cenovnik` (pojedinačni vlasnici) i jedan ka `/za-agencije` (agencije), formulisani kao pitanje/poziv, ne goli link.
8. **Lektura pre čuvanja** - proveri slaganje roda/broja (čest problem: "dnevna soba" ž.r. vs "dnevni boravak" m.r. - ne mešati pridev jednog sa imenicom drugog) i dosledno glagolsko vreme.

## Ako post treba da prikaže cenu

Ne piši cenu kao statičan tekst - cene i promocije se menjaju (`app/lib/pricing.ts`), pa bi post zastareo. Umesto toga:
1. U `app/blog/[slug]/page.tsx` postoji primer uslovnog renderovanja `<BlogPricingSnapshot />` po slug-u (vidi `koliko-kosta-fotografisanje-nekretnine-za-oglas`) - dodaj isti `if (slug === '...')` blok za novi post ako mu treba cenovni pregled.
2. `components/BlogPricingSnapshot.tsx` povlači cene uživo iz `pricing.ts` preko `ItemPrice` komponente - nikad ne kucaj cenu ručno u `blogPosts.ts`.

## Posle pisanja - obavezno

1. `npx tsc --noEmit -p tsconfig.json` - nula grešaka.
2. `npm run build` - mora da prođe čisto, i novi post mora da se pojavi u listi ruta kao SSG (`● /blog/<slug>`).
3. Pokreni dev server (ili proveri postojeći na :3000) i vizuelno pogledaj `/blog` i `/blog/<slug>` - schema markup, "Ukratko" okvir, bullet liste.
4. Pokaži korisniku lokalni link i sačekaj potvrdu sadržaja.
5. **Nikad ne radi `git commit`/`git push` bez eksplicitnog "pushuj"** od korisnika - ovo važi za ceo projekat, ne samo za blog.

## Ovaj skill se dograđuje

Kad korisnik da povratnu informaciju o tonu, strukturi ili nečemu što treba drugačije - zabeleži to ovde, u odgovarajućoj sekciji, da se sledeći post automatski piše po novom pravilu.
