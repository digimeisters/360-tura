/**
 * Stil strana „Alati" (/alati i /alati/kalkulator-kredita). Ide posle
 * zajedničkog CSS-a sajta (SiteStylesheets), u <style> strane.
 */
export const TOOLS_STYLES = `
  /* Sekcije alata nose svoj razmak (sajt daje svakoj <section> veliki padding). */
  .tl-hero, .tl-tools, .tl-calc, .tl-explain, .tl-next, .tl-faq{padding-block:0;}
  .tl-hero{padding:clamp(28px,5vw,48px) 0 28px;}
  .tl-hero h1{margin:1rem 0 0; max-width:20ch; font-size:clamp(2.2rem,4.6vw,3.8rem); line-height:1.05; letter-spacing:-0.035em;}
  .tl-hero .lede{margin:1rem 0 0; max-width:52ch; color:var(--ink-soft); font-size:clamp(1rem,1.3vw,1.18rem); line-height:1.6;}
  .tl-crumb{font-size:.84rem; color:var(--ink-faint); margin:0 0 4px;}
  .tl-crumb a{color:var(--accent); text-decoration:none;}
  .tl-crumb a:hover{text-decoration:underline;}

  /* ---------- /alati ---------- */
  .tl-tools{display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px;}
  .tl-tool{background:var(--surface); border:1px solid var(--line); border-radius:24px; padding:24px; display:flex; flex-direction:column; gap:14px; text-decoration:none; color:inherit; transition:box-shadow .15s, border-color .15s;}
  a.tl-tool:hover{border-color:color-mix(in srgb, var(--accent) 45%, transparent); box-shadow:0 16px 40px -24px rgba(30,90,168,.45);}
  .tl-who{font-size:.74rem; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-faint);}
  .tl-tool h2{font-family:var(--font-display); font-size:1.5rem; letter-spacing:-.02em; margin:0; line-height:1.2;}
  .tl-tool p{margin:0; color:var(--ink-soft); line-height:1.5;}
  .tl-tool ul{margin:0; padding:0; list-style:none; display:grid; gap:7px; font-size:.9rem; color:var(--ink-soft);}
  .tl-tool li::before{content:'✓'; color:var(--ok); font-weight:800; margin-right:8px;}
  .tl-go{margin-top:auto; display:flex; justify-content:space-between; align-items:center; padding-top:6px; font-weight:700; color:var(--accent);}
  .tl-go span{width:40px; height:40px; border-radius:50%; background:#1E5AA8; color:#FFFFFF; display:grid; place-items:center; font-size:18px;}
  .tl-tool.is-soon{opacity:.75;}
  .tl-tool.is-soon .tl-go{color:var(--ink-faint);}
  .tl-tool.is-soon .tl-go span{background:var(--line-strong);}
  .tl-preview{border-radius:16px; background:var(--surface-2); border:1px solid var(--line); padding:14px; display:grid; gap:8px;}
  .tl-pv-row{display:flex; justify-content:space-between; gap:8px; font-size:.82rem; color:var(--ink-soft);}
  .tl-pv-row b{color:var(--ink); font-family:var(--font-display);}
  .tl-pv-big{background:#1E5AA8; color:#FFFFFF; border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:baseline; gap:8px;}
  .tl-pv-big small{color:#DCE8F7; font-weight:700; font-size:.8rem;}
  .tl-pv-big b{font-family:var(--font-display); font-size:1.35rem;}
  /* em ovde nije akcent sajta (serif, plavo), već obična sitna reč. */
  .tl-pv-big b em, .tl-big b em{font-family:var(--font-body); font-style:normal; font-weight:600; color:#DCE8F7; letter-spacing:0; line-height:inherit; font-variation-settings:normal;}
  .tl-pv-big b em{font-size:.8rem;}
  .tl-pv-green{background:color-mix(in srgb, var(--ok) 8%, var(--surface)); border:1px solid color-mix(in srgb, var(--ok) 35%, transparent); color:var(--ok); border-radius:12px; padding:8px 12px; display:flex; justify-content:space-between; gap:8px; font-size:.82rem; font-weight:700;}
  .tl-pv-range{height:10px; border-radius:999px; background:linear-gradient(90deg,#DCE8F7,var(--accent) 50%,#DCE8F7); position:relative; margin:10px 0 4px;}
  .tl-pv-range::after{content:''; position:absolute; left:50%; top:-5px; width:4px; height:20px; background:var(--ink); border-radius:2px;}
  .tl-strip{background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:clamp(40px,6vw,64px);}
  .tl-strip b{font-family:var(--font-display);}
  .tl-strip a{font-weight:700; color:var(--accent); text-decoration:none;}

  /* ---------- kalkulator ---------- */
  .tl-calc{display:grid; grid-template-columns:minmax(0,1fr) 420px; gap:24px; align-items:start; margin-bottom:36px;}
  .tl-card{background:var(--surface); border:1px solid var(--line); border-radius:24px; padding:22px;}
  .tl-sec + .tl-sec{border-top:1px solid var(--line); margin-top:18px; padding-top:18px;}
  .tl-sec h2{font-family:var(--font-display); font-size:1.02rem; margin:0 0 12px; display:flex; align-items:center; gap:8px;}
  .tl-sec h2 i{font-style:normal; width:24px; height:24px; border-radius:50%; background:var(--accent-soft); color:var(--accent); display:inline-grid; place-items:center; font-size:.75rem; font-weight:800;}
  .tl-field{display:grid; gap:6px; margin-bottom:12px;}
  .tl-field > span, .tl-field > label{display:flex; justify-content:space-between; gap:8px; font-size:.86rem; font-weight:600; color:var(--ink-soft);}
  .tl-field small{font-weight:500; color:var(--ink-faint);}
  .tl-num{display:flex; align-items:center; border:1.5px solid var(--line-strong); border-radius:12px; background:var(--surface); overflow:hidden;}
  .tl-num:focus-within{border-color:var(--accent); box-shadow:0 0 0 3px rgba(30,90,168,.12);}
  .tl-num input{border:0; outline:0; padding:10px 12px; width:100%; min-width:0; font-weight:700; font-size:1rem; font-family:var(--font-display); color:var(--ink); background:transparent;}
  .tl-num span{padding:0 12px; color:var(--ink-faint); font-weight:600;}
  .tl-row2{display:grid; grid-template-columns:1fr 1fr; gap:14px;}
  .tl-range{width:100%; accent-color:var(--accent); margin:2px 0 0;}
  .tl-hint{font-size:.8rem; color:var(--ink-faint); margin:2px 0 0;}
  .tl-chips{display:flex; gap:6px; flex-wrap:wrap;}
  .tl-chips button{border:1.5px solid var(--line-strong); background:var(--surface); border-radius:999px; padding:7px 14px; font:inherit; font-size:.88rem; font-weight:700; color:var(--ink-soft); min-height:40px; cursor:pointer;}
  .tl-chips button[aria-pressed="true"]{background:#1E5AA8; border-color:#1E5AA8; color:#FFFFFF;}
  .tl-tabs{display:grid; grid-template-columns:1fr 1fr; gap:4px; background:var(--line); border-radius:14px; padding:4px; margin-bottom:14px;}
  .tl-tabs button{border:0; background:transparent; border-radius:10px; padding:10px; min-height:42px; font:inherit; font-size:.88rem; font-weight:700; color:var(--ink-soft); cursor:pointer;}
  .tl-tabs button[aria-selected="true"]{background:var(--surface); color:var(--accent); box-shadow:0 1px 4px rgba(0,0,0,.08);}
  .tl-q{display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; font-weight:600;}
  .tl-q + .tl-q{margin-top:12px;}
  .tl-yn{display:inline-flex; gap:3px; background:var(--surface); border:1.5px solid var(--line-strong); border-radius:999px; padding:3px;}
  .tl-yn button{border:0; background:transparent; border-radius:999px; padding:7px 18px; min-height:36px; font:inherit; font-size:.88rem; font-weight:700; color:var(--ink-soft); cursor:pointer;}
  .tl-yn button[aria-pressed="true"]{background:#17663A; color:#FFFFFF;}
  .tl-step{display:inline-flex; align-items:center; gap:10px;}
  .tl-step button{width:40px; height:40px; border-radius:50%; border:1.5px solid color-mix(in srgb, var(--ok) 35%, transparent); background:var(--surface); font-weight:800; color:var(--ok); font-size:1.1rem; cursor:pointer;}
  .tl-step button:disabled{opacity:.4; cursor:default;}
  .tl-step b{min-width:1.4rem; text-align:center; font-size:1.05rem;}
  .tl-relief{background:color-mix(in srgb, var(--ok) 8%, var(--surface)); border:1.5px solid color-mix(in srgb, var(--ok) 35%, transparent); border-radius:16px; padding:12px 14px; margin-top:12px; font-size:.9rem; color:color-mix(in srgb, var(--ok) 75%, var(--ink)); line-height:1.5;}
  .tl-relief b{color:var(--ok);}

  .tl-res{position:sticky; top:88px;}
  .tl-res h2{font-family:var(--font-display); margin:0 0 12px; font-size:1.02rem;}
  .tl-big{background:#1E5AA8; color:#FFFFFF; border-radius:18px; padding:16px 18px;}
  .tl-big small{color:#DCE8F7; font-weight:700; font-size:.8rem;}
  .tl-big b{display:block; font-family:var(--font-display); font-size:2.2rem; letter-spacing:-.02em; margin-top:2px; line-height:1.1;}
  .tl-big b em{font-size:.95rem;}
  .tl-kv{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;}
  .tl-kv div{border:1px solid var(--line); border-radius:14px; padding:10px 12px;}
  .tl-kv small{display:block; font-size:.75rem; font-weight:700; color:var(--ink-faint);}
  .tl-kv b{font-family:var(--font-display); font-size:1.1rem;}
  .tl-back{margin-top:8px; background:color-mix(in srgb, var(--ok) 8%, var(--surface)); border:1px solid color-mix(in srgb, var(--ok) 35%, transparent); border-radius:14px; padding:10px 12px; display:flex; justify-content:space-between; align-items:baseline; gap:10px;}
  .tl-back small{font-size:.75rem; font-weight:700; color:color-mix(in srgb, var(--ok) 75%, var(--ink));}
  .tl-back b{font-family:var(--font-display); font-size:1.25rem; color:var(--ok); white-space:nowrap;}
  .tl-costs{margin-top:12px; border-top:1px solid var(--line); padding-top:10px;}
  .tl-costs-t{display:flex; justify-content:space-between; gap:8px; font-weight:700; font-size:.9rem; margin-bottom:4px;}
  .tl-costs ul{list-style:none; margin:0; padding:0;}
  .tl-costs li{display:flex; justify-content:space-between; gap:10px; font-size:.82rem; color:var(--ink-soft); padding:5px 0; border-top:1px dashed var(--line);}
  .tl-costs li small{display:block; color:var(--ink-faint); font-size:.72rem;}
  .tl-costs li b{color:var(--ink); white-space:nowrap;}
  .tl-btns{display:grid; gap:8px; margin-top:14px;}
  .tl-btn{display:flex; align-items:center; justify-content:center; gap:8px; min-height:46px; border-radius:14px; font:inherit; font-weight:700; font-size:.92rem; text-decoration:none; border:0; cursor:pointer;}
  .tl-btn.is-dark{background:#111113; color:#FFFFFF;}
  .tl-btn.is-dark span{background:#FFFFFF; color:#111113; border-radius:4px; padding:1px 5px; font-size:.68rem; font-weight:800;}
  .tl-btn.is-dark:hover{background:#1E5AA8;}
  .tl-btn.is-line{border:1.5px solid color-mix(in srgb, var(--accent) 45%, transparent); color:var(--accent); background:var(--surface);}
  .tl-fine{font-size:.76rem; color:var(--ink-faint); line-height:1.5; margin:12px 0 0;}

  .tl-explain{display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px;}
  .tl-explain h2{font-family:var(--font-display); font-size:1.08rem; margin:0 0 8px;}
  .tl-explain p{margin:0; color:var(--ink-soft); font-size:.92rem; line-height:1.55;}
  .tl-next{background:var(--dark-bg); color:var(--dark-ink); border:1px solid var(--dark-line); border-radius:28px; padding:28px; display:grid; grid-template-columns:1fr auto; gap:20px; align-items:center; margin-bottom:28px;}
  .tl-next h2{font-family:var(--font-display); font-size:1.6rem; margin:0 0 6px; letter-spacing:-.02em; color:var(--dark-ink);}
  .tl-next p{margin:0; color:var(--dark-ink-soft);}
  .tl-next a{background:#FFFFFF; color:#111113; border-radius:999px; padding:13px 20px; font-weight:800; text-decoration:none; white-space:nowrap;}
  .tl-faq{margin-bottom:28px;}
  .tl-faq > h2{font-family:var(--font-display); font-size:1.5rem; margin:0 0 12px;}
  .tl-faq details{background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:8px;}
  .tl-faq summary{font-weight:700; cursor:pointer;}
  .tl-faq p{margin:8px 0 0; color:var(--ink-soft); line-height:1.55; font-size:.92rem;}

  @media (max-width:900px){
    .tl-tools{grid-template-columns:1fr;}
    .tl-calc{grid-template-columns:1fr;}
    .tl-res{position:static;}
    .tl-explain{grid-template-columns:1fr;}
    .tl-next{grid-template-columns:1fr;}
  }
  @media (max-width:520px){
    .tl-row2{grid-template-columns:1fr;}
    .tl-card{padding:18px;}
  }

  /* „Sačuvajte kalkulaciju": pregledačeva štampa, samo unos i računica. */
  @media print{
    .nav, .foot, .tl-noprint, .tl-btns{display:none !important;}
    body{background:#FFFFFF;}
    .tl-calc{grid-template-columns:1fr 1fr; gap:16px;}
    .tl-res{position:static;}
    .tl-card{border-color:#D5DEEB; break-inside:avoid;}
    .tl-chips button:not([aria-pressed="true"]), .tl-yn button:not([aria-pressed="true"]), .tl-tabs button:not([aria-selected="true"]), .tl-range, .tl-step button{display:none;}
  }
`;
