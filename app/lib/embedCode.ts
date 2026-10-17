import { SITE_URL } from './site';

/**
 * Gotov <iframe> kod za ugradnju ture na sajt agencije (obećano na sajtu i
 * u ponudama). Isti kod kopira dugme "Iframe" u adminu i šalje mejl "Vaša
 * tura je gotova". `allow` sa senzorima je bitan: bez njega bi žiroskop i
 * ceo ekran ćutali kad je tura ugrađena na TUĐEM domenu, jer pregledač po
 * difoltu ne prosleđuje te dozvole u iframe.
 */
export function embedSnippet(slug: string): string {
  const url = `${SITE_URL}/tour/${slug}`;
  return `<iframe src="${url}" width="100%" height="600" style="border:0;border-radius:12px;overflow:hidden" allow="fullscreen; accelerometer; gyroscope; magnetometer" allowfullscreen loading="lazy"></iframe>`;
}
