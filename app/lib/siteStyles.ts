/**
 * Dizajn sistem sajta van ture: početna, /ture, blog i strana za agencije
 * dele OVAJ isti CSS, da se ne razdvoje kad se nešto promeni na jednom mestu.
 *
 * Izgled (septembar 2026, mockup "Ceo sajt u novom dizajnu"): veliki naslovi
 * poravnati levo, naglašena reč u kurzivu sa serifima (<em>, vidi
 * lib/accent.tsx), numerisana poglavlja (01, 02... - brojač ispod), smena
 * svetlih, sivih i tamnih sekcija, kartice od 24px, kontakt u plavom bloku.
 * Tamni delovi (.is-dark lista ispod) samo menjaju boje preko promenljivih,
 * pa sve komponente u njima rade bez posebnih pravila.
 */
export const SITE_STYLES = `
  :root{
    --bg:#FAFAF7;
    --surface:#FFFFFF;
    --surface-2:#F1F1EC;
    --ink:#111113;
    --ink-soft:#5B5D63;
    --ink-faint:#686A70;
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
      --ink-faint:#8E9096;
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
    --ink-faint:#8E9096;
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
  /* NEMA scroll-behavior:smooth na html: to je važilo za CEO dokument, pa i
     za prelaz na drugu stranu - Next pozove skok na vrh, animacija krene sa
     dna duge strane, a kraća strana je u međuvremenu već iscrtana, pa se
     animacija prekine na pola i posetilac otvori /ture usred spiska umesto
     na vrhu. Meko klizanje ka sidrima (#pitanja, #cenovnik...) sad radi
     preko JS-a (vidi components/NavScrollSpy.tsx), ne preko ovog pravila -
     tako ne može da procuri na navigaciju između strana. */
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
  .wrap{width:100%; max-width:1280px; margin:0 auto; padding-inline:clamp(1.25rem,4vw,2.5rem);}
  h1,h2,h3{
    font-family:var(--font-display);
    font-weight:800;
    text-wrap:balance;
    margin:0;
    color:var(--ink);
    letter-spacing:-0.03em;
  }
  /* Naglašena reč u naslovu: Newsreader kurziv. Debljina 500 i optička
     veličina 24 namerno: Newsreader na velikim naslovima sam prelazi na
     tanji, kontrastniji crtež (opsz do 72), a to bi vratilo problem zbog kog
     je zamenjen Instrument Serif - tanka, teško čitljiva slova.
     Veličina 1.1em i debljina 450 (vlasnik, 28. 9. 2026): na 1.05/500 je
     delovao sitnije od Jakarte 800 pored njega, na 1.16/500 preglasno - kao
     da se takmiči sa naslovom umesto da bude akcenat. Sredina vraća deo
     lakoće starog fonta, a ostaje čitljiva. */
  em{font-family:var(--font-serif); font-style:italic; font-weight:450; font-variation-settings:'opsz' 24; color:var(--accent); letter-spacing:-0.005em; font-size:1.1em; line-height:.9;}
  /* Pasusi bez "siročića" (jedne reči u poslednjem redu); naslovi već imaju balance. */
  p{margin:0; text-wrap:pretty;}
  /* Naglašena fraza u naslovu se ne lomi (lib/accent.tsx dodaje .keep kratkim frazama).
     Samo od 640px: na telefonu bi i kratka fraza u velikom naslovu mogla da izađe van ekrana. */
  @media (min-width:640px){ em.keep{white-space:nowrap;} }
  .eyebrow{
    font-family:var(--font-display);
    font-size:.8rem;
    font-weight:700;
    letter-spacing:.1em;
    text-transform:uppercase;
    color:var(--accent);
  }
  :focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:6px;}
  @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important;} }

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

  .card{background:var(--surface); border:1px solid var(--line); border-radius:24px; box-shadow:var(--shadow);}

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
  .nav{position:sticky; top:0; z-index:40; background:color-mix(in srgb, var(--bg) 88%, transparent); -webkit-backdrop-filter:saturate(140%) blur(12px); backdrop-filter:saturate(140%) blur(12px); border-bottom:1px solid var(--line);}
  .nav-bar{display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem 0;}
  .nav .btn-primary{background:#1E5AA8; color:#FFFFFF; box-shadow:none;}
  .nav .btn-primary:hover{background:#17447E; color:#FFFFFF;}
  .brand{text-decoration:none; display:inline-flex;}
  .navlinks{display:flex; align-items:center; gap:.2rem; list-style:none; margin:0; padding:0;}
  .navlinks a{display:block; white-space:nowrap; text-decoration:none; font-size:.88rem; font-weight:600; color:var(--ink-soft); padding:.45rem .85rem; border-radius:999px; transition:background .15s ease, color .15s ease;}
  /* Samo gde postoji miš - na telefonu bi hover ostao "zalepljen" posle dodira. */
  @media (hover:hover){ .navlinks a:hover{background:var(--surface-2); color:var(--ink);} }
  /* Sekcija kroz koju posetilac upravo prolazi (components/NavScrollSpy.tsx). */
  .navlinks a[aria-current="true"]{background:var(--accent-soft); border-color:var(--accent-soft); color:var(--accent);}
  @media (hover:hover){ .navlinks a[aria-current="true"]:hover{background:var(--accent-soft); color:var(--accent);} }
  /* Druga jezička verzija: uokviren čip, da se ne čita kao još jedna sekcija. */
  .nav-lang a{border:1px solid var(--line-strong); color:var(--ink); font-weight:700; letter-spacing:.04em; margin-left:.35rem;}
  /* Strelica na pilulama koje vode na DRUGU stranu (Link, href bez "#") - da
     se razlikuju od onih koje samo skroluju ovu stranu. Čisto po atributu
     href, pa ne traži izmenu nijedne strane koja SiteNav koristi (početna,
     /ture, /za-agencije...) - nova pilula ka novoj strani ovo dobija sama.
     EN je izuzet: već ima sopstveni, uočljiviji oblik (obrub). */
  .navlinks li:not(.nav-lang) > a:not([href^="#"])::after{
    content:"↗"; margin-left:.32em; font-size:.82em; opacity:.55; position:relative; top:-.05em;
  }

  section{padding-block:clamp(3.5rem,8vw,7rem); scroll-margin-top:76px;}

  /* Na užem ekranu linkovi ne nestaju: prelaze u drugi red kartice kao čipovi
     koji se pomeraju prstom, isto kao spisak soba u turi. Jezik ide prvi, da
     ga stranac na telefonu ne mora da traži skrolovanjem. */
  /* Između 980 i 1200px: linkovi zbijeniji; ako ih je i dalje previše (početna),
     traka linkova se pomera prstom umesto da gura dugme van ekrana. */
  .navlinks{min-width:0; overflow-x:auto; scrollbar-width:none;}
  .navlinks::-webkit-scrollbar{display:none;}
  @media (max-width:1200px){ .navlinks a{padding:.45rem .6rem; font-size:.84rem;} }
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
  main{counter-reset:chapter;}
  .section-head{display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:1rem; margin-bottom:clamp(2.4rem,5vw,3.8rem);}
  .section-head h2{font-size:clamp(2.1rem,4.2vw,3.5rem); line-height:1.06; max-width:24ch;}
  .section-head .note{max-width:60ch; color:var(--ink-soft); font-size:clamp(1rem,1.3vw,1.18rem); line-height:1.6;}
  .section-head.left{margin-bottom:0;}
  .section-head .eyebrow{color:var(--ink-soft); display:flex; align-items:center; gap:.8rem;}
  /* Broj poglavlja u kvadratu - isti znak kao u imenu Kvadrat360. */
  .section-head .eyebrow::before{counter-increment:chapter; content:counter(chapter, decimal-leading-zero); color:var(--accent); font-weight:800; letter-spacing:0;
    display:inline-grid; place-items:center; width:2.3em; height:2.3em; flex:none; font-size:.82em; line-height:1;
    border:1.5px solid color-mix(in srgb, var(--accent) 45%, transparent); border-radius:7px;
    background:color-mix(in srgb, var(--accent) 9%, transparent);}

  /* ---------- HERO ---------- */
  .hero{padding-block:clamp(2rem,6vw,5rem) clamp(3rem,7vw,6rem);}
  .hero .wrap{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,5vw,4rem); align-items:center;}
  .hero h1{font-size:clamp(2.4rem,5vw,4.4rem); line-height:1.04; letter-spacing:-0.035em; margin-top:1.2rem;}
  /* Slogan: "bez skrivenih ćoškova." uvek u svom redu i nikad prelomljen
     (vlasnik, 1. 10. 2026). Na uskom telefonu je ceo izraz za par piksela
     širi od ekrana, pa se naslov tu malo smanji srazmerno širini. */
  .hero h1 em{display:block; white-space:nowrap;}
  @media (max-width:480px){ .hero h1{font-size:min(2.4rem, calc(10.6vw - 4.5px));} }
  .hero .lede{margin-top:1.5rem; max-width:48ch; color:var(--ink-soft); font-size:clamp(1rem,1.3vw,1.18rem); line-height:1.6;}
  .hero-ctas{display:flex; align-items:center; gap:.7rem; margin-top:1.8rem; flex-wrap:wrap;}
  .trust{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.4rem;}
  @media (max-width:940px){ .hero .wrap{grid-template-columns:1fr;} }
  /* Vrh bez makete (strana za agencije): jedna kolona, uži tekst - inače bi
     desna polovina ekrana ostala prazna. */
  .hero.hero-solo .wrap{grid-template-columns:1fr;}
  .hero.hero-solo h1{max-width:20ch;}

  /* ---------- KADAR IZ TURE ---------- */
  /* Delovi aplikacije preko fotografije su uvek svetli, kao u samoj turi. */
  .device{position:relative; border-radius:28px; overflow:hidden; box-shadow:0 30px 70px rgba(17,17,19,.25); aspect-ratio:1/.95; background:var(--surface-2);}
  @media (max-width:940px){ .device{aspect-ratio:4/3.4; border-radius:22px;} }
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
  /* Filteri na spisku tura (/ture). */
  /* Svaki filter u svom redu, iste širine: dok su stajali jedan do drugog,
     meni krajnjeg desnog se otvarao preko desne margine strane. Ovako se
     panel uvek otvara ispod svog dugmeta i staje u istu širinu. */
  .filters{display:flex; flex-direction:column; align-items:flex-start; gap:.5rem; margin-bottom:1.1rem;}
  .filter-menu{position:relative; width:min(100%, 22rem);}
  .filter-toggle{display:flex; width:100%; align-items:center; gap:.5rem; cursor:pointer; font:inherit; color:var(--ink); background:var(--surface); border:1px solid var(--line-strong); border-radius:999px; padding:.5rem .9rem; line-height:1.2;}
  .filter-toggle:hover{border-color:var(--accent);}
  .filter-toggle-label{font-family:var(--font-display); font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint);}
  .filter-toggle-value{margin-left:auto; font-size:.88rem; font-weight:650; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right;}
  .filter-toggle.on{background:var(--accent); color:var(--on-accent); border-color:var(--accent);}
  .filter-toggle.on .filter-toggle-label{color:var(--on-accent); opacity:.75;}
  /* Strelica se crta, da meni ne zavisi od fonta za emodži. */
  .filter-caret{width:0; height:0; border-left:.3rem solid transparent; border-right:.3rem solid transparent; border-top:.34rem solid currentColor; opacity:.65;}
  .filter-toggle[aria-expanded="true"] .filter-caret{transform:rotate(180deg);}
  .filter-panel{position:absolute; z-index:30; top:calc(100% + .4rem); left:0; right:0; max-width:100%; max-height:17rem; overflow-y:auto; background:var(--surface); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow-lg); padding:.35rem;}
  .filter-opt{display:flex; align-items:center; gap:.6rem; padding:.45rem .55rem; border-radius:9px; cursor:pointer; font-size:.9rem; line-height:1.3;}
  .filter-opt:hover{background:var(--surface-2);}
  .filter-opt input{accent-color:var(--accent); width:1rem; height:1rem; flex:none; margin:0;}
  /* "Potvrdi" samo zatvara meni - kvačice se primenjuju odmah. Stoji tu da
     posetilac ima gde da klikne kad je gotov, umesto da pogađa da meni
     zatvara klik izvan njega. */
  .filter-panel-foot{display:flex; align-items:center; gap:.5rem; margin-top:.3rem; padding-top:.45rem; border-top:1px solid var(--line);}
  .filter-panel-clear{flex:1; padding:.45rem .55rem; background:none; border:none; border-radius:9px; font:inherit; font-size:.84rem; color:var(--accent); font-weight:650; text-align:left; cursor:pointer;}
  .filter-panel-clear:hover:not(:disabled){background:var(--surface-2);}
  .filter-panel-clear:disabled{color:var(--ink-faint); cursor:default;}
  .filter-panel-done{flex:none; padding:.45rem 1rem; background:var(--accent); color:var(--on-accent); border:1px solid var(--accent); border-radius:999px; font:inherit; font-size:.84rem; font-weight:700; cursor:pointer;}
  .filter-panel-done:hover{background:var(--accent-strong); border-color:var(--accent-strong);}
  /* Klizači (kvadratura, cena) - dva <input type=range> jedan preko drugog. */
  .filter-ranges{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem 1.6rem; margin-bottom:1.1rem;}
  .range-filter{min-width:0;}
  .range-head{display:flex; align-items:baseline; justify-content:space-between; gap:.6rem; margin-bottom:.5rem;}
  .range-label{font-family:var(--font-display); font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint);}
  .range-value{font-size:.88rem; font-weight:650; color:var(--ink-soft);}
  .range-filter.on .range-value{color:var(--accent);}
  .range-track{position:relative; height:1.4rem;}
  /* Šina i popunjeni deo se crtaju ispod, a same ručice hvataju klik. */
  .range-track::before{content:""; position:absolute; left:0; right:0; top:50%; height:4px; margin-top:-2px; border-radius:999px; background:var(--line-strong);}
  .range-fill{position:absolute; top:50%; height:4px; margin-top:-2px; border-radius:999px; background:var(--accent);}
  .range-input{position:absolute; left:0; width:100%; top:0; height:1.4rem; margin:0; background:none; pointer-events:none; appearance:none; -webkit-appearance:none;}
  .range-input:focus{outline:none;}
  .range-input::-webkit-slider-thumb{pointer-events:auto; appearance:none; -webkit-appearance:none; width:1.1rem; height:1.1rem; border-radius:50%; background:var(--surface); border:2px solid var(--accent); box-shadow:var(--shadow); cursor:grab;}
  .range-input::-moz-range-thumb{pointer-events:auto; width:1.1rem; height:1.1rem; border-radius:50%; background:var(--surface); border:2px solid var(--accent); box-shadow:var(--shadow); cursor:grab;}
  .range-input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px var(--accent-glow);}
  .range-input:focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px var(--accent-glow);}
  .range-note{margin:.35rem 0 0; font-size:.76rem; color:var(--ink-faint);}
  @media (max-width:560px){ .filter-ranges{grid-template-columns:1fr; gap:1.1rem;} }
  /* Lebdeća pilula: pali se tek kad filteri odu iznad ekrana, pa posetilac
     usred spiska ne mora da se vraća na vrh da bi promenio izbor.
     Iznad gornje trake (z-index 40), jer joj tačan razmak ispod trake
     postavlja TourList tek pošto izmeri njenu visinu - dok ta mera ne
     stigne, ovaj broj je samo gruba rezerva i ne sme da je proguta. */
  .filter-bar{position:fixed; z-index:45; top:76px; left:0; right:0; display:flex; justify-content:center; pointer-events:none; opacity:0; transform:translateY(-.5rem); transition:opacity .18s ease, transform .18s ease;}
  .filter-bar.show{opacity:1; transform:none;}
  .filter-bar.show .filter-bar-btn{pointer-events:auto;}
  .filter-bar-btn{display:inline-flex; align-items:center; gap:.5rem; font-family:var(--font-display); font-size:.86rem; font-weight:700; color:var(--ink); background:color-mix(in srgb, var(--surface) 92%, transparent); -webkit-backdrop-filter:saturate(140%) blur(10px); backdrop-filter:saturate(140%) blur(10px); border:1px solid var(--line-strong); border-radius:999px; padding:.5rem 1.1rem; box-shadow:var(--shadow-lg); cursor:pointer;}
  .filter-bar-btn.on{background:var(--accent); color:var(--on-accent); border-color:var(--accent);}
  .filter-bar-count{display:inline-grid; place-items:center; min-width:1.35rem; height:1.35rem; padding:0 .35rem; border-radius:999px; background:var(--accent); color:var(--on-accent); font-size:.76rem; font-variant-numeric:tabular-nums;}
  .filter-bar-btn.on .filter-bar-count{background:var(--on-accent); color:var(--accent);}

  /* Prozor sa filterima - isti kontrolori, samo dostupni usred spiska. */
  .filter-sheet{position:fixed; inset:0; z-index:60; display:flex; align-items:flex-start; justify-content:center; padding:1.25rem;}
  .filter-sheet-scrim{position:absolute; inset:0; border:none; padding:0; background:rgba(15,23,42,.45); cursor:pointer;}
  .filter-sheet-panel{position:relative; display:flex; flex-direction:column; width:min(100%, 30rem); max-height:min(80vh, 44rem); margin-top:4.5rem; background:var(--surface); border:1px solid var(--line); border-radius:20px; box-shadow:var(--shadow-lg); overflow:hidden;}
  .filter-sheet-head{display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.1rem .8rem; border-bottom:1px solid var(--line);}
  .filter-sheet-head h2{font-size:1.05rem;}
  .filter-sheet-close{background:none; border:none; font-size:1.6rem; line-height:1; color:var(--ink-faint); cursor:pointer; padding:0 .25rem;}
  .filter-sheet-close:hover{color:var(--ink);}
  .filter-sheet-body{padding:1.1rem; overflow-y:auto;}
  .filter-sheet-body .filter-ranges{margin-bottom:0;}
  .filter-sheet-body .filter-menu{width:100%;}
  .filter-sheet-body .filter-ranges{grid-template-columns:1fr;}
  /* U prozoru meni se otvara U TOKU, a ne lebdeći: panel koji lebdi bi ga
     odsekao donji rub prozora čim je spisak duži od preostalog mesta. */
  .filter-sheet-body .filter-panel{position:static; max-height:none; margin-top:.35rem; background:var(--surface-2); box-shadow:none;}
  .filter-sheet-foot{display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.85rem 1.1rem; border-top:1px solid var(--line); background:var(--surface);}
  .filter-sheet-foot .filter-reset:disabled{color:var(--ink-faint); cursor:default; text-decoration:none;}
  @media (max-width:560px){
    /* Na telefonu prozor sedi uz donju ivicu, nadohvat palca. */
    .filter-sheet{padding:0; align-items:flex-end;}
    .filter-sheet-panel{width:100%; max-height:88vh; margin-top:auto; border-radius:20px 20px 0 0;}
  }

  .filter-count{margin:.2rem 0 1.2rem; font-size:.88rem; color:var(--ink-soft); display:flex; align-items:center; gap:.6rem; flex-wrap:wrap;}
  .map-cta{display:flex; flex-direction:column; align-items:center; gap:.7rem; text-align:center; margin:0 0 1.6rem;}
  .map-cta-text{margin:0; font-family:var(--font-display); font-size:1rem; font-weight:650; color:var(--ink);}
  .map-toggle-btn{display:inline-flex; align-items:center; gap:.4rem; font-family:var(--font-display); font-size:.82rem; font-weight:700; color:var(--ink); background:var(--surface); border:1px solid var(--line-strong); border-radius:999px; padding:.4rem .9rem; cursor:pointer; white-space:nowrap;}
  .map-toggle-btn.on{background:var(--accent); color:var(--on-accent); border-color:var(--accent);}
  .map-toggle-btn-lg{font-size:1rem; padding:.75rem 1.6rem; gap:.55rem; box-shadow:var(--shadow);}
  .tour-map{width:100%; height:420px; border-radius:16px; overflow:hidden; margin-bottom:1.4rem; border:1px solid var(--line-strong);}
  .tour-map-empty{width:100%; padding:2rem; text-align:center; border-radius:16px; margin-bottom:1.4rem; background:var(--bg); border:1px solid var(--line-strong); color:var(--ink-soft); font-size:.9rem;}
  .tour-map .leaflet-popup-content-wrapper{border-radius:10px;}
  @media (max-width:560px){ .tour-map{height:320px;} }
  .filter-reset{background:none; border:none; padding:0; font:inherit; color:var(--accent); font-weight:650; cursor:pointer; text-decoration:underline;}

  /* /ture: vrsta oglasa kao četiri dugmeta, ostali filteri u jednoj traci. */
  .tl-seg{display:inline-flex; gap:2px; max-width:100%; background:var(--surface); border:1px solid var(--line-strong); border-radius:999px; padding:4px;}
  .tl-seg button{border:0; background:none; font:inherit; font-size:.9rem; font-weight:600; color:var(--ink-soft); padding:.5rem 1.05rem; border-radius:999px; cursor:pointer; white-space:nowrap;}
  .tl-seg button:hover{color:var(--ink);}
  .tl-seg button[aria-pressed="true"]{background:var(--accent); color:var(--on-accent);}
  .tl-bar{display:flex; margin-top:.9rem; background:var(--surface); border:1px solid var(--line-strong); border-radius:22px; box-shadow:var(--shadow-lg);}
  .tl-bar > .filter-menu{flex:1 1 0; width:auto; min-width:0; border-left:1px solid var(--line);}
  .tl-bar > .filter-menu:first-child{border-left:0;}
  .tl-bar .filter-toggle{display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"label label" "value caret"; row-gap:.15rem; column-gap:.4rem; background:none; border:0; border-radius:21px; padding:.7rem 1.1rem; text-align:left;}
  .tl-bar .filter-toggle:hover:not(:disabled){background:var(--surface-2);}
  .tl-bar .filter-toggle:disabled{cursor:default;}
  .tl-bar .filter-toggle:disabled .filter-toggle-value{color:var(--ink-faint); font-weight:500;}
  .tl-bar .filter-toggle-label{grid-area:label; font-size:.66rem; font-weight:800;}
  .tl-bar .filter-toggle-value{grid-area:value; margin:0; text-align:left; font-size:.92rem; font-weight:600;}
  .tl-bar .filter-caret{grid-area:caret;}
  .tl-bar .filter-toggle.on{background:none; color:var(--ink);}
  .tl-bar .filter-toggle.on:hover{background:var(--surface-2);}
  .tl-bar .filter-toggle.on .filter-toggle-label{color:var(--accent); opacity:1;}
  .tl-bar .filter-panel{right:auto; min-width:15rem;}
  .tl-bar > .filter-menu:nth-last-child(-n+2) .filter-panel{left:auto; right:0;}
  .tl-range-panel{min-width:18rem !important; padding:.9rem 1rem .45rem;}
  /* Mapa desno od filtera: traka tada ide u dva reda po tri polja. */
  .tl-top{margin-bottom:1.6rem;}
  .tl-top .tl-meta{margin-bottom:0;}
  .tl-map{margin-top:1rem;}
  .tl-map .tour-map, .tl-map .tour-map-empty{margin:0;}
  @media (min-width:861px){
    .tl-top.with-map{display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); gap:1.4rem; align-items:stretch;}
    .tl-top.with-map .tl-map{margin:0; min-height:300px; display:flex;}
    .tl-top.with-map .tl-map .tour-map{flex:1; height:auto; min-height:300px;}
    .tl-top.with-map .tl-map .tour-map-empty{flex:1; display:grid; place-items:center;}
    .tl-top.with-map .tl-bar{display:grid; grid-template-columns:repeat(3,minmax(0,1fr));}
    .tl-top.with-map .tl-bar > .filter-menu{border-left:1px solid var(--line); border-top:1px solid var(--line);}
    .tl-top.with-map .tl-bar > .filter-menu:nth-child(3n+1){border-left:0;}
    .tl-top.with-map .tl-bar > .filter-menu:nth-child(-n+3){border-top:0;}
    .tl-top.with-map .tl-bar > .filter-menu .filter-panel{left:0; right:auto;}
    .tl-top.with-map .tl-bar > .filter-menu:nth-child(3n) .filter-panel{left:auto; right:0;}
  }
  .tl-meta{display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; margin:1rem 0 1.2rem;}
  .tl-chip{display:inline-flex; align-items:center; gap:.4rem; background:var(--accent-soft); color:var(--accent); border:0; border-radius:999px; padding:.35rem .45rem .35rem .8rem; font:inherit; font-size:.84rem; font-weight:650; cursor:pointer;}
  .tl-chip span{display:inline-grid; place-items:center; width:1.15rem; height:1.15rem; border-radius:50%; background:var(--surface); font-size:.8rem; line-height:1;}
  .tl-chip:hover span{background:var(--accent); color:var(--on-accent);}
  .tl-count{margin:0 0 0 auto; font-size:.9rem; color:var(--ink-soft);}
  .tl-mobile{display:none; gap:.5rem; margin-top:.8rem;}
  .tl-mobile-btn{flex:1; justify-content:center; font-size:.92rem; padding:.7rem 1rem; border-radius:14px;}
  button.tl-mobile-btn{display:inline-flex; align-items:center; gap:.5rem; font-family:var(--font-display); font-weight:700; color:var(--ink); background:var(--surface); border:1px solid var(--line-strong); cursor:pointer;}
  button.tl-mobile-btn.on{background:var(--accent); color:var(--on-accent); border-color:var(--accent);}
  .filter-sheet-body .tl-seg{display:flex; flex-wrap:wrap; border-radius:18px; margin-bottom:1rem;}
  @media (max-width:860px){
    .tl-bar, .tl-map-desk{display:none !important;}
    .tl-mobile{display:flex;}
    .tl-seg{display:flex; overflow-x:auto; scrollbar-width:none;}
    .tl-seg::-webkit-scrollbar{display:none;}
    .tl-count{margin-left:0; width:100%; order:-1;}
  }
  /* Na telefonu meni ide preko cele širine kartice, da duga imena naselja
     ne isteraju panel van ekrana. */
  @media (max-width:560px){
    .filters{gap:.4rem;}
    .filter-menu{width:100%;}
  }

  .feat-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:1.2rem; counter-reset:feat;}
  /* Šest kartica: 3+3, da poslednji red ne ostane napola prazan. */
  .feat-grid.n-3{grid-template-columns:repeat(3,1fr);}
  .feat{padding:1.8rem 1.7rem; display:flex; flex-direction:column; gap:.65rem; box-shadow:none;}
  .feat::before{counter-increment:feat; content:counter(feat, decimal-leading-zero); font-family:var(--font-display); font-weight:800; font-size:.95rem; color:var(--accent);}
  .feat h3{font-size:1.18rem; font-weight:700; line-height:1.25; letter-spacing:-0.015em;}
  .feat p{color:var(--ink-soft); font-size:.95rem; line-height:1.6;}
  /* I .n-3 mora da se navede: ima veću specifičnost od samog .feat-grid, pa
     bi inače ostao u tri kolone i na telefonu (strana za agencije). */
  @media (max-width:1000px){ .feat-grid, .feat-grid.n-3{grid-template-columns:1fr 1fr;} }
  @media (max-width:560px){ .feat-grid, .feat-grid.n-3{grid-template-columns:1fr;} }

  /* ---------- KORACI ---------- */
  .steps-row{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.3rem;}
  @media (max-width:900px){ .steps-row{grid-template-columns:1fr 1fr;} }
  @media (max-width:520px){ .steps-row{grid-template-columns:1fr;} }
  .step{padding:1.35rem 1.35rem 1.45rem;}
  .steps-split{display:grid; grid-template-columns:1fr 1.5fr; gap:clamp(2rem,5vw,4.5rem); align-items:start;}
  @media (max-width:900px){ .steps-split{grid-template-columns:1fr;} }
  .steps-side .deliver-card{margin-top:2.2rem;}
  .steps-side .deliver-list{grid-template-columns:1fr;}
  .steps-split .steps-row{grid-template-columns:1fr; gap:.9rem; margin:0;}
  .steps-split .step{display:grid; grid-template-columns:4.6rem 1fr; column-gap:1.1rem; align-items:center; padding:1.6rem 1.8rem; border:0; box-shadow:none;}
  .steps-split .step .num{grid-row:span 2; background:none; padding:0; height:auto; font-size:2.6rem; letter-spacing:-0.02em;}
  .steps-split .step h3{margin:0; font-size:1.25rem;}
  .steps-split .step p{margin-top:.35rem; font-size:1rem;}
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

  /* ---------- CENOVNIK ---------- */
  /* Cena po stavci: tura i fotografije stoje napisane odvojeno, pre paketa
     koji ih spajaju u jednu cenu po nekretnini. Lakše kartice od paketa -
     ovde nema dugmeta ni nalepnice, samo cena i šta za nju ulazi. */
  .rate-head{max-width:820px; margin:3rem 0 1.4rem;}
  .rate-head h3{font-size:1.5rem; margin:0 0 .4rem;}
  .rate-head .note{color:var(--ink-soft);}
  .rate-head + .rate-grid, .rate-head + .price-grid{margin-bottom:1rem;}
  /* Tabela za više nekretnina (VolumeDetails): na računaru otvorena i izgleda
     kao običan naslov; na telefonu sklopljena pločica koja se otvara dodirom. */
  .vol-details{margin:3rem 0 1rem;}
  .vol-details > summary{list-style:none; display:flex; align-items:center; justify-content:space-between; gap:.8rem; max-width:820px; cursor:pointer;}
  .vol-details > summary::-webkit-details-marker{display:none;}
  .vol-details > summary h3{font-size:1.5rem; margin:0;}
  .vol-details-chevron{color:var(--accent); font-size:1.1rem; transition:transform .2s ease;}
  .vol-details[open] .vol-details-chevron{transform:rotate(180deg);}
  .vol-details .note{color:var(--ink-soft); max-width:820px; margin:.4rem 0 1.4rem;}
  @media (min-width:721px){ .vol-details > summary{pointer-events:none;} .vol-details-chevron{display:none;} }
  @media (max-width:720px){
    .vol-details{margin-top:2rem;}
    .vol-details > summary{padding:1rem 1.1rem; border:1px solid var(--line); border-radius:16px; background:var(--surface);}
    .vol-details > summary h3{font-size:1.05rem;}
    .vol-details[open] > summary{margin-bottom:.8rem;}
  }
  .rate-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.1rem; align-items:stretch;}
  @media (max-width:920px){ .rate-grid{grid-template-columns:1fr;} }
  /* min-width:0 - bez njega flex/grid stavka ne sme da se suzi ispod širine
     svog NEPREKINUTOG sadržaja (npr. "27.500 din."), pa gura ceo red preko
     ivice kartice umesto da dozvoli prelom. Dinarski iznosi su duži od
     evra, pa je ovo od uvođenja dinara postalo stvarno vidljivo. */
  .rate-card{padding:2rem 1.9rem; display:flex; flex-direction:column; gap:.8rem; min-width:0; box-shadow:none;}
  .rate-card h4{font-family:var(--font-display); font-size:1.05rem; font-weight:700; margin:0;}
  .rate-price{display:flex; align-items:baseline; flex-wrap:wrap; gap:.35rem; margin:0; font-size:.86rem; color:var(--ink-soft);}
  .rate-price b{font-family:var(--font-display); font-size:2.3rem; letter-spacing:-0.02em; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums;}
  .rate-price .price-was{font-size:.92rem;}

  .price-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:1.3rem; align-items:stretch; padding-top:.9rem;}
  /* Samo dva paketa (strana za agencije) - centrirano, da ne visi prazno mesto. */
  .price-grid.n-2{grid-template-columns:repeat(2,1fr);}
  /* I .n-2 mora da se navede: ima veću specifičnost od samog .price-grid,
     pa bi inače nadjačao ovo pravilo i ostao u dve kolone na telefonu. */
  @media (max-width:920px){ .price-grid, .price-grid.n-2{grid-template-columns:1fr;} }
  .price-card{position:relative; padding:2.2rem 2rem; display:flex; flex-direction:column; gap:1.1rem; min-width:0; box-shadow:none;}
  .price-card.featured{border:0; box-shadow:0 30px 60px -20px rgba(17,17,19,.45);}
  /* Sva CTA dugmad su plava (boja sajta), i u običnoj i u istaknutoj (tamnoj) kartici. */
  .price-card .price-cta{background:#1E5AA8; color:#FFFFFF; border:0; box-shadow:none;}
  .price-card .price-cta:hover{background:#17447E; color:#FFFFFF;}
  .price-badge{position:absolute; top:-.8rem; left:1.5rem; background:var(--accent); color:var(--on-accent); font-family:var(--font-display); font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:.35rem .75rem; border-radius:999px; box-shadow:0 4px 12px var(--accent-glow);}
  /* Nalepnica sa popustom, u uglu kartice - kao pečat u prospektu. Crvena, da
     se ne stopi sa plavim čipom u suprotnom uglu (components/PromoPrice.tsx). */
  .price-sale{position:absolute; top:-.85rem; right:1.1rem; z-index:2; width:3.5rem; height:3.5rem; border-radius:50%; display:grid; place-items:center; background:var(--danger); color:#fff; border:2px solid var(--surface); font-family:var(--font-display); font-weight:800; font-size:.95rem; font-variant-numeric:tabular-nums; transform:rotate(9deg); box-shadow:0 6px 16px color-mix(in srgb, var(--danger) 35%, transparent);}
  @media (prefers-reduced-motion:no-preference){ .price-card:hover .price-sale{transform:rotate(9deg) scale(1.06); transition:transform .18s ease;} }
  .price-was{color:var(--ink-faint); font-size:1rem; font-weight:600; text-decoration-thickness:2px; font-variant-numeric:tabular-nums;}
  .price-audience{font-family:var(--font-display); font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .price-card h3{font-size:1.7rem;}
  .price-value{display:flex; flex-wrap:wrap; align-items:baseline; gap:.35rem; font-size:.92rem; color:var(--ink-soft);}
  .price-value b{font-family:var(--font-display); font-size:2.8rem; letter-spacing:-0.025em; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums;}
  .price-list{list-style:none; margin:0; padding:1rem 0 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.6rem; flex:1;}
  .price-list li{font-size:.88rem; color:var(--ink-soft); display:flex; gap:.6rem;}
  .price-list li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .price-cta{width:100%;}
  .fine-print{margin-top:1.4rem; font-size:.88rem; color:var(--ink-soft); max-width:90ch;}

  /* Blog (/blog, /blog/[slug]) */
  .blog-grid{display:grid; grid-template-columns:repeat(2,1fr); gap:1.4rem;}
  @media (max-width:720px){ .blog-grid{grid-template-columns:1fr;} }
  .blog-card{padding:2.2rem 2.1rem; display:block; text-decoration:none; color:inherit; box-shadow:none; transition:transform .18s ease, box-shadow .18s ease;}
  @media (hover:hover){ .blog-card:hover{transform:translateY(-3px); box-shadow:var(--shadow-lg);} }
  .blog-card:nth-child(2n){background:var(--surface);}
  .blog-card h3{font-family:var(--font-display); font-size:clamp(1.4rem,2vw,1.8rem); line-height:1.2; letter-spacing:-0.02em; font-weight:800; margin:0 0 .8rem;}
  .blog-card .note{margin:0; color:var(--ink-soft); font-size:1rem; line-height:1.6;}
  .blog-article{max-width:760px;}
  .blog-section{margin-bottom:2.6rem;}
  .blog-section h2{font-size:clamp(1.6rem,2.8vw,2.1rem); line-height:1.2; margin:0 0 1rem;}
  .blog-section p{color:var(--ink); opacity:.88; line-height:1.75; margin:0 0 1.2rem; font-size:1.1rem;}
  .blog-list{margin:0; padding:0;}
  .blog-list > div{margin-bottom:1.1rem;}
  .blog-list dt{font-weight:700; color:var(--ink); margin-bottom:.3rem;}
  .blog-list dd{margin:0; color:var(--ink-soft); line-height:1.65;}
  .blog-related{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.7rem;}
  .blog-related a{color:var(--accent); font-weight:600; text-decoration:none;}
  .blog-related a:hover{text-decoration:underline;}
  .blog-bullets{margin:0 0 1rem; padding:0; list-style:none; display:flex; flex-direction:column; gap:.55rem;}
  .blog-bullets li{font-size:1.05rem; color:var(--ink); opacity:.88; line-height:1.6; display:flex; gap:.75rem;}
  .blog-bullets li::before{content:""; width:8px; height:8px; margin-top:.6em; border-radius:50%; background:var(--accent); flex:none;}
  .blog-callout{border-radius:26px; padding:2rem 2.2rem; margin-bottom:2.6rem;}
  .blog-callout h2{font-size:1.3rem; font-weight:800; letter-spacing:-0.01em; color:var(--accent); margin:0 0 1rem;}
  .blog-callout .blog-bullets li{color:var(--ink);}
  /* Promo traka (PromoBanner) - crta se samo dok kampanja traje. U potpisu
     sajta: plavi prelaz, svetlo levo gore i mreža kvadrata. Veliki procenat
     levo, rečenica sa cenom, odbrojavanje u kockicama, belo dugme ka formi. */
  .promo-card{position:relative; overflow:hidden; display:flex; align-items:center; gap:1rem 1.6rem; flex-wrap:wrap; margin:0 0 1.6rem; padding:1.2rem 1.5rem; border-radius:20px; color:#fff;
    background:
      radial-gradient(55% 140% at 8% -40%, rgba(165,200,242,.5) 0%, transparent 70%),
      linear-gradient(rgba(255,255,255,.075) 1px, transparent 1px) -1px -1px / 26px 26px,
      linear-gradient(90deg, rgba(255,255,255,.075) 1px, transparent 1px) -1px -1px / 26px 26px,
      linear-gradient(135deg, #1E5AA8 0%, #17447E 100%);
    box-shadow:0 18px 40px -18px rgba(23,68,126,.7);}
  .promo-big{font-family:var(--font-display); font-weight:800; font-size:2.6rem; line-height:1; letter-spacing:-0.03em; flex:none;}
  .promo-big small{display:block; margin-top:.35rem; font-size:.66rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; opacity:.8;}
  .promo-mid{flex:1 1 16rem; min-width:0; display:flex; flex-direction:column; gap:.2rem;}
  .promo-mid b{font-family:var(--font-display); font-size:1.12rem; font-weight:800; line-height:1.25;}
  .promo-mid span{font-size:.85rem; opacity:.88; line-height:1.45;}
  .promo-cd{display:flex; gap:.45rem; flex:none;}
  .promo-cd div{min-width:3.4rem; text-align:center; padding:.45rem .55rem; border-radius:12px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.26); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);}
  .promo-cd b{display:block; font-family:var(--font-display); font-size:1.25rem; font-weight:800; font-variant-numeric:tabular-nums; line-height:1.1;}
  .promo-cd small{font-size:.66rem; font-weight:600; opacity:.85;}
  .promo-cta{flex:none; display:inline-flex; align-items:center; padding:.7rem 1.2rem; border-radius:999px; background:linear-gradient(180deg,#FFFFFF,#EAF1FB); color:#1E5AA8; font-family:var(--font-display); font-weight:800; font-size:.9rem; text-decoration:none; box-shadow:0 8px 18px -10px rgba(5,20,50,.6); transition:transform .15s ease;}
  @media (hover:hover){ .promo-cta:hover{transform:translateY(-1px);} }
  @media (max-width:640px){
    .promo-card{padding:1.1rem; gap:.9rem;}
    .promo-big{font-size:2.2rem;}
    .promo-cta{width:100%; justify-content:center;}
  }

  /* ---------- CENOVNIK ---------- */
  /* Cene i stepeni su u lib/pricing.ts; ovde je samo izgled (components/Pricing.tsx). */
  /* Od čega je cena sastavljena, odmah ispod velikog broja. */
  .price-split{margin:.35rem 0 0; font-size:.86rem; color:var(--ink-soft); line-height:1.5; font-variant-numeric:tabular-nums;}
  .price-split b{color:var(--accent); font-weight:800;}
  /* Tabela obima: tri kolone, brojevi poravnati, red se ističe pod mišem. */
  .vol-card{padding:.4rem 1.4rem; box-shadow:none; overflow-x:auto;}
  .vol-table{width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums;}
  .vol-table th, .vol-table td{text-align:left; padding:.85rem .6rem; border-bottom:1px solid var(--line); white-space:nowrap;}
  .vol-table tbody tr:last-child th, .vol-table tbody tr:last-child td{border-bottom:0;}
  .vol-table thead th{font-family:var(--font-display); font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint);}
  .vol-table tbody th{font-family:var(--font-display); font-weight:800; font-size:1.05rem; color:var(--ink);}
  .vol-table td b{font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--ink);}
  .vol-table td .price-was{margin-left:.45rem; font-size:.84rem;}
  @media (hover:hover){ .vol-table tbody tr:hover{background:color-mix(in srgb, var(--accent) 6%, transparent);} }
  /* Jedan red za turu bez fotografija i fotografije bez ture. */
  .price-single{margin-top:1.2rem; font-size:.95rem; color:var(--ink-soft);}
  .price-single b{color:var(--ink); font-weight:700;}
  /* ---------- PRIMERI TURA ---------- */
  .tours-grid{display:grid; gap:1.2rem;}
  .tours-grid.n-1{grid-template-columns:minmax(0,560px); justify-content:center;}
  .tours-grid.n-2{grid-template-columns:repeat(2,1fr);}
  .tours-grid.n-3{grid-template-columns:repeat(3,1fr);}
  .tours-grid.n-4{grid-template-columns:repeat(4,1fr);}
  @media (max-width:1100px){ .tours-grid.n-4{grid-template-columns:1fr 1fr;} }
  @media (max-width:900px){ .tours-grid.n-3{grid-template-columns:1fr 1fr;} }
  @media (max-width:620px){ .tours-grid.n-2, .tours-grid.n-3, .tours-grid.n-4{grid-template-columns:1fr;} }
  /* Na telefonu početna pokazuje samo prva dva primera - ostale su na /ture (dugme ispod). */
  @media (max-width:620px){ .home-tours > :nth-child(n+3){display:none;} }
  /* Traka posle mreže kartica - najavljuje ceo spisak tura sa filterima
     (/ture). Svetla kartica ("ovo je samo putokaz"), a NE plava boja promo
     trake (.promo-card) - lako bi se pročitalo kao popust umesto kao putokaz. */
  .db-teaser{margin-top:1.6rem; padding:1.3rem 1.6rem; border-radius:22px; background:var(--surface); border:1px solid var(--line); display:flex; flex-wrap:wrap; align-items:center; gap:1rem 1.2rem;}
  .db-teaser-icon{flex:none; display:grid; place-items:center; width:2.4rem; height:2.4rem; border-radius:50%; background:var(--accent-soft); font-size:1.15rem;}
  .db-teaser-body{flex:1 1 16rem; min-width:0; display:flex; flex-direction:column; gap:.55rem;}
  .db-teaser-text{font-size:.9rem; color:var(--ink-soft); line-height:1.5;}
  .db-teaser-title{font-size:1.2rem; margin:0;}
  /* Mini-pretraga: ista traka kao filteri na /ture. */
  .db-search{flex:1.6 1 30rem; display:flex; align-items:stretch; background:var(--surface); border:1px solid var(--line-strong); border-radius:20px;}
  .db-field{flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:.15rem; padding:.6rem 1rem; border-left:1px solid var(--line); cursor:pointer;}
  .db-field:first-child{border-left:0;}
  .db-field span{font-family:var(--font-display); font-size:.66rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint);}
  .db-field select{font:inherit; font-size:.92rem; font-weight:600; color:var(--ink); background:none; border:0; padding:0; margin:0 -.2rem; cursor:pointer; min-width:0;}
  .db-field select:focus-visible{outline:2px solid var(--accent); outline-offset:2px; border-radius:6px;}
  .db-search .db-teaser-cta{margin:.4rem; border-radius:14px;}
  .db-teaser-cta{flex:none;}
  @media (max-width:640px){ .db-teaser{flex-direction:column; align-items:stretch; padding:1.2rem;} .db-search{flex-direction:column; flex-basis:auto;} .db-field{border-left:0; border-top:1px solid var(--line);} .db-field:first-child{border-top:0;} .db-search .db-teaser-cta{margin:.5rem;} }
  .tour-card{position:relative; overflow:hidden; display:flex; flex-direction:column; text-decoration:none; color:inherit; border:0; transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;}
  @media (hover:hover){ .tour-card:hover{transform:translateY(-3px); box-shadow:var(--shadow-lg);} .tour-card:hover .tour-open{border-color:var(--accent); color:var(--accent);} }
  /* Reflektor koji prati miš (--mx/--my postavlja components/CardSpotlight.tsx)
     + tanak plavi okvir. Na telefonu nema miša, pa ni ovoga. */
  .tour-card::after{content:""; position:absolute; inset:0; z-index:2; pointer-events:none; border-radius:inherit; opacity:0; transition:opacity .25s ease;
    background:radial-gradient(280px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 70%);
    box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 35%, transparent);}
  @media (hover:hover){ .tour-card:hover::after{opacity:1;} }
  .tour-photo{position:relative; aspect-ratio:1200/630; background:var(--surface-2);}
  .tour-photo img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;}
  .tour-photo .glass.tag{position:absolute; top:.75rem; left:.75rem;}
  .tour-langs{position:absolute; bottom:.75rem; right:.75rem; display:flex; gap:.3rem;}
  .tour-body{padding:1.25rem 1.3rem 1.4rem; display:flex; flex-direction:column; gap:.7rem; flex:1;}
  .tour-body h3{font-size:1.1rem; font-weight:700; line-height:1.3; letter-spacing:-0.015em;}
  /* Cena odmah ispod naslova (zato negativan razmak - .tour-body ima gap). */
  /* "Sve ture →" ispod kartica na početnoj, dok nema mini-pretrage. */
  .tours-more{display:flex; justify-content:flex-end; margin-top:1.1rem;}
  .tours-more a{font-family:var(--font-display); font-weight:700; font-size:.95rem; color:var(--accent); text-decoration:none;}
  .tours-more a:hover{text-decoration:underline; text-underline-offset:3px;}
  .tour-price{margin-top:-.35rem; font-family:var(--font-display); font-size:1.4rem; font-weight:800; letter-spacing:-0.02em; color:var(--ink); font-variant-numeric:tabular-nums;}
  .tour-price small{font-size:.8rem; font-weight:600; color:var(--ink-soft);}
  .tour-meta{font-size:.86rem; color:var(--ink-soft);}
  .tour-open{margin-top:auto; align-self:flex-start; background:none; border:0; box-shadow:none; padding:0; color:var(--accent);}

  /* ---------- INTEGRACIJA ---------- */
  /* ---------- PUTOKAZ KA STRANI ZA AGENCIJE ---------- */
  /* Tekst levo, dugme desno; na užem ekranu jedno ispod drugog. */
  .agency-bridge .wrap{display:grid; grid-template-columns:1fr auto; gap:clamp(1.4rem,4vw,3rem); align-items:center;}
  @media (max-width:820px){ .agency-bridge .wrap{grid-template-columns:1fr; justify-items:start;} }
  .agency-bridge h2{font-size:clamp(2rem,4vw,3.3rem);}
  .bridge-points{list-style:none; margin:.3rem 0 0; padding:0; display:flex; flex-wrap:wrap; gap:.5rem 1.4rem;}
  .bridge-points li{display:flex; align-items:center; gap:.5rem; font-size:.9rem; color:var(--ink-soft);}
  .bridge-points li::before{content:"✓"; color:var(--accent); font-weight:700; flex:none;}
  .agency-bridge .btn{white-space:nowrap; background:#1E5AA8; color:#FFFFFF; box-shadow:none;}
  .agency-bridge .btn:hover{background:#17447E;}
  .agency-bridge .bridge-points li{font-size:1rem;}

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
  .contact .wrap{display:grid; grid-template-columns:1.1fr .9fr; gap:1.5rem clamp(2rem,5vw,3.4rem); align-items:start; background:#1E5AA8; border-radius:36px; padding:clamp(1.6rem,5vw,4.5rem); max-width:calc(1280px - 5rem); width:calc(100% - clamp(1.5rem,6vw,5rem));
    --ink:#FFFFFF; --ink-soft:rgba(255,255,255,.85); --ink-faint:rgba(255,255,255,.66); --line:rgba(255,255,255,.28); --line-strong:rgba(255,255,255,.4); --surface:rgba(255,255,255,.12); --accent:#FFFFFF; --accent-soft:rgba(255,255,255,.16); --on-accent:#1E5AA8; --shadow:none; color:var(--ink);}
  @media (max-width:640px){ .contact .wrap{border-radius:26px;} }
  .contact .contact-form{--surface:#FFFFFF; --surface-2:#F4F4F0; --ink:#111113; --ink-soft:#5B5D63; --ink-faint:#686A70; --line:#E4E4DE; --line-strong:#D3D3CB; --accent:#1E5AA8; --accent-soft:#E9EFF6; --on-accent:#FFFFFF; --shadow:0 2px 8px rgba(17,17,19,.08); background:#FFFFFF; color:#111113; border:0;}
  .contact .contact-form .btn-primary{background:#1E5AA8; color:#FFFFFF; box-shadow:none;}
  .contact .contact-form .btn-primary:hover{background:#17447E;}
  .contact .info-list > div{background:none; border:0; box-shadow:none; padding:.3rem 0;}
  .contact-head{grid-column:1 / -1; display:flex; flex-direction:column; gap:1.1rem;}
  @media (max-width:880px){ .contact .wrap{grid-template-columns:1fr;} }
  .contact h2{font-size:clamp(1.8rem,2.8vw,2.5rem); margin-top:.6rem; margin-bottom:.3rem;}
  .quick-contact{display:flex; flex-wrap:wrap; gap:.5rem;}
  .qc-dot{width:8px; height:8px; border-radius:50%; flex:none; background:var(--accent);}
  .qc-viber .qc-dot{background:#7360F2;}
  .qc-wa .qc-dot{background:#25D366;}
  /* Plutajući krug za poruku (ChatBubble) - samo telefon, Viber na SR, WhatsApp na EN. */
  .chat-bubble{display:none;}
  @media (max-width:760px){
    .chat-bubble{display:flex; align-items:center; justify-content:center; position:fixed; right:14px; bottom:calc(env(safe-area-inset-bottom,0px) + 16px); z-index:60; width:54px; height:54px; border-radius:50%; border:2px solid #fff; box-shadow:0 6px 18px rgba(17,17,19,.22); transition:opacity .25s ease, transform .25s ease;}
    .chat-bubble.is-viber{background:#7360F2; color:#7360F2;}
    .chat-bubble.is-whatsapp{background:#25D366; color:#25D366;}
    .chat-bubble.is-hidden{opacity:0; transform:scale(.8); pointer-events:none;}
  }
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
  /* "Dodatni detalji (opciono)" - sklopljeni deo forme (ContactForm). */
  .form-more{border:1px solid var(--line); border-radius:16px; background:var(--surface-2);}
  .form-more summary{list-style:none; cursor:pointer; display:flex; align-items:center; gap:.4rem; padding:.85rem 1rem; font-size:.85rem; font-weight:600; color:var(--ink-soft);}
  .form-more summary::-webkit-details-marker{display:none;}
  .form-more summary small{font-weight:500; color:var(--ink-faint);}
  .form-more summary::after{content:'+'; margin-left:auto; font-size:1.15rem; line-height:1; color:var(--accent);}
  .form-more[open] summary::after{content:'–';}
  .form-more-body{display:flex; flex-direction:column; gap:1rem; padding:0 1rem 1rem;}
  .form-more .slot{background:var(--surface);}
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
  .faq-split{display:grid; grid-template-columns:1fr 2fr; gap:clamp(2rem,5vw,4.5rem); align-items:start;}
  @media (max-width:900px){ .faq-split{grid-template-columns:1fr;} }
  .faq-split .faq-list{max-width:none; margin:0; gap:0;}
  .faq-split .faq-item{background:none; border:0; border-top:1px solid var(--line-strong); border-radius:0; box-shadow:none;}
  .faq-split .faq-item:last-child{border-bottom:1px solid var(--line-strong);}
  .faq-split .faq-item summary{padding:1.4rem 0; font-size:1.15rem;}
  .faq-split .faq-item p{padding:0 0 1.4rem; font-size:1rem; line-height:1.65;}

  /* Podnožje: tamno, sa istim reflektorom i mrežom (vidi REFLEKTOR I MREŽA)
     i velikim obrisom znaka u uglu. Logo prati --ink/--accent, pa sam prelazi
     u svetlu verziju. */
  footer{position:relative; overflow:hidden; padding-block:clamp(2.6rem,6vw,4rem); margin-top:clamp(3rem,6vw,5rem);
    --ink:#F5F5F3; --ink-soft:#A8A9AE; --accent:#7FB0EC; --line:#2C2C30;
    background-color:#0E0E10; color:var(--ink);}
  footer::after{content:""; position:absolute; right:-170px; bottom:-190px; width:320px; height:320px; border-radius:56px; transform:rotate(45deg);
    border:3px solid rgba(127,176,236,.2); pointer-events:none;}
  footer .wrap{position:relative; z-index:1;}

  /* ---------- TAMNI DELOVI ---------- */
  /* Iste komponente, tamne boje: menjaju se samo promenljive. */
  .agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .blog-card:nth-child(2n), .is-dark{
    --surface:#111113; --surface-2:#1A1A1E; --ink:#F5F5F3; --ink-soft:#A8A9AE; --ink-faint:#8C8E93; --line:#2C2C30; --line-strong:#38383D;
    --accent:#7FB0EC; --accent-strong:#A5C8F2; --accent-soft:rgba(127,176,236,.14); --on-accent:#0B0E1A; --shadow:none;
    background:var(--surface); color:var(--ink); border-color:var(--line);
  }
  .agency-bridge{background-color:#0E0E10;}

  /* ---------- REFLEKTOR I MREŽA ---------- */
  /* Potpis sajta: svetlo pada odozgo, ispod njega fina mreža kvadrata (tlocrt,
     kvadrati, Kvadrat360) koja ka dnu bledi, pa tekst ostaje na čistoj podlozi.
     Isti recept na tamnim, plavim i sivim blokovima - razlikuju se samo
     promenljive:
       --k-cell   veličina kvadrata (kartica 22px, cela sekcija 30-32px)
       --k-line   boja linija mreže
       --k-glow   boja svetla;  --k-size / --k-at  oblik i mesto svetla
       --k-fade   boja podloge u koju mreža bledi (= boja samog bloka)
       --k-fade-end  gde mreža potpuno nestaje (% za kartice, px za sekcije,
                  da na dugačkoj sekciji ne pokrije ceo spisak)
       --k-base   donji sloj (plavi blokovi: prelaz iz svetlije u tamniju plavu)
     Redosled slojeva: svetlo, bleđenje, mreža, podloga. */
  .agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .blog-card:nth-child(2n), .is-dark, .integration, .band, .contact .wrap, .cta-band, .hero, footer{
    --k-cell:22px; --k-line:rgba(255,255,255,.07);
    --k-glow:rgba(91,146,214,.45); --k-size:85% 60%; --k-at:50% -14%;
    --k-fade:#111113; --k-fade-end:88%;
    --k-base:linear-gradient(transparent, transparent);
    background-image:
      radial-gradient(var(--k-size) at var(--k-at), var(--k-glow) 0%, transparent 70%),
      linear-gradient(180deg, transparent 0%, var(--k-fade) var(--k-fade-end)),
      linear-gradient(var(--k-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--k-line) 1px, transparent 1px),
      var(--k-base);
    background-size:100% 100%, 100% 100%, var(--k-cell) var(--k-cell), var(--k-cell) var(--k-cell), 100% 100%;
    background-position:0 0, 0 0, -1px -1px, -1px -1px, 0 0;
    background-repeat:no-repeat, no-repeat, repeat, repeat, no-repeat;
  }
  /* Sekcije preko cele širine: naslovi su levo, pa i svetlo pada levo. */
  .agency-bridge, .integration, .is-dark:is(section){
    --k-cell:30px; --k-fade:#0E0E10; --k-fade-end:min(92%, 620px);
    --k-size:60% 95%; --k-at:16% -22%;
  }
  .is-dark:is(section){--k-fade:#111113;}
  /* Sive sekcije: ista mreža, jedva vidljiva, boja prati svetlu i tamnu temu. */
  .band{
    --k-cell:32px; --k-line:color-mix(in srgb, var(--ink) 5.5%, transparent);
    --k-glow:color-mix(in srgb, var(--accent) 11%, transparent);
    --k-size:60% 70%; --k-at:12% -18%;
    --k-fade:var(--surface-2); --k-fade-end:min(90%, 560px);
  }
  /* Vrh strane: prvo što posetilac vidi - mreža iza naslova, svetlo levo
     gore, sve bledi pre dugmadi da ništa ne smeta čitanju. */
  .hero{
    --k-cell:32px; --k-line:color-mix(in srgb, var(--ink) 5%, transparent);
    --k-glow:color-mix(in srgb, var(--accent) 13%, transparent);
    --k-size:55% 80%; --k-at:10% -20%;
    --k-fade:var(--bg); --k-fade-end:min(95%, 640px);
  }
  footer{
    --k-cell:30px; --k-fade:#0E0E10; --k-fade-end:100%;
    --k-size:50% 120%; --k-at:12% -40%; --k-glow:rgba(91,146,214,.3);
  }
  /* Plavi blokovi: prelaz ka tamnijoj plavoj + belo svetlo. */
  .contact .wrap, .cta-band{
    --k-cell:30px; --k-line:rgba(255,255,255,.085);
    --k-glow:rgba(165,200,242,.5); --k-size:70% 65%; --k-at:22% -18%;
    --k-fade:#17447E; --k-fade-end:95%;
    --k-base:linear-gradient(180deg, #1E5AA8 0%, #17447E 100%);
  }

  /* Završni poziv (/ture, tekst na blogu): plavi blok kao kontakt na početnoj. */
  .cta-band{background-color:#1E5AA8; border-radius:32px; padding:clamp(1.8rem,5vw,4rem); max-width:calc(1280px - 5rem); width:calc(100% - clamp(1.5rem,6vw,5rem));
    --ink:#FFFFFF; --ink-soft:rgba(255,255,255,.85); --accent:#FFFFFF; color:var(--ink);}
  @media (max-width:640px){ .cta-band{border-radius:24px;} }
  .cta-band .section-head{margin-bottom:0;}
  /* Blok je već plav, pa je dugme belo sa plavim tekstom (plavo na plavom se ne bi videlo). */
  .cta-band .btn-primary{background:#FFFFFF; color:#1E5AA8; box-shadow:none;}
  .cta-band .blog-related a{color:#FFFFFF; text-decoration:underline; text-underline-offset:3px;}

  /* Kompaktna plava traka na sredini strane: tekst levo, dugmad desno.
     Za agencije (#probajte) i početna (#zakazite, posle "U samoj turi"). */
  .mid-cta-sec{padding-block:clamp(1.5rem,4vw,2.8rem);}
  .mid-cta{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1.2rem 2rem; border-radius:24px; padding:clamp(1.3rem,3vw,1.9rem) clamp(1.3rem,3vw,2.2rem); color:#fff;
    background:
      radial-gradient(50% 140% at 8% -40%, rgba(165,200,242,.45) 0%, transparent 70%),
      linear-gradient(rgba(255,255,255,.075) 1px, transparent 1px) -1px -1px / 28px 28px,
      linear-gradient(90deg, rgba(255,255,255,.075) 1px, transparent 1px) -1px -1px / 28px 28px,
      linear-gradient(135deg, #1E5AA8 0%, #17447E 100%);
    max-width:calc(1280px - 5rem); width:calc(100% - clamp(1.5rem,6vw,5rem));}
  .mid-cta h2{color:#fff; font-size:clamp(1.4rem,2.4vw,1.9rem); line-height:1.15;}
  .mid-cta h2 em{color:#fff;}
  .mid-cta ul{list-style:none; margin:.6rem 0 0; padding:0; display:flex; flex-wrap:wrap; gap:.3rem 1.1rem; font-size:.92rem; opacity:.92;}
  .mid-cta li::before{content:"✓ "; opacity:.8;}
  .mid-cta-actions{display:flex; flex-wrap:wrap; gap:.6rem;}
  .mid-cta .btn-primary, .mid-cta .btn-primary:hover{background:linear-gradient(180deg,#FFFFFF,#EAF1FB); color:#1E5AA8; border-color:rgba(255,255,255,.6);}
  .mid-cta .btn.btn-secondary{background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.45);}
  .mid-cta .btn.btn-secondary:hover{background:rgba(255,255,255,.16); color:#fff;}

  /* ---------- DUGMAD (uz reflektor i mrežu) ---------- */
  /* Glavno dugme: ista plava svuda (i u tamnoj temi, i na tamnim blokovima),
     sa blagim prelazom odozgo nadole i svetlom ivicom na vrhu - kao da i na
     njega pada isti reflektor. Pri prelazu mišem svetlo je jače. */
  .btn-primary, .nav .btn-primary, .price-card .price-cta, .agency-bridge .btn, .contact .contact-form .btn-primary{
    background:linear-gradient(180deg, #3A77C9 0%, #1E5AA8 55%, #1A4F96 100%);
    color:#FFFFFF; border-color:rgba(10,30,70,.25);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.3), 0 8px 18px -8px rgba(30,90,168,.65);
  }
  .btn-primary:hover, .nav .btn-primary:hover, .price-card .price-cta:hover, .agency-bridge .btn:hover, .contact .contact-form .btn-primary:hover{
    background:linear-gradient(180deg, #4885D6 0%, #2463B5 55%, #1C5399 100%);
    color:#FFFFFF;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.36), 0 12px 24px -8px rgba(30,90,168,.75);
  }
  /* Na plavom bloku glavno dugme je belo - isti prelaz, samo u beloj. */
  .cta-band .btn-primary, .cta-band .btn-primary:hover{
    background:linear-gradient(180deg, #FFFFFF 0%, #EAF1FB 100%); color:#1E5AA8; border-color:rgba(255,255,255,.6);
    box-shadow:inset 0 -1px 0 rgba(30,90,168,.14), 0 10px 22px -10px rgba(5,20,50,.55);
  }
  .cta-band .btn-primary:hover{background:#FFFFFF;}
  /* Sporedno dugme: pločica koja blago tamni ka dnu (svetla i tamna tema). */
  .btn-secondary:not(.tour-open){
    background:linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface-2) 55%, var(--surface)) 100%);
  }
  /* Na tamnim i plavim blokovima sporedno dugme je staklo: vidi se mreža kroz njega. */
  :is(.agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .blog-card:nth-child(2n), .is-dark, .integration, .contact .wrap, .cta-band) .btn-secondary:not(.contact-form .btn-secondary){
    background:rgba(255,255,255,.08); color:#FFFFFF; border-color:rgba(255,255,255,.22);
    -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
  }
  :is(.agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .blog-card:nth-child(2n), .is-dark, .integration, .contact .wrap, .cta-band) .btn-secondary:not(.contact-form .btn-secondary):hover{
    background:rgba(255,255,255,.16); color:#FFFFFF; border-color:rgba(255,255,255,.4);
  }

  /* ---------- TRAKE ---------- */
  .promo-top{display:block; text-align:center; background:#1E5AA8; color:#FFFFFF; font-size:.86rem; font-weight:500; padding:.6rem 1rem; text-decoration:none; line-height:1.4;
    background-image:radial-gradient(40% 180% at 50% -40%, rgba(165,200,242,.45) 0%, transparent 70%), linear-gradient(90deg, #17447E 0%, #1E5AA8 50%, #17447E 100%);}
  .promo-top b{font-weight:700;}
  .promo-top-days{white-space:nowrap;}
  .promo-top-short{display:none;}
  @media (max-width:520px){ .promo-top-long{display:none;} .promo-top-short{display:inline;} }
  .promo-top:hover{background-color:#17447E; background-image:radial-gradient(40% 180% at 50% -40%, rgba(165,200,242,.6) 0%, transparent 70%), linear-gradient(90deg, #17447E 0%, #2463B5 50%, #17447E 100%);}
  footer .wrap{display:flex; flex-direction:column; gap:1.6rem;}
  footer p{font-size:.85rem; color:var(--ink-soft);}
  /* Gornji red: logo levo, veze u sredini, kontakt desno; na telefonu jedno ispod drugog. */
  .foot-main{display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1.2rem 2rem;}
  .foot-links{display:flex; flex-wrap:wrap; gap:.4rem 1.4rem;}
  .foot-links a{color:var(--ink); font-family:var(--font-display); font-weight:700; font-size:.92rem; text-decoration:none;}
  .foot-contact{display:flex; flex-wrap:wrap; gap:.4rem 1.2rem; margin:0;}
  .foot-contact a{color:var(--ink); text-decoration:none;}
  .foot-links a:hover, .foot-contact a:hover{color:var(--accent);}
  .foot-note{padding-top:1.2rem; border-top:1px solid var(--line);}
  @media (max-width:640px){ .foot-main{flex-direction:column; align-items:flex-start;} }
`;
