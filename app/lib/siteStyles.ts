/**
 * Dizajn sistem sajta van ture: početna strana i strana za agencije dele
 * OVAJ isti CSS, da se ne razdvoje kad se nešto promeni na jednom mestu.
 * Oblici su preuzeti iz aplikacije (ture, /unos, admin): pun zaobljen oblik
 * dugmadi, kartice od 20px sa mekom senkom, polja od 10px na blago sivoj
 * podlozi, čipovi i stakleni tretman preko fotografija.
 */
export const SITE_STYLES = `
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
  /* Vrh bez makete (strana za agencije): jedna kolona, uži tekst - inače bi
     desna polovina ekrana ostala prazna. */
  .hero.hero-solo .wrap{grid-template-columns:1fr; max-width:820px;}

  /* ---------- KADAR IZ TURE ---------- */
  /* Delovi aplikacije preko fotografije su uvek svetli, kao u samoj turi. */
  .device{position:relative; border-radius:20px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid var(--line); aspect-ratio:16/11; background:var(--surface-2);}
  .device-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .device::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,transparent 32%,transparent 60%,rgba(0,0,0,.2) 100%); pointer-events:none; z-index:1;}
  .device-empty{display:flex; align-items:center; justify-content:center; color:var(--ink-faint); font-weight:600;}
  .device-empty::after{display:none;}
  /* Maketa nosi ISTI izgled kao sama tura: tamno staklo preko fotografije,
     traka "Prostorija X od Y" sa strelicama i kartica sa tekstom pri dnu.
     Vrednosti stakla su iste kao u app/tour/[slug]/theme.ts (GLASS). */
  .d-glass{background:rgba(15,23,42,.55); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.28); box-shadow:0 6px 20px rgba(0,0,0,.25); color:#fff;}
  .d-top{position:absolute; top:8px; left:8px; right:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px; z-index:2;}
  .d-title{border-radius:12px; padding:5px 11px 6px; min-width:0; max-width:62%;}
  .d-title small{display:block; color:#5B92D6; font-family:var(--font-display); font-size:.6rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-title strong{display:block; color:#fff; font-size:.78rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-langs{display:flex; gap:2px; border-radius:12px; padding:4px 5px; flex:none;}
  .d-langs span{font-size:.66rem; font-weight:700; color:rgba(255,255,255,.75); padding:3px 7px; border-radius:8px;}
  .d-langs span.on{background:#5B92D6; color:#fff;}

  .d-nav{position:absolute; top:52px; left:0; right:0; z-index:2; display:flex; justify-content:center; align-items:center; gap:8px; padding-inline:8px;}
  .d-step{flex:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; line-height:1; padding:0 0 2px; cursor:pointer; color:#fff;}
  .d-step:disabled{opacity:.35; cursor:default;}
  .d-current{min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:4px; border-radius:14px; padding:6px 13px 7px;}
  .d-current b{font-size:.58rem; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:rgba(255,255,255,.72); white-space:nowrap;}
  .d-current span{font-family:var(--font-display); font-size:.86rem; font-weight:700; line-height:1.15; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;}
  .d-dots{display:flex; align-items:center; gap:4px;}
  .d-dots i{width:5px; height:5px; border-radius:3px; background:rgba(255,255,255,.28);}
  .d-dots i.seen{background:rgba(255,255,255,.9);}
  .d-dots i.now{width:13px; background:#5B92D6;}

  .d-info{position:absolute; left:12px; right:12px; bottom:12px; margin-inline:auto; max-width:420px; border-radius:16px; padding:.7rem .8rem .7rem .95rem; z-index:2; display:grid; grid-template-columns:1fr auto; column-gap:.8rem; align-items:center;}
  .d-info h4{margin:0; font-family:var(--font-display); font-size:.88rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .d-info p{grid-column:1; color:rgba(255,255,255,.9); font-size:.74rem; line-height:1.45; margin-top:.15rem;}
  .d-open{grid-column:2; grid-row:1 / span 2; background:#1E5AA8; color:#fff; border-radius:999px; padding:.5rem .85rem; font-family:var(--font-display); font-size:.76rem; font-weight:700; text-decoration:none; white-space:nowrap; box-shadow:0 4px 14px rgba(30,90,168,.35);}
  .d-open:hover{background:#17447E;}
  @media (max-width:520px){ .d-info p, .d-langs span:not(.on){display:none;} .d-current span{max-width:120px;} }

  /* ---------- BENEFITI ---------- */
  .feat-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem;}
  /* Šest kartica: 3+3, da poslednji red ne ostane napola prazan. */
  .feat-grid.n-3{grid-template-columns:repeat(3,1fr);}
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
  /* Samo dva paketa (strana za agencije) - centrirano, da ne visi prazno mesto. */
  .price-grid.n-2{grid-template-columns:repeat(2,1fr); max-width:780px; margin-inline:auto;}
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
