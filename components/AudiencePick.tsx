import Link from 'next/link';
import { accent } from '../app/lib/accent';
import type { HomeCopy, HomeService } from '../app/lib/homeCopy';

/**
 * "Ko ste vi?" ispod vrha početne (vlasnik, 4. 11. 2026): tri kartice, svaka
 * sa crtežom u stilu osnove nekretnine, kratkim opisom iz teksta ciljne
 * strane i dugmetom "Za vašu nekretninu" (isti glas kao ostatak sajta). Crtež "oživi" na
 * hover; na uređaju bez miša je odmah u "upaljenom" stanju (vidi .aud-art u
 * siteStyles.ts). Maketa: public/mockup/KoSteVi.html.
 */

/** Crteži su isti na svakom jeziku - nemaju tekst. Boje daje CSS (.aud-art). */
const ART: Record<HomeService['icon'], React.ReactNode> = {
  // Osnova: dnevna soba se oboji, tačka iz ture dobije prsten.
  home: (
    <>
      <rect className="fill live" x="8" y="8" width="44" height="64" />
      <rect x="8" y="8" width="104" height="64" rx="2" />
      <path d="M52 8V44M52 56V72M52 40H84M96 40H112M84 40V72" />
      <path className="soft" d="M20 8h16M70 8h14M8 24v14" />
      <g className="ring">
        <circle className="solid" cx="30" cy="40" r="3.6" />
      </g>
      <circle cx="30" cy="40" r="8" style={{ opacity: 0.35 }} />
    </>
  ),
  // Ulica sa oglasima: srednja zgrada se oboji, oznaka se spusti na nju.
  agency: (
    <>
      <path className="soft" d="M4 70h112" />
      <path d="M5 44 21 30l16 14M8 44v26h26V44" />
      <rect className="win" x="16" y="52" width="10" height="10" />
      <rect className="fill live" x="44" y="24" width="32" height="46" />
      <rect x="44" y="24" width="32" height="46" />
      <g className="win">
        <rect x="52" y="32" width="8" height="7" />
        <rect x="64" y="32" width="8" height="7" />
        <rect x="52" y="44" width="8" height="7" />
        <rect x="64" y="44" width="8" height="7" />
        <rect x="52" y="56" width="8" height="7" />
        <rect x="64" y="56" width="8" height="7" />
      </g>
      <g className="drop">
        <path className="solid" d="M60 20C60 20 52 14 52 9a8 8 0 0 1 16 0c0 5-8 11-8 11Z" />
        <circle className="pin-dot" cx="60" cy="9" r="2.6" />
      </g>
      <rect x="86" y="40" width="26" height="30" />
      <g className="win">
        <rect x="91" y="46" width="6" height="6" />
        <rect x="101" y="46" width="6" height="6" />
        <rect x="91" y="57" width="6" height="6" />
        <rect x="101" y="57" width="6" height="6" />
      </g>
    </>
  ),
  // Fasada sa stanovima: prodati obojeni, izabrani dobije oblačić sa podacima.
  building: (
    <>
      <path className="soft" d="M8 72h104" />
      <rect x="30" y="8" width="60" height="64" rx="1.5" />
      <g className="fill">
        <rect x="35" y="27" width="11" height="12" />
        <rect x="48" y="41" width="11" height="12" />
        <rect x="61" y="55" width="11" height="12" />
        <rect x="35" y="55" width="11" height="12" />
        <rect x="48" y="13" width="11" height="12" />
      </g>
      <g className="win">
        <rect x="35" y="13" width="11" height="12" />
        <rect x="61" y="13" width="11" height="12" />
        <rect x="74" y="13" width="11" height="12" />
        <rect x="48" y="27" width="11" height="12" />
        <rect x="61" y="27" width="11" height="12" />
        <rect x="74" y="27" width="11" height="12" />
        <rect x="35" y="41" width="11" height="12" />
        <rect x="61" y="41" width="11" height="12" />
        <rect x="74" y="41" width="11" height="12" />
        <rect x="48" y="55" width="11" height="12" />
        <rect x="74" y="55" width="11" height="12" />
      </g>
      <rect x="74" y="27" width="11" height="12" />
      <rect className="solid live" x="74" y="27" width="11" height="12" />
      <g className="tip live">
        <path d="M85 33h7" />
        <rect className="paper" x="92" y="24" width="24" height="18" rx="3" />
        <path d="M96 30h12M96 36h8" />
      </g>
    </>
  )
};

export default function AudiencePick({ copy }: { copy: NonNullable<HomeCopy['audiencePick']> }) {
  return (
    <nav className="aud" aria-label={copy.label}>
      <div className="wrap">
        <div className="aud-in" data-reveal="up">
          <div className="aud-head">
            <h2 className="aud-title">{accent(copy.title)}</h2>
            <p className="aud-sub">{copy.sub}</p>
          </div>
          <ul className="aud-list">
            {copy.items.map((item) => (
              <li key={item.href}>
                <Link className="aud-card" href={item.href} data-track={`cta:audience_${item.icon}`}>
                  <div className="aud-art">
                    <svg viewBox="0 0 120 80" aria-hidden="true">
                      {ART[item.icon]}
                    </svg>
                  </div>
                  <span className="aud-text">
                    <span className="aud-name">{item.label}</span>
                    <span className="aud-line">{item.line}</span>
                    <span className="aud-go">{item.action}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
