/**
 * Izgled izbora stana (zgrada -> sprat -> stan): primer na /za-investitore
 * (components/InvestorDemo.tsx) i prava strana projekta /novogradnja/[slug]
 * (components/projekat/ProjectSelector.tsx). Klase .inv-*; kartica je uvek
 * svetla, jer su boje statusa birane za svetlu pozadinu.
 */
export const SELECTOR_STYLES = `
  /* 02 Primer: kartica je uvek svetla (boje statusa su za svetlu pozadinu). */
  .inv-badge-note{display:inline-flex; font-size:.8rem; font-weight:700; color:var(--ink-soft); background:var(--surface); border:1px dashed var(--line-strong); border-radius:999px; padding:.35rem .85rem;}
  .inv-demo{--d-ink:#111113; --d-soft:#5B5D63; --d-faint:#8C8E93; --d-line:#E3E8F1; --d-accent:#1E5AA8; --d-soft-bg:#F6F8FC;
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
`;
