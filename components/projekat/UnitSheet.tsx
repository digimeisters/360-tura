import QRCode from 'qrcode';
import type { ProjectPageData } from '../../app/lib/projectData';
import type { SelectorFloor, SelectorUnit } from './ProjectSelector';
import {
  floorLabel,
  formatArea,
  formatPrice,
  orientationText,
  PROJECT_TEXT,
  statusLabel,
  structureText,
  type ProjectLang
} from '../../app/lib/projectI18n';
import { SITE_URL } from '../../app/lib/site';
import PrintButton from './PrintButton';

/**
 * PDF letak stana (A4, jedna strana): /novogradnja/[slug]/stan/[oznaka]/letak
 * i /en/... - prodaja ga šalje na Viber ili štampa za kancelariju. Pravi se
 * kao obična strana sa CSS-om za štampu; „Sačuvaj kao PDF" je pregledačeva
 * štampa (bez PDF biblioteke). QR vodi na stranu projekta.
 */

const T = {
  sr: { floor: 'Sprat', status: 'Status', area: 'Površina', terrace: 'Terasa', layout: 'Struktura', orient: 'Orijentacija', price: 'Cena', perSqm: 'po m²', scan: 'Skenirajte za 360° turu i izbor stana', contact: 'Prodaja', print: 'Sačuvaj kao PDF / Štampaj', hint: 'U prozoru za štampu izaberite „Sačuvaj kao PDF".', plan: 'Osnova stana', floorPlan: 'Osnova sprata' },
  en: { floor: 'Floor', status: 'Status', area: 'Size', terrace: 'Terrace', layout: 'Layout', orient: 'Orientation', price: 'Price', perSqm: 'per m²', scan: 'Scan for the 360° tour and apartment selector', contact: 'Sales', print: 'Save as PDF / Print', hint: 'In the print window choose “Save as PDF”.', plan: 'Apartment plan', floorPlan: 'Floor plan' }
};

const STYLES = `
  @page{size:A4; margin:12mm;}
  body{margin:0; background:#E9ECF2; color:#111113; font-family:var(--font-body), system-ui, sans-serif;}
  .us-bar{max-width:210mm; margin:16px auto 0; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:0 4px; font-size:13px; color:#5B5D63;}
  .us-bar button{border:0; border-radius:999px; background:#1E5AA8; color:#fff; font:inherit; font-weight:700; padding:10px 18px; cursor:pointer;}
  .us{width:210mm; min-height:297mm; margin:12px auto 24px; background:#fff; padding:14mm; box-sizing:border-box; box-shadow:0 10px 40px rgba(0,0,0,.15); display:flex; flex-direction:column; gap:7mm;}
  .us-head{display:flex; justify-content:space-between; align-items:flex-start; gap:8mm; border-bottom:2px solid #1E5AA8; padding-bottom:5mm;}
  .us-brand{font-family:var(--font-display); font-weight:800; font-size:12pt; color:#1E5AA8;}
  .us-head h1{margin:2mm 0 0; font-family:var(--font-display); font-size:24pt; letter-spacing:-.02em; line-height:1.05;}
  .us-head p{margin:1.5mm 0 0; color:#5B5D63; font-size:10.5pt;}
  .us-price{text-align:right;}
  .us-price b{display:block; font-family:var(--font-display); font-size:22pt; color:#1E5AA8;}
  .us-price small{font-size:9.5pt; color:#5B5D63;}
  .us-status{display:inline-block; margin-top:2mm; font-size:9pt; font-weight:800; border-radius:999px; padding:1mm 3mm; background:#DCF3E4; color:#1F7A45;}
  .us-status.is-r{background:#FCEFD3; color:#9A6A0B;} .us-status.is-p{background:#ECECEC; color:#6B6B6B;}
  .us-body{display:grid; grid-template-columns:1.45fr 1fr; gap:8mm; align-items:start;}
  .us-plan{border:1px solid #E3E8F1; border-radius:4mm; padding:3mm; text-align:center;}
  .us-plan img{max-width:100%; max-height:150mm; object-fit:contain;}
  .us-plan small{display:block; color:#8C8E93; font-size:8.5pt; margin-top:2mm;}
  .us-facts{display:grid; grid-template-columns:1fr 1fr; gap:2.5mm;}
  .us-facts div{background:#F6F8FC; border-radius:2.5mm; padding:2.5mm 3mm;}
  .us-facts small{display:block; font-size:7.5pt; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#8C8E93;}
  .us-facts b{font-family:var(--font-display); font-size:12pt;}
  .us-rooms{width:100%; border-collapse:collapse; margin-top:5mm; font-size:10pt;}
  .us-rooms td{padding:1.6mm 0; border-bottom:1px solid #EEF2F8;}
  .us-rooms td:last-child{text-align:right; white-space:nowrap;}
  .us-rooms tr.is-total td{font-weight:800; border-bottom:0; border-top:2px solid #111113;}
  .us-foot{margin-top:auto; display:flex; justify-content:space-between; align-items:center; gap:8mm; border-top:1px solid #E3E8F1; padding-top:5mm; font-size:10pt;}
  .us-foot b{font-family:var(--font-display);}
  .us-qr{display:flex; align-items:center; gap:4mm; text-align:right; font-size:9pt; color:#5B5D63; max-width:80mm;}
  .us-qr svg{width:28mm; height:28mm; flex:none;}
  /* Ekran telefona: list se sužava (štampa i PDF ostaju A4). */
  @media screen and (max-width:820px){
    .us{width:auto; min-height:auto; margin:10px; padding:16px;}
    .us-head{flex-direction:column; gap:10px;} .us-price{text-align:left;}
    .us-body{grid-template-columns:1fr;}
    .us-foot{flex-direction:column; align-items:flex-start;} .us-qr{text-align:left;}
    .us-bar{flex-direction:column; align-items:flex-start; margin:10px;}
  }
  @media print{
    body{background:#fff;}
    .us-bar{display:none;}
    .us{margin:0; box-shadow:none; width:auto; min-height:auto; padding:0;}
  }
`;

export default async function UnitSheet({
  data,
  unit,
  floor,
  lang = 'sr'
}: {
  data: ProjectPageData;
  unit: SelectorUnit;
  floor: SelectorFloor | null;
  lang?: ProjectLang;
}) {
  const t = T[lang];
  const pt = PROJECT_TEXT[lang];
  const { project } = data;
  const title = (lang === 'en' && project.title_en?.trim()) || project.title;
  const projectUrl = `${SITE_URL}${lang === 'en' ? '/en' : ''}/novogradnja/${project.slug}`;
  const qr = await QRCode.toString(projectUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111113', light: '#FFFFFF' } });
  const sqm = unit.price && unit.areaSqm ? Math.round(unit.price / unit.areaSqm) : null;
  const total = Math.round(unit.rooms.reduce((s, r) => s + r.m2, 0) * 100) / 100;
  const planSrc = unit.planUrl ?? floor?.planUrl ?? null;
  const badge = unit.status === 'available' ? '' : unit.status === 'reserved' ? ' is-r' : ' is-p';

  return (
    <main lang={lang}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="us-bar">
        <span>{t.hint}</span>
        <PrintButton label={t.print} />
      </div>
      <article className="us">
        <header className="us-head">
          <div>
            <div className="us-brand">{title}</div>
            <h1>
              {pt.unit} {unit.code}
            </h1>
            <p>{[floor ? floorLabel(floor.level, floor.label, lang) : null, project.address, project.city].filter(Boolean).join(' · ')}</p>
            <span className={`us-status${badge}`}>{statusLabel(unit.status, lang)}</span>
          </div>
          <div className="us-price">
            <small>{t.price}</small>
            <b>{unit.status === 'sold' ? '—' : unit.price ? formatPrice(unit.price, lang) : pt.onRequest}</b>
            {unit.status !== 'sold' && sqm ? (
              <small>
                {formatPrice(sqm, lang)} {t.perSqm}
              </small>
            ) : null}
          </div>
        </header>

        <section className="us-body">
          <div className="us-plan">
            {planSrc ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- osnova sa R2 CDN-a, štampa */}
                <img src={planSrc} alt={unit.planUrl ? t.plan : t.floorPlan} />
                <small>{unit.planUrl ? t.plan : t.floorPlan}</small>
              </>
            ) : (
              <small>—</small>
            )}
          </div>
          <div>
            <div className="us-facts">
              <div>
                <small>{t.area}</small>
                <b>{formatArea(unit.areaSqm, lang)}</b>
              </div>
              <div>
                <small>{t.terrace}</small>
                <b>{formatArea(unit.terraceSqm, lang)}</b>
              </div>
              <div>
                <small>{t.layout}</small>
                <b>{structureText(unit.structure, lang) || '—'}</b>
              </div>
              <div>
                <small>{t.orient}</small>
                <b>{orientationText(unit.orientation, lang) || '—'}</b>
              </div>
            </div>
            {unit.rooms.length > 0 && (
              <table className="us-rooms">
                <tbody>
                  {unit.rooms.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{formatArea(r.m2, lang)}</td>
                    </tr>
                  ))}
                  <tr className="is-total">
                    <td>{pt.roomsTotal}</td>
                    <td>{formatArea(total, lang)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </section>

        <footer className="us-foot">
          <div>
            {(project.contact_phone || project.contact_email) && (
              <>
                <b>{t.contact}:</b> {[project.contact_phone, project.contact_email].filter(Boolean).join(' · ')}
                <br />
              </>
            )}
            {project.developer_name && <span style={{ color: '#5B5D63' }}>{project.developer_name} · </span>}
            <span style={{ color: '#8C8E93' }}>Kvadrat360</span>
          </div>
          <div className="us-qr">
            <span>{t.scan}</span>
            <span dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        </footer>
      </article>
    </main>
  );
}
