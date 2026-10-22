// Kanonski domen sajta. Na Vercelu se može pregaziti preko
// NEXT_PUBLIC_SITE_URL (npr. za staging), inače je produkcijski domen.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kvadrat360.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Kvadrat360';

// Kontakt firme na jednom mestu - koriste ga početna strana, podaci za
// Google (JSON-LD) i česta pitanja, da se broj ne promeni na jednom mestu,
// a na drugom ostane stari.
export const CONTACT = {
  phoneDisplay: '+381 64 936 7339',
  phoneE164: '+381649367339',
  email: 'info@kvadrat360.com',
  street: 'Janka Katića 17',
  city: 'Kragujevac',
  countryCode: 'RS',
  hoursDisplay: 'Pon–Sub, 08–20h',
  // Radni dani i vreme u obliku koji Google razume (schema.org).
  openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  opens: '08:00',
  closes: '20:00',
  serviceArea: 'Kragujevac i okolina'
} as const;

// Prva poruka je već upisana u WhatsApp-u, na jeziku strane sa koje se piše.
const WHATSAPP_GREETING = {
  sr: 'Zdravo! Zanima me snimanje 360° ture za nekretninu.',
  en: 'Hi! I’m interested in a 360° tour of a property.'
} as const;

// wa.me radi i bez aplikacije - na računaru otvara WhatsApp Web.
export function whatsappLink(lang: keyof typeof WHATSAPP_GREETING = 'sr'): string {
  return `https://wa.me/${CONTACT.phoneE164.slice(1)}?text=${encodeURIComponent(WHATSAPP_GREETING[lang])}`;
}

// Profili firme (Google Business, društvene mreže) - idu u LocalBusiness
// `sameAs`, da pretraživači i AI alati povežu sajt, Google profil, Facebook
// i Instagram kao istu firmu. Google profil je zapisan preko CID-a (trajan
// link), ne preko kratkog maps.app.goo.gl linka.
export const SOCIAL_PROFILES = [
  'https://maps.google.com/?cid=11854622975870609885',
  'https://www.facebook.com/1313415595190061',
  'https://www.instagram.com/kvadrat.360/'
] as const;
// Autor tekstova na blogu (vlasnik, 22. 10. 2026) - potpis ispod naslova,
// kratko "o autoru" na kraju teksta i `author` u BlogPosting podacima.
export const BLOG_AUTHOR = {
  name: 'Nikola Stojanov',
  jobTitle: 'Osnivač Kvadrat360',
  bio: 'Nikola Stojanov je osnivač Kvadrat360 i lično snima 360° ture nekretnina u Kragujevcu i okolini.'
} as const;

export const CONTACT_LINKS = {
  phone: `tel:${CONTACT.phoneE164}`,
  email: `mailto:${CONTACT.email}`,
  // Otvara razgovor u Viber aplikaciji (telefon ili Viber za računar).
  viber: `viber://chat?number=${encodeURIComponent(CONTACT.phoneE164)}`,
  whatsapp: whatsappLink('sr'),
  map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${CONTACT.street}, ${CONTACT.city}`)}`
} as const;
