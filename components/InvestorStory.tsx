import Link from 'next/link';
import { accent } from '../app/lib/accent';
import type { InvestorCopy } from '../app/lib/investorCopy';
import type { InvestorStoryData } from '../app/lib/investorStory';
import { formatArea, formatPrice, statusLabel, structureText } from '../app/lib/projectI18n';
import { UNIT_STATUSES, UNIT_STATUS_COLORS } from '../app/lib/projects';
import InvestorStoryPlayer from './InvestorStoryPlayer';

/**
 * "Od zgrade do upita": priča na skrol za investitore (vlasnik, 21. 10.
 * 2026; maketa public/mockup/InvestitorPrica.html). Zamenila je raniju
 * sekciju sa četiri telefona i nosi njeno sidro #kupac.
 *
 * Server ispisuje statičan oblik: fasadu, svih devet koraka kao listu i
 * dugme ka pravom projektu - to vidi Google, posetilac bez JS-a i ko je
 * isključio pokrete. InvestorStoryPlayer ga posle učitavanja pretvara u
 * priču (visoka sekcija, "zalepljena" scena, kadrovi po skrolu).
 */
export default function InvestorStory({ data, copy }: { data: InvestorStoryData; copy: InvestorCopy['buyer'] }) {
  const last = copy.steps.length - 1;
  const u = data.unit;
  const pts = (poly: [number, number][]) => poly.map((p) => p.join(',')).join(' ');

  return (
    <section className="band inv-story" id="kupac" aria-labelledby="kupac-h">
      <div className="inv-stage">
        <div className="inv-text">
          <span className="eyebrow" id="kupac-h">{copy.eyebrow}</span>
          <ol className="inv-steps">
            {copy.steps.map((step, i) => (
              <li key={step.title} className="inv-step">
                <span className="inv-kicker">{step.kicker}</span>
                <h3>{accent(step.title)}</h3>
                <p>{step.text}</p>
                {i === last && (
                  <Link className="btn btn-primary inv-cta" href={`/novogradnja/${data.slug}`} data-track="cta:investor_story">
                    {copy.cta}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <div className="inv-progress" aria-hidden="true">
            {copy.steps.map((step) => (
              <i key={step.title}>
                <b />
              </i>
            ))}
          </div>
        </div>

        <div className="inv-view">
          <div className="inv-layer inv-facade">
            <div className="inv-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- smanjena slika sa našeg CDN-a (/_next/image), mera dolazi iz same slike */}
              <img className="inv-facade-img" src={data.facade.desktop} alt="" loading="lazy" />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                {data.floors.map((poly, i) => (
                  <polygon key={i} className="inv-fl" points={pts(poly)} />
                ))}
              </svg>
            </div>
          </div>
          <div className="inv-layer inv-plan" aria-hidden="true">
            <div className="inv-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- smanjena osnova sa našeg CDN-a */}
              <img className="inv-plan-img" alt="" />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none">
                {data.units.map((unit) => (
                  <polygon key={unit.code} className="inv-un" points={pts(unit.polygon)} />
                ))}
              </svg>
              {data.units.map((unit) => {
                const xs = unit.polygon.map((p) => p[0]);
                const ys = unit.polygon.map((p) => p[1]);
                const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
                const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
                return (
                  <span key={unit.code} className="inv-code" style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
                    {unit.code}
                  </span>
                );
              })}
            </div>
          </div>
          {u.plan3d && (
            <div className="inv-layer inv-3d" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- 3D prikaz stana sa našeg CDN-a */}
              <img className="inv-3d-img" alt="" />
              <span className="inv-tag">{copy.d3} · Stan {u.code}</span>
            </div>
          )}
          <div className="inv-ui" aria-hidden="true">
            <div className="inv-legend">
              {UNIT_STATUSES.map((s) => (
                <span key={s}>
                  <i style={{ background: UNIT_STATUS_COLORS[s].stroke }} />
                  {statusLabel(s, 'sr')}
                </span>
              ))}
            </div>
            <span className="inv-tag inv-floor-tag">{data.floorLabel}</span>
            <div className="inv-card">
              <div className="inv-card-head">
                <h4>Stan {u.code}</h4>
                <span className="inv-badge">{statusLabel(u.status, 'sr')}</span>
              </div>
              <div className="inv-tabs">
                {copy.tabs.map((t, i) => (
                  <i key={t} className={i === 0 ? 'on' : undefined}>{t}</i>
                ))}
              </div>
              <div className="inv-facts">
                <span>{copy.facts.structure}<b>{structureText(u.structure, 'sr') ?? '—'}</b></span>
                <span>{copy.facts.area}<b>{formatArea(u.areaSqm, 'sr')}</b></span>
                <span>{copy.facts.terrace}<b>{formatArea(u.terraceSqm, 'sr')}</b></span>
                <span>{copy.facts.floor}<b>{data.floorLabel}</b></span>
              </div>
              {u.price && (
                <div className="inv-price">
                  <span>{formatPrice(u.price.perM2, 'sr')}/m²</span>
                  <b>{formatPrice(u.price.total, 'sr')}</b>
                  {u.price.example && <small>{copy.priceNote}</small>}
                </div>
              )}
              <div className="inv-form">
                <div className="inv-field"><span>{copy.form.name[0]}</span><b data-type={copy.form.name[1]} /></div>
                <div className="inv-field"><span>{copy.form.phone[0]}</span><b data-type={copy.form.phone[1]} /></div>
              </div>
              <span className="inv-cbtn" data-send={copy.send} data-sent={copy.sent}>{copy.send}</span>
            </div>
            <div className="inv-toast">
              <small>{copy.toast}</small>
              Stan {u.code} → <b>{statusLabel('reserved', 'sr')}</b>
            </div>
          </div>
        </div>
      </div>
      <InvestorStoryPlayer data={data} />
    </section>
  );
}
