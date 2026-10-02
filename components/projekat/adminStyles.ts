/**
 * CSS za admin novogradnje (/admin/projekti i /admin/projekti/[id]). Koristi
 * promenljive iz FormThemeStyle (app/lib/formTheme.tsx), pa prati svetli i
 * tamni režim kao ostatak admina.
 */
export const PROJECT_ADMIN_STYLES = `
  .pa{min-height:100dvh; background:var(--bg); color:var(--ink); font-family:var(--font-body); padding:16px 16px 64px;}
  .pa-wrap{max-width:1200px; margin:0 auto;}
  .pa-top{display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:18px;}
  .pa-top h1{margin:0; font-family:var(--font-display); font-size:22px;}
  .pa-crumbs{display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; color:var(--ink-soft);}
  .pa-crumbs a{color:var(--accent); text-decoration:none; font-weight:650;}
  .pa-card{background:var(--surface); border:1px solid var(--line); border-radius:18px; box-shadow:var(--shadow); padding:18px; margin-bottom:16px;}
  .pa-card h2{margin:0 0 4px; font-family:var(--font-display); font-size:17px;}
  .pa-card > p.pa-hint{margin:0 0 14px; font-size:13px; color:var(--ink-soft);}
  .pa-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px 14px;}
  .pa-field{display:flex; flex-direction:column; gap:4px; font-size:12.5px; font-weight:650; color:var(--ink-soft);}
  .pa-field.is-wide{grid-column:1 / -1;}
  .pa input[type="text"], .pa input[type="number"], .pa input[type="email"], .pa select, .pa textarea{
    font:inherit; font-size:14px; font-weight:400; color:var(--ink); background:var(--surface); border:1px solid var(--line-strong);
    border-radius:10px; padding:8px 10px; min-height:38px; width:100%; box-sizing:border-box;}
  .pa textarea{min-height:90px; resize:vertical;}
  .pa-btn{font:inherit; font-size:13px; font-weight:650; border-radius:999px; padding:8px 14px; min-height:36px; cursor:pointer;
    border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); text-decoration:none; display:inline-flex; align-items:center; gap:6px;}
  .pa-btn:hover{border-color:var(--accent); color:var(--accent);}
  .pa-btn.is-primary{background:var(--accent); border-color:var(--accent); color:var(--on-accent);}
  .pa-btn.is-primary:hover{background:var(--accent-strong); color:var(--on-accent);}
  .pa-btn.is-danger{color:var(--danger); border-color:color-mix(in srgb, var(--danger) 40%, transparent);}
  .pa-btn:disabled{opacity:.5; cursor:default;}
  .pa-row{display:flex; gap:8px; align-items:center; flex-wrap:wrap;}
  .pa-msg{font-size:13px; padding:8px 12px; border-radius:10px; margin:0 0 12px; white-space:pre-line;}
  .pa-msg.is-ok{background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok);}
  .pa-msg.is-err{background:var(--danger-soft); color:var(--danger);}
  .pa-toast{position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:50; width:min(560px, calc(100% - 32px)); margin:0;
    display:flex; align-items:flex-start; justify-content:space-between; gap:10px; font-size:14px; font-weight:600; padding:12px 14px;
    box-shadow:var(--shadow-lg); border:1px solid var(--line); background-clip:padding-box;}
  .pa-toast.is-ok{background:var(--surface); color:var(--ok);}
  .pa-toast.is-err{background:var(--surface); color:var(--danger); border-color:var(--danger);}
  .pa-toast button{border:0; background:none; color:inherit; font-size:20px; line-height:1; cursor:pointer; padding:0 2px;}
  .pa-list{display:flex; flex-direction:column; gap:8px;}
  .pa-item{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px solid var(--line); border-radius:14px; background:var(--surface); text-decoration:none; color:inherit;}
  .pa-item:hover{border-color:var(--accent);}
  .pa-item b{font-family:var(--font-display); font-size:15px;}
  .pa-item small{display:block; color:var(--ink-soft); font-size:12.5px;}
  .pa-pill{font-size:11.5px; font-weight:700; border-radius:999px; padding:3px 9px; white-space:nowrap;}
  .pa-pill.is-pub{background:color-mix(in srgb, var(--ok) 16%, transparent); color:var(--ok);}
  .pa-pill.is-draft{background:var(--surface-2); color:var(--ink-soft);}
  .pa-split{display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:16px; align-items:start;}
  @media (max-width:900px){ .pa-split{grid-template-columns:1fr;} }
  .pa-floors{display:flex; flex-direction:column; gap:6px;}
  .pa-floor{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border:1px solid var(--line); border-radius:12px; cursor:pointer; background:var(--surface); font:inherit; color:inherit; text-align:left; width:100%;}
  .pa-floor[aria-pressed="true"]{border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-soft);}
  .pa-floor small{color:var(--ink-faint); font-size:11.5px;}
  .pa-empty{border:2px dashed var(--line-strong); border-radius:14px; padding:28px; text-align:center; color:var(--ink-soft); font-size:14px;}
  .pa-table-wrap{overflow-x:auto;}
  .pa-table{width:100%; border-collapse:collapse; font-size:13px; min-width:860px;}
  .pa-table th{text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); padding:6px; border-bottom:1px solid var(--line);}
  .pa-table td{padding:4px 6px; border-bottom:1px solid var(--line); vertical-align:middle;}
  .pa-table input, .pa-table select{min-height:32px !important; padding:5px 7px !important; font-size:13px !important;}
  .pa-table tr.is-dirty td{background:color-mix(in srgb, var(--accent) 7%, transparent);}
  .pa-status{font-weight:700;}

  /* UnitMediaModal - detalji stana */
  .um-bg{position:fixed; inset:0; z-index:40; background:var(--overlay); display:flex; align-items:flex-start; justify-content:center; padding:24px 12px; overflow:auto;}
  .um{width:min(760px,100%); background:var(--surface); color:var(--ink); border-radius:20px; padding:18px; box-shadow:var(--shadow-lg);}
  .um h2{font-family:var(--font-display); font-size:19px;}
  .um-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
  @media (max-width:640px){ .um-grid{grid-template-columns:1fr;} }
  .um-block{display:flex; flex-direction:column; gap:6px; background:var(--surface-2); border-radius:14px; padding:12px; margin-top:12px;}
  .um-grid .um-block{margin-top:0;}
  .um-block b{font-size:14px;}
  .um-block small{font-size:12px; color:var(--ink-soft);}
  .um-img{display:flex; flex-direction:column; gap:6px; align-items:flex-start;}
  .um-img img{max-width:100%; max-height:180px; border-radius:10px; border:1px solid var(--line); background:#fff;}
  .um-thumbs{display:flex; flex-wrap:wrap; gap:8px;}
  .um-thumb{position:relative; width:110px; height:80px; border-radius:10px; overflow:hidden; border:1px solid var(--line);}
  .um-thumb img{width:100%; height:100%; object-fit:cover;}
  .um-thumb span{position:absolute; top:4px; right:4px; display:flex; gap:3px;}
  .um-thumb button{width:24px; height:24px; border-radius:50%; border:0; background:rgba(17,17,19,.7); color:#fff; font-size:13px; line-height:1; cursor:pointer;}

  /* PolygonCanvas */
  .pc-bar{display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; font-size:13px; background:var(--accent-soft); color:var(--ink); border-radius:12px; padding:8px 10px; margin-bottom:8px;}
  .pc-bar kbd{font:inherit; font-size:11.5px; border:1px solid var(--line-strong); border-radius:5px; padding:0 4px; background:var(--surface);}
  .pc-actions{display:flex; gap:6px; flex-wrap:wrap;}
  .pc-actions button{font:inherit; font-size:12.5px; font-weight:650; border-radius:999px; padding:5px 11px; border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); cursor:pointer;}
  .pc-actions button.is-primary{background:var(--accent); border-color:var(--accent); color:var(--on-accent);}
  .pc-actions button:disabled{opacity:.45; cursor:default;}
  .pc-box{position:relative; border-radius:12px; overflow:hidden; background:#E9E9E4; user-select:none;}
  .pc-box.is-drawing{cursor:crosshair; outline:2px solid var(--accent);}
  .pc-box img{display:block; width:100%; height:auto; pointer-events:none;}
  .pc-box svg{position:absolute; inset:0; width:100%; height:100%;}
  .pc-label{position:absolute; transform:translate(-50%,-50%); background:rgba(255,255,255,.92); color:#111113; font-size:12px; font-weight:800; border-radius:999px; padding:2px 8px; pointer-events:none; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,.2);}
  .pc-label.is-active{background:#1E5AA8; color:#FFFFFF;}
  .pc-bar.is-edit{background:var(--surface-2); color:var(--ink-soft);}
  .pc-box.is-dragging{cursor:grabbing;}
  .pc-handle{position:absolute; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:4px; background:#FFFFFF; border:2.5px solid #1E5AA8; cursor:grab; touch-action:none; box-shadow:0 1px 4px rgba(0,0,0,.35); z-index:2;}
  .pc-handle:hover, .pc-handle.is-active{background:#1E5AA8; transform:scale(1.15);}
  .pc-mid{position:absolute; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; background:rgba(255,255,255,.85); border:2px solid #1E5AA8; cursor:copy; touch-action:none; opacity:.75; z-index:1;}
  .pc-mid:hover{opacity:1; transform:scale(1.3);}
  .pc-dot{position:absolute; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; background:#FFFFFF; border:2px solid #1E5AA8; pointer-events:none;}
  .pc-dot.is-first{width:14px; height:14px; margin:-7px 0 0 -7px; background:#1E5AA8;}
  /* Slike zgrade i kompleksa (ViewManager, migracija 025) */
  .pa-vtabs{display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:8px;}
  .pa-vtabs button{flex:0 0 auto; display:flex; flex-direction:column; gap:3px; align-items:stretch; width:104px; padding:4px; border:1.5px solid var(--line); border-radius:12px; background:var(--surface); color:var(--ink); font:inherit; font-size:12px; font-weight:650; cursor:pointer;}
  .pa-vtabs button[aria-selected="true"]{border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-soft);}
  .pa-vtabs img{width:100%; height:58px; object-fit:cover; border-radius:8px; background:var(--surface-2);}
  .pa-vtabs span{white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .pa-vadd{flex:0 0 auto; display:grid; place-items:center; width:84px; border:2px dashed var(--line-strong); border-radius:12px; font-size:13px; font-weight:700; color:var(--accent); cursor:pointer;}
  .pa-empty-upload{display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer;}
  .pa-seg{display:inline-flex; gap:3px; background:var(--surface-2); border-radius:999px; padding:3px;}
  .pa-seg button{font:inherit; font-size:13px; font-weight:650; border:0; background:transparent; color:var(--ink-soft); border-radius:999px; padding:6px 12px; cursor:pointer;}
  .pa-seg button[aria-pressed="true"]{background:var(--surface); color:var(--accent); box-shadow:var(--shadow);}
  .pa-bchips{display:flex; gap:6px; flex-wrap:wrap; align-items:center;}
  .pa-bchips .pa-floor{width:auto;}
`;
