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
     lakoće starog fonta, a ostaje čitljiva.
     Od 23. 10. 2026 font je statičan, debljina 500 bez opsz (~42 umesto ~175 KB, vlasnik izabrao). */
  em{font-family:var(--font-serif); font-style:italic; font-weight:500; color:var(--accent); letter-spacing:-0.005em; font-size:1.1em; line-height:.9;}
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
  /* Logo investitora umesto znaka (strane projekta, SiteNav brandLogo). */
  .brand-logo{display:inline-flex; align-items:center; height:44px;}
  .brand-logo img{display:block; max-height:40px; max-width:200px; width:auto; height:auto; object-fit:contain;}
  .brand-logo.is-dark{background:#111113; border-radius:10px; padding:6px 12px;}
  .brand-logo.is-dark img{max-height:32px;}
  @media (max-width:520px){ .brand-logo img{max-height:32px; max-width:150px;} }
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

  /* ---------- GLAVNI MENI (components/MainMenu) ---------- */
  /* Isti na svim srpskim stranama: Ture · Usluge ▾ · Alati ▾ · Cenovnik · Blog.
     Ovde nema strelice "druga strana" - sve stavke vode na druge strane. */
  .navlinks.mm{overflow:visible;}
  .navlinks.mm li:not(.nav-lang) > a::after{content:none;}
  .navlinks.mm a[aria-current="page"], .mm-btn.is-here{color:var(--accent);}
  .mm-group{position:relative;}
  .mm-btn{display:flex; align-items:center; gap:.35rem; border:0; background:transparent; font:inherit; font-size:.88rem; font-weight:600; color:var(--ink-soft); padding:.45rem .85rem; border-radius:999px; cursor:pointer; white-space:nowrap; transition:background .15s ease, color .15s ease;}
  @media (hover:hover){ .mm-btn:hover{background:var(--surface-2); color:var(--ink);} }
  .mm-btn[aria-expanded="true"]{background:var(--surface-2); color:var(--ink);}
  .mm-chev{font-size:.7em; transition:transform .15s ease;}
  .mm-btn[aria-expanded="true"] .mm-chev{transform:rotate(180deg);}
  .mm-drop{position:absolute; top:calc(100% + .6rem); left:50%; transform:translateX(-50%); width:22rem; background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:.5rem; box-shadow:0 20px 50px -18px rgba(17,17,19,.35); z-index:50;}
  .mm-drop[hidden]{display:none;}
  .mm-entry, .navlinks .mm-drop a.mm-entry{display:flex; gap:.75rem; align-items:flex-start; padding:.7rem .75rem; border-radius:12px; text-decoration:none; color:var(--ink); white-space:normal; font-size:inherit; font-weight:inherit;}
  @media (hover:hover){ .mm-entry:hover, .navlinks .mm-drop a.mm-entry:hover{background:var(--accent-soft); color:var(--ink);} }
  .mm-entry[aria-current="page"]{background:var(--accent-soft);}
  .mm-ico{flex:none; width:2.2rem; height:2.2rem; border-radius:10px; background:var(--accent-soft); color:var(--accent); display:grid; place-items:center;}
  .mm-ico svg{width:1.15rem; height:1.15rem;}
  .mm-entry b{display:block; font-family:var(--font-display); font-size:.92rem; font-weight:700;}
  .mm-entry small{display:block; color:var(--ink-faint); font-size:.78rem; line-height:1.4; margin-top:.1rem; font-weight:500;}
  .mm-new{font-family:var(--font-body); font-size:.6rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; background:#F59E0B; color:#FFFFFF; border-radius:5px; padding:.1rem .35rem; margin-left:.45rem; vertical-align:.15em;}
  .mm-end{display:flex; align-items:center; gap:.5rem; flex:none;}
  .mm-burger{display:none; align-items:center; gap:.45rem; border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); border-radius:999px; padding:.45rem .9rem; font:inherit; font-weight:700; font-size:.86rem; min-height:40px; cursor:pointer;}
  .mm-lines{display:grid; gap:3px;}
  .mm-lines i{display:block; width:14px; height:2px; background:currentColor; border-radius:2px;}
  /* Telefon i tablet: umesto reda pilula jedno dugme "Meni". */
  @media (max-width:980px){
    .navlinks.mm{display:none;}
    .mm-burger{display:inline-flex;}
    .nav-bar:has(.mm-end){flex-wrap:nowrap;}
    section{scroll-margin-top:76px;}
  }
  /* Uzan telefon: dugme za kontakt je u meniju i na strani, ovde bi gurnulo "Meni" van ekrana. */
  @media (max-width:520px){ .mm-end .btn-primary{display:none;} }
  .mm-sheet{position:fixed; inset:0; z-index:100; background:var(--bg); overflow-y:auto; padding:1rem 1rem 2rem;}
  .mm-sheet-top{display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem;}
  .mm-sheet-title{font-family:var(--font-display); font-weight:800; font-size:1.1rem;}
  .mm-x{width:44px; height:44px; border-radius:50%; border:1px solid var(--line); background:var(--surface); font-size:1.5rem; line-height:1; color:var(--ink); cursor:pointer;}
  .mm-sheet .mm-entry{background:var(--surface); border:1px solid var(--line); margin-bottom:.4rem; align-items:center;}
  .mm-sheet-grp{font-size:.72rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-faint); margin:1rem .3rem .4rem;}
  .mm-sheet-end{display:flex; gap:.5rem; margin-top:1.2rem;}
  .mm-sheet-end .btn{flex:1; justify-content:center;}
  .band{background:var(--surface-2);}
  main{counter-reset:chapter;}
  .section-head{display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:1rem; margin-bottom:clamp(2.4rem,5vw,3.8rem);}
  .section-head h2{font-size:clamp(2.1rem,4.2vw,3.5rem); line-height:1.06; max-width:24ch;}
  .section-head .note{max-width:60ch; color:var(--ink-soft); font-size:clamp(1rem,1.3vw,1.18rem); line-height:1.6;}
  .section-head.left{margin-bottom:0;}
  /* Novi izgled (16. 10. 2026): sekcije se ne numerišu i nemaju natpis
     velikim slovima iznad naslova - naslov sam kaže o čemu je reč, a isti
     natpis već stoji u meniju. */
  .section-head .eyebrow{display:none;}
  /* Naslov levo, objašnjenje desno, poravnati dole - kad je u glavi samo to dvoje. */
  @media (min-width:900px){
    .section-head:not(.left):has(> h2 + .note:last-child){display:grid; grid-template-columns:1fr 1fr; align-items:end; column-gap:clamp(2rem,6vw,5rem);}
    .section-head:not(.left):has(> h2 + .note:last-child) .note{max-width:46ch; padding-bottom:.35rem;}
  }

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
  /* Podatak iznad naslova alata (npr. "takse proverene oktobra 2026."):
     običan red teksta, ne pilula sa tačkom (novi izgled, 16. 10. 2026). */
  :is(.hero, .tl-hero) .chip:has(> .dot){background:none; border:0; box-shadow:none; padding:0; border-radius:0; font-size:.92rem; font-weight:600; color:var(--ink-soft); white-space:normal;}
  :is(.hero, .tl-hero) .chip:has(> .dot) .dot{display:none;}

  /* ---------- VRH POČETNE: TURA PREKO CELE ŠIRINE ---------- */
  /* components/HeroTour. Kadar se vuče, tlocrt je dole desno, tekst na svojoj
     pločici dole levo. Delovi preko slike su uvek svetli, kao u samoj turi. */
  .hero-tour{position:relative; padding:0; height:min(calc(100svh - 7rem), 800px); min-height:600px; overflow:hidden; background:#1A1A1E;}
  .ht-media{position:absolute; inset:0; overflow:hidden;}
  .ht-still{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
  .ht-pano{position:absolute; inset:0; overflow:hidden; opacity:0; transition:opacity .5s ease; touch-action:pan-y; cursor:grab; user-select:none;}
  /* Traka sa panoramom pomera se transform-om (HeroTour setOffset) - crta je grafički čip. */
  .ht-pano-strip{position:absolute; top:0; left:0; height:100%; width:100%; background-repeat:repeat-x; background-position:0 50%; will-change:transform; pointer-events:none;}
  /* Sporo okretanje bez JavaScript-a: traka ide za jednu panoramu (--ht-tile) ulevo i kreće ispočetka - izgleda beskonačno. Trajanje postavlja HeroTour. */
  @keyframes ht-drift{from{transform:translate3d(0,0,0);} to{transform:translate3d(calc(var(--ht-tile) * -1),0,0);}}
  .ht-pano-strip.is-drifting{animation-name:ht-drift; animation-timing-function:linear; animation-iteration-count:infinite;}
  .ht-pano.is-ready{opacity:1;}
  .ht-pano:active{cursor:grabbing;}
  .ht-pano:focus-visible{outline:3px solid #FFFFFF; outline-offset:-6px; border-radius:0;}
  /* Bez backdrop-filter: zamućenje ispod natpisa se crtalo iznova u svakom frejmu dok se panorama okreće - zato malo tamnija podloga. */
  .ht-hint{position:absolute; top:1.4rem; left:50%; transform:translateX(-50%); padding:.5rem 1rem; border-radius:999px; background:rgba(17,17,19,.72); color:#FFFFFF;
    font-family:var(--font-display); font-weight:600; font-size:.88rem; white-space:nowrap; pointer-events:none; transition:opacity .4s ease;}
  .ht-media.is-touched .ht-hint{opacity:0;}
  .ht-empty{display:grid; place-items:center; color:#FFFFFF;}

  .ht-card{position:absolute; right:clamp(16px,3vw,40px); bottom:clamp(16px,3vw,40px); width:300px; padding:.9rem .9rem 1rem; border-radius:20px;
    background:#FFFFFF; color:#111113; box-shadow:0 18px 44px rgba(0,0,0,.32);}
  .ht-card-head{display:flex; flex-direction:column; gap:.1rem; padding:0 .2rem .6rem;}
  .ht-card-head strong{font-family:var(--font-display); font-size:1.02rem; font-weight:800; letter-spacing:-0.01em;}
  .ht-card-head .ht-sample{font-size:.8rem; font-weight:700; color:#1E5AA8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  /* Poruka za tlocrt: ista tamna pilula kao .ht-hint, iznad kartice (ili
     iznad sklopljene pločice na telefonu), poravnata desno. */
  .ht-plan-hint{position:absolute; right:0; bottom:calc(100% + 10px); padding:.5rem 1rem; border-radius:999px; background:rgba(17,17,19,.6); color:#FFFFFF;
    font-family:var(--font-display); font-weight:600; font-size:.88rem; white-space:nowrap; pointer-events:none;
    -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);}
  .ht-plan{position:relative; line-height:0; border-radius:10px; overflow:hidden; background:#FFFFFF;}
  .ht-plan img{display:block; width:100%; height:auto;}
  /* Dugme je 28px (lako se pogodi), a vidi se tačka od 12px u sredini - kao u turi. */
  .ht-dot{position:absolute; width:28px; height:28px; transform:translate(-50%,-50%); padding:0; border:0; background:none; cursor:pointer; border-radius:50%;}
  .ht-dot::after{content:""; position:absolute; inset:8px; border-radius:50%; background:rgba(15,23,42,.55); border:2px solid #FFFFFF; box-shadow:0 1px 4px rgba(0,0,0,.35); transition:transform .15s ease;}
  .ht-dot:hover::after{transform:scale(1.3);}
  .ht-dot[data-on]::after{inset:6px; background:#1E5AA8;}
  .ht-dot:focus-visible{outline:2px solid #1E5AA8; outline-offset:0;}
  .ht-steps{display:flex; align-items:center; justify-content:space-between; gap:.5rem; font-weight:700; font-size:.9rem;}
  .ht-steps button{width:40px; height:40px; border-radius:50%; border:1px solid #D3D3CB; background:#FFFFFF; color:#111113; font-size:1.3rem; cursor:pointer;}
  .ht-steps button:disabled{opacity:.35; cursor:default;}
  .ht-open{display:flex; align-items:center; justify-content:center; gap:.45rem; margin-top:.8rem; min-height:44px; border-radius:999px;
    background:#1E5AA8; color:#FFFFFF; font-family:var(--font-display); font-weight:700; font-size:.92rem; text-decoration:none;}
  .ht-open:hover{background:#17447E;}

  .ht-copy{position:absolute; left:clamp(16px,3vw,40px); bottom:clamp(16px,3vw,40px); max-width:min(720px, calc(100% - 400px)); padding:clamp(1.5rem,3vw,2.4rem);
    border-radius:26px; background:var(--bg); color:var(--ink); box-shadow:0 18px 44px rgba(0,0,0,.22);}
  .ht-copy h1{font-size:clamp(2.2rem,4.4vw,3.9rem); line-height:1.04; letter-spacing:-0.035em;}
  /* Slogan "bez skrivenih ćoškova." uvek u svom redu, nikad prelomljen (vlasnik, 1. 10. 2026). */
  .ht-copy h1 em{display:block; white-space:nowrap;}
  .ht-copy .lede{margin-top:1rem; max-width:46ch; color:var(--ink-soft); font-size:clamp(1rem,1.2vw,1.1rem); line-height:1.6;}
  .ht-copy .hero-ctas{margin-top:1.4rem;}
  .ht-facts{display:flex; flex-wrap:wrap; gap:.3rem 1.2rem; margin:1.2rem 0 0; padding:0; list-style:none; font-size:.9rem; font-weight:600; color:var(--ink-soft);}
  .ht-facts li{display:flex; align-items:center; gap:.5rem;}
  .ht-facts li + li::before{content:""; width:4px; height:4px; border-radius:50%; background:var(--line-strong); margin-left:-.7rem;}
  /* Na telefonu jedno ispod drugog - tačka-razdvajač bi inače ostala na početku reda. */
  @media (max-width:640px){ .ht-facts{flex-direction:column; gap:.25rem;} .ht-facts li + li::before{display:none;} }

  /* Ispod 1100px nema mesta za tekst i tlocrt jedno pored drugog: kadar gore, tekst ispod. */
  @media (max-width:1100px){
    .hero-tour{height:auto; min-height:0; overflow:visible; background:var(--bg);}
    .ht-media{position:relative; height:min(62svh, 560px); min-height:380px;}
    .ht-copy{position:static; max-width:none; border-radius:0; box-shadow:none; padding:1.8rem clamp(1rem,4vw,2.5rem) 0;}
  }
  /* Sklopljen tlocrt postoji samo na telefonu (ispod). */
  .ht-mini, .ht-collapse{display:none;}
  @media (max-width:640px){
    /* Kadar zauzima manje od pola ekrana, da naslov i "Zakažite snimanje" budu na prvom ekranu
       (vlasnik, 23. 10. 2026 - ranije 62-72svh, pa je dugme bilo tek posle skrolovanja). */
    .ht-media, .ht-media:has(.ht-card){height:44svh; min-height:300px;}
    .ht-mini{display:flex; align-items:center; gap:.55rem; position:absolute; right:12px; bottom:12px; max-width:calc(100% - 24px); padding:.4rem .75rem .4rem .4rem;
      border:0; border-radius:16px; background:#FFFFFF; color:#111113; box-shadow:0 10px 28px rgba(0,0,0,.3); font:inherit; text-align:left; cursor:pointer;}
    .ht-mini-plan{position:relative; flex:none; width:58px; line-height:0; border-radius:6px; overflow:hidden; background:#FFFFFF; border:1px solid #E4E4DE;}
    .ht-mini-plan img{display:block; width:100%; height:auto;}
    .ht-mini-plan i{position:absolute; width:9px; height:9px; transform:translate(-50%,-50%); border-radius:50%; background:#1E5AA8; border:1.5px solid #FFFFFF;}
    .ht-mini-text{display:flex; flex-direction:column; min-width:0;}
    .ht-mini-text b{font-family:var(--font-display); font-size:.86rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .ht-mini-text small{font-size:.74rem; font-weight:700; color:#1E5AA8;}
    /* Otvoren: kartica preko donjeg dela kadra, cele širine. */
    .ht-card{display:none; left:12px; right:12px; width:auto; padding:.7rem .7rem .8rem; bottom:12px; border-radius:18px;}
    .ht-card.is-open{display:block;}
    .ht-card .ht-plan{max-width:340px; margin-inline:auto;}
    .ht-collapse{display:grid; place-items:center; position:absolute; top:.45rem; right:.45rem; width:36px; height:36px; border:0; border-radius:50%; background:#F1F1EC; color:#5B5D63; cursor:pointer;}
    .ht-card-head{padding-bottom:.4rem;}
    .ht-card-head strong{font-size:.9rem;}
    .ht-card-head .ht-sample{font-size:.72rem;}
    .ht-open{min-height:38px; font-size:.82rem; margin-top:.55rem;}
    .ht-hint, .ht-plan-hint{font-size:.8rem;}
    .ht-hint{top:.9rem;}
  }
  @media (max-width:480px){ .ht-copy h1{font-size:min(2.4rem, calc(10.6vw - 4.5px));} }

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
  .filter-toggle-label{font-family:var(--font-display); font-size:.84rem; font-weight:700; color:var(--ink-soft);}
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
  .range-label{font-family:var(--font-display); font-size:.84rem; font-weight:700; color:var(--ink-soft);}
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

  /* Prednosti: redovi odvojeni linijom, ne red istih kartica (novi izgled,
     16. 10. 2026). Bez brojeva - to nije redosled, nego spisak. */
  .feat-grid{display:grid; grid-template-columns:repeat(2,1fr); gap:0 clamp(2rem,5vw,4.5rem);}
  .feat-grid.n-3{grid-template-columns:repeat(3,1fr);}
  .feat-grid .feat{background:none; border:0; border-top:1px solid var(--line-strong); border-radius:0; box-shadow:none;
    padding:1.6rem 0 2rem; display:flex; flex-direction:column; gap:.55rem;}
  .feat h3{font-size:clamp(1.2rem,1.6vw,1.4rem); font-weight:700; line-height:1.25; letter-spacing:-0.015em;}
  .feat p{color:var(--ink-soft); font-size:1rem; line-height:1.65; max-width:52ch;}
  /* I .n-3 mora da se navede: ima veću specifičnost od samog .feat-grid. */
  @media (max-width:1000px){ .feat-grid.n-3{grid-template-columns:1fr 1fr;} }
  @media (max-width:640px){ .feat-grid, .feat-grid.n-3{grid-template-columns:1fr;} }

  /* ---------- KORACI ---------- */
  .steps-row{display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.3rem;}
  @media (max-width:900px){ .steps-row{grid-template-columns:1fr 1fr;} }
  @media (max-width:520px){ .steps-row{grid-template-columns:1fr;} }
  .step{padding:1.35rem 1.35rem 1.45rem;}
  .steps-split{display:grid; grid-template-columns:1fr 1.5fr; gap:clamp(2rem,5vw,4.5rem); align-items:start;}
  @media (max-width:900px){ .steps-split{grid-template-columns:1fr;} }
  .steps-side .deliver-card{margin-top:2.2rem;}
  .steps-side .deliver-list{grid-template-columns:1fr;}
  /* Koraci su pravi redosled, pa imaju brojeve - na vertikalnoj liniji,
     bez kartica (novi izgled, 16. 10. 2026). */
  .steps-split .steps-row{grid-template-columns:1fr; gap:0; margin:0;}
  .steps-split .step{position:relative; display:grid; grid-template-columns:2.4rem 1fr; column-gap:1.2rem; align-items:start;
    padding:0 0 2rem; background:none; border:0; border-radius:0; box-shadow:none;}
  .steps-split .step:last-child{padding-bottom:0;}
  .steps-split .step::before{content:""; position:absolute; left:calc(1.2rem - 1px); top:2.6rem; bottom:.2rem; width:2px; background:var(--line-strong);}
  .steps-split .step:last-child::before{display:none;}
  .steps-split .step .num{grid-row:span 2; width:2.4rem; height:2.4rem; padding:0; border-radius:50%; background:var(--accent); color:var(--on-accent); font-size:.95rem;}
  .steps-split .step h3{margin:.3rem 0 0; font-size:1.25rem;}
  .steps-split .step p{margin-top:.35rem; font-size:1rem; max-width:54ch;}
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
  .price-badge{position:absolute; top:-.8rem; left:1.5rem; background:var(--accent); color:var(--on-accent); font-family:var(--font-display); font-size:.78rem; font-weight:700; padding:.35rem .75rem; border-radius:999px; box-shadow:0 4px 12px var(--accent-glow);}
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
  /* Spisak tekstova: redovi sa linijom, naslov levo i uvod desno - ne
     naizmenično svetle i tamne kartice (novi izgled, 16. 10. 2026). */
  .blog-grid{display:flex; flex-direction:column; border-bottom:1px solid var(--line-strong);}
  .blog-grid .blog-card{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:.6rem clamp(2rem,6vw,5rem); align-items:baseline;
    padding:2rem 0; background:none; border:0; border-top:1px solid var(--line-strong); border-radius:0; box-shadow:none; text-decoration:none; color:inherit;}
  @media (max-width:720px){ .blog-grid .blog-card{grid-template-columns:1fr;} }
  .blog-card h3{font-family:var(--font-display); font-size:clamp(1.35rem,2vw,1.75rem); line-height:1.2; letter-spacing:-0.02em; font-weight:800; margin:0; transition:color .15s ease;}
  .blog-card:hover h3{color:var(--accent);}
  .blog-card .note{margin:0; color:var(--ink-soft); font-size:1rem; line-height:1.6; max-width:52ch;}
  .blog-article{max-width:760px;}
  .hero .blog-date{margin-top:1rem; color:var(--ink-soft); font-size:.92rem;}
  .blog-cta{margin:-.6rem 0 2.6rem;}
  .blog-author{margin:0; padding-top:1.4rem; border-top:1px solid var(--line-strong); color:var(--ink-soft); font-size:1rem; line-height:1.65;}
  .blog-author strong{color:var(--ink);}
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
  /* Tekst uzima samo koliko mu treba, filteri ostatak - bez praznine između. */
  .db-teaser-body{flex:0 1 19rem; min-width:0; display:flex; flex-direction:column; gap:.55rem;}
  .db-teaser-text{font-size:.9rem; color:var(--ink-soft); line-height:1.5;}
  .db-teaser-title{font-size:1.2rem; margin:0;}
  /* Mini-pretraga: ista traka kao filteri na /ture. */
  .db-search{flex:1 1 30rem; display:flex; align-items:stretch; background:var(--surface); border:1px solid var(--line-strong); border-radius:20px;}
  .db-field{flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:.15rem; padding:.6rem 1rem; border-left:1px solid var(--line); cursor:pointer;}
  .db-field:first-child{border-left:0;}
  .db-field span{font-family:var(--font-display); font-size:.8rem; font-weight:700; color:var(--ink-soft);}
  .db-field select{font:inherit; font-size:.92rem; font-weight:600; color:var(--ink); background:none; border:0; padding:0; margin:0 -.2rem; cursor:pointer; min-width:0;}
  .db-field select:focus-visible{outline:2px solid var(--accent); outline-offset:2px; border-radius:6px;}
  .db-search .db-teaser-cta{margin:.4rem; border-radius:14px;}
  .db-teaser-cta{flex:none;}
  /* U koloni bi osnova od 19rem postala visina teksta - otuda prazan prostor iznad filtera. */
  @media (max-width:640px){ .db-teaser{flex-direction:column; align-items:stretch; padding:1.2rem;} .db-teaser-body{flex:none;} .db-search{flex-direction:column; flex-basis:auto;} .db-field{border-left:0; border-top:1px solid var(--line);} .db-field:first-child{border-top:0;} .db-search .db-teaser-cta{margin:.5rem;} }
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
  /* "Usluge" na početnoj: isti tamni blok, tri kartice i red besplatnih alata. */
  .agency-bridge.services .wrap{display:block;}
  /* Tri reda, ne tri kartice: naziv levo, opis u sredini, veza desno. */
  .svc-grid{display:flex; flex-direction:column; margin-top:clamp(1.6rem,3vw,2.4rem); border-bottom:1px solid rgba(255,255,255,.16);}
  .svc-grid .svc{display:grid; grid-template-columns:3rem minmax(11rem,.8fr) 1.6fr auto; grid-template-areas:"ico title text link" "ico title points link";
    column-gap:clamp(1rem,3vw,2.4rem); row-gap:.6rem; align-items:start; padding:1.8rem 0; background:none; border:0; border-top:1px solid rgba(255,255,255,.16); border-radius:0; box-shadow:none;}
  .svc-grid .svc .svc-ico{grid-area:ico;}
  .svc-grid .svc h3{grid-area:title; margin-top:.55rem;}
  .svc-grid .svc p{grid-area:text;}
  .svc-grid .svc .bridge-points{grid-area:points;}
  .svc-grid .svc .svc-link{grid-area:link; align-self:center; margin:0; padding:0;}
  @media (max-width:900px){
    .svc-grid .svc{grid-template-columns:3rem 1fr; grid-template-areas:"ico title" "text text" "points points" "link link";}
    .svc-grid .svc h3{margin-top:.5rem;}
  }
  /* Putokaz "Ko ste vi?" ispod vrha početne. */
  .aud-pick{padding:clamp(1.2rem,2.5vw,1.8rem) 0; border-bottom:1px solid var(--line-strong);}
  .aud-pick .wrap{display:flex; flex-wrap:wrap; align-items:center; gap:.7rem;}
  .aud-pick-label{margin-right:.4rem; color:var(--ink-soft); font-weight:700;}
  .aud-pick-link{display:inline-flex; align-items:center; gap:.6rem; min-height:44px; padding:.55rem 1.1rem; border:1px solid var(--line-strong); border-radius:999px;
    color:var(--ink); font-weight:600; text-decoration:none; transition:border-color .2s, color .2s;}
  .aud-pick-link svg{width:20px; height:20px; flex:none; color:var(--accent);}
  .aud-pick-arrow{color:var(--accent); transition:transform .2s;}
  .aud-pick-link:hover{border-color:var(--accent); color:var(--accent-strong);}
  .aud-pick-link:hover .aud-pick-arrow{transform:translateX(3px);}
  @media (max-width:640px){
    .aud-pick-label{width:100%;}
    .aud-pick-link{width:100%;}
    .aud-pick-arrow{margin-left:auto;}
  }
  .svc-ico{width:44px; height:44px; border-radius:14px; display:grid; place-items:center; background:var(--accent-soft); color:var(--accent);}
  .svc-ico svg{width:22px; height:22px;}
  .svc h3{display:flex; align-items:center; gap:.55rem; font-size:1.25rem; font-weight:700; line-height:1.25; letter-spacing:-0.015em;}
  .svc-new{padding:.18rem .6rem; border-radius:999px; background:var(--accent); color:var(--on-accent); font-size:.75rem; font-weight:700;}
  .svc p{color:var(--ink-soft); font-size:.95rem; line-height:1.6;}
  .agency-bridge .svc .bridge-points{flex-direction:column; gap:.4rem; margin:0;}
  .agency-bridge .svc .bridge-points li{font-size:.92rem;}
  .svc-link{margin-top:auto; padding-top:.5rem; color:var(--accent); font-weight:700; text-decoration:none;}
  .svc-link:hover{color:var(--accent-strong);}
  .svc-tools{display:flex; flex-wrap:wrap; align-items:center; gap:.6rem .8rem; margin-top:1.5rem; color:var(--ink-soft); font-size:.95rem;}
  .svc-tools a{padding:.55rem 1rem; border:1px solid var(--line-strong); border-radius:999px; color:var(--ink); font-weight:600; text-decoration:none; transition:border-color .2s, color .2s;}
  .svc-tools a:hover{border-color:var(--accent); color:var(--accent-strong);}

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
  .agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .is-dark{
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
  .agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .is-dark, .integration, .band, .contact .wrap, .cta-band, .hero, footer{
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
  :is(.agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .is-dark, .integration, .contact .wrap, .cta-band) .btn-secondary:not(.contact-form .btn-secondary){
    background:rgba(255,255,255,.08); color:#FFFFFF; border-color:rgba(255,255,255,.22);
    -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
  }
  :is(.agency-bridge, .steps-side .deliver-card, .price-card.featured, .blog-callout, .is-dark, .integration, .contact .wrap, .cta-band) .btn-secondary:not(.contact-form .btn-secondary):hover{
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

  /* ---------- ANIMACIJE (krug 1, početna; vidi docs/superpowers/specs/2026-10-21-animacije-sajta-design.md) ----------
     Elementi sa data-reveal se skrivaju samo pod html.rv-armed, koji postavlja
     components/SiteReveal posle učitavanja. Bez JS-a, pre hidratacije i uz
     smanjene pokrete sve je vidljivo kao ranije. Tempo "Srednje" (vlasnik, 21. 10. 2026). */
  :root{--rv-dist:18px; --rv-dur:.8s; --rv-step:90ms; --rv-ease:cubic-bezier(.22,.8,.24,1);}
  [data-reveal]{transition:opacity var(--rv-dur) var(--rv-ease), transform var(--rv-dur) var(--rv-ease), filter var(--rv-dur) var(--rv-ease); transition-delay:calc(var(--i,0) * var(--rv-step));}
  html.rv-armed [data-reveal]:not(.is-in){opacity:0; transform:translateY(var(--rv-dist));}
  html.rv-armed [data-reveal="blur"]:not(.is-in){filter:blur(8px);}
  html.rv-armed [data-reveal="scale"]:not(.is-in){transform:translateY(var(--rv-dist)) scale(.965);}
  html.rv-armed [data-reveal="list"]:not(.is-in){transform:translateX(calc(var(--rv-dist) * -1));}

  /* Sve ispod važi samo unutar <main class="rv-page"> - strane koje su dobile animacije (početna, za-agencije); ostale dobijaju svoje u sledećim krugovima.
     Hero ne čeka JS: naslov, uvod, dugmad i činjenice izranjaju pri učitavanju, fotografija se približi. */
  /* Bez filter:blur - zamućenje se crta na procesoru u svakom frejmu i usporavalo je prvi prikaz na
     slabijim telefonima (merenje 22. 10. 2026); izron + pojava idu preko grafičkog čipa. */
  @keyframes rv-hero-in{from{opacity:0; transform:translateY(18px);} to{opacity:1; transform:none;}}
  @keyframes rv-hero-zoom{from{transform:scale(1.07);} to{transform:scale(1);}}
  @media (prefers-reduced-motion:no-preference){
    .rv-page .ht-copy h1, .rv-page .ht-copy .lede, .rv-page .ht-copy .hero-ctas, .rv-page .ht-facts li{animation:rv-hero-in .8s cubic-bezier(.22,.8,.24,1) both;}
    .rv-page .ht-copy .lede{animation-delay:90ms;}
    .rv-page .ht-copy .hero-ctas{animation-delay:180ms;}
    .rv-page .ht-facts li:nth-child(1){animation-delay:270ms;}
    .rv-page .ht-facts li:nth-child(2){animation-delay:360ms;}
    .rv-page .ht-facts li:nth-child(3){animation-delay:450ms;}
    .rv-page .ht-facts li:nth-child(4){animation-delay:540ms;}
    .rv-page .ht-still{animation:rv-hero-zoom 2.4s cubic-bezier(.2,.7,.2,1) both;}
  }

  /* "Kako radimo" - Linija (B2a): vodilica kroz krugove 01-04, plava linija se spušta, krug se popuni kad ga dotakne. */
  [data-reveal-steps]{position:relative; --sg:calc(var(--rv-step) * 6);}
  [data-reveal-steps] .step .num{position:relative; z-index:1;}
  /* Stara siva spojnica koraka (.steps-split .step::before) bi stajala preko nove linije; bez JS-a ostaje. */
  html.rv-armed [data-reveal-steps] .step::before{display:none;}
  [data-reveal-steps] .step[data-reveal]{transition-delay:calc(var(--i,0) * var(--sg));}
  .rv-steps-track, .rv-steps-line{position:absolute; width:2px; border-radius:2px; pointer-events:none; z-index:0;}
  .rv-steps-track{background:#dbe4f0;}
  .rv-steps-line{background:#1e5aa8; transform:scaleY(0); transform-origin:top; transition:transform calc(var(--sg) * 3) cubic-bezier(.45,0,.55,1) .15s;}
  [data-reveal-steps].is-in .rv-steps-line{transform:scaleY(1);}
  html.rv-armed [data-reveal-steps] .step .num{transition:background .35s ease, color .35s ease, box-shadow .35s ease; transition-delay:calc(var(--i,0) * var(--sg) + .15s);}
  html.rv-armed [data-reveal-steps] .step:not(.is-in) .num{background:#fff; color:#1e5aa8; box-shadow:inset 0 0 0 2px #1e5aa8;}

  /* Pitanja i tabela popusta: odgovor se glatko otvara (gde pregledač to podržava). */
  .rv-page{interpolate-size:allow-keywords;}  .rv-page details.faq-item::details-content, .rv-page details.vol-details::details-content, .rv-page details.embed-details::details-content{height:0; overflow:clip; transition:height .45s var(--rv-ease), content-visibility .45s allow-discrete;}
  .rv-page details.faq-item[open]::details-content, .rv-page details.vol-details[open]::details-content, .rv-page details.embed-details[open]::details-content{height:auto;}

  /* Glavno dugme: jedan blagi odsjaj kad se prvi put pojavi. */
  html.rv-armed .btn-primary{position:relative; overflow:hidden;}
  html.rv-armed .btn-primary::after{content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%); transform:translateX(-120%);}
  html.rv-armed .btn-primary.is-shone::after{transform:translateX(120%); transition:transform 1.1s ease .35s;}

  /* Kartica ture koja izranja: njeno podizanje pod mišem ide preko translate, a ne transform. */
  .tour-card[data-reveal]{transition:opacity var(--rv-dur) var(--rv-ease) calc(var(--i,0) * var(--rv-step)), transform var(--rv-dur) var(--rv-ease) calc(var(--i,0) * var(--rv-step)), translate .18s ease, box-shadow .18s ease, border-color .18s ease;}
  @media (hover:hover){ .tour-card[data-reveal].is-in:hover{transform:none; translate:0 -3px;} }

  /* Kartice benefita i usluga se blago podignu pod mišem (kartice tura to već imaju).
     Podizanje ide preko svojstva translate, da ne pregazi transform izrona (i njegovo kašnjenje u nizu). */
  .rv-page .card.feat, .rv-page .card.svc{transition:opacity var(--rv-dur) var(--rv-ease) calc(var(--i,0) * var(--rv-step)), transform var(--rv-dur) var(--rv-ease) calc(var(--i,0) * var(--rv-step)), filter var(--rv-dur) var(--rv-ease) calc(var(--i,0) * var(--rv-step)), translate .35s var(--rv-ease), box-shadow .35s var(--rv-ease);}
  @media (hover:hover){ .rv-page .card.feat:hover, .rv-page .card.svc:hover{translate:0 -4px; box-shadow:0 14px 34px -18px rgba(15,23,42,.35);} }

  /* ---------- "OD TLOCRTA DO TURE" (components/TourStory + TourStoryPlayer) ----------
     Bez JS-a: tlocrt + lista od 8 koraka. Sa JS-om (.is-armed): visoka sekcija,
     "zalepljena" scena i kadrovi po skrolu (maketa public/mockup/TlocrtTura.html). */
  .story{background:var(--surface); padding:clamp(3rem,7vw,5.5rem) 0;}
  .story-stage{max-width:1180px; margin:0 auto; padding:0 clamp(1rem,4vw,2.5rem); display:grid; grid-template-columns:minmax(260px,1fr) 1.6fr; gap:clamp(1.5rem,4vw,3rem); align-items:center;}
  .story-steps{list-style:none; margin:1rem 0 0; padding:0; display:grid; gap:1.1rem;}
  .story-kicker{display:block; font-size:.72rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:.35rem;}
  .story-step h3{font-size:clamp(1.15rem,1.6vw,1.35rem); letter-spacing:-.02em; margin:0 0 .3rem;}
  .story-step p{margin:0; color:var(--ink-soft); line-height:1.5;}
  .story-cta{margin-top:1rem;}
  .story-progress{display:none;}
  .story-view{position:relative; width:100%; overflow:hidden; border-radius:18px;}
  .story-plan{position:absolute; inset:0; transform-origin:0 0;}
  .story-plan svg{display:block; width:100%; height:100%;}
  /* Isti izgled kao šematski SVG ture (floorplanLayout PLAN_STYLE), ali samo unutar sekcije. */
  .story-plan .room, .story-mini .room{fill:#F7F7F4; stroke:#2B2D33; stroke-width:7; stroke-linejoin:miter;}
  .story-plan .outdoor, .story-mini .outdoor{fill:#EEF3F8; stroke-dasharray:14 8; stroke-width:4;}
  .story-plan .seam, .story-mini .seam{stroke:#F7F7F4; stroke-width:10; stroke-linecap:butt;}
  .story-plan .outdoor-seam, .story-mini .outdoor-seam{stroke:#EEF3F8;}
  .story-plan .door, .story-mini .door{stroke:#F7F7F4; stroke-width:10; stroke-linecap:butt;}
  .story-plan text{font-family:var(--font-display),Inter,Arial,sans-serif; fill:#2B2D33; font-weight:700;}
  .story-plan text.note{font-size:15px; fill:#8C8E93; font-weight:500;}
  .story-cam{fill:#1e5aa8;}
  .story-cam-ring{fill:none; stroke:#1e5aa8; stroke-width:4; opacity:.35;}
  .story-cams > g{transform-box:fill-box; transform-origin:center;}
  .story-pano, .story-ui, .story-ui > *{display:none;}

  .story.is-armed{height:640vh; padding:0;}
  .story.is-armed .story-stage{position:sticky; top:0; height:100vh; height:100svh;}
  .story.is-armed .story-text{position:relative;}
  .story.is-armed .story-steps{position:relative; height:240px; margin:0; display:block;}
  /* visibility: korak koji se ne vidi nije ni dostupan tastaturi (dugme ka turi u poslednjem koraku). */
  .story.is-armed .story-step{position:absolute; inset:0; opacity:0; visibility:hidden; transform:translateY(14px); pointer-events:none; transition:opacity .45s ease, transform .45s ease, visibility 0s linear .45s;}
  .story.is-armed .story-step.on{opacity:1; visibility:visible; transform:none; pointer-events:auto; transition-delay:0s;}
  .story.is-armed .story-step h3{font-size:clamp(1.5rem,3vw,2.35rem); line-height:1.12; margin-bottom:.6rem;}
  .story.is-armed .story-step p{font-size:1.02rem; max-width:36ch;}
  .story.is-armed .story-progress{display:flex; gap:5px; margin-top:1.2rem;}
  .story-progress i{height:3px; flex:1; max-width:34px; border-radius:3px; background:var(--line); overflow:hidden; position:relative;}
  .story-progress b{position:absolute; inset:0; background:var(--accent); transform-origin:left; transform:scaleX(0);}
  .story.is-armed .story-view{max-height:82vh; justify-self:center;}
  .story.is-armed .story-pano{display:block; position:absolute; inset:0; opacity:0; pointer-events:none; background:#ccc 0 52%/auto 165% repeat-x;}
  .story.is-armed .story-pano-b{z-index:1;}
  .story.is-armed .story-ui{display:block; position:absolute; inset:0; z-index:3; pointer-events:none;}
  .story.is-armed .story-ui > *{display:block;}
  .story-tag{position:absolute; left:14px; top:14px; background:rgba(17,17,19,.72); color:#fff; font-size:13px; font-weight:600; padding:7px 11px; border-radius:999px; backdrop-filter:blur(6px); opacity:0;}
  .story-hs{position:absolute; width:34px; height:34px; margin:-17px 0 0 -17px; border-radius:50%; background:rgba(255,255,255,.95); opacity:0; transform:scale(.4); transition:opacity .3s, transform .4s cubic-bezier(.34,1.56,.64,1);}
  .story-hs::after{content:"i"; position:absolute; inset:0; display:grid; place-items:center; font:800 16px/1 Georgia,serif; color:#1e5aa8;}
  .story-hs.on{opacity:1; transform:scale(1); animation:story-pulse 1.6s ease-out infinite;}
  @keyframes story-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.75);} 100%{box-shadow:0 0 0 18px rgba(255,255,255,0);}}
  .story-card{position:absolute; width:min(300px,64%); background:rgba(255,255,255,.96); border-radius:14px; padding:14px 16px; box-shadow:0 18px 40px -16px rgba(0,0,0,.45); opacity:0; transform:translateY(8px) scale(.97); transform-origin:top left; transition:opacity .35s, transform .35s;}
  .story-card.on{opacity:1; transform:none;}
  .story-card b{display:block; font-size:15px; margin-bottom:4px;}
  .story-card p{margin:0; font-size:13px; line-height:1.45; color:#3d4250;}
  .story-play{display:inline-block; margin-top:8px; font-size:12px; font-weight:700; color:#1e5aa8;}
  .story-door{position:absolute; transform:translate(-50%,-50%); text-align:center; opacity:0; transition:opacity .3s;}
  .story-door.on{opacity:1;}
  .story-arrow{display:grid; place-items:center; width:46px; height:46px; margin:0 auto 6px; border-radius:50%; background:rgba(17,17,19,.6); border:2px solid #fff; backdrop-filter:blur(4px);}
  .story-arrow svg{width:22px; height:22px;}
  .story-door-label{display:inline-block; background:rgba(255,255,255,.95); font-size:13px; font-weight:700; padding:6px 11px; border-radius:999px; white-space:nowrap;}
  .story-mini{position:absolute; right:12px; bottom:12px; width:30%; max-width:170px; background:rgba(255,255,255,.94); border-radius:10px; padding:5px; box-shadow:0 10px 26px -12px rgba(0,0,0,.5); opacity:0; transition:opacity .35s;}
  .story-mini.on{opacity:1;}
  .story-mini svg{display:block; width:100%; height:auto;}
  .story-mini .room{stroke-width:9;}
  .story-sub{position:absolute; left:14px; bottom:14px; width:min(520px, calc(100% - 28px - 32%)); opacity:0; transition:opacity .35s;}
  .story-sub.on{opacity:1;}
  .story-langs{display:flex; gap:5px; margin-bottom:7px;}
  .story-langs i{font-style:normal; font-size:11px; font-weight:800; letter-spacing:.06em; padding:4px 8px; border-radius:999px; background:rgba(17,17,19,.55); color:#cbd5e1; transition:background .25s, color .25s;}
  .story-langs i.on{background:#1e5aa8; color:#fff;}
  .story-subbox{display:flex; gap:10px; align-items:center; background:rgba(17,17,19,.76); color:#fff; border-radius:12px; padding:10px 12px; backdrop-filter:blur(6px);}
  .story-waves{display:flex; gap:3px; align-items:center; height:20px; flex:none;}
  /* Talasi: scaleY (grafički čip) umesto height (preračun rasporeda u svakom frejmu), i samo dok se titl vidi. */
  .story-waves u{width:3px; height:18px; border-radius:2px; background:#7fb0ff; transform:scaleY(.28);}
  .story-sub.on .story-waves u{animation:story-wave 1s ease-in-out infinite;}
  .story-waves u:nth-child(2){animation-delay:-.2s;} .story-waves u:nth-child(3){animation-delay:-.4s;} .story-waves u:nth-child(4){animation-delay:-.6s;}
  @keyframes story-wave{0%,100%{transform:scaleY(.28);} 50%{transform:scaleY(1);}}
  .story-subtxt{font-size:14px; line-height:1.4; min-height:2.8em;}

  @media (max-width:760px){
    .story-stage{grid-template-columns:1fr;}
    .story-view{order:-1;}
    .story.is-armed{height:520vh;}
    .story.is-armed .story-stage{align-content:center; gap:26px;}
    .story.is-armed .story-view{max-height:none; border-radius:14px;}
    .story.is-armed .story-steps{height:180px;}
    .story.is-armed .story-step h3{font-size:1.45rem;}
    .story.is-armed .story-step p{font-size:.95rem;}
    .story.is-armed .story-progress{position:absolute; top:-14px; left:0; right:0; margin:0;}
    .story-card{width:72%; padding:11px 12px;} .story-card p{font-size:12px;}
    .story-mini{width:34%;}
    .story-sub{width:calc(100% - 28px);}
    .story-subtxt{font-size:12.5px;}
    .story-door-label{font-size:12px;}
  }

  /* ---------- Strane sa običnim vrhom (.hero: ture, alati) i spisak tura (22. 10. 2026) ---------- */
  @media (prefers-reduced-motion:no-preference){
    .rv-page .hero h1, .rv-page .hero .lede, .rv-page .hero .hero-ctas, .rv-page .hero .ht-facts li{animation:rv-hero-in .8s cubic-bezier(.22,.8,.24,1) both;}
    .rv-page .hero .lede{animation-delay:90ms;}
    .rv-page .hero .hero-ctas{animation-delay:180ms;}
    .rv-page .hero .ht-facts li:nth-child(1){animation-delay:270ms;}
    .rv-page .hero .ht-facts li:nth-child(2){animation-delay:360ms;}
    .rv-page .hero .ht-facts li:nth-child(3){animation-delay:450ms;}
    /* Spisak tura: prvi put kartice ulaze redom kad dođu na ekran; posle filtera nov spisak se kratko poređa. */
    html.rv-armed .rv-page .tours-grid[data-reveal-group]:not(.is-in) > *{opacity:0;}
    html.rv-armed .rv-page .tours-grid.is-in > *{animation:rv-card-in .6s cubic-bezier(.22,.8,.24,1) both;}
    .rv-page .tours-grid.refilter > *{animation:rv-card-re .5s cubic-bezier(.22,.8,.24,1) both;}
    .rv-page .tours-grid > :nth-child(2){animation-delay:80ms;}
    .rv-page .tours-grid > :nth-child(3){animation-delay:160ms;}
    .rv-page .tours-grid > :nth-child(4){animation-delay:240ms;}
    .rv-page .tours-grid > :nth-child(n+5){animation-delay:320ms;}
  }
  @keyframes rv-card-in{from{opacity:0; transform:translateY(18px) scale(.97);} to{opacity:1; transform:none;}}
  @keyframes rv-card-re{from{opacity:0; transform:translateY(12px) scale(.98);} to{opacity:1; transform:none;}}

  /* Traka napretka čitanja na tekstovima bloga (components/ReadingProgress). */
  .reading-progress{position:fixed; left:0; right:0; top:0; height:3px; z-index:200; background:var(--accent); transform-origin:left; transform:scaleX(0); opacity:0; transition:opacity .3s ease; pointer-events:none;}
`;
