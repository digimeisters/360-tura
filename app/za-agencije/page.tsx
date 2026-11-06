import type { Metadata } from 'next';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import ContactForm from '../../components/ContactForm';
import AgencyHeroVisual, { AGENCY_HERO_STYLES } from '../../components/AgencyHeroVisual';
import PromoTopBar from '../../components/PromoTopBar';
import { IconPhone } from '../../components/SiteIcons';
import PricingShort from '../../components/PricingShort';
import TourModulesShowcase from '../../components/TourModulesShowcase';
import FirstOffers from '../../components/FirstOffers';
import SiteTracker from '../../components/SiteTracker';
import NavScrollSpy from '../../components/NavScrollSpy';
import SiteReveal from '../../components/SiteReveal';
import { AGENCY_COPY } from '../lib/agencyCopy';
import { HOME_COPY } from '../lib/homeCopy';
import { accent, plainAccent } from '../lib/accent';
import { CONTACT, CONTACT_LINKS, SITE_NAME, SITE_URL, whatsappLink } from '../lib/site';
import { serializeJsonLd } from '../lib/structuredData';
import { getShowcaseTours, pickHeroTour } from '../lib/showcaseTours';
import SiteStylesheets from '../../components/SiteStylesheets';

/**
 * Prodajna strana za agencije (/za-agencije):
 *   vrh (tura ugrađena na sajt agencije) -> 02 kupac (vremenska linija i
 *   jedan telefon sa Viber razgovorom) -> 02b pet dugmadi u turi
 *   (TourModulesShowcase) i "još uz svaku turu" -> 02c uživo razgledanje ->
 *   03 vlasnik i izveštaj -> 04 šest koristi -> 05 brojke iz sveta ->
 *   06 kako radimo -> cene -> pitanja -> kontakt.
 *
 * Deli CSS i komponente sa početnom stranom (SITE_STYLES, HeroTour,
 * ContactForm, Pricing), a cene čita iz istih paketa kao početna -
 * da se brojevi ne razdvoje. Stilovi koji postoje samo ovde su u
 * AGENCY_STYLES ispod.
 *
 * Za sada samo srpski; engleska verzija ide istim putem kad zatreba.
 */

const PATH = '/za-agencije';
const copy = AGENCY_COPY;

// Strana se osvežava kao početna - tura u vrhu prati objavljene ture.
export const revalidate = 3600;

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
        name: plainAccent(copy.faq.title),
        mainEntity: copy.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

const AGENCY_STYLES = `
  /* 02 Kupac: vremenska linija levo, jedan telefon sa Viber razgovorom desno. */
  .st .wrap{display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr); gap:clamp(2rem,5vw,5rem); align-items:center;}
  .tl{position:relative; list-style:none; margin:2rem 0 0; padding:0; display:grid; gap:1.1rem;}
  .tl::before{content:""; position:absolute; left:2.35rem; top:.9rem; bottom:.9rem; width:2px; background:var(--line-strong);}
  .tl li{position:relative; display:grid; grid-template-columns:4.7rem 1fr; gap:1rem; align-items:start;}
  .tl time{position:relative; z-index:1; justify-self:center; padding:.3rem .65rem; border-radius:999px; background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:800; font-size:.86rem; font-variant-numeric:tabular-nums;}
  .tl li:last-child time{background:#1E7A4C;}
  .tl b{display:block; font-family:var(--font-display); font-size:1.06rem; letter-spacing:-0.01em; color:var(--ink);}
  .tl span{color:var(--ink-soft); font-size:.95rem;}
  .st-end{display:flex; flex-wrap:wrap; align-items:center; gap:.8rem 1.2rem; margin-top:2rem; padding-top:1.3rem; border-top:1px solid var(--line);}
  .st-end p{font-family:var(--font-display); font-weight:700; font-size:1.02rem; color:var(--ink);}
  .vb-ph{justify-self:center; width:min(310px,100%); padding:10px; border-radius:42px; background:#0F1014; box-shadow:0 0 0 1px #2A2B31, 0 50px 90px -40px rgba(17,17,19,.6);}
  .vb-in{border-radius:33px; overflow:hidden; background:#ECE5DD; color:#111113; min-height:540px; display:flex; flex-direction:column;}
  .vb-top{display:flex; align-items:center; gap:.6rem; padding:16px 14px 12px; background:#7360F2; color:#FFFFFF;}
  .vb-top i{display:grid; place-items:center; width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,.22); font-style:normal; font-weight:800; font-size:.8rem;}
  .vb-top b{display:block; font-size:.92rem;}
  .vb-top small{display:block; font-size:.72rem;}
  .vb{flex:1; display:flex; flex-direction:column; gap:10px; padding:16px 12px;}
  .vb-day{align-self:center; font-size:.7rem; font-weight:600; color:#4F535A; background:rgba(255,255,255,.75); padding:.15rem .6rem; border-radius:999px;}
  .vb-msg{max-width:84%; padding:9px 11px 6px; border-radius:16px; font-size:.86rem; line-height:1.4; background:#FFFFFF; box-shadow:0 1px 1px rgba(0,0,0,.06);}
  .vb-msg.out{align-self:flex-end; background:#E6E1FB; border-bottom-right-radius:5px;}
  .vb-msg.inn{align-self:flex-start; border-bottom-left-radius:5px;}
  .vb-msg time, .vb-call time{display:block; text-align:right; font-size:.64rem; color:#565A61; margin-top:3px;}
  .vb-card{display:block; margin-top:7px; border-radius:11px; overflow:hidden; background:#FFFFFF; border:1px solid #DCD6F7;}
  .vb-card img{display:block; width:100%; height:112px; object-fit:cover; background:#E4E4DE;}
  .vb-card span{display:block; padding:6px 9px 7px;}
  .vb-card b{display:block; font-size:.8rem;}
  .vb-card small{display:block; font-size:.68rem; color:#4F535A;}
  .vb-call{align-self:flex-start; display:flex; align-items:center; gap:.5rem; padding:8px 12px; border-radius:16px; background:#FFFFFF; font-size:.82rem; font-weight:600; color:#1E7A4C;}
  .vb-call i{display:grid; place-items:center; width:26px; height:26px; border-radius:50%; background:#1E7A4C; color:#FFFFFF;}
  .vb-call i svg{width:14px; height:14px;}
  .vb-call time{display:inline; margin:0 0 0 .3rem; font-weight:500;}
  @media (max-width:900px){
    .st .wrap{grid-template-columns:1fr;}
    .vb-ph{order:-1; width:min(280px,100%);}
    .vb-in{min-height:0;}
    .vb-card img{height:90px;}
  }

  /* Plava traka na sredini (#probajte) - stil je u app/lib/siteStyles.ts (.mid-cta), deli ga i početna. */

  /* 03 Vlasnik: tamna sekcija, izveštaj u beloj kartici. */
  .owner .wrap{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,5vw,4.5rem); align-items:center;}
  @media (max-width:900px){ .owner .wrap{grid-template-columns:1fr;} }
  .owner-points{list-style:none; margin:2rem 0 0; padding:0; display:flex; flex-direction:column; gap:.85rem;}
  .owner-points li{display:flex; gap:.75rem; font-size:1.05rem;}
  .owner-points li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .report-card{background:#FFFFFF; color:#111113; border-radius:28px; padding:clamp(1.3rem,3vw,2rem); box-shadow:0 30px 70px rgba(0,0,0,.5);}
  .report-head{display:flex; justify-content:space-between; align-items:baseline; gap:1rem;}
  .report-head strong{font-family:var(--font-display); font-size:1.15rem;}
  .report-head span{font-size:.75rem; color:#686A70;}
  .kpi-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; margin-top:1.2rem;}
  .kpi{background:#F1F1EC; border-radius:14px; padding:.9rem;}
  .kpi small{display:block; font-size:.72rem; color:#5B5D63;}
  .kpi b{display:block; font-family:var(--font-display); font-size:1.8rem; font-weight:800; line-height:1.2;}
  .kpi i{font-style:normal; font-size:.72rem; font-weight:700; color:#166534;}
  .rooms-title{font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#5B5D63; margin:1.4rem 0 .7rem;}
  .room-bar{display:grid; grid-template-columns:8rem 1fr; gap:.8rem; align-items:center; font-size:.85rem; margin-bottom:.55rem;}
  .room-bar span{height:10px; border-radius:999px; background:#F1F1EC; overflow:hidden;}
  .room-bar span i{display:block; height:100%; border-radius:999px; background:#1E5AA8;}
  /* Izvori poseta: redosled od najvećeg, bez procenata. */
  .report-sources{counter-reset:src; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem .9rem; margin:0; padding:0; list-style:none; font-size:.85rem; font-weight:600;}
  .report-sources li{counter-increment:src;}
  .report-sources li::before{content:counter(src) ". "; color:#1E5AA8; font-weight:800;}
  .report-chips{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.3rem;}
  .report-chips span{background:#F1F1EC; border-radius:999px; padding:.4rem .8rem; font-size:.78rem; font-weight:700;}

  /* 05 Brojke iz sveta. */
  .proof-grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(1.5rem,4vw,3rem); max-width:900px;}
  .proof-item small a{color:inherit; text-decoration:underline; text-underline-offset:3px;}
  .proof-item small a:hover{color:var(--accent);}
  @media (max-width:820px){ .proof-grid{grid-template-columns:1fr;} }
  .proof-item{border-top:2px solid var(--ink); padding-top:1.4rem;}
  .proof-item b{display:block; font-family:var(--font-display); font-weight:800; font-size:clamp(3rem,6vw,4.4rem); letter-spacing:-0.03em; color:var(--accent); line-height:1.05;}
  .proof-item p{font-size:1.1rem; margin-top:.4rem;}
  .proof-item small{display:block; font-size:.82rem; color:var(--ink-faint); margin-top:.6rem;}

  .embed-details{margin-top:1.4rem; overflow:hidden;}
  .embed-details summary{cursor:pointer; padding:1.1rem 1.5rem; font-weight:600; list-style:none; display:flex; justify-content:space-between; align-items:center; gap:1rem;}
  .embed-details summary::-webkit-details-marker{display:none;}
  .embed-details summary::after{content:"+"; font-size:1.3rem; color:var(--accent); line-height:1;}
  .embed-details[open] summary::after{content:"–";}
  .embed-body{padding:0 1.5rem 1.5rem;}
  .embed-body p{font-size:.92rem; color:var(--ink-soft); margin-bottom:.8rem;}

  .calc-details{margin-top:1.6rem;}
  .calc-details > summary{cursor:pointer; list-style:none; display:flex;}
  .calc-details > summary::-webkit-details-marker{display:none;}
  .calc-details[open] > summary{margin-bottom:1rem;}
  .contact-line{display:flex; flex-wrap:wrap; gap:.4rem 1.6rem; font-size:.95rem; color:var(--ink-soft); grid-column:1 / -1;}
  /* Ovde nema kartica sa kontaktom desno od forme (kraći red ispod nje), pa forma ide preko cele širine. */
  #kontakt .contact-form{grid-column:1 / -1;}
  .contact-line a{color:inherit; text-decoration:none;}

  /* ---------- Animacije (vlasnik, 21. 10. 2026; maketa public/mockup/AnimacijeAgencije.html) ----------
     Opšti efekti su u siteStyles (data-reveal, .rv-page); ovde su samo filmovi
     ove strane. Važe dok je html.rv-armed (components/SiteReveal), pa bez JS-a
     i uz smanjene pokrete strana izgleda kao ranije. */
  /* K1 Viber razgovor: poruke stižu redom kad telefon uđe u ekran. */
  html.rv-armed .vb > *{opacity:0; transform:translateY(10px); transition:opacity .45s cubic-bezier(.16,1,.3,1), transform .45s cubic-bezier(.16,1,.3,1);}
  html.rv-armed .vb-ph.is-in .vb > *{opacity:1; transform:none;}
  html.rv-armed .vb-ph.is-in .vb > :nth-child(2){transition-delay:.4s;}
  html.rv-armed .vb-ph.is-in .vb > :nth-child(3){transition-delay:1.2s;}
  html.rv-armed .vb-ph.is-in .vb > :nth-child(4){transition-delay:2.1s;}
  html.rv-armed .vb-ph.is-in .vb > :nth-child(5){transition-delay:3s;}
  /* V1 Izveštaj vlasniku: trake prostorija porastu, čipovi iskoče (KPI brojevi rastu preko data-count). */
  html.rv-armed .room-bar span i{transform:scaleX(0); transform-origin:left; transition:transform 1.1s cubic-bezier(.22,.8,.24,1) .5s;}
  html.rv-armed .room-bar + .room-bar span i{transition-delay:.66s;}
  html.rv-armed .room-bar + .room-bar + .room-bar span i{transition-delay:.82s;}
  html.rv-armed .report-card.is-in .room-bar span i{transform:none;}
  html.rv-armed .report-chips span{display:inline-block; transform:scale(.6); opacity:0; transition:transform .45s cubic-bezier(.34,1.56,.64,1) 1.1s, opacity .3s 1.1s;}
  html.rv-armed .report-card.is-in .report-chips span{transform:none; opacity:1;}

  /* 02c Uživo: tekst i koraci levo, dva telefona desno (vaš i kupčev, isti kadar). */
  .lv .wrap{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr); gap:clamp(2rem,5vw,4.5rem); align-items:center;}
  .lv-steps{list-style:none; margin:2rem 0 0; padding:0; display:grid; gap:1.1rem; counter-reset:s;}
  .lv-steps li{display:grid; grid-template-columns:2.2rem 1fr; gap:.9rem; align-items:start; counter-increment:s;}
  .lv-steps li::before{content:counter(s); display:grid; place-items:center; width:2.2rem; height:2.2rem; border-radius:50%; background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:800;}
  .lv-steps b{display:block; font-family:var(--font-display); font-size:1.08rem; color:var(--ink);}
  .lv-steps span{color:var(--ink-soft); font-size:.96rem;}
  .lv-use{margin-top:1.8rem; padding-top:1.2rem; border-top:1px solid var(--line); font-size:.92rem; color:var(--ink-soft);}
  .lv-ctas{margin-top:1.6rem;}
  .lv-pair{position:relative; display:flex; justify-content:center; align-items:flex-end; gap:clamp(1rem,3vw,2.2rem);}
  .lv-ph{--w:clamp(150px,19vw,240px); position:relative; width:var(--w); flex:none; margin:0;}
  .lv-ph img{display:block; width:100%; height:auto; padding:9px; border-radius:38px; background:#050506; box-shadow:0 0 0 1px #2C2D33, 0 40px 80px -30px rgba(0,0,0,.8);}
  .lv-ph figcaption{margin-top:.9rem; text-align:center; font-size:.85rem; font-weight:600; color:var(--ink-soft);}
  .lv-ph.agent{transform:translateY(-28px);}
  .lv-sync{position:absolute; top:38%; left:50%; translate:-50% -50%; z-index:2; display:flex; align-items:center; gap:.45rem; padding:.5rem .85rem; border-radius:999px;
    background:#FFFFFF; color:#111113; font-size:.8rem; font-weight:700; white-space:nowrap; box-shadow:0 14px 30px -10px rgba(0,0,0,.6);}
  .lv-sync i{width:8px; height:8px; border-radius:50%; background:#2FA36B; animation:lv-ping 1.6s ease-out infinite;}
  @keyframes lv-ping{0%{box-shadow:0 0 0 0 rgba(47,163,107,.6);} 100%{box-shadow:0 0 0 10px rgba(47,163,107,0);}}
  @media (prefers-reduced-motion:reduce){ .lv-sync i{animation:none;} }

  /* 02b Ispod pet dugmadi: kratak red onoga što dugmad ne pokazuju. */
  .ex{margin-top:clamp(2.5rem,5vw,3.5rem); padding-top:clamp(1.6rem,3vw,2.2rem); border-top:1px solid var(--line);}
  .ex h3{font-size:1.15rem; letter-spacing:-0.01em; margin-bottom:1rem;}
  .ex ul{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:1rem 1.6rem;}
  .ex li b{display:block; font-family:var(--font-display); font-weight:800; font-size:1rem; color:var(--ink);}
  .ex li span{display:block; margin-top:.2rem; color:var(--ink-soft); font-size:.92rem; line-height:1.45;}

  @media (max-width:920px){
    .lv .wrap{grid-template-columns:1fr;}
    .lv-pair{order:-1; padding-top:28px;}
  }
  @media (max-width:520px){
    .lv-ph{--w:42vw;}
    .lv-ph.agent{transform:translateY(-16px);}
    .lv-sync{font-size:.72rem; padding:.4rem .7rem;}
  }
`;

export default async function AgencyPage() {
  const { nav, hero, buyer, live, extras, owner, proof, steps, contact } = copy;
  const address = [CONTACT.street, CONTACT.city].filter(Boolean).join(', ');

  const tours = await getShowcaseTours('sr');
  const heroTour = pickHeroTour(tours, 'sr');
  // Za primer u kodu za ugradnju i za ekrane telefona - prava, otvorena
  // tura, ne izmišljen link ni tuđa fotografija.
  const exampleSlug = heroTour?.slug ?? tours[0]?.slug ?? 'naziv-ture';
  const room = heroTour?.rooms[1] ?? heroTour?.rooms[0] ?? null;
  const roomPhoto = room?.previewUrl ?? heroTour?.coverUrl ?? null;

  return (
    <div lang="sr" style={{ display: 'contents' }}>
      <SiteStylesheets />
      <style dangerouslySetInnerHTML={{ __html: AGENCY_STYLES + AGENCY_HERO_STYLES }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd()) }} />
      <SiteTracker />
      <NavScrollSpy />
      <SiteReveal />
      <PromoTopBar lang="sr" href="#paketi" />

      <SiteNav
        brandHref="/"
        brandAria={nav.brandAria}
        cta={{ href: '#kontakt', label: nav.cta, track: 'cta:agency_nav' }}
        mainMenu={{}}
      />

      {/* .rv-page: animacije iz siteStyles (kao na početnoj) važe i ovde. */}
      <main className="rv-page">
        {/* Vrh (vlasnik, 4. 11. 2026): tamno, tekst levo, tura u pregledaču i mesečni
            izveštaj desno - da se ne ponavlja živa tura sa početne (components/AgencyHeroVisual). */}
        <section className="ah is-dark" id="pocetna">
          <div className="wrap">
          <div className="ah-copy">
            <h1>{accent(hero.title)}</h1>
            <p className="lede">{hero.lede}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#kontakt" data-track="cta:agency_hero_contact">{hero.ctaContact}</a>
              <a className="btn btn-secondary" href="#paketi" data-track="cta:agency_hero_prices">{hero.ctaPrices}</a>
            </div>
            <ul className="ht-facts">
              {hero.trust.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <AgencyHeroVisual tour={heroTour} report={owner.report} />
          </div>
        </section>

        {/* 02 Kupac: ista priča, kraće (vlasnik, 5. 11. 2026): vremenska linija i
            jedan telefon. Plan i kontakt pokazuje "Pet dugmadi" odmah ispod. */}
        <section className="st" id="kupac">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{buyer.eyebrow}</span>
                <h2 data-reveal="blur">{accent(buyer.title)}</h2>
                <p className="note" data-reveal="up">{buyer.note}</p>
              </div>
              <ol className="tl">
                {buyer.steps.map((step) => (
                  <li key={step.time} data-reveal="list">
                    <time>{step.time}</time>
                    <div><b>{step.title}</b><span>{step.text}</span></div>
                  </li>
                ))}
              </ol>
              <div className="st-end" data-reveal="up">
                <p>{buyer.end.text}</p>
                <a className="btn btn-primary btn-sm" href="#kontakt" data-track="cta:agency_story_end">{buyer.end.cta}</a>
              </div>
            </div>

            <div className="vb-ph" aria-hidden="true" data-reveal-group>
              <div className="vb-in">
                <div className="vb-top"><i>AG</i><div><b>{buyer.chat.app}</b><small>{buyer.chat.sub}</small></div></div>
                <div className="vb">
                  <span className="vb-day">{buyer.chat.day}</span>
                  <div className="vb-msg out">
                    {buyer.chat.message}
                    <span className="vb-card">
                      {/* eslint-disable-next-line @next/next/no-img-element -- sličica ture sa CDN-a */}
                      {roomPhoto && <img src={roomPhoto} alt="" loading="lazy" />}
                      <span><b>{buyer.chat.card}</b><small>kvadrat360.com/tour/…</small></span>
                    </span>
                    <time>{buyer.chat.sent}</time>
                  </div>
                  <div className="vb-msg inn">{buyer.chat.reply}<time>{buyer.chat.replyAt}</time></div>
                  <div className="vb-msg inn">{buyer.chat.followUp}<time>{buyer.chat.followUpAt}</time></div>
                  <div className="vb-call"><i><IconPhone /></i>{buyer.chat.call}<time>{buyer.chat.callAt}</time></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02b Pet dugmadi u turi (vlasnik, 5. 11. 2026): ista sekcija koja je bila
            na početnoj, tekst je već pisan za agenta ("Vi"). Ispod, ono što
            dugmad ne pokazuju. */}
        {HOME_COPY.sr.modules && (
          <section className="band" id="dugmad">
            <div className="wrap">
              <TourModulesShowcase copy={HOME_COPY.sr.modules} photoUrl={heroTour?.coverUrl ?? null} autoMs={7000} compact />
              <div className="ex">
                <h3 data-reveal="up">{extras.title}</h3>
                <ul>
                  {extras.items.map((item) => (
                    <li key={item.title} data-reveal="up"><b>{item.title}</b><span>{item.text}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 02c Uživo razgledanje (vlasnik, 5. 11. 2026): pravi snimci ture u
            režimu za agenta i kupčevog telefona, isti kadar (tura-koraci/uzivo-*.webp). */}
        <section className="lv is-dark" id="uzivo">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{live.eyebrow}</span>
                <h2 data-reveal="blur">{accent(live.title)}</h2>
                <p className="note" data-reveal="up">{live.text}</p>
              </div>
              <ol className="lv-steps">
                {live.steps.map((step) => (
                  <li key={step.title} data-reveal="list">
                    <div><b>{step.title}</b><span>{step.text}</span></div>
                  </li>
                ))}
              </ol>
              <p className="lv-use" data-reveal="up">{live.use}</p>
              <p className="lv-ctas" data-reveal="up">
                <a className="btn btn-primary" href="#kontakt" data-track="cta:agency_live">{live.cta}</a>
              </p>
            </div>
            <div className="lv-pair" aria-hidden="true" data-reveal="scale">
              <figure className="lv-ph agent">
                {/* eslint-disable-next-line @next/next/no-img-element -- snimak ekrana, unapred smanjen na 600 px */}
                <img src="/hero/tura-koraci/uzivo-agent.webp" width={600} height={1298} alt="" loading="lazy" />
                <figcaption>Vaš telefon</figcaption>
              </figure>
              <span className="lv-sync"><i />Isti kadar, uživo</span>
              <figure className="lv-ph">
                {/* eslint-disable-next-line @next/next/no-img-element -- snimak ekrana, unapred smanjen na 600 px */}
                <img src="/hero/tura-koraci/uzivo-kupac.webp" width={600} height={1298} alt="" loading="lazy" />
                <figcaption>Kupčev telefon</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* 03 Dokaz odmah posle priče: brojke iz sveta, sa izvorom. */}
        <section className="band" id="brojke">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" data-reveal="up">{proof.eyebrow}</span>
              <h2 data-reveal="blur">{accent(proof.title)}</h2>
            </div>
            <div className="proof-grid">
              {proof.items.map((item) => (
                <div key={item.value} className="proof-item" data-reveal="scale">
                  <b data-count>{item.value}</b>
                  <p>{item.label}</p>
                  <small>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" data-track="cta:agency_proof_source">
                      {item.source} ↗
                    </a>
                  </small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 04 Vlasnik stana i mesečni izveštaj (primer). */}
        <section className="owner is-dark" id="vlasnik">
          <div className="wrap">
            <div>
              <div className="section-head left">
                <span className="eyebrow" data-reveal="up">{owner.eyebrow}</span>
                <h2 data-reveal="blur">{accent(owner.title)}</h2>
                <p className="note" data-reveal="up">{owner.text}</p>
              </div>
              <ul className="owner-points">
                {owner.points.map((point) => <li key={point} data-reveal="list">{point}</li>)}
              </ul>
            </div>
            <div className="report-card" aria-label={owner.report.title} data-reveal="scale">
              <div className="report-head">
                <strong>{owner.report.title}</strong>
                <span>{owner.report.badge}</span>
              </div>
              <div className="kpi-grid">
                {owner.report.kpis.map((kpi) => (
                  <div key={kpi.label} className="kpi">
                    <small>{kpi.label}</small>
                    <b data-count>{kpi.value}</b>
                    <i>{kpi.delta}</i>
                  </div>
                ))}
              </div>
              <div className="rooms-title">{owner.report.roomsTitle}</div>
              {owner.report.rooms.map((room) => (
                <div key={room.name} className="room-bar">
                  {room.name}
                  <span><i style={{ width: `${room.pct}%` }} /></span>
                </div>
              ))}
              <div className="rooms-title">{owner.report.sourcesTitle}</div>
              <ol className="report-sources">
                {owner.report.sources.map((source) => <li key={source}>{source}</li>)}
              </ol>
              <div className="report-chips">
                {owner.report.chips.map((chip) => <span key={chip}>{chip}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* 06 Kako radimo - isti raspored kao na početnoj. */}
        <section id="kako-radi">
          <div className="wrap steps-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{steps.eyebrow}</span>
              <h2 data-reveal="blur">{accent(steps.title)}</h2>
              <p className="note" data-reveal="up">{steps.note}</p>
            </div>
            <div className="steps-row" data-reveal-steps>
              {steps.items.map((item, i) => (
                <div key={item.title} className="card step" data-reveal="up">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <details className="card embed-details" data-reveal="up">
              <summary>{steps.embed.summary}</summary>
              <div className="embed-body">
                <p>{steps.embed.text}</p>
                <div className="code-block">
                  &lt;<span className="tag">iframe</span>
                  <br />
                  &nbsp;&nbsp;<span className="attr">src</span>=<span className="str">&quot;{SITE_URL}/tour/{exampleSlug}&quot;</span>
                  <br />
                  &nbsp;&nbsp;<span className="attr">width</span>=<span className="str">&quot;100%&quot;</span> <span className="attr">height</span>=<span className="str">&quot;600&quot;</span>
                  <br />
                  &nbsp;&nbsp;<span className="attr">frameborder</span>=<span className="str">&quot;0&quot;</span> <span className="attr">allowfullscreen</span>&gt;
                  <br />
                  &lt;/<span className="tag">iframe</span>&gt;
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* Cene ukratko, kao na početnoj (vlasnik, 5. 11. 2026: ceo cenovnik je bio
            3 ekrana na telefonu); tabela po obimu je na /cenovnik. Ispod su
            ponude samo za agencije. */}
        {HOME_COPY.sr.pricingShort && (
          <PricingShort copy={HOME_COPY.sr.pricingShort} id="paketi" track="agency">
            <FirstOffers />
          </PricingShort>
        )}

        {/* Pitanja. */}
        <section id="pitanja">
          <div className="wrap faq-split">
            <div className="section-head left">
              <span className="eyebrow" data-reveal="up">{copy.faq.eyebrow}</span>
              <h2 data-reveal="blur">{accent(copy.faq.title)}</h2>
              <p className="note" data-reveal="up">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {copy.faq.items.map((item) => (
                <details key={item.question} className="card faq-item" data-reveal="up">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Kontakt: kraj priče. */}
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
            <ContactForm lang="sr" variant="agency" />
            <p className="contact-line">
              <a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a>
              <a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a>
              <a href={CONTACT_LINKS.map} target="_blank" rel="noopener noreferrer" data-track="contact:map">{address} ↗</a>
              <span>{contact.hours}</span>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter note={copy.footer} />
    </div>
  );
}
