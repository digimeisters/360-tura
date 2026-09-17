import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import PriceCalculator from '../../components/PriceCalculator';
import PromoBanner from '../../components/PromoBanner';
import { PlanPrice, SaleSticker } from '../../components/PromoPrice';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import { SITE_STYLES } from '../lib/siteStyles';
import { AGENCY_COPY } from '../lib/agencyCopy';
import { HOME_COPY } from '../lib/homeCopy';
import { CONTACT, CONTACT_LINKS, SITE_NAME, SITE_URL, whatsappLink } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { CONTACT_PACKAGES } from '../lib/pricing';

/**
 * Prodajna strana za agencije (/za-agencije). Deli CSS i komponente sa
 * početnom stranom (SITE_STYLES, ContactForm, PriceCalculator), a cene
 * čita iz istih paketa kao početna - da se brojevi ne razdvoje.
 *
 * Za sada samo srpski; engleska verzija ide istim putem kad zatreba.
 */

const PATH = '/za-agencije';
const copy = AGENCY_COPY;

// Paketi za agencije su isti oni sa početne strane (jedan izvor cena);
// pojedinačna tura ovde ne pripada, ta publika je na početnoj.
const AGENCY_PLANS = HOME_COPY.sr.pricing.plans.filter((plan) => plan.track !== 'price_single');

export const metadata: Metadata = {
  title: { absolute: copy.meta.title },
  description: copy.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: PATH,
    title: copy.meta.title,
    description: copy.meta.description,
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
        name: copy.meta.title,
        description: copy.meta.description,
        inLanguage: 'sr',
        isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME }
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#pitanja`,
        url: pageUrl,
        inLanguage: 'sr',
        mainEntity: copy.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

export default function AgencyPage() {
  const { nav, hero, contact } = copy;
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: SITE_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteTracker />
      <NavScrollSpy />

      <SiteNav
        brandHref="/"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:agency_nav' }}
      >
        <li><a href="#dobijate">{nav.benefits}</a></li>
        <li><a href="#paketi">{nav.packages}</a></li>
        <li><a href="#pitanja">{nav.faq}</a></li>
        <li className="nav-lang"><Link href="/">{nav.home}</Link></li>
      </SiteNav>

      <main>
        <section className="hero hero-solo" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />{hero.chip}</span>
              <h1>{hero.titleStart}<em>{hero.titleEm}</em></h1>
              <p className="lede">{hero.lede}</p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href="#kontakt" data-track="cta:agency_hero_contact">{hero.ctaContact}</a>
                <a className="btn btn-secondary" href="#paketi" data-track="cta:agency_hero_packages">{hero.ctaPackages}</a>
              </div>
              <div className="trust">
                {hero.trust.map((item) => (
                  <span key={item} className="chip">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="dobijate">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.benefits.eyebrow}</span>
              <h2>{copy.benefits.title}</h2>
              <p className="note">{copy.benefits.note}</p>
            </div>
            <div className="feat-grid n-3">
              {copy.benefits.items.map((item) => (
                <div key={item.title} className="card feat">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="paketi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.pricing.eyebrow}</span>
              <h2>{copy.pricing.title}</h2>
              <p className="note">{copy.pricing.note}</p>
            </div>
            <PromoBanner lang="sr" />
            <div className="price-grid n-2">
              {AGENCY_PLANS.map((plan) => (
                <div key={plan.track} className={`card price-card${plan.badge ? ' featured' : ''}`}>
                  {plan.badge && <span className="price-badge">{plan.badge}</span>}
                  <SaleSticker count={plan.count} packageType={plan.packageType} />
                  <span className="price-audience">{plan.audience}</span>
                  <h3>{plan.title}</h3>
                  <PlanPrice
                    count={plan.count}
                    packageType={plan.packageType}
                    from={plan.from}
                    unit={plan.unit}
                    lang="sr"
                  />
                  <ul className="price-list">
                    {plan.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a
                    className="btn btn-primary price-cta"
                    href="#kontakt"
                    data-track={`cta:agency_${plan.track}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="fine-print">{copy.pricing.fine}</p>
            <PriceCalculator lang="sr" />
          </div>
        </section>

        <section id="pitanja">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.faq.eyebrow}</span>
              <h2>{copy.faq.title}</h2>
              <p className="note">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {copy.faq.items.map((item) => (
                <details key={item.question} className="card faq-item">
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
                <span className="eyebrow">{contact.eyebrow}</span>
                <h2>{contact.title}</h2>
                <p className="note">{contact.note}</p>
              </div>
              <div className="quick-contact">
                <a className="btn btn-secondary btn-sm qc-phone" href={CONTACT_LINKS.phone} data-track="contact:phone">
                  <span className="qc-dot" />{contact.call}
                </a>
                <a className="btn btn-secondary btn-sm qc-viber" href={CONTACT_LINKS.viber} data-track="contact:viber">
                  <span className="qc-dot" />Viber
                </a>
                <a
                  className="btn btn-secondary btn-sm qc-wa"
                  href={whatsappLink('sr')}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="contact:whatsapp"
                >
                  <span className="qc-dot" />WhatsApp
                </a>
              </div>
            </div>
            <ContactForm lang="sr" defaultPackage={CONTACT_PACKAGES[1]} />
            <dl className="info-list">
              <div className="card">
                <dt>{contact.labels.phone}</dt>
                <dd><a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a></dd>
              </div>
              <div className="card">
                <dt>{contact.labels.email}</dt>
                <dd><a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a></dd>
              </div>
              <div className="card">
                <dt>{contact.labels.address}</dt>
                <dd>
                  <a href={CONTACT_LINKS.map} target="_blank" rel="noopener noreferrer" data-track="contact:map">
                    {address}
                    <span className="ext" aria-hidden="true">↗</span>
                  </a>
                </dd>
              </div>
              <div className="card">
                <dt>{contact.labels.hours}</dt>
                <dd>{contact.hours}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter note={copy.footer} />
    </div>
  );
}
