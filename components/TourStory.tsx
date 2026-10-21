import Link from 'next/link';
import { accent } from '../app/lib/accent';
import { tourHref } from '../app/lib/tourHref';
import type { HomeLang, StoryCopy } from '../app/lib/homeCopy';
import { STORY_LANGS, type StoryData } from '../app/lib/tourStory';
import TourStoryPlayer from './TourStoryPlayer';

/**
 * "Od tlocrta do ture": priča vođena skrolom, odmah posle "U samoj turi"
 * (vlasnik, 21. 10. 2026; maketa public/mockup/TlocrtTura.html).
 *
 * Server ispisuje statičan oblik: pravi tlocrt sa tačkama soba, svih osam
 * koraka kao listu i dugme ka turi. To vidi Google, posetilac bez JS-a i ko
 * je isključio pokrete. TourStoryPlayer tek posle učitavanja pretvara
 * sekciju u priču (visoka sekcija, "zalepljena" scena, kadrovi po skrolu).
 */
export default function TourStory({ data, copy, lang }: { data: StoryData; copy: StoryCopy; lang: HomeLang }) {
  const [vx, vy, vw, vh] = data.planBox;
  const last = copy.steps.length - 1;
  // Šematski SVG se ne prenosi klijentu dvaput: player kopira plan iz strane.
  const { planSvg, ...playerData } = data;

  return (
    <section className="story" id="od-tlocrta" aria-labelledby="od-tlocrta-h">
      <div className="story-stage">
        <div className="story-text">
          <span className="eyebrow" id="od-tlocrta-h">{copy.eyebrow}</span>
          <ol className="story-steps">
            {copy.steps.map((step, i) => (
              <li key={step.title} className="story-step">
                <span className="story-kicker">{step.kicker}</span>
                <h3>{accent(step.title)}</h3>
                <p>
                  {step.text}
                  {i === last && <> {copy.tourName}.</>}
                </p>
                {i === last && (
                  <Link className="btn btn-primary story-cta" href={tourHref(data.slug, [...STORY_LANGS], lang)} data-track="cta:story_tour">
                    {copy.cta}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <div className="story-progress" aria-hidden="true">
            {copy.steps.map((step) => (
              <i key={step.title}>
                <b />
              </i>
            ))}
          </div>
        </div>

        <div className="story-view" style={{ aspectRatio: `${vw} / ${vh}` }}>
          <div className="story-plan">
            <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} role="img" aria-label={copy.steps[1].text}>
              <g dangerouslySetInnerHTML={{ __html: planSvg }} />
              <g className="story-cams">
                {data.cams.map((c) => (
                  <g key={c.roomId} data-room={c.roomId}>
                    <circle cx={c.x} cy={c.y} r={24} className="story-cam-ring" />
                    <circle cx={c.x} cy={c.y} r={12} className="story-cam" />
                  </g>
                ))}
              </g>
            </svg>
          </div>
          <div className="story-pano story-pano-a" />
          <div className="story-pano story-pano-b" />
          <div className="story-ui" aria-hidden="true">
            <span className="story-tag" />
            <span className="story-hs" />
            <div className="story-card">
              <b>{data.hotspot.title}</b>
              <p>{data.hotspot.text}</p>
              <span className="story-play">{copy.guideReads}</span>
            </div>
            <div className="story-door">
              <span className="story-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
              <span className="story-door-label">{data.door.label || copy.doorFallback}</span>
            </div>
            <div className="story-mini" />
            <div className="story-sub">
              <div className="story-langs">
                {STORY_LANGS.map((l) => (
                  <i key={l}>{l.toUpperCase()}</i>
                ))}
              </div>
              <div className="story-subbox">
                <span className="story-waves">
                  <u />
                  <u />
                  <u />
                  <u />
                </span>
                <span className="story-subtxt" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <TourStoryPlayer data={playerData} />
    </section>
  );
}
