import { SITE_URL, SITE_NAME, CONTACT } from '../lib/site';
import { PRICE_TIERS, PROMO, displayPerProperty, formatAmount, isPromoActive, tierLabel } from '../lib/pricing';
import { BLOG_POSTS } from '../lib/blogPosts';

// Kratak, činjenički opis firme za AI alate (ChatGPT, Google AI Overviews,
// Perplexity...) koji čitaju /llms.txt umesto da nagađaju iz HTML-a.
// Nema stila, nema šale - samo tačni podaci, isti kao u LocalBusiness schema.
// Cene i spisak tekstova čita iz pricing.ts i blogPosts.ts, pa ne zastarevaju.

// Strana se generiše na zahtev, da promocija nestane čim istekne.
export const dynamic = 'force-dynamic';

function pricesSection(): string {
  const rows = PRICE_TIERS.map((tier, i) => {
    const basic = formatAmount(displayPerProperty(tier, 'basic', 'sr'), 'sr');
    const premium = formatAmount(displayPerProperty(tier, 'premium', 'sr'), 'sr');
    return `- ${tierLabel(i)} mesečno: Osnovni ${basic}, Premium ${premium} po nekretnini`;
  }).join('\n');
  const promo = isPromoActive()
    ? `\nUvodna promocija do ${PROMO.endDate.split('-').reverse().map(Number).join('. ')}.: −${Math.round(PROMO.discount * 100)}% na ceo paket (tura + HDR), u oba paketa.`
    : '';
  return `Cena po nekretnini (360° tura + HDR fotografije), redovna, za stan od oko 50 m², po broju nekretnina mesečno:
${rows}
Osnovni: audio vodič na srpskom + jednom jeziku po izboru, isporuka najkasnije za 48h.
Premium: audio vodič na sva 4 jezika, izrada tlocrta, isporuka za 24h.${promo}
Aktuelni cenovnik: ${SITE_URL}/#cenovnik`;
}

function blogSection(): string {
  return [...BLOG_POSTS]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((post) => `- ${post.title}: ${SITE_URL}/blog/${post.slug}`)
    .join('\n');
}

function body(): string {
  return `# ${SITE_NAME}

> Profesionalne 360° virtuelne ture i HDR fotografije nekretnina, za agencije za nekretnine i pojedinačne vlasnike (prodaja, izdavanje, kratkoročni smeštaj) - ${CONTACT.serviceArea}.

Kvadrat360 NIJE agencija za nekretnine i ne posreduje u prodaji ili izdavanju. Isporučuje vizuelni materijal koji agencije i vlasnici koriste u svom oglasu.

## Usluge
- 360° virtuelne ture nekretnina, soba po sobi, sa interaktivnom navigacijom
- HDR fotografisanje nekretnina
- Tekst ture i audio vodič na srpskom, engleskom, nemačkom i ruskom jeziku
- Digitalizacija tlocrta, povezana sa turom
- Isporuka gotove ture za 24-48h (Premium 24h, Osnovni najkasnije 48h): link za deljenje i kod za ugradnju na sajt

## Cene
${pricesSection()}

## Oblast rada
${CONTACT.serviceArea}. Za druge gradove po dogovoru.

## Kontakt
- Telefon: ${CONTACT.phoneDisplay}
- Email: ${CONTACT.email}
- Adresa: ${CONTACT.street}, ${CONTACT.city}
- Radno vreme: ${CONTACT.hoursDisplay}

## Stranice
- Početna: ${SITE_URL}
- Za agencije: ${SITE_URL}/za-agencije
- Za investitore (novogradnja: izbor stana na zgradi, cenovnik, ture stanova): ${SITE_URL}/za-investitore
- Objavljene ture: ${SITE_URL}/ture
- Besplatni alati: ${SITE_URL}/alati
  - Procena vrednosti nekretnine: ${SITE_URL}/alati/procena-vrednosti
  - Cene nekretnina po naseljima u Kragujevcu: ${SITE_URL}/alati/cene-nekretnina-kragujevac
  - Kalkulator kredita i troškova kupovine: ${SITE_URL}/alati/kalkulator-kredita
- Blog: ${SITE_URL}/blog
- English: ${SITE_URL}/en

## Tekstovi na blogu
${blogSection()}
`;
}

export async function GET() {
  return new Response(body(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
