import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import SalesBoard from '../../../components/projekat/SalesBoard';
import { loadSalesData, resolveSalesLink, serviceClient } from '../../lib/salesAccess';

/**
 * Strana za prodaju investitora: /prodaja/<lični kod>. Bez naloga - kod
 * iz linka je ključ (migracija 020). Nepostojeći ili ugašen link = 404.
 * Radni ekran, ne strana sajta: bez menija, nikad u pretrazi, uvek svež.
 */

type Props = { params: Promise<{ token: string }> };

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Prodaja · Kvadrat360' },
  robots: { index: false, follow: false },
  // Link je tajni ključ - ne sme da ode drugom sajtu kroz Referer.
  referrer: 'no-referrer'
};

export const viewport: Viewport = { themeColor: '#FFFFFF' };

const STYLES = `
  body{margin:0; background:#F6F8FC; color:#111113; font-family:var(--font-body), system-ui, sans-serif;}
  .sb{max-width:560px; margin:0 auto; padding-bottom:40px; min-height:100dvh;}
  .sb button, .sb input{font:inherit;}
  .sb-top{background:#FFFFFF; padding:16px 16px 12px; border-bottom:1px solid #E3E8F1; position:sticky; top:0; z-index:3;}
  .sb-brand{display:flex; align-items:center; gap:6px; font-family:var(--font-display); font-weight:800; font-size:13px; color:#5B5D63;}
  .sb-top h1{margin:6px 0 0; font-family:var(--font-display); font-weight:800; font-size:22px; letter-spacing:-.02em;}
  .sb-who{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px; font-size:12.5px; color:#5B5D63;}
  .sb-who b{color:#111113;}
  .sb-live{display:inline-flex; align-items:center; gap:5px; color:#1F7A45; font-weight:700; white-space:nowrap;}
  .sb-live i{width:7px; height:7px; border-radius:50%; background:#2E9E5B; box-shadow:0 0 0 3px rgba(46,158,91,.2);}
  .sb-live.is-off{color:#9A6A0B;}
  .sb-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:12px 16px 0;}
  .sb-stat{background:#FFFFFF; border:1px solid #E3E8F1; border-radius:14px; padding:9px 10px; text-align:left; cursor:pointer; color:#111113;}
  .sb-stat b{display:block; font-family:var(--font-display); font-size:20px;}
  .sb-stat b.is-s{color:#1F7A45;} .sb-stat b.is-r{color:#9A6A0B;} .sb-stat b.is-p{color:#6B6B6B;}
  .sb-stat small{font-size:11.5px; color:#6B7280;}
  .sb-stat[aria-pressed="true"]{border-color:#1E5AA8; box-shadow:0 0 0 2px rgba(30,90,168,.15);}
  .sb-search{display:block; margin:10px 16px 0; position:relative;}
  .sb-search input{width:100%; box-sizing:border-box; border:1.5px solid #D5DEEB; border-radius:12px; padding:10px 12px 10px 36px; font-size:16px; background:#FFFFFF; color:#111113;}
  .sb-search svg{position:absolute; left:12px; top:13px;}
  .sb-floor{margin:16px 16px 0;}
  .sb-floor h2{display:flex; justify-content:space-between; align-items:baseline; font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#1E5AA8; margin:0 2px 6px;}
  .sb-floor h2 span{color:#8C8E93; font-weight:600; letter-spacing:0; text-transform:none;}
  .sb-unit{background:#FFFFFF; border:1px solid #E3E8F1; border-radius:16px; padding:12px; margin-bottom:8px; transition:border-color .2s, box-shadow .2s;}
  .sb-unit.is-dirty{border-color:#1E5AA8; box-shadow:0 0 0 2px rgba(30,90,168,.12);}
  .sb-unit.is-flash{animation:sbFlash 1.2s ease;}
  @keyframes sbFlash{0%{background:#DCF3E4} 100%{background:#FFFFFF}}
  .sb-unit-top{display:flex; justify-content:space-between; align-items:baseline; gap:8px;}
  .sb-unit-top b{font-family:var(--font-display); font-size:17px;}
  .sb-unit-top small{color:#6B7280; font-size:12.5px; text-align:right;}
  .sb-seg{display:grid; grid-template-columns:repeat(3,1fr); gap:4px; background:#EEF2F8; border-radius:12px; padding:3px; margin-top:10px;}
  .sb-seg button{border:0; background:transparent; border-radius:9px; padding:9px 0; font-size:13px; font-weight:700; color:#5B5D63; cursor:pointer; min-height:42px;}
  .sb-seg button.is-s[aria-pressed="true"]{background:#2E9E5B; color:#FFFFFF;}
  .sb-seg button.is-r[aria-pressed="true"]{background:#D99A1E; color:#FFFFFF;}
  .sb-seg button.is-p[aria-pressed="true"]{background:#6B6B6B; color:#FFFFFF;}
  .sb-price{display:flex; gap:8px; margin-top:8px; align-items:center;}
  .sb-price label{flex:1; position:relative;}
  .sb-price input{width:100%; box-sizing:border-box; border:1.5px solid #D5DEEB; border-radius:12px; padding:10px 34px 10px 12px; font-size:16px; font-weight:600; background:#FFFFFF; color:#111113;}
  .sb-price input:disabled{background:#F3F4F6; color:#9CA3AF;}
  .sb-price label::after{content:"€"; position:absolute; right:12px; top:11px; font-weight:700; color:#8C8E93;}
  .sb-ppm{font-size:12px; color:#6B7280; white-space:nowrap; min-width:78px; text-align:right;}
  .sb-confirm{display:flex; align-items:center; gap:6px; margin-top:10px; padding-top:10px; border-top:1px dashed #C9D6EA;}
  .sb-confirm span{flex:1; font-size:12.5px; font-weight:600; color:#1E5AA8;}
  .sb-confirm button{border:0; border-radius:999px; padding:10px 14px; font-weight:700; font-size:13.5px; cursor:pointer; min-height:42px;}
  .sb-confirm .is-undo{background:#EEF2F8; color:#374151;}
  .sb-confirm .is-ok{background:#1E5AA8; color:#FFFFFF;}
  .sb-log{margin:22px 16px 0;}
  .sb-log h2{font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#5B5D63; margin:0 2px 8px;}
  .sb-log ul{margin:0; padding:0; list-style:none;}
  .sb-log li{background:#FFFFFF; border:1px solid #E3E8F1; border-radius:12px; padding:9px 11px; margin-bottom:6px; font-size:13px;}
  .sb-log li small{display:block; color:#8C8E93; font-size:11.5px; margin-top:2px;}
  .sb-inq{margin:14px 16px 0;}
  .sb-inq h2{display:flex; align-items:center; gap:8px; font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#B45309; margin:0 2px 8px;}
  .sb-inq-count{background:#B45309; color:#FFFFFF; border-radius:999px; padding:2px 8px; font-size:11px; letter-spacing:0; text-transform:none;}
  .sb-inq-item{background:#FFFBEB; border:1.5px solid #F2C46D; border-radius:16px; padding:12px; margin-bottom:8px;}
  .sb-inq-item.is-done{background:#FFFFFF; border-color:#E3E8F1; opacity:.8;}
  .sb-inq-item p{margin:8px 0 0; font-size:14px; line-height:1.45; color:#374151;}
  .sb-inq-contact{display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; margin-top:6px; font-size:15px; font-weight:600;}
  .sb-inq-contact a{color:#1E5AA8; text-decoration:none;}
  .sb-inq-tag{font-size:11px; font-weight:700; background:#EEF2F8; color:#374151; border-radius:999px; padding:2px 8px;}
  .sb-inq-btn{margin-top:10px; width:100%; border:0; border-radius:999px; padding:11px; font-weight:700; font-size:14px; background:#1E5AA8; color:#FFFFFF; cursor:pointer; min-height:44px;}
  .sb-inq-done{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px; font-size:12.5px; color:#1F7A45; font-weight:600;}
  .sb-inq-done button{border:0; background:#EEF2F8; border-radius:999px; padding:6px 12px; font-weight:700; font-size:12px; cursor:pointer;}
  .sb-inq-toggle{border:0; background:none; color:#1E5AA8; font-weight:700; font-size:13px; padding:4px 2px; cursor:pointer;}
  .sb-statrow{display:flex; justify-content:space-between; gap:8px;}
  .sb-statrow span{color:#5B5D63;}
  /* Kratka beleška (jedan red, ⚑ = važno). */
  .sb-note{display:flex; align-items:flex-start; gap:8px; width:100%; margin-top:10px; padding:8px 10px; border:0; border-radius:10px; background:#F1F4F9; text-align:left; cursor:pointer; color:#1F2937; font:inherit;}
  .sb-note-ic{flex:none; font-size:13px; line-height:1.4; color:#8C8E93;}
  .sb-note-tx{flex:1; min-width:0; font-size:13.5px; line-height:1.4; overflow-wrap:anywhere;}
  .sb-note-tx small{display:block; font-size:11px; color:#8C8E93; margin-top:1px; font-weight:400;}
  .sb-note.is-imp{background:#FFF1DC;}
  .sb-note.is-imp .sb-note-ic{color:#D97706;}
  .sb-note.is-imp .sb-note-tx{color:#7C2D12; font-weight:600;}
  .sb-note.is-empty{background:none; border:1.5px dashed #D5DEEB; color:#1E5AA8; font-weight:700; font-size:13px; padding:7px 10px;}
  .sb-note:disabled{opacity:.6; cursor:default;}
  .sb-note-edit{margin-top:10px;}
  .sb-note-in{display:flex; gap:6px; align-items:center;}
  .sb-note-in input{flex:1; min-width:0; border:1.5px solid #9DBBE3; border-radius:10px; padding:9px 10px; font-size:16px; color:#111113; background:#FFFFFF;}
  .sb-note-flag{flex:none; border:1.5px solid #D5DEEB; background:#FFFFFF; border-radius:10px; padding:8px 11px; font-weight:800; font-size:14px; color:#8C8E93; cursor:pointer; min-height:44px;}
  .sb-note-flag.is-on{background:#D97706; border-color:#D97706; color:#FFFFFF;}
  .sb-note-meta{display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:#8C8E93;}
  .sb-note-acts{display:flex; gap:6px; margin-top:6px;}
  .sb-note-acts button{flex:1; border:0; border-radius:999px; padding:8px; min-height:40px; font-weight:700; font-size:13px; background:#EEF2F8; color:#374151; cursor:pointer;}
  .sb-note-acts .is-save{background:#1E5AA8; color:#FFFFFF;}
  .sb-note-acts button:disabled{opacity:.6; cursor:default;}
  .sb-flag{display:inline-block; font-size:11px; font-weight:800; color:#FFFFFF; background:#D97706; border-radius:999px; padding:1px 7px; margin-left:6px; vertical-align:2px;}
  .sb-help{margin:18px 16px 0; font-size:12.5px; color:#6B7280; line-height:1.5;}
  .sb-toast{position:fixed; left:50%; top:14px; transform:translateX(-50%); z-index:20; background:#1F7A45; color:#FFFFFF; font-size:13.5px; font-weight:700; padding:10px 16px; border-radius:16px; box-shadow:0 10px 24px rgba(0,0,0,.2); width:max-content; max-width:calc(100% - 32px);}
  .sb-toast.is-err{background:#B42318;}
  .sb-sheet-bg{position:fixed; inset:0; background:rgba(17,17,19,.45); display:flex; align-items:flex-end; justify-content:center; z-index:10;}
  .sb-sheet{background:#FFFFFF; border-radius:26px 26px 0 0; padding:20px 18px calc(22px + env(safe-area-inset-bottom)); width:100%; max-width:560px; box-sizing:border-box;}
  .sb-sheet h3{margin:0; font-family:var(--font-display); font-size:20px;}
  .sb-sheet ul{list-style:none; margin:12px 0 0; padding:0;}
  .sb-sheet li{background:#F6F8FC; border-radius:12px; padding:10px 12px; margin-bottom:6px; font-size:15px;}
  .sb-sheet s{color:#8C8E93;}
  .sb-sheet p{color:#5B5D63; font-size:14px; margin:6px 0 16px; line-height:1.5;}
  .sb-sheet button{width:100%; border:0; border-radius:999px; padding:14px; font-weight:700; font-size:15px; cursor:pointer; margin-top:8px;}
  .sb-sheet .is-yes{background:#111113; color:#FFFFFF;}
  .sb-sheet .is-no{background:#EEF2F8; color:#111113;}
  .sb-sheet button:disabled{opacity:.6; cursor:default;}
`;

export default async function SalesPage({ params }: Props) {
  const { token } = await params;
  const db = serviceClient();
  if (!db) notFound();
  const access = await resolveSalesLink(db, token);
  if (!access) notFound();
  const data = await loadSalesData(db, access.project.id, access.link.person_name);
  if (!data) notFound();

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <SalesBoard token={token} initial={data} />
    </main>
  );
}
