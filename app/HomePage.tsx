import type { Metadata } from 'next';
import HeroDevice from '../components/HeroDevice';
import ContactForm from '../components/ContactForm';
import SiteTracker from '../components/SiteTracker';
import PriceCalculator from '../components/PriceCalculator';
import { Logo } from './tour/[slug]/Logo';
import { getShowcaseTours, pickHeroTour, type ShowcaseTour } from './lib/showcaseTours';
import { SITE_NAME, SITE_URL, CONTACT, CONTACT_LINKS, whatsappLink } from './lib/site';
import { HOME_COPY, type HomeCopy, type HomeLang } from './lib/homeCopy';
import { HOME_FAQ } from './lib/homeFaq';
import { homeJsonLd, serializeJsonLd } from './lib/structuredData';
import { getPublicOpenCount } from './lib/tourStats';
import { tourHref } from './lib/tourHref';

/**
 * Početna strana, jedan raspored za obe jezičke verzije: app/page.tsx (/,
 * srpski) i app/en/page.tsx (/en, engleski). Tekst je u lib/homeCopy.ts.
 */

// Obe verzije se međusobno najavljuju pretraživačima (hreflang), a srpska je
// podrazumevana za sve ostale jezike (x-default).
const LANGUAGE_ALTERNATES = { sr: '/', en: '/en', 'x-default': '/' };

export function homeMetadata(lang: HomeLang): Metadata {
  const { meta } = HOME_COPY[lang];
  const path = lang === 'sr' ? '/' : `/${lang}`;
  return {
    // absolute: /en je ispod root layout-a, pa bi mu šablon "%s | Kvadrat360"
    // dodao ime firme drugi put.
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: path, languages: LANGUAGE_ALTERNATES },
    // openGraph strane zamenjuje ceo openGraph iz layout-a, pa ide sve ponovo.
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: path,
      title: meta.title,
      description: meta.description,
      locale: lang === 'sr' ? 'sr_RS' : 'en_GB'
    }
  };
}

// Broj kolona prati broj tura, da nijedna kartica ne ostane sama u redu.
function gridClass(count: number): string {
  if (count === 1) return 'n-1';
  if (count === 2 || count === 4) return 'n-2';
  return 'n-3';
}

// Oblici komponenti su preuzeti iz aplikacije (ture, /unos, admin): pun
// zaobljen oblik dugmadi, kartice od 20px sa mekom senkom, polja od 10px
// na blago sivoj podlozi, čipovi i stakleni tretman preko fotografija.
const styles = `
  :root{
    --bg:#FAFAF7;
    --surface:#FFFFFF;
    --surface-2:#F1F1EC;
    --ink:#111113;
    --ink-soft:#5B5D63;
    --ink-faint:#8C8E93;
    --line:#E4E4DE;
    --line-strong:#D3D3CB;
    --accent:#1E5AA8;
    --accent-strong:#17447E;
    --accent-soft:#E9EFF6;
    --on-accent:#FFFFFF;
    --accent-glow:rgba(30,90,168,.35);
    --danger:#dc2626;
    --ok:#15803d;
    --dark-bg:#0E0E10;
    --dark-surface:#1A1A1E;
    --dark-ink:#F5F5F3;
    --dark-ink-soft:#A8A9AE;
    --dark-line:#2C2C30;
    --shadow:0 2px 8px rgba(17,17,19,.08);
    --shadow-lg:0 10px 30px rgba(17,17,19,.13);
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --bg:#101012;
      --surface:#17171A;
      --surface-2:#1D1D21;
      --ink:#F2F2EF;
      --ink-soft:#AEB0B6;
      --ink-faint:#797B81;
      --line:#2A2A2E;
      --line-strong:#38383D;
      --accent:#5B92D6;
      --accent-strong:#7FADE4;
      --accent-soft:#1A2433;
      --on-accent:#0B0E1A;
      --accent-glow:rgba(91,146,214,.32);
      --danger:#f87171;
      --ok:#4ade80;
      --shadow:0 2px 8px rgba(0,0,0,.4);
      --shadow-lg:0 14px 34px rgba(0,0,0,.5);
    }
  }
  :root[data-theme="dark"]{
    --bg:#101012;
    --surface:#17171A;
    --surface-2:#1D1D21;
    --ink:#F2F2EF;
    --ink-soft:#AEB0B6;
    --ink-faint:#797B81;
    --line:#2A2A2E;
    --line-strong:#38383D;
    --accent:#5B92D6;
    --accent-strong:#7FADE4;
    --accent-soft:#1A2433;
    --on-accent:#0B0E1A;
    --accent-glow:rgba(91,146,214,.32);
    --danger:#f87171;
    --ok:#4ade80;
    --shadow:0 2px 8px rgba(0,0,0,.4);
    --shadow-lg:0 14px 34px rgba(0,0,0,.5);
  }

  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:var(--bg);
    color:var(--ink);
    font-family:var(--font-body);
    font-size:16.5px;
    line-height:1.62;
    -webkit-font-smoothing:antialiased;
  }
  img{max-width:100%;}
  a{color:inherit;}
  [hidden]{display:none !important;}
  .wrap{width:100%; max-width:1180px; margin:0 auto; padding-inline:1.25rem;}
  h1,h2,h3{
    font-family:var(--font-display);
    font-weight:800;
    text-wrap:balance;
    margin:0;
    color:var(--ink);
    letter-spacing:-0.01em;
  }
  em{font-style:normal; color:var(--accent);}
  p{margin:0;}
  .eyebrow{
    font-family:var(--font-display);
    font-size:.76rem;
    font-weight:700;
    letter-spacing:.09em;
    text-transform:uppercase;
    color:var(--accent);
  }
  :focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:6px;}
  @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important;} html{scroll-behavior:auto;} }

  /* ---------- KOMPONENTE ---------- */
  .btn{
    font-family:var(--font-display); font-weight:700; font-size:.9rem; border-radius:999px; padding:.72rem 1.35rem;
    border:1px solid transparent; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
    transition:transform .15s ease, background .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease; white-space:nowrap;
  }
  .btn-primary{background:var(--accent); color:var(--on-accent); box-shadow:0 4px 14px var(--accent-glow);}
  .btn-primary:hover{background:var(--accent-strong);}
  .btn-secondary{background:var(--surface); color:var(--ink); border-color:var(--line); box-shadow:var(--shadow);}
  .btn-secondary:hover{border-color:var(--accent); color:var(--accent);}
  .btn-sm{font-size:.82rem; padding:.5rem .95rem;}
  .btn:disabled{opacity:.6; cursor:default;}
  @media (hover:hover){ .btn:not(:disabled):hover{transform:translateY(-1px);} }

  .chip{display:inline-flex; align-items:center; gap:.45rem; font-size:.84rem; font-weight:600; border-radius:16px; padding:.35rem .85rem; background:var(--surface); color:var(--ink-soft); border:1px solid var(--line); box-shadow:var(--shadow); white-space:nowrap;}
  .chip .dot{width:6px; height:6px; border-radius:50%; background:var(--accent); flex:none;}

  /* Isti tretman kao hotspotovi soba u panorami. */
  .glass{display:inline-flex; align-items:center; gap:5px; background:rgba(15,23,42,.34); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,.7); color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.45); border-radius:999px; padding:4px 10px; font-family:var(--font-display); font-size:.72rem; font-weight:700; box-shadow:0 2px 8px rgba(0,0,0,.2); white-space:nowrap;}
  .glass .dot{width:5px; height:5px; border-radius:50%; background:#5B92D6; box-shadow:0 0 0 2px rgba(255,255,255,.25); flex:none;}

  .card{background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:var(--shadow);}

  .field{display:flex; flex-direction:column; gap:.4rem;}
  .field label{font-size:.8rem; font-weight:600; color:var(--ink-soft);}
  .input{
    font-family:var(--font-body); font-size:.95rem; color:var(--ink); width:100%;
    background:var(--surface-2); border:1px solid var(--line-strong); border-radius:10px; padding:.72rem .85rem;
    transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .input::placeholder{color:var(--ink-faint);}
  .input:focus{outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); background:var(--surface);}
  textarea.input{resize:vertical; min-height:96px;}
  select.input{
    appearance:none; padding-right:2.2rem;
    background-image:linear-gradient(45deg,transparent 50%,var(--ink-faint) 50%),linear-gradient(135deg,var(--ink-faint) 50%,transparent 50%);
    background-position:calc(100% - 18px) 52%,calc(100% - 13px) 52%; background-size:5px 5px,5px 5px; background-repeat:no-repeat;
  }
  .row2{display:grid; grid-template-columns:1fr 1fr; gap:1rem;}
  @media (max-width:540px){ .row2{grid-template-columns:1fr;} }

  .toast{display:inline-flex; align-items:center; gap:.4rem; font-size:.85rem; font-weight:600; border-radius:999px; padding:.4rem .85rem;}
  .toast-ok{color:var(--accent); background:var(--accent-soft);}
  .toast-error{color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent);}

  /* ---------- MENI ---------- */
  /* Kartica koja lebdi pri vrhu - isti oblik kao gornja traka u turi. */
  .nav{position:sticky; top:0; z-index:40; padding-block:10px;}
  .nav-bar{
    display:flex; align-items:center; justify-content:space-between; gap:1rem;
    background:color-mix(in srgb, var(--surface) 90%, transparent); -webkit-backdrop-filter:saturate(140%) blur(10px); backdrop-filter:saturate(140%) blur(10px);
    border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); padding:.45rem .45rem .45rem .85rem;
  }
  .brand{text-decoration:none; display:inline-flex;}
  .navlinks{display:flex; align-items:center; gap:.2rem; list-style:none; margin:0; padding:0;}
  .navlinks a{display:block; text-decoration:none; font-size:.88rem; font-weight:600; color:var(--ink-soft); padding:.45rem .85rem; border-radius:999px; transition:background .15s ease, color .15s ease;}
  /* Samo gde postoji miš - na telefonu bi hover ostao "zalepljen" posle dodira. */
  @media (hover:hover){ .navlinks a:hover{background:var(--surface-2); color:var(--ink);} }
  /* Druga jezička verzija: uokviren čip, da se ne čita kao još jedna sekcija. */
  .nav-lang a{border:1px solid var(--line-strong); color:var(--ink); font-weight:700; letter-spacing:.04em; margin-left:.35rem;}

  section{padding-block:clamp(3rem,7vw,5.2rem); scroll-margin-top:76px;}

  /* Na užem ekranu linkovi ne nestaju: prelaze u drugi red kartice kao čipovi
     koji se pomeraju prstom, isto kao spisak soba u turi. Jezik ide prvi, da
     ga stranac na telefonu ne mora da traži skrolovanjem. */
  @media (max-width:980px){
    .nav-bar{flex-wrap:wrap; row-gap:.45rem;}
    .navlinks{order:3; flex-basis:100%; gap:.35rem; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;}
    .navlinks::-webkit-scrollbar{display:none;}
    .navlinks li{flex:none;}
    .navlinks a{font-size:.8rem; padding:.34rem .8rem; background:var(--surface-2); border:1px solid var(--line); white-space:nowrap;}
    .nav-lang{order:-1;}
    .nav-lang a{margin-left:0; background:var(--surface); border-color:var(--line-strong);}
    section{scroll-margin-top:124px;}
  }
  .band{background:var(--surface-2);}
  .section-head{display:flex; flex-direction:column; align-items:center; text-align:center; gap:.65rem; margin-bottom:clamp(2.2rem,4vw,3rem);}
  .section-head h2{font-size:clamp(1.8rem,2.8vw,2.5rem); max-width:22ch;}
  .section-head .note{max-width:52ch; color:var(--ink-soft); font-size:.98rem;}
  .section-head.left{align-items:flex-start; text-align:left; margin-bottom:0;}
  .section-head.left .note{max-width:40ch;}

  /* ---------- HERO ---------- */
  .hero{padding-block:clamp(1.4rem,4vw,2.6rem) clamp(2.6rem,6vw,4.4rem);}
  .hero .wrap{display:grid; grid-template-columns:1fr 1.08fr; gap:clamp(2rem,5vw,3.2rem); align-items:center;}
  .hero h1{font-size:clamp(2.5rem,4.6vw,3.9rem); line-height:1.06; margin-top:1rem;}
  .hero .lede{margin-top:1.15rem; max-width:42ch; color:var(--ink-soft); font-size:1.06rem;}
  .hero-ctas{display:flex; align-items:center; gap:.7rem; margin-top:1.8rem; flex-wrap:wrap;}
  .trust{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.4rem;}
  @media (max-width:940px){ .hero .wrap{grid-template-columns:1fr;} }

  /* ---------- KADAR IZ TURE ---------- */
  /* Delovi aplikacije preko fotografije su uvek svetli, kao u samoj turi. */
  .device{position:relative; border-radius:20px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid var(--line); aspect-ratio:16/11; background:var(--surface-2);}
  .device-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .device::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,transparent 32%,transparent 60%,rgba(0,0,0,.2) 100%); pointer-events:none; z-index:1;}
  .device-empty{display:flex; align-items:center; justify-content:center; color:var(--ink-faint); font-weight:600;}
  .device-empty::after{display:none;}
  .d-top{position:absolute; top:10px; left:10px; right:10px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px; z-index:2;}
  .d-title{background:#fff; border:1px solid #E4E4DE; border-radius:12px; box-shadow:0 2px 8px rgba(17,17,19,.08); padding:5px 11px; min-width:0; max-width:62%;}
  .d-title small{display:block; color:#1E5AA8; font-family:var(--font-display); font-size:.6rem; font-weight:800; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-title strong{display:block; color:#111113; font-size:.78rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-langs{display:flex; gap:2px; background:#fff; border:1px solid #E4E4DE; border-radius:12px; padding:3px; box-shadow:0 2px 8px rgba(17,17,19,.08); flex:none;}
  .d-langs span{font-size:.66rem; font-weight:700; color:#5B5D63; padding:3px 8px; border-radius:999px;}
  .d-langs span.on{background:#1E5AA8; color:#fff;}
  .d-rooms{position:absolute; top:54px; left:10px; right:10px; display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; z-index:2; padding-bottom:4px;}
  .d-rooms::-webkit-scrollbar{display:none;}
  .d-rooms button{flex:none; font-family:var(--font-body); font-size:.72rem; font-weight:500; background:#fff; color:#111113; border:1px solid #E4E4DE; border-radius:16px; padding:4px 10px; box-shadow:0 2px 8px rgba(17,17,19,.08); white-space:nowrap; cursor:pointer; transition:opacity .15s ease;}
  .d-rooms button[aria-pressed="true"]{background:#1E5AA8; color:#fff; border-color:#1E5AA8; font-weight:600;}
  .d-rooms button[aria-busy="true"]{opacity:.55;}
  .d-info{position:absolute; left:12px; right:12px; bottom:12px; margin-inline:auto; max-width:420px; background:#fff; border:1px solid #E4E4DE; border-radius:16px; box-shadow:0 10px 30px rgba(17,17,19,.15); padding:.7rem .8rem .7rem .95rem; z-index:2; display:grid; grid-template-columns:1fr auto; column-gap:.8rem; align-items:center;}
  .d-info h4{margin:0; color:#1E5AA8; font-family:var(--font-body); font-size:.86rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-info p{grid-column:1; color:#111113; font-size:.74rem; line-height:1.45; margin-top:.15rem;}
  .d-open{grid-column:2; grid-row:1 / span 2; background:#1E5AA8; color:#fff; border-radius:999px; padding:.5rem .85rem; font-family:var(--font-display); font-size:.76rem; font-weight:700; text-decoration:none; white-space:nowrap; box-shadow:0 4px 14px rgba(30,90,168,.35);}
  .d-open:hover{background:#17447E;}
  @media (max-width:520px){ .d-info p, .d-langs span:not(.on){display:none;} }

  /* ---------- BENEFITI ---------- */
  .feat-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;}
  .feat{padding:1.4rem 1.35rem; display:flex; flex-direction:column; gap:.55rem;}
  .feat h3{font-size:1.02rem; font-weight:700;}
  .feat p{color:var(--ink-soft); font-size:.9rem;}
  @media (max-width:1000px){ .feat-grid{grid-template-columns:1fr 1fr;} }
  @media (max-width:560px){ .feat-grid{grid-template-columns:1fr;} }

  /* ---------- KORACI ---------- */
  .steps-row{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.3rem;}
  @media (max-width:900px){ .steps-row{grid-template-columns:1fr 1fr;} }
  @media (max-width:520px){ .steps-row{grid-template-columns:1fr;} }
  .step{padding:1.35rem 1.35rem 1.45rem;}
  .step .num{display:inline-flex; align-items:center; justify-content:center; height:1.75rem; padding-inline:.7rem; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-family:var(--font-display); font-weight:800; font-size:.82rem; font-variant-numeric:tabular-nums;}
  .step h3{font-size:1.02rem; font-weight:700; margin-top:.85rem;}
  .step p{margin-top:.45rem; font-size:.9rem; color:var(--ink-soft);}

  .deliver-card{padding:1.6rem 1.8rem;}
  .deliver-card h3{font-size:1.05rem; font-weight:700; margin-bottom:1rem;}
  .deliver-list{display:grid; grid-template-columns:1fr 1fr; gap:.7rem 2rem; list-style:none; margin:0; padding:0;}
  @media (max-width:640px){ .deliver-list{grid-template-columns:1fr;} }
  .deliver-list li{display:flex; gap:.6rem; font-size:.92rem; color:var(--ink);}
  .deliver-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}

  /* ---------- TIPOVI OGLASA ---------- */
  .cat-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;}
  @media (max-width:880px){ .cat-grid{grid-template-columns:1fr;} }
  .cat-card{padding:1.6rem; display:flex; flex-direction:column; gap:.7rem;}
  .cat-card .eyebrow{font-size:.72rem;}
  .cat-card h3{font-size:1.2rem;}
  .cat-card .focus{font-size:.9rem; color:var(--ink-soft);}
  .cat-faq{background:var(--surface-2); border-radius:12px; padding:.8rem .95rem; margin-top:.4rem;}
  .cat-faq span{display:block; font-family:var(--font-display); font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-faint); margin-bottom:.3rem;}
  .cat-faq p{font-size:.9rem; color:var(--ink); font-style:italic;}

  /* ---------- PAKETI ---------- */
  .price-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.1rem; align-items:stretch;}
  @media (max-width:920px){ .price-grid{grid-template-columns:1fr;} }
  .price-card{position:relative; padding:1.7rem 1.6rem; display:flex; flex-direction:column; gap:1.1rem;}
  .price-card.featured{border:2px solid var(--accent); box-shadow:0 12px 32px -10px var(--accent-glow);}
  .price-badge{position:absolute; top:-.8rem; left:1.5rem; background:var(--accent); color:var(--on-accent); font-family:var(--font-display); font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:.35rem .75rem; border-radius:999px; box-shadow:0 4px 12px var(--accent-glow);}
  .price-audience{font-family:var(--font-display); font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .price-card h3{font-size:1.4rem;}
  .price-value{display:flex; align-items:baseline; gap:.35rem; font-size:.92rem; color:var(--ink-soft);}
  .price-value b{font-family:var(--font-display); font-size:2.2rem; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums;}
  .price-list{list-style:none; margin:0; padding:1rem 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.6rem; flex:1;}
  .price-list li{font-size:.88rem; color:var(--ink-soft); display:flex; gap:.6rem;}
  .price-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .price-cta{width:100%;}
  .fine-print{margin-top:1.4rem; font-size:.85rem; color:var(--ink-faint); text-align:center;}

  /* ---------- KALKULATOR ---------- */
  /* Cene i stepeni su u lib/pricing.ts; ovde je samo izgled. */
  .calc{margin-top:1.1rem; display:grid; grid-template-columns:1.1fr .9fr; overflow:hidden; scroll-margin-top:90px;}
  .calc > *{min-width:0;}
  @media (max-width:820px){ .calc{grid-template-columns:1fr;} }
  .calc-inputs{padding:1.5rem; display:flex; flex-direction:column; gap:1.3rem;}
  .calc h3{font-size:1.2rem;}
  .calc-sub{margin-top:.3rem; color:var(--ink-soft); font-size:.9rem;}
  .ctl-label{display:flex; justify-content:space-between; align-items:baseline; gap:.6rem; font-size:.82rem; font-weight:600; color:var(--ink-soft); margin-bottom:.55rem;}
  .ctl-hint{font-weight:500; color:var(--ink-faint); font-size:.76rem;}
  .stepper{display:flex; align-items:center; gap:.9rem;}
  .stepper button{flex:none; width:2.5rem; height:2.5rem; border-radius:50%; border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); font:inherit; font-size:1.25rem; font-weight:700; line-height:1; cursor:pointer; box-shadow:var(--shadow); display:inline-flex; align-items:center; justify-content:center;}
  .stepper button:disabled{opacity:.4; cursor:default; box-shadow:none;}
  @media (hover:hover){ .stepper button:not(:disabled):hover{border-color:var(--accent); color:var(--accent);} }
  .stepper output{font-family:var(--font-display); font-weight:800; font-size:1.8rem; min-width:2ch; text-align:center; font-variant-numeric:tabular-nums;}
  .stepper .unit{color:var(--ink-soft); font-size:.92rem;}
  .tiers{display:grid; grid-template-columns:repeat(4,1fr); gap:.4rem;}
  .tier{font:inherit; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:.5rem .3rem; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:.05rem; box-shadow:var(--shadow); transition:background .15s ease, border-color .15s ease;}
  .tier small{font-size:.7rem; font-weight:600; color:var(--ink-faint); font-variant-numeric:tabular-nums;}
  .tier b{font-family:var(--font-display); font-size:.95rem; font-variant-numeric:tabular-nums;}
  .tier[aria-pressed="true"]{background:var(--accent); border-color:var(--accent);}
  .tier[aria-pressed="true"] small, .tier[aria-pressed="true"] b{color:var(--on-accent);}
  @media (hover:hover){ .tier:not([aria-pressed="true"]):hover{border-color:var(--accent);} }
  .switch-row{display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem 1rem; border:1px solid var(--line); border-radius:14px; background:var(--surface-2); cursor:pointer;}
  .switch-row strong{display:block; font-size:.92rem; color:var(--ink);}
  .switch-row span span{font-size:.8rem; color:var(--ink-soft);}
  .switch{appearance:none; -webkit-appearance:none; flex:none; margin:0; width:2.6rem; height:1.5rem; border-radius:999px; background:var(--line-strong); position:relative; cursor:pointer; transition:background .15s ease;}
  .switch::after{content:""; position:absolute; top:3px; left:3px; width:calc(1.5rem - 6px); height:calc(1.5rem - 6px); border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .15s ease;}
  .switch:checked{background:var(--accent);}
  .switch:checked::after{transform:translateX(1.1rem);}
  .calc-result{background:var(--accent-soft); padding:1.5rem; display:flex; flex-direction:column; gap:.7rem; border-left:1px solid var(--line);}
  @media (max-width:820px){ .calc-result{border-left:0; border-top:1px solid var(--line);} }
  .result-label{font-family:var(--font-display); font-size:.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-faint);}
  .result-price{display:flex; align-items:baseline; gap:.3rem .6rem; flex-wrap:wrap;}
  .result-price b{font-family:var(--font-display); font-size:2.7rem; font-weight:800; line-height:1; color:var(--ink); font-variant-numeric:tabular-nums;}
  .result-price span{color:var(--ink-soft); font-size:.92rem;}
  .saving{align-self:flex-start; font-size:.8rem; font-weight:700; color:var(--ok); background:color-mix(in srgb, var(--ok) 14%, transparent); border-radius:999px; padding:.25rem .75rem;}
  .breakdown{list-style:none; margin:0; padding:0;}
  .breakdown li{display:flex; justify-content:space-between; gap:1rem; padding:.45rem 0; font-size:.86rem; color:var(--ink-soft); border-top:1px solid color-mix(in srgb, var(--accent) 18%, transparent);}
  .breakdown li span:last-child{color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; text-align:right;}
  .calc-note{font-size:.84rem; color:var(--ink); background:var(--surface); border:1px dashed var(--line-strong); border-radius:12px; padding:.6rem .8rem;}
  .calc-result .btn{margin-top:.2rem;}
  .calc-fine{font-size:.75rem; color:var(--ink-faint);}

  /* ---------- PRIMERI TURA ---------- */
  .tours-grid{display:grid; gap:1.2rem;}
  .tours-grid.n-1{grid-template-columns:minmax(0,560px); justify-content:center;}
  .tours-grid.n-2{grid-template-columns:repeat(2,1fr);}
  .tours-grid.n-3{grid-template-columns:repeat(3,1fr);}
  @media (max-width:900px){ .tours-grid.n-3{grid-template-columns:1fr 1fr;} }
  @media (max-width:620px){ .tours-grid.n-2, .tours-grid.n-3{grid-template-columns:1fr;} }
  .tour-card{overflow:hidden; display:flex; flex-direction:column; text-decoration:none; color:inherit; transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;}
  @media (hover:hover){ .tour-card:hover{transform:translateY(-3px); box-shadow:var(--shadow-lg);} .tour-card:hover .tour-open{border-color:var(--accent); color:var(--accent);} }
  .tour-photo{position:relative; aspect-ratio:1200/630; background:var(--surface-2);}
  .tour-photo img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .tour-photo .glass.tag{position:absolute; top:.75rem; left:.75rem;}
  .tour-langs{position:absolute; bottom:.75rem; right:.75rem; display:flex; gap:.3rem;}
  .tour-body{padding:1rem 1.15rem 1.2rem; display:flex; flex-direction:column; gap:.7rem; flex:1;}
  .tour-body h3{font-size:1.02rem; font-weight:700; line-height:1.3;}
  .tour-meta{font-size:.86rem; color:var(--ink-soft);}
  .tour-open{margin-top:auto; align-self:flex-start;}

  /* ---------- INTEGRACIJA ---------- */
  .integration{background:var(--dark-bg); color:var(--dark-ink);}
  .integration .wrap{display:grid; grid-template-columns:1fr 1.1fr; gap:clamp(2rem,5vw,3.5rem); align-items:center;}
  @media (max-width:880px){ .integration .wrap{grid-template-columns:1fr;} }
  .integration .eyebrow{color:#5B92D6;}
  .integration h2{color:var(--dark-ink); font-size:clamp(1.7rem,2.6vw,2.2rem); margin-top:.6rem;}
  .integration p.desc{margin-top:1rem; color:var(--dark-ink-soft); font-size:1rem; max-width:38ch;}
  .code-block{background:var(--dark-surface); border:1px solid var(--dark-line); border-radius:16px; padding:1.5rem 1.6rem; font-family:'Menlo','Consolas',monospace; font-size:.86rem; line-height:1.7; color:#C7C9D1; overflow-x:auto;}
  .code-block .tag{color:#5B92D6;}
  .code-block .attr{color:#E3B6E0;}
  .code-block .str{color:#9FD6A8;}

  /* ---------- KONTAKT ---------- */
  /* Naslov preko obe kolone, pa forma i kartice kreću sa iste visine. */
  .contact .wrap{display:grid; grid-template-columns:1.1fr .9fr; gap:1.5rem clamp(2rem,5vw,3.4rem); align-items:start;}
  .contact-head{grid-column:1 / -1; display:flex; flex-direction:column; gap:1.1rem;}
  @media (max-width:880px){ .contact .wrap{grid-template-columns:1fr;} }
  .contact h2{font-size:clamp(1.8rem,2.8vw,2.5rem); margin-top:.6rem; margin-bottom:.3rem;}
  .quick-contact{display:flex; flex-wrap:wrap; gap:.5rem;}
  .qc-dot{width:8px; height:8px; border-radius:50%; flex:none; background:var(--accent);}
  .qc-viber .qc-dot{background:#7360F2;}
  .qc-wa .qc-dot{background:#25D366;}
  .contact .wrap > *{min-width:0;}
  .contact-form{display:flex; flex-direction:column; gap:1rem; padding:1.4rem;}

  /* Željeni termin: dani kao čipovi koji se pomeraju prstom, pa deo dana. */
  .slot{border:1px solid var(--line); border-radius:16px; padding:.85rem 1rem 1rem; margin:0; min-width:0; display:flex; flex-direction:column; gap:.75rem; background:var(--surface-2);}
  .slot legend{font-size:.8rem; font-weight:600; color:var(--ink-soft); padding:0 .35rem;}
  .slot legend small{font-weight:500; color:var(--ink-faint);}
  .days{display:flex; gap:.45rem; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; min-height:3.3rem;}
  .days::-webkit-scrollbar{display:none;}
  .day, .win{font:inherit; color:var(--ink); background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow); cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:background .15s ease, border-color .15s ease, opacity .15s ease;}
  .day{flex:none; min-width:3.6rem; border-radius:14px; padding:.42rem .5rem;}
  .win{border-radius:12px; padding:.48rem .4rem;}
  .day small, .win small{font-size:.68rem; font-weight:600; color:var(--ink-faint);}
  .day small{text-transform:uppercase; letter-spacing:.04em;}
  .day b, .win b{font-family:var(--font-display); font-size:.95rem; font-variant-numeric:tabular-nums;}
  .day[aria-pressed="true"], .win[aria-pressed="true"]{background:var(--accent); border-color:var(--accent);}
  .day[aria-pressed="true"] small, .day[aria-pressed="true"] b, .win[aria-pressed="true"] small, .win[aria-pressed="true"] b{color:var(--on-accent);}
  .win:disabled{opacity:.45; cursor:default; box-shadow:none;}
  @media (hover:hover){ .day:hover, .win:not(:disabled):hover{border-color:var(--accent);} }
  .windows{display:grid; grid-template-columns:repeat(4,1fr); gap:.45rem;}
  @media (max-width:520px){ .windows{grid-template-columns:repeat(2,1fr);} }
  .slot-summary{font-size:.85rem; color:var(--ink-soft);}
  .slot-summary strong{color:var(--ink);}
  .form-foot{display:flex; flex-wrap:wrap; align-items:center; gap:.9rem;}
  .info-list{display:flex; flex-direction:column; gap:.7rem; margin:0;}
  .info-list > div{padding:.95rem 1.15rem;}
  .info-list dt{font-family:var(--font-display); font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); margin:0;}
  .info-list dd{margin:.25rem 0 0; font-size:1rem; font-weight:600; color:var(--ink);}
  .info-list dd a{text-decoration:none; transition:color .15s ease;}
  .info-list dd a:hover{color:var(--accent);}
  .info-list .ext{color:var(--ink-faint); font-weight:500; margin-left:.3rem;}

  /* ---------- ČESTA PITANJA ---------- */
  /* <details> radi i bez JavaScript-a, a tastatura i čitač ekrana ga znaju. */
  .faq-list{max-width:780px; margin:0 auto; display:flex; flex-direction:column; gap:.7rem;}
  .faq-item summary{list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1.05rem 1.25rem; font-family:var(--font-display); font-weight:700; font-size:1rem; color:var(--ink); transition:color .15s ease;}
  .faq-item summary::-webkit-details-marker{display:none;}
  .faq-item summary::after{content:"+"; flex:none; width:1.7rem; height:1.7rem; border-radius:50%; background:var(--accent-soft); color:var(--accent); display:inline-flex; align-items:center; justify-content:center; font-size:1.15rem; font-weight:700; line-height:1; transition:transform .2s ease;}
  .faq-item[open] summary::after{transform:rotate(45deg);}
  @media (hover:hover){ .faq-item summary:hover{color:var(--accent);} }
  .faq-item p{padding:0 1.25rem 1.2rem; color:var(--ink-soft); font-size:.94rem; max-width:65ch;}

  footer{border-top:1px solid var(--line); padding-block:1.6rem;}
  footer .wrap{display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; align-items:center;}
  footer p{font-size:.85rem; color:var(--ink-soft);}
`;

function TourCard({ tour, copy, lang }: { tour: ShowcaseTour; copy: HomeCopy; lang: HomeLang }) {
  const category = tour.category ? copy.categories[tour.category] : null;
  const rooms = copy.tourCard.rooms(tour.roomCount);

  return (
    <a
      className="card tour-card"
      href={tourHref(tour.slug, tour.languages, lang)}
      data-track={`cta:tour_card:${tour.slug}`}
    >
      <div className="tour-photo">
        {tour.coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- sličica je
             već 1200x630 JPG sa CDN-a, next/image nema šta da doda */
          <img src={tour.coverUrl} alt="" loading="lazy" decoding="async" />
        )}
        {category && (
          <span className="glass tag">
            <span className="dot" />
            {category}
          </span>
        )}
        <span className="tour-langs">
          {tour.languages.map((l) => (
            <span key={l} className="glass">
              {l.toUpperCase()}
            </span>
          ))}
        </span>
      </div>
      <div className="tour-body">
        <h3>{tour.title}</h3>
        <p className="tour-meta">{[tour.agency, rooms].filter(Boolean).join(' · ')}</p>
        <span className="btn btn-secondary btn-sm tour-open">{copy.tourCard.open}</span>
      </div>
    </a>
  );
}

export default async function HomePage({ lang }: { lang: HomeLang }) {
  const copy = HOME_COPY[lang];
  const faq = HOME_FAQ[lang];
  const { nav, hero, contact } = copy;

  const [tours, openCount] = await Promise.all([getShowcaseTours(lang), getPublicOpenCount()]);
  const heroTour = pickHeroTour(tours, lang);
  const exampleSlug = heroTour?.slug ?? tours[0]?.slug ?? 'naziv-ture';
  const address = [CONTACT.street, CONTACT.city, contact.country].filter(Boolean).join(', ');

  return (
    // <html lang="sr"> dolazi iz root layout-a za ceo sajt; omotač kaže
    // čitaču ekrana (i pregledaču pri deljenju reči) na kom je jeziku strana.
    // display: contents - omotač ne menja raspored.
    <div lang={lang} style={{ display: 'contents' }}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd(faq, lang)) }}
      />
      <SiteTracker />

      <header className="nav">
        <div className="wrap">
          <div className="nav-bar">
            <a className="brand" href="#pocetna" aria-label={nav.brandAria}>
              <Logo />
            </a>
            <ul className="navlinks">
              {tours.length > 0 && <li><a href="#primeri">{nav.examples}</a></li>}
              <li><a href="#kako-radimo">{nav.how}</a></li>
              <li><a href="#benefiti">{nav.benefits}</a></li>
              <li><a href="#paketi">{nav.packages}</a></li>
              <li><a href="#pitanja">{nav.faq}</a></li>
              <li className="nav-lang">
                <a href={nav.switchHref} hrefLang={nav.switchLang} lang={nav.switchLang} aria-label={nav.switchAria}>
                  {nav.switchLabel}
                </a>
              </li>
            </ul>
            <a className="btn btn-primary btn-sm" href="#kontakt" data-track="cta:nav_book">{nav.cta}</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="pocetna">
          <div className="wrap">
            <div>
              <span className="chip"><span className="dot" />{hero.chip}</span>
              <h1>{hero.titleStart}<em>{hero.titleEm}</em></h1>
              <p className="lede">{hero.lede}</p>
              <div className="hero-ctas">
                <a
                  className="btn btn-primary"
                  href={heroTour ? tourHref(heroTour.slug, heroTour.languages, lang) : '#primeri'}
                  data-track="cta:hero_tour"
                >
                  {hero.ctaTour}
                </a>
                <a className="btn btn-secondary" href="#paketi" data-track="cta:hero_packages">{hero.ctaPackages}</a>
              </div>
              <div className="trust">
                {hero.trust.map((item) => (
                  <span key={item} className="chip">{item}</span>
                ))}
                {openCount !== null && (
                  <span className="chip">{hero.opens(new Intl.NumberFormat(copy.locale).format(openCount))}</span>
                )}
              </div>
            </div>

            <HeroDevice tour={heroTour} lang={lang} />
          </div>
        </section>

        {tours.length > 0 && (
          <section className="band" id="primeri">
            <div className="wrap">
              <div className="section-head">
                <span className="eyebrow">{copy.examples.eyebrow}</span>
                <h2>{copy.examples.title}</h2>
                <p className="note">{copy.examples.note}</p>
              </div>
              <div className={`tours-grid ${gridClass(tours.length)}`}>
                {tours.map((tour) => (
                  <TourCard key={tour.slug} tour={tour} copy={copy} lang={lang} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="benefiti">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.benefits.eyebrow}</span>
              <h2>{copy.benefits.title}</h2>
              <p className="note">{copy.benefits.note}</p>
            </div>
            <div className="feat-grid">
              {copy.benefits.items.map((item) => (
                <div key={item.title} className="card feat">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="kako-radimo">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.steps.eyebrow}</span>
              <h2>{copy.steps.title}</h2>
              <p className="note">{copy.steps.note}</p>
            </div>

            <div className="steps-row">
              {copy.steps.items.map((item, i) => (
                <div key={item.title} className="card step">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>

            <div className="card deliver-card">
              <h3>{copy.steps.deliverTitle}</h3>
              <ul className="deliver-list">
                {copy.steps.deliver.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="tipovi">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.types.eyebrow}</span>
              <h2>{copy.types.title}</h2>
              <p className="note">{copy.types.note}</p>
            </div>
            <div className="cat-grid">
              {copy.types.items.map((item) => (
                <div key={item.eyebrow} className="card cat-card">
                  <span className="eyebrow">{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p className="focus">{item.focus}</p>
                  <div className="cat-faq"><span>{copy.types.faqLabel}</span><p>{item.faq}</p></div>
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
            <div className="price-grid">
              {copy.pricing.plans.map((plan) => (
                <div key={plan.track} className={`card price-card${plan.badge ? ' featured' : ''}`}>
                  {plan.badge && <span className="price-badge">{plan.badge}</span>}
                  <span className="price-audience">{plan.audience}</span>
                  <h3>{plan.title}</h3>
                  <div className="price-value">{plan.from} <b>{plan.amount}</b><span>{plan.unit}</span></div>
                  <ul className="price-list">
                    {plan.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a
                    className={`btn ${plan.badge ? 'btn-primary' : 'btn-secondary'} price-cta`}
                    href="#kontakt"
                    data-track={`cta:${plan.track}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="fine-print">{copy.pricing.fine}</p>
            <PriceCalculator lang={lang} />
          </div>
        </section>

        <section className="integration">
          <div className="wrap">
            <div>
              <span className="eyebrow">{copy.integration.eyebrow}</span>
              <h2>{copy.integration.title}</h2>
              <p className="desc">{copy.integration.desc}</p>
            </div>
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
        </section>

        <section className="band" id="pitanja">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">{copy.faq.eyebrow}</span>
              <h2>{copy.faq.title}</h2>
              <p className="note">{copy.faq.note}</p>
            </div>
            <div className="faq-list">
              {faq.map((item) => (
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
                <a className="btn btn-secondary btn-sm qc-wa" href={whatsappLink(lang)} target="_blank" rel="noopener noreferrer" data-track="contact:whatsapp">
                  <span className="qc-dot" />WhatsApp
                </a>
              </div>
            </div>
            <ContactForm lang={lang} />
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

      <footer>
        <div className="wrap">
          <Logo />
          <p>{copy.footer}</p>
        </div>
      </footer>
    </div>
  );
}
