import { CONTACT, SITE_NAME, SITE_URL } from './site';
import { PRICE_TIERS, formatPrice } from './pricing';
import type { FaqItem } from './homeFaq';
import type { HomeLang } from './homeCopy';

const BUSINESS_DESCRIPTION: Record<HomeLang, string> = {
  sr: 'Profesionalne 360° virtuelne ture i HDR fotografije nekretnina za agencije i vlasnike, sa audio vodičem na srpskom, engleskom, nemačkom i ruskom.',
  en: 'Professional 360° virtual tours and HDR real estate photography for agencies and owners, with an audio guide in Serbian, English, German and Russian.'
};

// Podaci o firmi u obliku koji pretraživači čitaju (schema.org JSON-LD):
// ko smo, gde smo, kad radimo i koja pitanja kupci najčešće postavljaju.
// Proveriti posle izmene: https://search.google.com/test/rich-results
export function homeJsonLd(faq: readonly FaqItem[], lang: HomeLang = 'sr') {
  const businessId = `${SITE_URL}/#business`;
  const pageUrl = lang === 'sr' ? SITE_URL : `${SITE_URL}/${lang}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['sr', 'en'],
        publisher: { '@id': businessId }
      },
      {
        '@type': 'LocalBusiness',
        '@id': businessId,
        name: SITE_NAME,
        description: BUSINESS_DESCRIPTION[lang],
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image`,
        telephone: CONTACT.phoneE164,
        email: CONTACT.email,
        // Bio je hardkodiran (60€, stara cena) - sad čita ulaznu cenu same
        // ture (1-2 nekretnine, Osnovni paket) direktno iz pricing.ts.
        // Dinari na srpskoj strani, evri na engleskoj - vidi formatPrice.
        priceRange:
          lang === 'sr'
            ? `od ${formatPrice(PRICE_TIERS[0].tour, 'sr')}`
            : `from €${PRICE_TIERS[0].tour}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: CONTACT.street,
          addressLocality: CONTACT.city,
          addressCountry: CONTACT.countryCode
        },
        areaServed: [
          { '@type': 'City', name: CONTACT.city },
          { '@type': 'AdministrativeArea', name: 'Šumadijski okrug' }
        ],
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: CONTACT.openDays,
            opens: CONTACT.opens,
            closes: CONTACT.closes
          }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#pitanja`,
        url: pageUrl,
        inLanguage: lang,
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

// "<" se menja da tekst iz podataka ne bi mogao da zatvori <script> tag.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// Structured data za pojedinačnu turu (/tour/[slug]) - do sada te stranice
// nisu imale nijedan JSON-LD blok. BreadcrumbList vezuje turu za sajt u
// Google-ovim rezultatima, a 3DModel je schema.org tip koji najbliže opisuje
// interaktivnu 360° turu (nema posebnog tipa "virtual tour").
export function tourJsonLd(params: {
  title: string;
  description: string;
  url: string;
  previewUrl: string | null;
  address: string | null;
}) {
  const { title, description, url, previewUrl, address } = params;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Ture', item: `${SITE_URL}/ture` },
          { '@type': 'ListItem', position: 3, name: title, item: url }
        ]
      },
      {
        '@type': '3DModel',
        name: title,
        description,
        url,
        ...(previewUrl ? { image: previewUrl } : {}),
        ...(address ? { contentLocation: { '@type': 'Place', address } } : {}),
        provider: {
          '@type': 'LocalBusiness',
          name: SITE_NAME,
          url: SITE_URL,
          telephone: CONTACT.phoneE164
        }
      }
    ]
  };
}
