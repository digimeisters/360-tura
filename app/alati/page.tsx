import type { Metadata } from 'next';
import Link from 'next/link';
import SiteTracker from '../../components/SiteTracker';
import SiteReveal from '../../components/SiteReveal';
import SiteStylesheets from '../../components/SiteStylesheets';
import { SiteFooter } from '../../components/SiteChrome';
import { ToolCta, ToolExplain, ToolFaq, ToolsNav } from '../../components/alati/ToolSections';
import { TOOLS_STYLES } from '../../components/alati/toolsStyles';
import { accent } from '../lib/accent';
import { HOME_COPY } from '../lib/homeCopy';
import { computePlan, TARIFE_OD } from '../lib/paymentPlan';
import { formatPrice } from '../lib/projectI18n';
import { SITE_NAME, SITE_URL } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { VALUATION_HREF, VALUATION_LIVE } from './toolsNav';
import { cityAverage, CITY_ROW, getAreaPrices } from '../lib/valuation/areaPrices';

/**
 * „Alati" (/alati): ulaz u besplatne alate - kalkulator kredita i troškova
 * kupovine (za kupce) i procena vrednosti (za vlasnike). Svaki alat ima svoju
 * stranu i svoj naslov za pretragu; ovde su kartice, odakle su brojevi i
 * pitanja, u istom rasporedu kao ostale strane sajta (vrh sa slikom,
 * poglavlja sa brojem, plava traka, pitanja).
 */

const PATH = '/alati';
const CALC_HREF = '/alati/kalkulator-kredita';
const PRICES_HREF = '/alati/cene-nekretnina-kragujevac';

// Statična strana: VALUATION_LIVE (toolsNav) se proverava pri build-u. Primer
// procene čita naše cene po naseljima, pa se strana osvežava jednom dnevno.
export const dynamic = 'force-static';
export const revalidate = 86400;

/** Primer procene u vrhu: stan od ovoliko m², prodaja, prosek Kragujevca. */
const SAMPLE_AREA = 50;

/** Raspon za primer iz pravih cena (isto kao /alati/cene-nekretnina-kragujevac); null = bez brojeva. */
async function sampleRange(): Promise<{ low: number; high: number } | null> {
  try {
    const rows = await getAreaPrices();
    const split = rows.some((r) => r.build === 'new') && rows.some((r) => r.build === 'old');
    const build = split ? 'old' : 'any';
    const city = rows.find((r) => r.neighborhood === CITY_ROW && r.type === 'apartment' && r.kind === 'sale' && r.build === build);
    const avg = city ?? cityAverage(rows.filter((r) => r.neighborhood !== CITY_ROW && r.type === 'apartment' && r.kind === 'sale' && r.build === build));
    if (!avg) return null;
    const round = (n: number) => Math.round((n * SAMPLE_AREA) / 1000) * 1000;
    return { low: round(avg.low), high: round(avg.high) };
  } catch {
    return null;
  }
}

// Primer u kartici i slici u vrhu: izmišljen stan, isti obračun kao kalkulator.
const SAMPLE = computePlan({
  price: 92_800,
  areaSqm: 58,
  deposit: 20,
  mode: 'loan',
  months: 18,
  years: 25,
  rate: 4.5,
  firstHome: true,
  members: 1
});

const tariffMonth = new Date(TARIFE_OD).toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' });

const COPY = {
  meta: {
    title: 'Alati za kupovinu i prodaju stana u Kragujevcu | Kvadrat360',
    description:
      'Besplatni alati bez registracije: kalkulator stambenog kredita sa troškovima notara, katastra i povratom PDV-a za prvi stan, i procena vrednosti ili kirije nekretnine po naselju u Kragujevcu.'
  },
  hero: {
    chip: 'Besplatno · bez registracije',
    titleStart: 'Alati za kupovinu ',
    titleEm: 'i prodaju.',
    lede: 'Izračunajte koliko vas stan zaista košta ili koliko vredi nekretnina koju prodajete. Sa pravim taksama i cenama za Kragujevac.',
    ctaCalc: 'Izračunajte ratu',
    ctaValue: 'Procenite nekretninu',
    trust: ['Bez registracije', `Takse proverene: ${tariffMonth}`, 'Cene po naseljima Kragujevca']
  },
  tools: {
    eyebrow: 'Alati',
    title: 'Za kupce, vlasnike *i sve koji računaju.*',
    note: 'Svaki alat radi na telefonu, bez naloga i bez instalacije. Rezultat vidite odmah.'
  },
  calc: {
    who: 'Za kupce',
    title: 'Kalkulator kredita i troškova kupovine',
    text: 'Mesečna rata, šta plaćate odmah i koliko vam država vraća ako kupujete prvi stan.',
    points: ['Rate investitoru ili stambeni kredit', 'Notar, katastar i banka po važećoj tarifi', 'Novogradnja i starogradnja'],
    go: 'Izračunajte'
  },
  valuation: {
    who: 'Za vlasnike',
    title: 'Procena vrednosti nekretnine',
    text: 'Prodajna cena ili mesečna kirija za vaš stan, kuću ili lokal, po naselju.',
    points: ['Raspon cene, ne izmišljena cifra', 'Prodaja i izdavanje', 'Bez ikakve obaveze'],
    go: 'Procenite',
    soon: 'Uskoro'
  },
  prices: {
    who: 'Za sve',
    title: 'Cene po naseljima Kragujevca',
    text: 'Koliko košta kvadrat stana, kuće i lokala u svakom naselju, i kolika je kirija.',
    points: ['Centar, Bubanj, Erdoglija, Aerodrom i druga', 'Cena cele nekretnine za vašu kvadraturu', 'Osveženo na svaka dva meseca'],
    go: 'Pogledajte cene'
  },
  sources: {
    eyebrow: 'Odakle su brojevi',
    title: 'Brojevi koje možete *da proverite.*',
    note: 'Ne izmišljamo cene ni takse. Evo odakle dolazi svaki broj u alatima.',
    items: [
      {
        title: 'Takse notara i katastra',
        text: 'Po Javnobeležničkoj tarifi i Tarifi republičkih administrativnih taksi. Preračunavamo ih u evre i proveravamo jednom godišnje.'
      },
      {
        title: 'Povrat PDV-a i porez na prenos',
        text: 'Po Zakonu o PDV (prvi stan: 40 m² + 15 m² po članu domaćinstva) i Zakonu o porezima na imovinu (2,5% kod starogradnje).'
      },
      {
        title: 'Cene po naseljima',
        text: 'Iz javnih oglasa za Kragujevac, posebno za prodaju i za izdavanje, osvežene na svaka dva meseca. Zato procena daje raspon, a ne jednu cifru.'
      }
    ]
  },
  cta: {
    title: 'Prodajete ili izdajete? *Pokažite nekretninu 360° turom.*',
    points: ['Kupci gledaju pre poziva', 'Manje uzaludnih razgledanja', 'Tura za 24–48h'],
    primary: 'Kako radi 360° tura',
    secondary: 'Pogledajte ture'
  },
  faq: {
    eyebrow: 'Pitanja',
    title: 'Pre nego što *izračunate.*',
    note: 'Kratki odgovori o tome kako alati rade i šta rade sa vašim podacima.',
    items: [
      {
        q: 'Da li su alati besplatni?',
        a: 'Da. Kalkulator i procena su besplatni i ne traže nalog. Kalkulator ništa ne šalje i ne čuva - sve se računa u vašem pregledaču.'
      },
      {
        q: 'Koliko su brojevi tačni?',
        a: 'Okvirno. Takse se računaju po važećim tarifama, ali procena stana za banku i kurs evra se menjaju. Procena vrednosti daje raspon iz cena po naselju, jer ne vidi pogled, raspored ni papire.'
      },
      {
        q: 'Da li važi i za kupovinu od vlasnika?',
        a: 'Da. U kalkulatoru izaberite „Vlasnika (starogradnja)": umesto povrata PDV-a računa se porez na prenos od 2,5%, sa oslobođenjem za kupca prvog stana.'
      },
      {
        q: 'Zašto je procena samo za Kragujevac?',
        a: 'Cene po naseljima imamo samo za Kragujevac. Za ostala mesta procena bi bila nagađanje, pa je ne nudimo.'
      }
    ]
  },
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

export default async function ToolsPage() {
  const range = await sampleRange();
  const tools = [
    { url: CALC_HREF, name: COPY.calc.title },
    ...(VALUATION_LIVE ? [{ url: VALUATION_HREF, name: COPY.valuation.title }] : []),
    { url: PRICES_HREF, name: COPY.prices.title }
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}${PATH}`,
      url: `${SITE_URL}${PATH}`,
      name: COPY.meta.title,
      description: COPY.meta.description,
      inLanguage: 'sr',
      isPartOf: { '@type': 'WebSite', url: SITE_URL, name: SITE_NAME },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${tool.url}`, name: tool.name }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: COPY.faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    }
  ];

  const valuationBody = (
    <>
      <span className="tl-who">{COPY.valuation.who}</span>
      <h3>{COPY.valuation.title}</h3>
      <p>{COPY.valuation.text}</p>
      <ul>
        {COPY.valuation.points.map((p) => (
          <li key={p} data-reveal="list">{p}</li>
        ))}
      </ul>
      <div className="tl-go">
        {VALUATION_LIVE ? COPY.valuation.go : COPY.valuation.soon} <span aria-hidden="true">→</span>
      </div>
    </>
  );

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: TOOLS_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteTracker />
      <SiteReveal />

      <ToolsNav />

      {/* .rv-page: animacije iz siteStyles (kao na početnoj) važe i ovde; filmovi alata su u TOOLS_STYLES. */}
      <main className="rv-page">
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <h1>
                {COPY.hero.titleStart}
                <em>{COPY.hero.titleEm}</em>
              </h1>
              <p className="lede">{COPY.hero.lede}</p>
              <div className="hero-ctas">
                <Link className="btn btn-primary" href={CALC_HREF} data-track="cta:tools_hero_calc">
                  {COPY.hero.ctaCalc}
                </Link>
                {VALUATION_LIVE && (
                  <Link className="btn btn-secondary" href={VALUATION_HREF} data-track="cta:tools_hero_valuation">
                    {COPY.hero.ctaValue}
                  </Link>
                )}
              </div>
              <ul className="ht-facts">
                {COPY.hero.trust.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            {/* Slika u vrhu: rezultat kalkulatora (pravi obračun primera) i oblik procene. */}
            <div className="tl-visual" aria-hidden="true">
              <div className="tl-vcard is-calc">
                <small>Vaša računica · primer</small>
                <div className="tl-pv-big">
                  <small>25 god. · 4,5%</small>
                  <b>
                    <span data-count>{formatPrice(SAMPLE.monthly, 'sr')}</span> <em>mesečno</em>
                  </b>
                </div>
                <div className="tl-pv-row">
                  <span>Odmah: učešće + troškovi</span>
                  <b data-count>{formatPrice(SAMPLE.upfront, 'sr')}</b>
                </div>
                <div className="tl-pv-green">
                  <span>Povrat PDV-a za prvi stan</span>
                  <span data-count>{formatPrice(SAMPLE.vatRefund, 'sr')}</span>
                </div>
              </div>
              <div className="tl-vcard is-value">
                <small>{range ? `Procena · primer, stan ${SAMPLE_AREA} m²` : 'Procena · raspon po naselju'}</small>
                <div className="tl-pv-range" />
                <div className="tl-pv-row">
                  {range ? (
                    <>
                      <b data-count>{formatPrice(range.low, 'sr')}</b>
                      <span>prosek Kragujevca</span>
                      <b data-count>{formatPrice(range.high, 'sr')}</b>
                    </>
                  ) : (
                    <>
                      <span>Najniža</span>
                      <b>Procena</b>
                      <span>Najviša</span>
                    </>
                  )}
                </div>
              </div>
              <span className="tl-visual-tag">Kragujevac</span>
            </div>
          </div>
        </section>

        <section className="band" id="alati">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{COPY.tools.eyebrow}</span>
              <h2 data-reveal="blur">{accent(COPY.tools.title)}</h2>
              <p className="note" data-reveal="up">{COPY.tools.note}</p>
            </div>
            <div className="tl-tools">
              <Link className="tl-tool" data-reveal="scale" href={CALC_HREF} data-track="cta:tools_card_calc">
                <span className="tl-who">{COPY.calc.who}</span>
                <h3>{COPY.calc.title}</h3>
                <p>{COPY.calc.text}</p>
                <ul>
                  {COPY.calc.points.map((p) => (
                    <li key={p} data-reveal="list">{p}</li>
                  ))}
                </ul>
                <div className="tl-go">
                  {COPY.calc.go} <span aria-hidden="true">→</span>
                </div>
              </Link>

              {VALUATION_LIVE ? (
                <Link className="tl-tool" data-reveal="scale" href={VALUATION_HREF} data-track="cta:tools_card_valuation">
                  {valuationBody}
                </Link>
              ) : (
                <div className="tl-tool is-soon" data-reveal="scale">{valuationBody}</div>
              )}

              <Link className="tl-tool" data-reveal="scale" href={PRICES_HREF} data-track="cta:tools_card_prices">
                <span className="tl-who">{COPY.prices.who}</span>
                <h3>{COPY.prices.title}</h3>
                <p>{COPY.prices.text}</p>
                {/* Ilustracija grafikona (trake po naseljima), bez brojeva. */}
                <div className="tl-preview tl-pv-bars" aria-hidden="true" data-reveal-group>
                  {[
                    [52, 40],
                    [44, 42],
                    [36, 34],
                    [20, 40]
                  ].map(([left, width], i) => (
                    <span key={i} style={{ marginLeft: `${left}%`, width: `${width}%` }} />
                  ))}
                </div>
                <ul>
                  {COPY.prices.points.map((p) => (
                    <li key={p} data-reveal="list">{p}</li>
                  ))}
                </ul>
                <div className="tl-go">
                  {COPY.prices.go} <span aria-hidden="true">→</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <ToolExplain
          id="izvori"
          eyebrow={COPY.sources.eyebrow}
          title={COPY.sources.title}
          note={COPY.sources.note}
          items={COPY.sources.items}
          band={false}
        />

        <ToolCta
          id="ture"
          title={COPY.cta.title}
          points={COPY.cta.points}
          primary={{ href: '/za-agencije', label: COPY.cta.primary, track: 'cta:tools_cta_agencies' }}
          secondary={{ href: '/ture', label: COPY.cta.secondary, track: 'cta:tools_cta_tours' }}
        />

        <ToolFaq eyebrow={COPY.faq.eyebrow} title={COPY.faq.title} note={COPY.faq.note} items={COPY.faq.items} />
      </main>

      <SiteFooter note={COPY.footer} />
    </div>
  );
}
