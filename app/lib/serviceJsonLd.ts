import { PROMO, REFERENCE_AREA_SQM, displayPackagePrice, isPromoActive, type PackageType } from './pricing.ts';
import { CONTACT, SITE_NAME, SITE_URL } from './site.ts';

// Usluga sa dva paketa (schema.org Service + OfferCatalog) za /cenovnik i
// /za-vlasnike. Cene se računaju iz pricing.ts u trenutku renderovanja
// (strane imaju revalidate 3600), pa posle kraja promocije same pređu na
// redovnu cenu. Google za uslugu nema poseban prikaz u pretrazi; ovo služi
// da Google i AI pretraga tačno pročitaju šta prodajemo, gde i po kojoj ceni.
// Proveriti posle izmene: https://validator.schema.org/

const PRICING_URL = `${SITE_URL}/cenovnik`;

const PACKAGES: { type: PackageType; name: string; description: string }[] = [
  {
    type: 'basic',
    name: 'Osnovni',
    description:
      '360° tura kroz sve prostorije, HDR fotografija svake prostorije i audio vodič na srpskom + jednom jeziku po izboru (EN, DE ili RU).'
  },
  {
    type: 'premium',
    name: 'Premium',
    description:
      'Sve iz Osnovnog, plus audio vodič na sva 4 jezika (SR, EN, DE, RU), izrada tlocrta, QR kod i kratak video iz ture.'
  }
];

export function packagesJsonLd(now: Date = new Date()) {
  const promo = isPromoActive(now);
  return {
    '@type': 'Service',
    '@id': `${PRICING_URL}#usluga`,
    name: '360° virtuelna tura i HDR fotografije nekretnine',
    serviceType: '360° virtuelna tura nekretnine',
    url: PRICING_URL,
    provider: { '@id': `${SITE_URL}/#business` },
    areaServed: { '@type': 'City', name: CONTACT.city },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Paketi',
      itemListElement: PACKAGES.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        description: `${p.description} Cena po nekretnini od oko ${REFERENCE_AREA_SQM} m².`,
        price: displayPackagePrice(1, p.type, 'sr', promo),
        priceCurrency: 'RSD',
        // Rok samo dok traje promocija - posle njega važi redovna cena bez roka.
        ...(promo ? { priceValidUntil: PROMO.endDate } : {}),
        url: PRICING_URL
      }))
    }
  };
}

/** Putanja strane za Google: Kvadrat360 > naziv strane. */
export function breadcrumbJsonLd(name: string, path: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` }
    ]
  };
}
