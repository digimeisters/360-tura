import type { Metadata } from 'next';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import PromoNote from '../../components/PromoNote';
import PromoTopBar from '../../components/PromoTopBar';
import Pricing from '../../components/Pricing';
import FirstOffers from '../../components/FirstOffers';
import SiteTracker from '../../components/SiteTracker';
import SiteReveal from '../../components/SiteReveal';
import SiteStylesheets from '../../components/SiteStylesheets';
import { HOME_COPY } from '../lib/homeCopy';
import { HOME_FAQ } from '../lib/homeFaq';
import { accent, plainAccent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, SITE_URL, whatsappLink } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { breadcrumbJsonLd, packagesJsonLd } from '../lib/serviceJsonLd';

/**
 * Cenovnik (/cenovnik) - posebna strana od 3. 11. 2026 (vlasnik: "Cenovnik"
 * je bio samo skok na deo početne i nije mogao da se pošalje kao link).
 *
 * Isti cenovnik kao na početnoj i /za-agencije (components/Pricing.tsx, cene
 * iz lib/pricing.ts), ali ceo: kartice (Osnovni = tura, Premium = tura +
 * HDR), tabela po obimu otvorena, red "samo HDR fotografije". Ispod toga od čega zavisi
 * cena, pitanja o ceni (isti odgovori kao na početnoj, iz homeFaq.ts) i forma.
 *
 * Početna sada ima samo "Cenu ukratko" (components/PricingShort.tsx).
 * Samo srpski - engleska početna zadržava ceo cenovnik.
 */

const PATH = '/cenovnik';
const home = HOME_COPY.sr;
const { nav, pricing, contact } = home;

const COPY = {
  meta: {
    title: 'Cenovnik 360° ture i HDR fotografija | Kvadrat360',
    description:
      'Cena 360° virtuelne ture po nekretnini: Osnovni (samo tura) i Premium (tura + HDR fotografije), niža cena za agencije sa više nekretnina mesečno. Kragujevac i okolina.'
  },
  hero: {
    title: 'Dva paketa, *jedna cena* po nekretnini',
    lede: 'Samo 360° tura, ili tura sa HDR fotografijama i svim jezicima. Snimamo u Kragujevcu i okolini.'
  },
  factors: {
    eyebrow: 'Šta utiče na cenu',
    title: 'Od čega zavisi *cena*',
    items: [
      {
        title: 'Broj prostorija',
        text: 'Cene su za prostor od oko 50 m². Za manje i veće javite kvadraturu i broj soba, pa šaljemo tačnu ponudu.'
      },
      {
        title: 'Paket',
        text: 'Snimanje ture je isto u oba paketa. Premium dodaje HDR fotografije, sve jezike vodiča, osnovu nekretnine i kraći rok.'
      },
      {
        title: 'Grad',
        text: 'Cene važe za Kragujevac. Za druge gradove dogovaramo posebno.'
      }
    ]
  },
  faq: {
    eyebrow: 'Pitanja',
    title: 'Pitanja o *ceni*',
    note: 'Ako vašeg pitanja nema, javite nam se.'
  }
};

// Pitanja sa početne koja se tiču cene i snimanja - isti tekst, bez kopije.
const FAQ_QUESTIONS = [
  'Koliko košta 360° tura nekretnine u Kragujevcu?',
  'Gde snimate?',
  'Koliko dugo je tura dostupna online?',
  'Šta ako se nešto u prostoru promeni posle snimanja?'
];
const FAQ = FAQ_QUESTIONS.map((q) => HOME_FAQ.sr.find((item) => item.question === q)).filter(
  (item): item is (typeof HOME_FAQ.sr)[number] => Boolean(item)
);

// Promo traka i cene se proveravaju po satu, kao na početnoj.
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
      breadcrumbJsonLd('Cenovnik', PATH),
      // Paketi sa cenama (iste kao na stranici, promo se menja sam).
      packagesJsonLd(),
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: COPY.meta.title,
        description: COPY.meta.description,
        inLanguage: 'sr',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        // Firma je opisana na početnoj (homeJsonLd) - ovde samo upućujemo na nju.
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
  .cn-hero{padding-block:clamp(2.6rem,6vw,4.4rem) clamp(1rem,2vw,1.6rem);}
  .cn-hero .section-head{align-items:center; text-align:center; margin:0 auto;}
  .cn-hero h1{font-size:clamp(2.3rem,5vw,3.9rem); line-height:1.05; max-width:20ch;}
  .cn-hero .note{max-width:52ch;}
  /* Promocija jednim redom ispod naslova (PromoNote), umesto banera i nalepnica. */
  .promo-note{margin:0; padding:.45rem 1rem; border-radius:999px; background:#FFF1E7; color:#9A3412; font-weight:700; font-size:.95rem;}
  .sr-only{position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;}
  /* Plava fraza se ne lomi u dva reda (vlasnik: tipografsko grupisanje). */
  .cn-hero h1 em{white-space:nowrap;}
  .cn-factors{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem;}
  @media (max-width:820px){ .cn-factors{grid-template-columns:1fr;} }
  .cn-factor{box-shadow:none;}
  .cn-factor h3{font-size:1.15rem; margin-bottom:.4rem;}
  .cn-factor p{color:var(--ink-soft); line-height:1.55;}
  /* Kontakt kao na /za-agencije: forma preko cele širine, kontakt u jednom redu ispod. */
  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}
  #kontakt .contact-form{grid-column:1 / -1;}
`;

export default function CenovnikPage() {
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteTracker />
      <SiteReveal />
      <PromoTopBar lang="sr" href="#paketi" />

      <SiteNav
        brandHref="/"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:pricing_nav' }}
        mainMenu={{ lang: { href: '/en#cenovnik', label: nav.switchLabel, hrefLang: nav.switchLang, aria: nav.switchAria } }}
      />

      <main className="rv-page">
        <section className="cn-hero">
          <div className="wrap section-head">
            <span className="eyebrow" data-reveal="up">{pricing.eyebrow}</span>
            <h1 data-reveal="blur">{accent(COPY.hero.title)}</h1>
            <p className="note" data-reveal="up">{COPY.hero.lede}</p>
            <PromoNote />
          </div>
        </section>

        {/* Ceo cenovnik: bez compact, pa su podela tura + HDR i tabela po obimu
            vidljive - tabela otvorena i na telefonu (volumeOpen). */}
        <section id="paketi">
          <div className="wrap">
            {/* Naslov za čitače ekrana: kartice paketa su h3 (Pricing), a iznad je h1. */}
            <h2 className="sr-only">Paketi</h2>
            <Pricing copy={pricing} lang="sr" trackPrefix="pricing_" volumeOpen stickers={false} />
            <FirstOffers />
          </div>
        </section>

        <section className="band" id="od-cega-zavisi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{COPY.factors.eyebrow}</span>
              <h2 data-reveal="blur">{accent(COPY.factors.title)}</h2>
            </div>
            <div className="cn-factors">
              {COPY.factors.items.map((item) => (
                <div key={item.title} className="card cn-factor" data-reveal="up">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
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
