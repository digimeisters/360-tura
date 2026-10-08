/**
 * Izgled izbora stana (zgrada -> sprat -> stan): primer na /za-investitore
 * (components/InvestorDemo.tsx) i prava strana projekta /novogradnja/[slug]
 * (components/projekat/ProjectSelector.tsx). Klase .inv-*; kartica je uvek
 * svetla, jer su boje statusa birane za svetlu pozadinu.
 */
export const SELECTOR_STYLES = `
  /* 02 Primer: kartica je uvek svetla (boje statusa su za svetlu pozadinu). */
  .inv-badge-note{display:inline-flex; font-size:.8rem; font-weight:700; color:var(--ink-soft); background:var(--surface); border:1px dashed var(--line-strong); border-radius:999px; padding:.35rem .85rem;}
  .inv-demo{--d-ink:#111113; --d-soft:#5B5D63; --d-faint:#686A70; --d-line:#E3E8F1; --d-accent:#1E5AA8; --d-soft-bg:#F6F8FC;
    background:#FFFFFF; color:var(--d-ink); border-radius:28px; padding:clamp(.8rem,2vw,1.3rem); box-shadow:var(--shadow-lg); border:1px solid var(--line);}
  .inv-demo button{font:inherit; cursor:pointer;}
  .inv-tabs{display:inline-flex; gap:4px; background:#EEF2F8; border-radius:999px; padding:4px; margin-bottom:1rem;}
  .inv-tabs button{border:0; background:transparent; padding:.55rem 1.1rem; border-radius:999px; font-weight:600; font-size:.9rem; color:#4B5563; min-height:40px;}
  .inv-tabs button[aria-selected="true"]{background:#FFFFFF; color:var(--d-accent); box-shadow:0 2px 8px -3px rgba(30,90,168,.35);}
  .inv-grid{display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:1.2rem; align-items:start;}
  @media (max-width:960px){ .inv-grid{grid-template-columns:1fr;} }
  .inv-stage{border:1px solid var(--d-line); border-radius:22px; padding:1rem; display:flex; flex-direction:column; min-width:0;}
  .inv-panel{border:1px solid var(--d-line); border-radius:22px; padding:1.2rem; min-width:0;}
  .inv-stagehd{display:flex; justify-content:space-between; align-items:center; gap:.6rem; min-height:44px;}
  .inv-stagehd h3{margin:0; font-family:var(--font-display); font-weight:800; font-size:1.35rem; color:var(--d-ink);}
  .inv-art{display:flex; align-items:center; justify-content:center; flex:1; margin-top:.4rem;}
  .inv-svg{display:block; width:100%; max-width:560px; height:auto; font-family:var(--font-body);}
  .inv-svg text{font-family:var(--font-display);}
  .inv-hit, .inv-unit{cursor:pointer; outline:none;}
  .inv-hit rect{transition:fill .15s;}
  .inv-unit:hover > rect:first-child, .inv-unit:focus-visible > rect:first-child{filter:brightness(.95);}
  .inv-unit:focus-visible > rect:first-child, .inv-hit:focus-visible > rect:first-child{stroke:#1E5AA8; stroke-width:4;}
  .inv-back{border:1.5px solid #9DBBE3; background:#FFFFFF; color:var(--d-accent); border-radius:999px; padding:.5rem .9rem; font-weight:700; font-size:.85rem; min-height:40px;}
  .inv-flsw{display:flex; gap:6px;}
  .inv-flsw button{width:40px; height:40px; border-radius:50%; border:1.5px solid #9DBBE3; background:#FFFFFF; color:var(--d-accent); font-weight:700;}
  .inv-flsw button:disabled{opacity:.35; cursor:default;}
  .inv-legend{display:flex; gap:1rem; flex-wrap:wrap; font-size:.82rem; color:#4B5563; margin-top:.8rem;}
  .inv-legend i{display:inline-block; width:12px; height:12px; border-radius:4px; border:1.5px solid; margin-right:6px; vertical-align:-1px;}
  .inv-eyebrow{font-size:.7rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--d-accent);}
  .inv-title{font-family:var(--font-display); font-weight:800; font-size:1.7rem; letter-spacing:-.02em; line-height:1.15; margin-top:.2rem; color:var(--d-ink);}
  .inv-muted{color:var(--d-soft); font-size:.88rem; margin:.25rem 0 0;}
  .inv-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:1rem 0;}
  .inv-stats > div{background:var(--d-soft-bg); border-radius:14px; padding:.6rem .75rem;}
  .inv-stats b{display:block; font-family:var(--font-display); font-size:1.25rem;}
  .inv-stats b.is-ok{color:#1F7A45;}
  .inv-stats small{font-size:.72rem; color:#6B7280;}
  .inv-chips{display:flex; gap:6px; flex-wrap:wrap; margin:.7rem 0 .9rem;}
  .inv-chip{border:1.5px solid #D5DEEB; background:#FFFFFF; border-radius:999px; padding:.4rem .8rem; font-size:.82rem; font-weight:600; color:#374151; min-height:36px;}
  .inv-chip[aria-pressed="true"]{border-color:var(--d-accent); background:var(--d-accent); color:#FFFFFF;}
  .inv-list{display:flex; flex-direction:column; gap:6px;}
  .inv-row{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:.65rem .8rem; border-radius:14px; border:1px solid var(--d-line); background:#FFFFFF; width:100%; text-align:left; color:var(--d-ink);}
  .inv-row:hover, .inv-row.is-hover{border-color:#9DBBE3; background:#F8FAFE;}
  .inv-row.is-static{cursor:default; margin-top:1rem;}
  .inv-row b{font-family:var(--font-display); font-size:.92rem;}
  .inv-row small{display:block; color:#6B7280; font-size:.78rem;}
  .inv-badge{font-size:.72rem; font-weight:700; padding:.25rem .6rem; border-radius:999px; white-space:nowrap;}
  .inv-badge.is-s{background:#DCF3E4; color:#1F7A45;}
  .inv-badge.is-r{background:#FCEFD3; color:#9A6A0B;}
  .inv-badge.is-p{background:#ECECEC; color:#6B6B6B;}
  .inv-unit-head{display:flex; justify-content:space-between; align-items:center; gap:.6rem;}
  .inv-facts{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:1rem 0;}
  .inv-facts > div{background:var(--d-soft-bg); border-radius:14px; padding:.6rem .75rem;}
  .inv-facts small{display:block; font-size:.65rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--d-faint);}
  .inv-facts b{display:block; font-family:var(--font-display); font-size:1rem; margin-top:2px;}
  .inv-price{display:flex; align-items:baseline; justify-content:space-between; gap:.6rem; padding:.8rem 0; border-top:1px solid var(--d-line); border-bottom:1px solid var(--d-line); margin-bottom:.9rem; color:var(--d-soft); font-size:.88rem;}
  .inv-price b{font-family:var(--font-display); font-size:1.6rem; letter-spacing:-.02em; color:var(--d-ink);}
  .inv-media{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:.8rem;}
  .inv-mbtn{position:relative; display:block; height:92px; border-radius:16px; overflow:hidden; border:0; padding:0; background:#5E83B3 center/cover; color:#FFFFFF; text-align:left; text-decoration:none;}
  .inv-mbtn.is-drone{background:linear-gradient(160deg,#9FBCE0 0%,#5E83B3 55%,#7A9B6E 100%);}
  .inv-mbtn::before{content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(9,12,20,0) 30%,rgba(9,12,20,.75));}
  .inv-mbtn span{position:absolute; left:10px; right:10px; bottom:9px; font-family:var(--font-display); font-weight:700; font-size:.82rem; line-height:1.2;}
  .inv-mbtn em{position:absolute; top:8px; left:8px; font-style:normal; font-size:.66rem; font-weight:800; background:rgba(255,255,255,.92); color:var(--d-accent); padding:3px 7px; border-radius:999px;}
  .inv-note-box{margin:0 0 .8rem; padding:.7rem .85rem; border-radius:14px; background:#EEF4FC; color:#1E3A66; font-size:.84rem; line-height:1.5;}
  .inv-cta{display:flex; align-items:center; justify-content:center; width:100%; background:var(--d-accent); color:#FFFFFF; border:0; border-radius:999px; font-family:var(--font-display); font-weight:700; font-size:.95rem; padding:.85rem; min-height:46px;}
  .inv-cta.is-out{background:#FFFFFF; color:var(--d-accent); border:1.5px solid var(--d-accent); margin-top:8px;}
  .inv-cta:disabled{background:#C9CED6; cursor:default;}
  .inv-small{font-size:.75rem; color:var(--d-faint); margin:.7rem 0 0; text-align:center;}
  .inv-progress-head{display:flex; justify-content:space-between; font-size:.84rem; font-weight:600;}
  .inv-progress{height:10px; border-radius:999px; background:#EEF2F8; overflow:hidden; margin:.4rem 0 .3rem;}
  .inv-progress i{display:block; height:100%; background:var(--d-accent); border-radius:999px; transition:width .3s;}

  /* Prava strana projekta: slika (fasada / osnova) sa oblicima preko nje. */
  .inv-imgbox{position:relative; width:100%; border-radius:16px; overflow:hidden; background:#EEF2F8;}
  .inv-imgbox img{display:block; width:100%; height:auto;}
  .inv-imgbox svg{position:absolute; inset:0; width:100%; height:100%;}
  .inv-poly{cursor:pointer; outline:none; transition:fill .15s;}
  .inv-tag{position:absolute; transform:translate(-50%,-50%); pointer-events:none; background:rgba(255,255,255,.94); color:#111113; border-radius:999px; padding:2px 9px; font-family:var(--font-display); font-weight:800; font-size:.78rem; white-space:nowrap; box-shadow:0 1px 5px rgba(0,0,0,.25);}
  .inv-tag small{font-family:var(--font-body); font-weight:700; color:#1F7A45; margin-left:4px;}
  .inv-tag.is-none small{color:#8A8A8A;}
  /* Filteri cene i kvadrature. */
  .inv-selects{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0 0 .9rem;}
  .inv-selects label{display:flex; flex-direction:column; gap:3px; font-size:.72rem; font-weight:700; color:#6B7280;}
  .inv-selects select{font:inherit; font-size:.88rem; font-weight:600; color:#111113; background:#FFFFFF; border:1.5px solid #D5DEEB; border-radius:10px; padding:.45rem .5rem; min-height:38px;}

  /* Gradilište po mesecima (ProjectProgress). */
  .inv-progress-sec{margin-top:clamp(1.6rem,4vw,2.4rem);}
  .inv-progress-sec h2{font-family:var(--font-display); font-size:clamp(1.4rem,3vw,1.9rem); margin:0 0 .8rem;}
  .inv-months{display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none;}
  .inv-months::-webkit-scrollbar{display:none;}
  .inv-month-card{display:grid; grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:1rem; align-items:center; margin-top:.8rem; background:#FFFFFF; color:#111113; border:1px solid var(--line); border-radius:22px; padding:1rem;}
  @media (max-width:760px){ .inv-month-card{grid-template-columns:1fr;} }
  .inv-month-card .inv-mbtn{height:220px;}
  .inv-month-card p{margin:.4rem 0 0; color:#5B5D63; font-size:.95rem; line-height:1.55;}

  /* Kartica stana: Osnova / 360° / 3D / Slike (UnitMedia). */
  .inv-um{margin:.8rem 0 .2rem;}
  .inv-um-tabs{display:flex; gap:4px; background:#EEF2F8; border-radius:12px; padding:3px; margin-bottom:6px; overflow-x:auto; scrollbar-width:none;}
  .inv-um-tabs::-webkit-scrollbar{display:none;}
  .inv-um-tabs button{flex:1 0 auto; border:0; background:transparent; border-radius:9px; padding:.45rem .6rem; font-size:.78rem; font-weight:700; color:#5B5D63; white-space:nowrap; min-height:36px;}
  .inv-um-tabs button[aria-selected="true"]{background:#FFFFFF; color:#1E5AA8; box-shadow:0 1px 4px rgba(0,0,0,.08);}
  .inv-um-stage{position:relative; border:1px solid #E3E8F1; border-radius:14px; overflow:hidden; background:#FFFFFF;}
  .inv-um-img{display:flex; align-items:center; justify-content:center; height:240px; background:#FFFFFF; cursor:zoom-in;}
  .inv-um-img img{max-width:100%; max-height:100%; object-fit:contain; display:block;}
  .inv-um-stage iframe{display:block; width:100%; height:260px; border:0;}
  .inv-um-full{position:absolute; right:8px; bottom:8px; background:rgba(15,23,42,.7); color:#fff; font-size:.72rem; font-weight:700; border-radius:999px; padding:.35rem .7rem; text-decoration:none;}
  .inv-um-nav{position:absolute; left:0; right:0; bottom:8px; display:flex; justify-content:center; align-items:center; gap:10px;}
  .inv-um-nav button{width:32px; height:32px; border-radius:50%; border:0; background:rgba(15,23,42,.65); color:#fff; font-size:1.1rem; line-height:1;}
  .inv-um-nav span{background:rgba(15,23,42,.65); color:#fff; font-size:.72rem; font-weight:700; border-radius:999px; padding:.2rem .6rem;}
  .inv-rooms{margin:0 0 .8rem;}
  .inv-rooms-title{display:block; font-size:.68rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#686A70; margin-bottom:.3rem;}
  .inv-rooms table{width:100%; border-collapse:collapse; font-size:.85rem;}
  .inv-rooms td{padding:.32rem 0; border-bottom:1px solid #EEF2F8; color:#374151;}
  .inv-rooms td:last-child{text-align:right; white-space:nowrap; font-weight:600; color:#111113;}
  .inv-rooms tr.is-total td{font-weight:800; color:#111113; border-bottom:0; border-top:1.5px solid #111113;}
  .inv-pdf{display:flex; align-items:center; justify-content:center; gap:.5rem; width:100%; margin:0 0 .8rem; padding:.6rem; min-height:42px; border:1.5px solid #D5DEEB; border-radius:14px; background:#FFFFFF; color:#111113; font-weight:700; font-size:.88rem; text-decoration:none;}
  .inv-pdf span{font-size:.62rem; font-weight:800; background:#B42318; color:#fff; border-radius:4px; padding:2px 5px;}
  .inv-pdf:hover{border-color:#1E5AA8; color:#1E5AA8;}

  /* Kalkulator plana plaćanja (kartica stana). */
  .inv-pay-open{display:flex; align-items:center; justify-content:center; gap:.5rem; width:100%; margin:0 0 .8rem; padding:.7rem; min-height:44px; border:1.5px dashed #9DBBE3; border-radius:14px; background:#F6F8FC; color:#1E5AA8; font-weight:700; font-size:.9rem;}
  .inv-pay-open span{display:inline-grid; place-items:center; width:1.5rem; height:1.5rem; border-radius:50%; background:#1E5AA8; color:#fff; font-size:.8rem;}
  .inv-pay{border:1.5px solid #D5DEEB; border-radius:16px; padding:.85rem; margin:0 0 .8rem; background:#FBFCFE;}
  .inv-pay-head{display:flex; justify-content:space-between; align-items:center;}
  .inv-pay-head b{font-family:var(--font-display); font-size:1rem;}
  .inv-pay-head button{border:0; background:#EEF2F8; width:30px; height:30px; border-radius:50%; font-size:1.1rem; line-height:1; color:#5B5D63;}
  .inv-pay-label{display:block; font-size:.68rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#686A70; margin:.7rem 0 .35rem;}
  .inv-pay-chips{display:flex; gap:5px; flex-wrap:wrap;}
  .inv-pay-chips button{border:1.5px solid #D5DEEB; background:#FFFFFF; border-radius:999px; padding:.35rem .75rem; font-size:.82rem; font-weight:700; color:#374151; min-height:34px;}
  .inv-pay-chips button[aria-pressed="true"]{background:#1E5AA8; border-color:#1E5AA8; color:#FFFFFF;}
  .inv-pay-tabs{display:grid; grid-template-columns:1fr 1fr; gap:4px; background:#EEF2F8; border-radius:12px; padding:3px; margin-top:.8rem;}
  .inv-pay-tabs button{border:0; background:transparent; border-radius:9px; padding:.5rem .3rem; font-size:.8rem; font-weight:700; color:#5B5D63; min-height:38px;}
  .inv-pay-tabs button[aria-selected="true"]{background:#FFFFFF; color:#1E5AA8; box-shadow:0 1px 4px rgba(0,0,0,.08);}
  .inv-pay-rate{display:flex; justify-content:space-between; align-items:center; gap:.6rem; margin-top:.7rem; font-size:.82rem; font-weight:600; color:#5B5D63;}
  .inv-pay-rate span{display:flex; align-items:center; gap:4px; font-weight:700; color:#111113;}
  .inv-pay-rate input{width:4.2rem; font:inherit; font-weight:700; text-align:right; border:1.5px solid #D5DEEB; border-radius:9px; padding:.35rem .45rem; color:#111113; background:#FFFFFF;}
  .inv-pay-sum{display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:.85rem;}
  .inv-pay-sum > div{background:#FFFFFF; border:1px solid #E3E8F1; border-radius:12px; padding:.5rem .6rem;}
  .inv-pay-sum small{display:block; font-size:.66rem; font-weight:700; color:#686A70;}
  .inv-pay-sum b{display:block; font-family:var(--font-display); font-size:.98rem; color:#111113; margin-top:1px;}
  .inv-pay-sum .is-main{grid-column:1 / -1; background:#1E5AA8; border-color:#1E5AA8;}
  .inv-pay-sum .is-main small{color:#DCE8F7;}
  .inv-pay-sum .is-main b{color:#FFFFFF; font-size:1.3rem;}
  /* color:inherit - sajt boji svaki <em> akcentnom bojom, a ovde je pozadina plava. */
  .inv-pay-sum em{font-style:normal; font-family:var(--font-body); font-size:.78rem; font-weight:600; opacity:.85; color:inherit;}
  .inv-pay-note{margin:.6rem 0 0; font-size:.72rem; color:#686A70; line-height:1.45;}

  /* Šta je u blizini (ProjectNearby). */
  .inv-nearby{margin-top:clamp(1.6rem,4vw,2.4rem);}
  .inv-nearby h2{font-family:var(--font-display); font-size:clamp(1.4rem,3vw,1.9rem); margin:0;}
  .inv-nearby-note{margin:.35rem 0 .9rem; color:var(--ink-soft);}
  .inv-nearby-grid{display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); gap:1rem; align-items:stretch;}
  @media (max-width:860px){ .inv-nearby-grid{grid-template-columns:1fr;} }
  .inv-nearby-map{height:420px; border-radius:22px; overflow:hidden; border:1px solid var(--line); background:#E9EEF5; z-index:0;}
  @media (max-width:860px){ .inv-nearby-map{height:320px;} }
  .inv-nearby-map.is-loading{animation:invPulse 1.4s ease-in-out infinite;}
  @keyframes invPulse{50%{opacity:.6}}
  .inv-nearby-list{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; align-content:start; max-height:420px; overflow-y:auto; overflow-x:hidden;}
  @media (max-width:860px){ .inv-nearby-list{max-height:none;} }
  @media (max-width:640px){ .inv-nearby-list{grid-template-columns:minmax(0,1fr);} }
  .inv-nearby-cat{background:#FFFFFF; color:#111113; border:1px solid var(--line); border-radius:16px; padding:.7rem .8rem;}
  .inv-nearby-cat b{display:block; font-family:var(--font-display); font-size:.92rem; margin-bottom:.3rem;}
  .inv-nearby-cat button{display:flex; justify-content:space-between; align-items:baseline; gap:.6rem; width:100%; border:0; background:transparent; padding:.3rem 0; text-align:left; font:inherit; font-size:.85rem; color:#374151; cursor:pointer; border-top:1px solid #F1F1EC;}
  .inv-nearby-cat button span{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .inv-nearby-cat button small{color:#1E5AA8; font-weight:700; white-space:nowrap;}
  .inv-nearby-cat button[aria-pressed="true"] span{color:#1E5AA8; font-weight:700;}
  .inv-nearby-src{margin:.6rem 0 0; font-size:.75rem; color:var(--ink-faint);}

  /* Telefon: red velikih dugmadi spratova uz sliku (na računaru skriven). */
  .inv-floorchips{display:none;}
  @media (max-width:960px){
    .inv-floorchips{display:flex; gap:6px; overflow-x:auto; padding:10px 2px 4px; margin:0 -2px; scrollbar-width:none; -webkit-overflow-scrolling:touch;}
    .inv-floorchips::-webkit-scrollbar{display:none;}
    .inv-fchip{flex:0 0 auto; min-width:58px; min-height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; border:1.5px solid #D5DEEB; background:#FFFFFF; border-radius:14px; padding:6px 10px; color:#111113;}
    .inv-fchip b{font-family:var(--font-display); font-size:1.05rem; line-height:1.1;}
    .inv-fchip small{font-size:.68rem; font-weight:700; color:#1F7A45; white-space:nowrap;}
    .inv-fchip.is-none small{color:#8A8A8A;}
    .inv-fchip[aria-pressed="true"]{border-color:#1E5AA8; background:#1E5AA8; color:#FFFFFF;}
    .inv-fchip[aria-pressed="true"] small{color:#DCE8F7;}
    .inv-stagehd h3{font-size:1.15rem;}
  }
  .inv-form{display:flex; flex-direction:column; gap:.5rem; margin-top:.4rem;}
  .inv-form input, .inv-form textarea{font:inherit; font-size:.92rem; color:#111113; background:#FFFFFF; border:1.5px solid #D5DEEB; border-radius:12px; padding:.6rem .75rem; width:100%; box-sizing:border-box;}
  .inv-form textarea{min-height:80px; resize:vertical;}
  .inv-form-msg{font-size:.85rem; font-weight:600; margin:.2rem 0 0;}
  .inv-form-msg.is-ok{color:#1F7A45;}
  .inv-form-msg.is-err{color:#B42318;}

  /* Prekidač Zgrada / Lista (migracija 025). */
  .inv-modebar{display:flex; justify-content:space-between; align-items:center; gap:.6rem;}
  .inv-modebar .inv-tabs{margin-bottom:.8rem;}
  .inv-tabs small{font-size:.72rem; font-weight:800; background:#E3E8F1; color:#5B5D63; border-radius:999px; padding:1px 7px; margin-left:4px;}
  .inv-tabs button[aria-selected="true"] small{background:#DCE8F7; color:var(--d-accent);}
  .inv-stagehd > span:empty{min-width:1px;}

  /* Rotacija: više slika iste zgrade. */
  .inv-rot{position:absolute; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; border:0; background:rgba(255,255,255,.92); color:var(--d-accent); font-size:1.7rem; line-height:1; font-weight:700; box-shadow:0 2px 10px rgba(0,0,0,.25); display:grid; place-items:center; padding:0 0 3px;}
  .inv-rot.is-l{left:10px;} .inv-rot.is-r{right:10px;}
  .inv-rot:hover{background:#FFFFFF;}
  .inv-rot-label{position:absolute; left:50%; bottom:10px; transform:translateX(-50%); background:rgba(15,23,42,.72); color:#FFFFFF; font-size:.75rem; font-weight:700; border-radius:999px; padding:.25rem .7rem; white-space:nowrap; pointer-events:none;}
  .inv-tag.is-unit{transform:translate(-50%,-115%); z-index:2;}
  .inv-tag small.is-s{color:#1F7A45;} .inv-tag small.is-r{color:#9A6A0B;} .inv-tag small.is-p{color:#6B6B6B;}

  /* Kompleks bez slike iz vazduha: kartice lamela. */
  .inv-bcards{display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; margin-top:.8rem;}
  .inv-bcard{display:flex; flex-direction:column; align-items:flex-start; gap:2px; border:1px solid var(--d-line); background:#FFFFFF; border-radius:16px; padding:8px 8px 10px; text-align:left; color:var(--d-ink);}
  .inv-bcard:hover{border-color:#9DBBE3;}
  .inv-bcard-img{display:block; width:100%; aspect-ratio:4/3; border-radius:11px; background:#EEF2F8 center/cover; margin-bottom:6px;}
  .inv-bcard b{font-family:var(--font-display); font-size:1rem;}
  .inv-bcard small{font-size:.78rem; font-weight:700; color:#1F7A45;}
  .inv-bcard small.is-none{color:#8A8A8A;}

  /* Lista svih stanova. */
  .inv-lst-filters{border:1px solid var(--d-line); border-radius:18px; padding:.8rem 1rem; margin-bottom:.8rem;}
  .inv-lst-filters .inv-chips{margin-top:0;}
  .inv-selects.is-wide{grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); align-items:end; margin-bottom:.4rem;}
  .inv-check{flex-direction:row !important; align-items:center; gap:8px !important; min-height:38px; font-size:.86rem !important; color:#111113 !important; cursor:pointer;}
  .inv-check input{width:18px; height:18px; accent-color:#1E5AA8;}
  .inv-lst-wrap{border:1px solid var(--d-line); border-radius:18px; overflow:auto; max-height:640px;}
  .inv-lst-table{width:100%; border-collapse:collapse; font-size:.9rem; color:var(--d-ink);}
  .inv-lst-table th{position:sticky; top:0; z-index:1; background:#F6F8FC; text-align:left; padding:0; border-bottom:1px solid var(--d-line);}
  .inv-lst-table th button{display:flex; align-items:center; gap:4px; width:100%; border:0; background:transparent; padding:.65rem .7rem; font-size:.72rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#5B5D63; white-space:nowrap;}
  .inv-lst-table th[aria-sort="ascending"] button, .inv-lst-table th[aria-sort="descending"] button{color:var(--d-accent);}
  .inv-lst-table th i{font-style:normal; opacity:.6;}
  .inv-lst-table th.is-num button{justify-content:flex-end;}
  .inv-lst-table td{padding:.6rem .7rem; border-bottom:1px solid #EEF2F8; white-space:nowrap;}
  .inv-lst-table td.is-num{text-align:right; font-variant-numeric:tabular-nums;}
  .inv-lst-table td.is-price{font-weight:700;}
  .inv-lst-table td.is-code b{font-family:var(--font-display);}
  .inv-lst-table tbody tr{cursor:pointer; outline:none;}
  .inv-lst-table tbody tr:hover, .inv-lst-table tbody tr:focus-visible{background:#F3F7FD;}
  .inv-lst-table tbody tr:last-child td{border-bottom:0;}
  /* Telefon: svaki stan je kartica (oznaka + status gore, podaci ispod). */
  @media (max-width:700px){
    .inv-lst-wrap{border:0; max-height:none; overflow:visible;}
    .inv-lst-table thead{display:none;}
    .inv-lst-table, .inv-lst-table tbody{display:block;}
    .inv-lst-table tbody tr{display:grid; grid-template-columns:1fr 1fr; gap:2px 12px; border:1px solid var(--d-line); border-radius:16px; padding:.7rem .8rem; margin-bottom:8px;}
    .inv-lst-table td{display:flex; justify-content:space-between; gap:8px; padding:.15rem 0; border:0; white-space:normal; font-size:.85rem;}
    .inv-lst-table td.is-num{text-align:left;}
    .inv-lst-table td[data-l]::before{content:attr(data-l); color:#686A70; font-size:.75rem; font-weight:600;}
    .inv-lst-table td.is-code{font-size:1.05rem; grid-column:1; grid-row:1;}
    .inv-lst-table td.is-status{justify-content:flex-end; grid-column:2; grid-row:1;}
    .inv-lst-filters{padding:.7rem .75rem;}
  }
  /* ===== Dizajn 2 (2. 10. 2026): traka filtera, redovi sa zauzetošću, bez okvira u okviru ===== */
  .inv-demo{padding:clamp(.9rem,2.2vw,1.5rem); border-radius:30px; box-shadow:0 30px 60px -30px rgba(17,24,39,.28), 0 2px 6px rgba(17,24,39,.05);}
  .inv-modebar{flex-wrap:wrap; margin-bottom:.9rem;}
  .inv-modebar .inv-tabs{margin-bottom:0;}
  .inv-count{font-size:.82rem; font-weight:600; color:#6B7280;}
  .inv-grid{gap:clamp(1rem,2vw,1.6rem);}
  .inv-stage{border:0; padding:0; border-radius:0;}
  /* Računar: slika ostaje na ekranu dok se spisak spratova pomera. */
  @media (min-width:961px){ .inv-grid > .inv-stage{position:sticky; top:88px;} }
  .inv-stagehd{min-height:40px; margin-bottom:.2rem;}
  .inv-stagehd h3{font-size:1.3rem; letter-spacing:-.01em;}
  .inv-imgbox{border-radius:22px; box-shadow:0 12px 30px -18px rgba(17,24,39,.45);}
  .inv-panel{border:0; background:#F4F7FB; border-radius:24px; padding:1.1rem;}
  .inv-phead{margin:.1rem .2rem .9rem;}
  .inv-phead .inv-title{font-size:1.35rem; margin-top:0;}
  .inv-panel > .inv-title{font-size:1.45rem;}
  .inv-list{gap:8px;}
  .inv-legend{gap:.5rem;}
  .inv-legend span{display:inline-flex; align-items:center; background:#F4F7FB; border-radius:999px; padding:.3rem .7rem; font-weight:600;}
  .inv-legend i{border-radius:50%; width:10px; height:10px;}

  /* Traka filtera: „pilule" sa padajućim izborom + prekidač „samo slobodni". */
  .inv-fbar{display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:0 0 1rem; margin:0 0 1.1rem; border-bottom:1px solid #EAEFF6;}
  .inv-pill{position:relative; display:inline-flex; align-items:center; gap:.35rem; height:42px; padding:0 .35rem 0 .95rem; border:1.5px solid #DCE3EE; border-radius:999px; background:#FFFFFF; font-size:.86rem; color:#111113; transition:border-color .15s, background .15s; cursor:pointer;}
  .inv-pill:hover{border-color:#9DBBE3;}
  .inv-pill > span{font-weight:600; color:#6B7280; white-space:nowrap;}
  .inv-pill select{appearance:none; -webkit-appearance:none; border:0; background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' fill='none' stroke='%23111113' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right .55rem center; font:inherit; font-weight:750; color:#111113; padding:0 1.7rem 0 .1rem; height:100%; cursor:pointer; outline:none; max-width:11rem;}
  .inv-pill select:focus-visible{box-shadow:0 0 0 2px #9DBBE3; border-radius:8px;}
  .inv-pill.is-on{border-color:#1E5AA8; background:#EEF4FC;}
  .inv-pill.is-on > span{color:#1E5AA8;}
  .inv-pill.is-toggle{padding:0 1rem 0 .7rem; gap:.55rem; font:inherit; font-size:.86rem; font-weight:700; color:#374151;}
  .inv-pill.is-toggle i{position:relative; width:30px; height:18px; border-radius:999px; background:#D5DEEB; transition:background .15s; flex:none;}
  .inv-pill.is-toggle i::after{content:""; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#FFFFFF; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .15s;}
  .inv-pill.is-toggle.is-on{color:#1E5AA8;}
  .inv-pill.is-toggle.is-on i{background:#2E9E5B;}
  .inv-pill.is-toggle.is-on i::after{transform:translateX(12px);}
  .inv-reset{border:0; background:transparent; color:#1E5AA8; font-weight:750; font-size:.86rem; padding:.5rem .6rem; border-radius:999px; min-height:42px;}
  .inv-reset:hover{background:#EEF4FC;}
  @media (max-width:700px){
    .inv-fbar{flex-wrap:nowrap; overflow-x:auto; margin-inline:calc(-1 * clamp(.9rem,2.2vw,1.5rem)); padding-inline:clamp(.9rem,2.2vw,1.5rem); scrollbar-width:none; -webkit-overflow-scrolling:touch;}
    .inv-fbar::-webkit-scrollbar{display:none;}
    .inv-pill, .inv-reset{flex:none;}
    .inv-modebar{gap:.4rem;}
  }

  /* Red sprata / lamele / stana: broj, naziv + cena, traka zauzetosti, slobodni. */
  .inv-frow{display:grid; grid-template-columns:44px minmax(0,1fr) auto; align-items:center; gap:12px; width:100%; padding:.6rem .75rem .6rem .6rem; border:1px solid transparent; border-radius:16px; background:#FFFFFF; color:#111113; text-align:left; box-shadow:0 1px 2px rgba(16,24,40,.06); transition:border-color .15s, box-shadow .15s, transform .15s;}
  .inv-frow:hover, .inv-frow.is-hover{border-color:#9DBBE3; box-shadow:0 8px 20px -12px rgba(30,90,168,.45); transform:translateY(-1px);}
  .inv-frow:focus-visible{outline:2px solid #1E5AA8; outline-offset:2px;}
  .inv-frow-n{display:grid; place-items:center; width:44px; height:44px; border-radius:13px; background:#EEF4FC; color:#1E5AA8; font-family:var(--font-display); font-weight:800; font-size:1.02rem; letter-spacing:-.01em;}
  .inv-frow-n.is-s{background:#DCF3E4; color:#1F7A45;}
  .inv-frow-n.is-r{background:#FCEFD3; color:#9A6A0B;}
  .inv-frow-n.is-p{background:#ECECEC; color:#6B6B6B;}
  .inv-frow-main{min-width:0;}
  .inv-frow-main b{display:block; font-family:var(--font-display); font-size:.95rem; line-height:1.2;}
  .inv-frow-main small{display:block; color:#6B7280; font-size:.79rem; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .inv-occ{display:flex; height:5px; border-radius:999px; overflow:hidden; background:#EEF2F8; margin-top:7px; max-width:180px;}
  .inv-occ i{display:block; height:100%;}
  .inv-occ i.is-s{background:#2E9E5B;} .inv-occ i.is-r{background:#D99A1E;} .inv-occ i.is-p{background:#C4C7CE;}

  /* Kartica stana: mekše površine u panelu. */
  .inv-panel .inv-facts > div{background:#FFFFFF;}
  .inv-panel .inv-price{border-color:#E3E9F2;}
  .inv-panel .inv-um-stage, .inv-panel .inv-pdf, .inv-panel .inv-pay{border-color:#DCE3EE;}
  /* Isečak osnove sprata = osnova stana (UnitPlanCrop). */
  .inv-crop{display:flex; justify-content:center; align-items:center; background:#FFFFFF; padding:8px; min-height:120px;}
  .inv-crop-box{position:relative; overflow:hidden; max-width:100%; border-radius:6px;}
  .inv-crop-box img{position:absolute; max-width:none; height:auto; display:block;}
  .inv-crop-box svg{position:absolute; inset:0; width:100%; height:100%; pointer-events:none;}
  .inv-crop.is-tall{padding:clamp(10px,2vw,22px);}

  /* Link „Otvori stranu stana" u kartici. */
  .inv-open{display:flex; justify-content:space-between; align-items:center; gap:.6rem; margin:.7rem 0 0; padding:.7rem .95rem; border-radius:14px; background:#1E5AA8; color:#FFFFFF; font-weight:750; font-size:.9rem; text-decoration:none; transition:background .15s;}
  .inv-open:hover{background:#174A8C;}
  .inv-open span{font-size:1.1rem;}

  /* Strana stana: isti prekidač kao u kartici stana, samo veći, sa ikonicama. */
  .inv-um.is-large .inv-um-tabs{display:flex; gap:4px; background:#F3F6FB; border:1px solid #E3E8F1; border-radius:14px; padding:4px; margin-bottom:12px; overflow:visible;}
  .inv-um.is-large .inv-um-tabs button{flex:1 1 0; display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:44px; border:1px solid transparent; border-radius:11px; background:transparent; color:#5B5D63; font-size:.9rem; font-weight:650; cursor:pointer; transition:background .15s, color .15s;}
  .inv-um.is-large .inv-um-tabs button svg{width:17px; height:17px; flex:0 0 auto;}
  .inv-um.is-large .inv-um-tabs button:hover{color:#1E5AA8;}
  .inv-um.is-large .inv-um-tabs button[aria-selected="true"]{background:#FFFFFF; color:#1E5AA8; border-color:#C9D7EC; box-shadow:0 1px 4px rgba(15,23,42,.08);}
  .inv-um.is-large .inv-um-tabs button:focus-visible{outline:2px solid #1E5AA8; outline-offset:2px;}
  .inv-um.is-large .inv-um-stage{border:1px solid #E3E8F1; border-radius:16px;}
  .inv-um.is-large .inv-um-img{height:min(68vh,640px);}
  .inv-um.is-large .inv-um-stage iframe{height:min(70vh,660px);}
  /* 3D osnova: renderi dolaze sa crnom pozadinom - okvir je iste boje, pa slika ispunjava ceo prostor. */
  .inv-um-stage.is-dark{background:#000000; border-color:#000000;}
  .inv-um-stage.is-dark .inv-um-img{background:#000000;}
  .inv-um-zoom{position:absolute; right:10px; bottom:10px; display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.12); color:#FFFFFF; border:1px solid rgba(255,255,255,.28); font-size:.74rem; font-weight:700; border-radius:999px; padding:.3rem .7rem; pointer-events:none;}
  .inv-um-stage:not(.is-dark) .inv-um-zoom{background:rgba(15,23,42,.62); border-color:transparent;}
  .inv-um-zoom svg{width:13px; height:13px;}
  .inv-um-cropbtn{position:relative; display:block; width:100%; padding:0; border:0; background:transparent; cursor:zoom-in; font:inherit;}
  .inv-um-cropbtn:focus-visible{outline:2px solid #1E5AA8; outline-offset:-2px;}
  .inv-um-lightbox{position:fixed; inset:0; z-index:80; background:rgba(10,12,16,.86); display:flex; align-items:center; justify-content:center; padding:56px 16px 16px; cursor:zoom-out;}
  .inv-um-lightbox-body{background:#FFFFFF; border-radius:16px; max-width:min(1200px,100%); max-height:100%; overflow:auto; cursor:default;}
  .inv-um-lightbox-x{position:absolute; top:10px; right:12px; width:40px; height:40px; border-radius:50%; border:0; background:rgba(255,255,255,.14); color:#FFFFFF; font-size:1.6rem; line-height:1; cursor:pointer;}
  .inv-um-lightbox-x:hover{background:rgba(255,255,255,.26);}
  .inv-crop.is-full{padding:clamp(10px,2vw,20px);}
  @media (max-width:700px){
    .inv-um.is-large .inv-um-tabs{display:grid; grid-template-columns:1fr 1fr;}
    .inv-um.is-large .inv-um-tabs button{font-size:.84rem;}
    .inv-um.is-large .inv-um-img{height:52vh;}
    .inv-um.is-large .inv-um-stage iframe{height:60vh;}
  }
  /* Prezentacija (migracija 026): prazna kartica i oznaka demo ture. */
  .inv-um-soon{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.35rem; height:240px; background:repeating-linear-gradient(135deg,#F6F8FC 0 14px,#EEF2F8 14px 28px); color:#5B5D63; text-align:center; padding:1rem;}
  .inv-um-soon b{font-family:var(--font-display); font-size:1.05rem; color:#111113;}
  .inv-um-soon small{font-size:.82rem; font-weight:600;}
  .inv-um.is-large .inv-um-soon{height:min(52vh,460px);}
  .inv-um-demo{position:absolute; left:10px; top:58px; background:rgba(15,23,42,.72); color:#fff; font-size:.7rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; border-radius:999px; padding:.3rem .65rem; pointer-events:none;}

  /* ===== Ceo ekran (računar, FacadeFullscreen): zgrada preko celog prozora, filteri na dnu ===== */
  .inv-fullbtn{display:none;}
  @media (min-width:961px){
    .inv-fullbtn{display:inline-flex; align-items:center; gap:.45rem; border:0; background:#111113; color:#FFFFFF; border-radius:999px; padding:.55rem 1.05rem; font-weight:700; font-size:.86rem; min-height:40px; cursor:pointer;}
    .inv-fullbtn:hover{background:#1E5AA8;}
    .inv-fullbtn.is-onimg{position:absolute; top:12px; left:12px; z-index:2; background:rgba(17,17,19,.78); backdrop-filter:blur(6px); box-shadow:0 4px 14px rgba(0,0,0,.25);}
    .inv-fullbtn.is-onimg:hover{background:#1E5AA8;}
  }
  .inv-fs{--d-ink:#111113; --d-soft:#5B5D63; --d-faint:#686A70; --d-line:#E3E8F1; --d-accent:#1E5AA8; --d-soft-bg:#F6F8FC;
    position:fixed; inset:0; z-index:1000; outline:none; background:#0B0F17; color:#FFFFFF; overflow:hidden; font-family:var(--font-body);}
  .inv-fs button{font:inherit; cursor:pointer;}
  .fs-bg{position:absolute; inset:-40px; background:center/cover no-repeat; filter:blur(28px) brightness(.55); transform:scale(1.05);}
  .fs-view{position:absolute; top:0; left:0; bottom:0; transition:right .2s ease-out;}
  .fs-stage{position:absolute; inset:0; width:100%; height:100%; display:block;}
  .fs-poly{cursor:pointer; outline:none; transition:fill-opacity .15s, stroke-width .15s;}
  .fs-poly:focus-visible{stroke:#FFFFFF; stroke-width:4;}
  .fs-tag{position:absolute; transform:translate(-50%,-50%); pointer-events:none; background:rgba(255,255,255,.94); color:#111113; border-radius:999px; padding:2px 10px; font-family:var(--font-display); font-weight:800; font-size:.82rem; box-shadow:0 1px 6px rgba(0,0,0,.3); white-space:nowrap;}
  .fs-tip{position:fixed; z-index:5; pointer-events:none; min-width:180px; max-width:240px; background:rgba(255,255,255,.97); color:#111113; border-radius:14px; padding:.65rem .8rem; box-shadow:0 12px 30px -8px rgba(0,0,0,.45); display:flex; flex-direction:column; gap:2px; font-size:.84rem;}
  .fs-tip b{font-family:var(--font-display); font-size:1.05rem;}
  .fs-tip span{color:#4B5563;}
  .fs-tip span:nth-of-type(3){color:#111113; font-weight:800; font-size:.95rem; margin-top:2px;}
  .fs-tip .fs-tip-badge{align-self:flex-start; margin-top:5px; font-style:normal; color:#FFFFFF; font-size:.72rem; font-weight:800; border-radius:999px; padding:.18rem .6rem;}
  .fs-top{position:absolute; top:0; left:0; right:0; z-index:3; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; padding:14px 16px; pointer-events:none; background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0));}
  .fs-top > *{pointer-events:auto;}
  .fs-back{display:inline-flex; align-items:center; gap:.5rem; border:0; background:rgba(17,17,19,.72); backdrop-filter:blur(6px); color:#FFFFFF; border-radius:10px; padding:.55rem .95rem .55rem .7rem; font-weight:700; font-size:.95rem; min-height:44px;}
  .fs-back span{font-size:1.5rem; line-height:1; margin-top:-3px;}
  .fs-back:hover{background:#1E5AA8;}
  .fs-count{align-self:center; background:rgba(17,17,19,.6); backdrop-filter:blur(6px); border-radius:999px; padding:.35rem .9rem; font-size:.84rem; font-weight:600; color:#E5E7EB;}
  .fs-count:empty{display:none;}
  .fs-modes{display:flex; gap:8px;}
  .fs-modes button{border:1.5px solid #FFFFFF; background:#FFFFFF; color:#111113; min-width:112px; min-height:42px; padding:0 1rem; border-radius:6px; font-weight:700; font-size:.84rem; letter-spacing:.04em;}
  .fs-modes button.is-on{background:#111113; border-color:#111113; color:#FFFFFF; cursor:default;}
  .fs-modes button:not(.is-on):hover{background:#EEF4FC;}
  .fs-modes .fs-x{min-width:42px; padding:0; font-size:1.5rem; line-height:1; background:rgba(17,17,19,.72); border-color:transparent; color:#FFFFFF;}
  .fs-modes .fs-x:hover{background:#1E5AA8;}
  .fs-rot{position:absolute; top:50%; transform:translateY(-50%); z-index:3; width:58px; height:58px; border:0; border-radius:10px; background:rgba(17,17,19,.6); backdrop-filter:blur(6px); display:grid; place-items:center; transition:background .15s;}
  .fs-rot svg{width:28px; height:28px; fill:none; stroke:#FFFFFF; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round;}
  .fs-rot:hover{background:#1E5AA8;}
  .fs-rot.is-l{left:14px;} .fs-rot.is-r{right:14px;}
  .fs-bar[hidden]{display:none;}
  .fs-bar{position:absolute; left:0; right:0; bottom:0; z-index:3; display:flex; justify-content:center; align-items:flex-end; flex-wrap:wrap; gap:14px 34px; padding:12px 24px 16px; background:rgba(12,15,22,.8); backdrop-filter:blur(10px);}
  .fs-grp{display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0;}
  .fs-grp > label{font-size:.82rem; font-weight:600; color:#E5E7EB;}
  .fs-range{display:flex; flex-direction:column; align-items:center; gap:4px; width:220px;}
  .fs-range-track{position:relative; width:100%; height:24px;}
  .fs-range-track::before{content:""; position:absolute; left:0; right:0; top:10px; height:4px; border-radius:4px; background:rgba(255,255,255,.28);}
  .fs-range-track > i{position:absolute; top:10px; height:4px; border-radius:4px; background:#FFFFFF;}
  .fs-range input{position:absolute; inset:0; width:100%; height:24px; margin:0; background:transparent; pointer-events:none; -webkit-appearance:none; appearance:none;}
  .fs-range input::-webkit-slider-runnable-track{background:transparent; height:24px;}
  .fs-range input::-moz-range-track{background:transparent;}
  .fs-range input::-webkit-slider-thumb{-webkit-appearance:none; pointer-events:auto; width:22px; height:22px; margin-top:1px; border-radius:50%; background:#FFFFFF; border:0; box-shadow:0 1px 6px rgba(0,0,0,.4); cursor:grab;}
  .fs-range input::-moz-range-thumb{pointer-events:auto; width:22px; height:22px; border-radius:50%; background:#FFFFFF; border:0; box-shadow:0 1px 6px rgba(0,0,0,.4); cursor:grab;}
  .fs-range input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px #7FB0F0;}
  .fs-range-val{font-size:.84rem; font-weight:700; color:#FFFFFF; font-variant-numeric:tabular-nums;}
  .fs-chips{display:flex; gap:5px;}
  .fs-chips button{min-width:38px; height:38px; padding:0 .55rem; border:0; border-radius:6px; background:rgba(255,255,255,.16); color:#FFFFFF; font-weight:700; font-size:.9rem;}
  .fs-chips button:hover{background:rgba(255,255,255,.28);}
  .fs-chips button[aria-pressed="true"]{background:#FFFFFF; color:#111113;}
  .fs-sts{display:flex; gap:5px;}
  .fs-sts button{display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 .85rem; border:0; border-radius:6px; background:#FFFFFF; color:#111113; font-weight:650; font-size:.85rem;}
  .fs-sts button i{width:11px; height:11px; border-radius:50%;}
  .fs-sts button[aria-pressed="false"]{background:rgba(255,255,255,.14); color:#CBD5E1;}
  .fs-sts button[aria-pressed="false"] i{opacity:.35;}
  .fs-reset{height:38px; padding:0 1.6rem; border:0; border-radius:6px; background:rgba(255,255,255,.22); color:#FFFFFF; font-weight:650; font-size:.85rem;}
  .fs-reset:not(:disabled):hover{background:rgba(255,255,255,.34);}
  .fs-reset:disabled{opacity:.45; cursor:default;}
  .fs-drawer{position:absolute; top:0; right:0; bottom:0; z-index:4; overflow-y:auto; background:#F4F7FB; color:#111113; padding:1.2rem 1.2rem 1.6rem; box-shadow:-20px 0 50px -20px rgba(0,0,0,.5); animation:fsIn .2s ease-out;}
  @keyframes fsIn{from{transform:translateX(30px); opacity:0}}
  .fs-drawer .inv-facts > div{background:#FFFFFF;}
  .fs-drawer .inv-unit-head{padding-right:48px;}
  .fs-drawer-x{position:absolute; top:12px; right:12px; width:40px; height:40px; border:0; border-radius:50%; background:#E3E8F1; color:#111113; font-size:1.4rem; line-height:1;}
  .fs-drawer-x:hover{background:#D5DEEB;}
  .fs-badge{color:#FFFFFF; font-size:.72rem; font-weight:800; border-radius:999px; padding:.25rem .65rem; white-space:nowrap;}

  /* ===== Telefon: dugme „Filteri" + panel od dole (umesto reda padajućih izbora) ===== */
  .inv-mf{display:none;}
  @media (max-width:960px){
    .inv-fbar{display:none;}
    .inv-mf{display:block; margin:0 0 1rem;}
  }
  .inv-mf-btn{display:flex; align-items:center; justify-content:space-between; width:100%; min-height:50px; padding:.7rem .95rem; border:1.5px solid #DCE3EE; border-radius:16px; background:#FFFFFF; color:#111113; font-weight:700; font-size:.95rem;}
  .inv-mf-btn.is-on{border-color:#1E5AA8; background:#EEF4FC;}
  .inv-mf-l{display:flex; align-items:center; gap:.55rem;}
  .inv-mf-l svg{width:18px; height:18px; fill:none; stroke:#1E5AA8; stroke-width:2; stroke-linecap:round;}
  .inv-mf-n{background:#1E5AA8; color:#FFFFFF; border-radius:999px; font-size:.74rem; padding:.12rem .5rem; margin-left:.1rem;}
  .inv-mf-r{font-size:.84rem; font-weight:600; color:#5B5D63;}
  .inv-mf-chips{display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;}
  .inv-mf-chips button{display:inline-flex; align-items:center; gap:6px; border:0; background:#EEF4FC; color:#1E5AA8; font-size:.8rem; font-weight:700; border-radius:999px; padding:.4rem .7rem; min-height:34px;}
  .inv-mf-chips button span{font-size:.7rem; opacity:.75;}
  .inv-sheet-wrap{position:fixed; inset:0; z-index:1000;}
  .inv-sheet-shade{position:absolute; inset:0; background:rgba(10,14,22,.45); animation:invFade .2s ease-out;}
  @keyframes invFade{from{opacity:0}}
  .inv-sheet{position:absolute; left:0; right:0; bottom:0; max-height:88vh; display:flex; flex-direction:column; background:#FFFFFF; color:#111113; border-radius:24px 24px 0 0; box-shadow:0 -20px 40px -20px rgba(0,0,0,.35); animation:invUp .25s ease-out; padding-bottom:env(safe-area-inset-bottom);}
  @keyframes invUp{from{transform:translateY(100%)}}
  .inv-sheet button{font:inherit; cursor:pointer;}
  .inv-sheet-grab{width:40px; height:5px; border-radius:5px; background:#D5DEEB; margin:8px auto 4px;}
  .inv-sheet-head{display:flex; justify-content:space-between; align-items:center; padding:4px 18px 4px;}
  .inv-sheet-head b{font-family:var(--font-display); font-size:1.3rem;}
  .inv-sheet-head button{border:0; background:#EEF2F8; width:38px; height:38px; border-radius:50%; font-size:1.3rem; line-height:1; color:#111113;}
  .inv-sheet-body{overflow-y:auto; padding:0 18px; overscroll-behavior:contain;}
  .inv-sheet-grp{padding:14px 0; border-bottom:1px solid #EEF2F8;}
  .inv-sheet-grp:last-child{border-bottom:0;}
  .inv-sheet-l{display:flex; justify-content:space-between; font-size:.85rem; font-weight:700; color:#5B5D63; margin-bottom:10px;}
  .inv-sheet-v{font-weight:800; color:#111113;}
  .inv-sheet-seg{display:grid; gap:6px;}
  .inv-sheet-seg button{min-height:48px; padding:4px 2px; border:1.5px solid #DCE3EE; background:#FFFFFF; border-radius:12px; font-weight:800; font-size:.95rem; color:#111113; min-width:0;}
  .inv-sheet-seg button small{display:block; font-size:.56rem; font-weight:600; opacity:.75; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .inv-sheet-seg button[aria-pressed="true"]{background:#1E5AA8; border-color:#1E5AA8; color:#FFFFFF;}
  .inv-sheet-st{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px;}
  .inv-sheet-st button{display:flex; align-items:center; justify-content:center; gap:6px; min-height:46px; border:1.5px solid #DCE3EE; background:#FFFFFF; border-radius:12px; font-weight:700; font-size:.82rem; color:#111113; padding:0 4px;}
  .inv-sheet-st button i{width:10px; height:10px; border-radius:50%; flex:none;}
  .inv-sheet-st button[aria-pressed="false"]{background:#F4F5F7; border-color:#EEF0F3; color:#9CA3AF;}
  .inv-sheet-st button[aria-pressed="false"] i{opacity:.3;}
  .inv-sheet-foot{display:grid; grid-template-columns:1fr 1.6fr; gap:8px; padding:12px 18px 16px; border-top:1px solid #EEF2F8;}
  .inv-sheet-foot button{min-height:50px; border-radius:999px; font-weight:750; font-size:.95rem;}
  .inv-sheet-foot .is-reset{border:1.5px solid #DCE3EE; background:#FFFFFF; color:#111113;}
  .inv-sheet-foot .is-reset:disabled{opacity:.45; cursor:default;}
  .inv-sheet-foot .is-go{border:0; background:#1E5AA8; color:#FFFFFF;}
  /* Klizač (FacadeFullscreen RangeSlider) u svetloj varijanti: velike ručice za prst. */
  .fs-range.is-light{width:auto; padding:0 6px;}
  .fs-range.is-light .fs-range-track{height:32px;}
  .fs-range.is-light .fs-range-track::before{top:14px; background:#E3E8F1;}
  .fs-range.is-light .fs-range-track > i{top:14px; background:#1E5AA8;}
  .fs-range.is-light input{height:32px;}
  .fs-range.is-light input::-webkit-slider-runnable-track{height:32px;}
  .fs-range.is-light input::-webkit-slider-thumb{width:30px; height:30px; margin-top:1px; border:2px solid #1E5AA8; box-shadow:0 2px 6px rgba(0,0,0,.18);}
  .fs-range.is-light input::-moz-range-thumb{width:28px; height:28px; border:2px solid #1E5AA8;}
  .fs-range.is-light .fs-range-val{display:none;}
`;
