import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../../components/SiteTracker';
import SiteStylesheets from '../../../components/SiteStylesheets';
import { SiteFooter } from '../../../components/SiteChrome';
import { ToolCrossLink, ToolCta, ToolExplain, ToolFaq, ToolsNav } from '../../../components/alati/ToolSections';
import LoanCalculator from '../../../components/alati/LoanCalculator';
import { TOOLS_STYLES } from '../../../components/alati/toolsStyles';
import { HOME_COPY } from '../../lib/homeCopy';
import { SITE_NAME, SITE_URL } from '../../lib/site';
import { serializeJsonLd } from '../../lib/structuredData';
import { NEW_BUILD_HREF, VALUATION_HREF, VALUATION_LIVE } from '../toolsNav';

/**
 * Kalkulator kredita i troškova kupovine (/alati/kalkulator-kredita): rata,
 * notar, katastar, banka, povrat PDV-a za prvi stan i porez na prenos za
 * starogradnju. Obračun: app/lib/paymentPlan.ts (isti kao u kartici stana).
 * Strana je statična; računanje je u pregledaču (LoanCalculator).
 */

const PATH = '/alati/kalkulator-kredita';

// Statična strana: VALUATION_LIVE (toolsNav) se proverava pri build-u.
export const dynamic = 'force-static';

const COPY = {
  meta: {
    title: 'Kalkulator stambenog kredita i troškova kupovine stana | Kvadrat360',
    description:
      'Izračunajte mesečnu ratu, troškove notara i katastra i povrat PDV-a za prvi stan. Za novogradnju i starogradnju, sa važećim taksama.'
  },
  hero: {
    chip: 'Za kupce · takse proverene oktobra 2026.',
    titleStart: 'Koliko vas stan ',
    titleEm: 'zaista košta?',
    lede: 'Mesečna rata, troškovi notara i katastra i povrat PDV-a za prvi stan, na jednom mestu.'
  },
  explainHead: {
    eyebrow: 'Kako se računa',
    title: 'Tri stvari koje kupci *najčešće propuste.*',
    note: 'Rata nije jedini trošak - a država vam deo novca vraća samo ako znate da ga tražite.'
  },
  explain: [
    {
      title: 'Povrat PDV-a za prvi stan',
      text: 'Ako kupujete prvi stan u novogradnji, država vam vraća PDV za 40 m², i još 15 m² za svakog člana domaćinstva koji nema stan. Zahtev se podnosi Poreskoj upravi kad je cela cena isplaćena.'
    },
    {
      title: 'Šta su troškovi kupovine',
      text: 'Notar overava kupoprodajni ugovor (cena zavisi od vrednosti stana), a katastar upisuje vas kao vlasnika. Uz kredit dolaze založna izjava, upis hipoteke i procena stana za banku.'
    },
    {
      title: 'Novogradnja ili starogradnja',
      text: 'U novogradnji je PDV već u ceni, pa nema poreza na prenos. Kod kupovine od vlasnika plaća se porez na prenos od 2,5%, a kupac prvog stana je oslobođen za iste kvadrate kao kod PDV-a.'
    }
  ],
  next: {
    title: 'Pogledajte stan *pre nego što ga obiđete.*',
    points: ['Izbor stana na zgradi', 'Osnove i cene', '360° ture'],
    cta: 'Pogledajte novogradnju'
  },
  faqHead: {
    eyebrow: 'Pitanja kupaca',
    title: 'Povrat PDV-a, takse *i kredit.*',
    note: 'Ono što kupci pitaju pre potpisivanja ugovora.'
  },
  faq: [
    {
      q: 'Ko ima pravo na povrat PDV-a za prvi stan?',
      a: 'Punoletni državljanin Srbije sa prebivalištem u Srbiji koji od 1. 7. 2006. nije imao stan u svojini. Za člana domaćinstva se računa 15 m² ako ni on nema stan, a svi moraju biti prijavljeni na istoj adresi.'
    },
    {
      q: 'Kada stiže povrat PDV-a?',
      a: 'Tek kad je cela cena stana isplaćena. Poreska uprava odlučuje u roku od 30 dana od zahteva, a novac uplaćuje u roku od 15 dana od rešenja.'
    },
    {
      q: 'Da li su troškovi notara i katastra tačni?',
      a: 'Računaju se po važećoj tarifi notara i takse katastra, ali su okvirni: procena stana zavisi od banke, a kurs evra se menja. Tačan iznos dobijate od notara i banke.'
    },
    {
      q: 'Ko plaća porez na prenos kod starogradnje?',
      a: 'Po zakonu prodavac, ali ga ugovorom najčešće preuzima kupac. Zato ga kalkulator prikazuje među troškovima kupca - proverite šta piše u vašem ugovoru.'
    },
    {
      q: 'Da li se računa i parking ili garaža?',
      a: 'Povrat PDV-a i oslobođenje od poreza važe samo za stan, ne za parking mesto ili garažu.'
    }
  ],
  other: { title: 'Prodajete stan?', valuation: 'Proverite koliko vredi po naselju.', valuationLink: 'Procena vrednosti →', tools: 'Pogledajte i ostale alate.', toolsLink: 'Svi alati →' },
  footer: HOME_COPY.sr.footer
};

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

export default function LoanCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Kalkulator stambenog kredita i troškova kupovine',
      url: `${SITE_URL}${PATH}`,
      description: COPY.meta.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'sr',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
      isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: COPY.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Alati', item: `${SITE_URL}/alati` },
        { '@type': 'ListItem', position: 2, name: 'Kalkulator kredita', item: `${SITE_URL}${PATH}` }
      ]
    }
  ];

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: TOOLS_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />

      <ToolsNav />

      <main>
        <div className="wrap">
          <section className="tl-hero">
            <p className="tl-crumb tl-noprint">
              <Link href="/alati">Alati</Link> › Kalkulator kredita
            </p>
            <span className="chip">
              <span className="dot" />
              {COPY.hero.chip}
            </span>
            <h1>
              {COPY.hero.titleStart}
              <em>{COPY.hero.titleEm}</em>
            </h1>
            <p className="lede tl-noprint">{COPY.hero.lede}</p>
          </section>

          <LoanCalculator newBuildHref={NEW_BUILD_HREF} />
        </div>

        <div className="tl-noprint">
          <ToolExplain id="kako-se-racuna" eyebrow={COPY.explainHead.eyebrow} title={COPY.explainHead.title} note={COPY.explainHead.note} items={COPY.explain} />

          <ToolCta
            id="novogradnja"
            title={COPY.next.title}
            points={COPY.next.points}
            primary={{ href: NEW_BUILD_HREF, label: COPY.next.cta, track: 'cta:tools_calc_next' }}
          />

          <ToolFaq eyebrow={COPY.faqHead.eyebrow} title={COPY.faqHead.title} note={COPY.faqHead.note} items={COPY.faq} />

          {VALUATION_LIVE ? (
            <ToolCrossLink
              title={COPY.other.title}
              text={COPY.other.valuation}
              link={{ href: VALUATION_HREF, label: COPY.other.valuationLink, track: 'cta:tools_calc_valuation' }}
            />
          ) : (
            <ToolCrossLink title={COPY.other.title} text={COPY.other.tools} link={{ href: '/alati', label: COPY.other.toolsLink, track: 'cta:tools_calc_tools' }} />
          )}
        </div>
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}
