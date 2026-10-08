import { keepUnitsTogether } from '../../lib/typography';

/**
 * Naslovna fotografija i naslov ture odmah iz servera, dok se tura učitava u
 * pregledaču. Ranije je posetilac do učitavanja JavaScript-a i podataka
 * gledao samo natpis „Učitavanje…", a Google je „glavni sadržaj" merio tek
 * kad se pojavi ekran dobrodošlice (PageSpeed 5. 10. 2026: 6,1 s).
 *
 * Ista slika kao na ekranu dobrodošlice (pickCoverRoom, getTourMeta) i isti
 * stil naslova (WelcomeScreen). Naslov je srpski (podrazumevani jezik ture):
 * kad link traži drugi jezik (?lang=en…), mali skript ga skloni pre prvog
 * prikaza, da se ne vidi pogrešan jezik. Kad je tura spremna, page.tsx
 * postavi <html data-tour-ready> i ekran dobrodošlice odmah zameni ovaj. Ako
 * JavaScript ne stigne, nestaje sam posle 20 s, da ne zakloni poruku o grešci.
 */

const SPLASH_CSS = `
  .k360-splash{position:fixed; inset:0; z-index:2147483000; background:#0F172A; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:24px; text-align:center; animation:k360SplashGone 0s linear 20s forwards;}
  /* Zamena bez utapanja: pri utapanju bi se kratko videla dva naslova na različitim mestima. */
  html[data-tour-ready] .k360-splash{display:none;}
  .k360-splash img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
  .k360-splash::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.35) 40%, rgba(15,23,42,.8) 100%);}
  .k360-splash h2{position:relative; z-index:1; max-width:520px; margin:0; color:#fff; font-size:clamp(26px, 5vw, 38px); line-height:1.15; font-weight:700; font-family:var(--font-display); text-wrap:balance; text-shadow:0 2px 12px rgba(0,0,0,.35);}
  .k360-splash.is-other-lang h2{visibility:hidden;}
  .k360-splash-dots{position:absolute; left:50%; bottom:max(12vh, 64px); transform:translateX(-50%); z-index:1; display:flex; gap:8px;}
  .k360-splash-dots i{width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.85); animation:k360SplashDot 1.2s ease-in-out infinite;}
  .k360-splash-dots i:nth-child(2){animation-delay:.15s;} .k360-splash-dots i:nth-child(3){animation-delay:.3s;}
  @keyframes k360SplashDot{0%,100%{opacity:.25; transform:scale(.8)} 50%{opacity:1; transform:scale(1)}}
  @keyframes k360SplashGone{to{opacity:0; visibility:hidden; pointer-events:none}}
  @media (prefers-reduced-motion: reduce){ .k360-splash-dots i{animation:none; opacity:.7;} }
`;

// Izvršava se odmah dok pregledač čita HTML (pre prvog prikaza): drugi jezik u adresi -> bez srpskog naslova.
const LANG_SCRIPT = `(function(){var m=/[?&]lang=([a-z]{2})/i.exec(location.search);if(m&&m[1].toLowerCase()!=='sr'){var s=document.currentScript&&document.currentScript.parentNode;if(s)s.className+=' is-other-lang';}})();`;

export function TourSplash({ coverUrl, title }: { coverUrl: string; title: string }) {
  return (
    <div className="k360-splash" aria-hidden="true">
      <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- sličica sa CDN-a, ista kao na ekranu dobrodošlice */}
      <img src={coverUrl} alt="" fetchPriority="high" />
      <h2>{keepUnitsTogether(title)}</h2>
      <div className="k360-splash-dots">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
