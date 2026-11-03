import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import HeroTour from '../../components/HeroTour';
import PricingShort from '../../components/PricingShort';
import PromoTopBar from '../../components/PromoTopBar';
import SiteReveal from '../../components/SiteReveal';
import SiteStylesheets from '../../components/SiteStylesheets';
import SiteTracker from '../../components/SiteTracker';
import TourStory from '../../components/TourStory';
import { VALUATION_HREF } from '../alati/toolsNav';
import { accent, plainAccent } from '../lib/accent';
import { preloadHeroImage } from '../lib/heroPreload';
import { HOME_COPY } from '../lib/homeCopy';
import { HOME_FAQ } from '../lib/homeFaq';
import { getShowcaseTours, HOME_CITY, localToursFirst, pickHeroTour } from '../lib/showcaseTours';
import { CONTACT, CONTACT_LINKS, SITE_NAME, SITE_URL, whatsappLink } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { getStoryData } from '../lib/tourStory';

/**
 * Za vlasnike (/za-vlasnike) - strana za vlasnika koji sam prodaje ili
 * izdaje nekretninu (vlasnik, 3. 11. 2026; maketa public/mockup/Faza3.html).
 * Agencije i investitori već imaju svoje strane; "Za vlasnike" je do sada
 * vodilo na sredinu početne.
 *
 *   vrh (prava tura) -> oglas sa slikama / sa turom -> priča "Od tlocrta do
 *   ture" (preseljena sa početne) -> vaš deo posla -> cena ukratko ->
 *   procena vrednosti -> pitanja -> kontakt.
 *
 * Pitanja su ista kao na početnoj (homeFaq.ts, biraju se po tekstu pitanja),
 * a cena je ista sekcija kao na početnoj (PricingShort) - ništa se ne kopira.
 */

const PATH = '/za-vlasnike';
const home = HOME_COPY.sr;
const { nav, contact } = home;

const COPY = {
  meta: {
    title: '360° tura za prodaju i izdavanje nekretnine | Kvadrat360',
    description:
      'Prodajete ili izdajete nekretninu? 360° tura i HDR fotografije: kupac prošeta kroz svaku prostoriju pre poziva, a vama se javljaju oni koje nekretnina zaista zanima.'
  },
  hero: {
    // Plava fraza je kratka: u vrhu se ne lomi (nowrap), a duža je na telefonu izlazila van pločice.
    titleStart: 'Prodajete ili izdajete? Kupac prošeta ',
    titleEm: 'pre poziva.',
    lede: '360° tura i HDR fotografije vaše nekretnine. Javljaju vam se oni koje nekretnina zaista zanima, a ne svako ko je video oglas.',
    book: 'Zakažite snimanje',
    tour: 'Pogledajte primer ture',
    trust: ['Snimanje 30–60 min', 'Tura za 24–48h']
  },
  compare: {
    eyebrow: 'Razlika',
    title: 'Isti oglas, *drugačiji telefon*',
    without: {
      title: 'Oglas samo sa slikama',
      rows: [
        { title: 'Ista pitanja svaki dan', text: '„Koji je sprat?“, „Ima li lift?“, „Kakvo je grejanje?“' },
        { title: 'Razgledanje od pet minuta', text: 'Dođu, pogledaju i kažu „nije za nas“. Vi ste odvojili subotu.' },
        { title: 'Kupac iz drugog grada odustaje', text: 'Ne isplati mu se put samo da bi video raspored.' }
      ]
    },
    with: {
      title: 'Oglas sa 360° turom',
      rows: [
        { title: 'Odgovori su već u turi', text: 'Sprat, grejanje, uknjiženost i lokacija, na jednom mestu.' },
        { title: 'Dolaze oni kojima se dopala', text: 'Prošetali su kroz svaku prostoriju pre nego što su vas pozvali.' },
        { title: 'Razgleda i iz Beograda ili Niša', text: 'Sa telefona, uz audio vodiča kroz svaku prostoriju.' }
      ]
    }
  },
  steps: {
    eyebrow: 'Kako radimo',
    title: 'Vaš deo je *jedan sat*',
    items: [
      { title: 'Zakažete termin', text: 'Telefonom, porukom ili preko forme. Dogovorimo dan koji vama odgovara.' },
      { title: 'Otvorite vrata', text: 'Snimanje traje 30–60 minuta. Za to vreme u prostoriji ne treba da bude nikoga.' },
      { title: 'Dobijete link', text: 'Za 24–48h stižu tura i HDR fotografije. Link ubacite u oglas ili pošaljete kupcu porukom.' }
    ],
    prepLead: 'Pre snimanja:',
    prep: 'upalite svetla, razgrnite zavese i sklonite lične stvari. To je sve.'
  },
  price: {
    eyebrow: 'Cena',
    title: 'Za jednu nekretninu, *tura i fotografije*',
    note: 'Cena je za prostor od oko 50 m². Za veći ili manji javite broj soba, pa šaljemo tačnu ponudu.'
  },
  valuation: {
    title: 'Ne znate koliku cenu da tražite?',
    text: 'Besplatna procena prodajne cene ili kirije po naselju u Kragujevcu, bez registracije.',
    cta: 'Procenite nekretninu'
  },
  faq: {
    eyebrow: 'Pitanja',
    title: 'Pitanja *vlasnika*',
    note: 'Ako vašeg pitanja nema, javite nam se.'
  }
};

// Pitanja sa početne koja vlasnik postavlja - isti tekst, bez kopije.
const FAQ_QUESTIONS = [
  'Da li neko mora da bude prisutan tokom snimanja?',
  'Kako da postavim turu na oglas?',
  'Mora li kupac da zna da se snalazi u 360° turi?',
  'Koliko dugo je tura dostupna online?',
  'Šta ako se nešto u prostoru promeni posle snimanja?'
];
const FAQ = FAQ_QUESTIONS.map((q) => HOME_FAQ.sr.find((item) => item.question === q)).filter(
  (item): item is (typeof HOME_FAQ.sr)[number] => Boolean(item)
);

// Tura u vrhu prati objavljene ture, kao na početnoj.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: COPY.meta.title },
  description: COPY.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: COPY.meta.title,
    description: COPY.meta.description,
    locale: 'sr_RS'
  }
};

function jsonLd() {
  const pageUrl = `${SITE_URL}${PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: COPY.meta.title,
        description: COPY.meta.description,
        inLanguage: 'sr',
        isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME },
        about: { '@id': `${SITE_URL}/#business` }
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#pitanja`,
        url: pageUrl,
        inLanguage: 'sr',
        name: plainAccent(COPY.faq.title),
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

const STYLES = `
  /* Oglas sa slikama / sa turom: levo sivo, desno tamno (kao "Nedelja" na /za-agencije). */
  .ow-vs{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.4rem;}
  @media (max-width:880px){ .ow-vs{grid-template-columns:1fr;} }
  .ow-side{border-radius:30px; padding:clamp(1.4rem,3vw,2.3rem); background:color-mix(in srgb, var(--surface-2) 70%, var(--line-strong));}
  .ow-side.is-dark{background:#111113; box-shadow:0 30px 60px -20px rgba(17,17,19,.4);}
  .ow-side h3{font-size:1.4rem; color:var(--ink-soft);}
  .ow-side.is-dark h3{color:#FFFFFF;}
  .ow-rows{display:flex; flex-direction:column; gap:.8rem; margin-top:1.4rem;}
  .ow-row{background:var(--surface); border-radius:18px; padding:1rem 1.2rem;}
  .ow-side.is-dark .ow-row{background:#1C1C20; border:1px solid #2A2A30;}
  .ow-row strong{display:block; font-weight:600; line-height:1.4;}
  .ow-side.is-dark .ow-row strong{color:#FFFFFF;}
  .ow-row span{display:block; font-size:.95rem; color:var(--ink-soft); margin-top:.25rem; line-height:1.5;}
  .ow-side.is-dark .ow-row span{color:#A8A8B0;}

  .ow-steps{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem;}
  @media (max-width:820px){ .ow-steps{grid-template-columns:1fr;} }
  .ow-steps .step{box-shadow:none;}
  .ow-prep{margin-top:1rem; background:var(--accent-soft, #E9EFF6); border-radius:18px; padding:1rem 1.3rem; line-height:1.55;}

  .ow-tool{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem 2rem; padding:clamp(1.3rem,3vw,1.9rem); box-shadow:none;}
  .ow-tool h2{font-size:clamp(1.35rem,2.4vw,1.8rem);}
  .ow-tool p{color:var(--ink-soft); margin-top:.35rem; max-width:56ch; line-height:1.55;}
  .ow-tool-sec{padding-block:clamp(1.5rem,4vw,2.8rem);}

  /* Kontakt kao na /za-agencije: forma preko cele širine, kontakt u jednom redu ispod. */
  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}
  #kontakt .contact-form{grid-column:1 / -1;}
`;

export default async function OwnersPage() {
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  const [allTours, story] = await Promise.all([getShowcaseTours('sr'), getStoryData('sr')]);
  const heroTour = pickHeroTour(localToursFirst(allTours), 'sr', HOME_CITY);
  preloadHeroImage(heroTour);

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteTracker />
      <SiteReveal />
      <PromoTopBar lang="sr" href="/cenovnik" />

      <SiteNav
        brandHref="/"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:owner_nav' }}
        mainMenu={{ lang: { href: '/en', label: nav.switchLabel, hrefLang: nav.switchLang, aria: nav.switchAria } }}
      />

      <main className="rv-page">
        <section className="hero-tour" id="pocetna">
          <HeroTour tour={heroTour} lang="sr" />
          <div className="ht-copy">
            <h1>{COPY.hero.titleStart}<em>{COPY.hero.titleEm}</em></h1>
            <p className="lede">{COPY.hero.lede}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:owner_hero_book">{COPY.hero.book}</a>
              <Link className="btn btn-secondary" href="/ture" data-track="cta:owner_hero_tour">{COPY.hero.tour}</Link>
            </div>
            <ul className="ht-facts">
              {COPY.hero.trust.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="band" id="razlika">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{COPY.compare.eyebrow}</span>
              <h2 data-reveal="blur">{accent(COPY.compare.title)}</h2>
            </div>
            <div className="ow-vs">
              {[COPY.compare.without, COPY.compare.with].map((side, i) => (
                <div key={side.title} className={`ow-side${i === 1 ? ' is-dark' : ''}`} data-reveal="up">
                  <h3>{side.title}</h3>
                  <div className="ow-rows">
                    {side.rows.map((row) => (
                      <div key={row.title} className="ow-row">
                        <strong>{row.title}</strong>
                        <span>{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preseljena sa početne 3. 11. 2026. Bez podataka ture se ne prikazuje. */}
        {story && <TourStory data={story} copy={home.story} lang="sr" />}

        <section id="kako-radimo">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{COPY.steps.eyebrow}</span>
              <h2 data-reveal="blur">{accent(COPY.steps.title)}</h2>
            </div>
            <div className="ow-steps" data-reveal-steps>
              {COPY.steps.items.map((item, i) => (
                <div key={item.title} className="card step" data-reveal="up">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <p className="ow-prep" data-reveal="up">
              <b>{COPY.steps.prepLead}</b> {COPY.steps.prep}
            </p>
          </div>
        </section>

        {home.pricingShort && <PricingShort copy={{ ...home.pricingShort, ...COPY.price }} id="cena" track="owner" />}

        <section className="ow-tool-sec">
          <div className="wrap">
            <div className="card ow-tool" data-reveal="up">
              <div>
                <h2>{COPY.valuation.title}</h2>
                <p>{COPY.valuation.text}</p>
              </div>
              <Link className="btn btn-secondary" href={VALUATION_HREF} data-track="cta:owner_valuation">
                {COPY.valuation.cta}
              </Link>
            </div>
          </div>
        </section>

        <section id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{COPY.faq.eyebrow}</span>
              <h2 data-reveal="blur">{accent(COPY.faq.title)}</h2>
              <p className="note" data-reveal="up">{COPY.faq.note}</p>
            </div>
            <div className="faq-list">
              {FAQ.map((item) => (
                <details key={item.question} className="card faq-item" data-reveal="up">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="kontakt">
          <div className="wrap">
            <div className="contact-head">
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{contact.eyebrow}</span>
                <h2 data-reveal="blur">{accent(contact.title)}</h2>
                <p className="note" data-reveal="up">{contact.note}</p>
              </div>
              <div className="quick-contact" data-reveal="up">
                <a className="btn btn-secondary btn-sm qc-phone" href={CONTACT_LINKS.phone} data-track="contact:phone">
                  <span className="qc-dot" />{contact.call}
                </a>
                <a className="btn btn-secondary btn-sm qc-viber" href={CONTACT_LINKS.viber} data-track="contact:viber">
                  <span className="qc-dot" />Viber
                </a>
                <a className="btn btn-secondary btn-sm qc-wa" href={whatsappLink('sr')} target="_blank" rel="noopener noreferrer" data-track="contact:whatsapp">
                  <span className="qc-dot" />WhatsApp
                </a>
              </div>
            </div>
            <ContactForm lang="sr" />
            <p className="contact-line">
              <a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a>
              <a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a>
              <a href={CONTACT_LINKS.map} target="_blank" rel="noopener noreferrer" data-track="contact:map">{address} ↗</a>
              <span>{contact.hours}</span>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter note={home.footer} />
    </div>
  );
}
