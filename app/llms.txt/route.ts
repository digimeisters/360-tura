import { SITE_URL, SITE_NAME, CONTACT } from '../lib/site';

// Kratak, činjenički opis firme za AI alate (ChatGPT, Google AI Overviews,
// Perplexity...) koji čitaju /llms.txt umesto da nagađaju iz HTML-a.
// Nema stila, nema šale - samo tačni podaci, isti kao u LocalBusiness schema.
function body(): string {
  return `# ${SITE_NAME}

> Profesionalne 360° virtuelne ture i HDR fotografije nekretnina, za agencije za nekretnine i pojedinačne vlasnike (prodaja, izdavanje, kratkoročni smeštaj) - ${CONTACT.serviceArea}.

Kvadrat360 NIJE agencija za nekretnine i ne posreduje u prodaji ili izdavanju. Isporučuje vizuelni materijal koji agencije i vlasnici koriste u svom oglasu.

## Usluge
- 360° virtuelne ture nekretnina, soba po sobi, sa interaktivnom navigacijom
- HDR fotografisanje nekretnina
- Tekst ture i audio vodič na srpskom, engleskom, nemačkom i ruskom jeziku
- Digitalizacija tlocrta, povezana sa turom
- Isporuka gotove ture za 48h: link za deljenje i kod za ugradnju na sajt

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
- Objavljene ture: ${SITE_URL}/ture
`;
}

export async function GET() {
  return new Response(body(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
