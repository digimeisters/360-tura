// Paleta usklađena sa landing stranicom (app/page.tsx) da tura i sajt dele
// isti vizuelni identitet - topao off-white umesto hladnog slate, i
// indigo-plava (#3457FF) kao brend akcenat umesto generičke Tailwind plave.
export const THEME = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1EC',
  border: '#E4E4DE',
  borderStrong: '#D3D3CB',
  textPrimary: '#111113',
  textSecondary: '#5B5D63',
  textMuted: '#8C8E93',
  accent: '#1E5AA8',
  accentHover: '#17447E',
  accentSoft: '#E9EFF6',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  overlay: 'rgba(17, 17, 19, 0.45)',
  shadow: '0 2px 8px rgba(17, 17, 19, 0.08)',
  shadowLg: '0 10px 30px rgba(17, 17, 19, 0.15)',
  // Fontove učitava next/font (app/layout.tsx), a globals.css ih izlaže kao
  // --font-body i --font-display. Direktno ime ('Inter') ovde ne bi radilo,
  // jer next/font daje fontu svoje interno ime.
  fontBody: 'var(--font-body)',
  fontDisplay: 'var(--font-display)'
};

// Tamno staklo preko panorame - isti izgled kao traka sa sobama
// (RoomNavBar) i kartica sa tekstom, da ceo ekran ture deluje kao jedna celina.
export const GLASS: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.28)',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)'
};
// Plava na tamnom staklu - THEME.accent (#1E5AA8) je tu pretaman za čitanje.
// Ovo NIJE nova boja: isti je #5B92D6 koji sajt koristi za akcenat u tamnom
// režimu (HomePage.tsx) i koji tura već koristi za tačke na vratima
// (applyGlassHotspotStyle) i trenutnu sobu u traci (RoomNavBar) - tako sva
// plava u turi ostaje ista, umesto posebne nijanse za providne elemente.
export const GLASS_ACCENT = '#5B92D6';

// Okruglo stakleno dugme sa ikonicom (ceo ekran, žiroskop, zvuk, vodič) -
// isto staklo kao traka sa sobama i donji meni.
export const overlayIconStyle: React.CSSProperties = {
  ...GLASS,
  color: '#fff',
  borderRadius: '50%',
  width: '38px',
  height: '38px',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.15s ease'
};

// Dugme donjeg menija (Pitanja/Lokacija/Info/Skica/Kontakt) - ikonica +
// naziv, bez sopstvene pozadine; stakleni okvir nosi ceo meni (page.tsx).
export const overlayNavButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderRadius: '10px',
  padding: '6px 4px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px'
};

// Staklen (glassmorphism) hotspot preko panorame - providna pozadina + blur,
// tanak beli okvir, tačka u boji nosi razliku (plava = navigacija/soba,
// žuta = info), isti tretman kao donji toolbar. Radi direktno sa raw DOM
// stilom jer Pannellum-ov createTooltipFunc dobija HTMLDivElement, ne JSX.
//
// Ceo vizuelni izgled (i CSS zoom za uvećanje na računaru) stoji na
// UNUTRAŠNJEM omotaču, ne na `hotSpotDiv` samom - Pannellum svaki kadar
// upisuje position/transform (translate po pitch/yaw) direktno na
// `hotSpotDiv` i računa centriranje iz njegove offsetWidth/offsetHeight;
// `zoom` na tom istom elementu skalira i taj inline transform (translate u
// pikselima), pa tačka "pluta" dok se gleda okolo. Spoljni div ostaje gola
// pozicionirajuća ljuska (auto širina/visina - skuplja se oko unutrašnjeg).
export function applyGlassHotspotStyle(hotSpotDiv: HTMLDivElement, isNav: boolean, label: string) {
  hotSpotDiv.style.background = 'none';
  hotSpotDiv.style.backgroundImage = 'none';
  hotSpotDiv.style.width = 'auto';
  hotSpotDiv.style.height = 'auto';
  hotSpotDiv.style.cursor = 'pointer';

  const inner = document.createElement('div');
  inner.className = 'k360-hotspot-scale';
  inner.style.backgroundColor = 'rgba(15, 23, 42, 0.32)';
  // @ts-ignore - backdropFilter nije u starijim CSSProperties tipovima za sve DOM lib verzije
  inner.style.backdropFilter = 'blur(6px)';
  // @ts-ignore
  inner.style.webkitBackdropFilter = 'blur(6px)';
  inner.style.border = '1px solid rgba(255, 255, 255, 0.7)';
  inner.style.borderRadius = isNav ? '50px' : '50%';
  inner.style.color = '#fff';
  inner.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.45)';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'center';
  inner.style.gap = isNav ? '7px' : '4px';
  inner.style.padding = isNav ? '4px 11px 4px 5px' : '0.5px';
  inner.style.width = isNav ? 'auto' : '22px';
  inner.style.height = isNav ? 'auto' : '22px';
  inner.style.fontWeight = '700';
  inner.style.fontSize = isNav ? '10.5px' : '12px';
  inner.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
  inner.style.whiteSpace = 'nowrap';

  if (isNav) {
    // Puna plava tačka sa belim obrubom i talasom koji pulsira (.k360-hs-dot u TourOverlays) - odmah se vidi šta je klikabilno.
    const dot = '<span class="k360-hs-dot"></span>';
    inner.innerHTML = `${dot}<span>${label}</span>`;
  } else {
    inner.style.color = '#fde68a';
    inner.innerHTML = 'ℹ';
  }

  hotSpotDiv.innerHTML = '';
  hotSpotDiv.appendChild(inner);
}

export const btnStyle: React.CSSProperties = {
  backgroundColor: THEME.surface,
  color: THEME.textPrimary,
  border: '1px solid ' + THEME.border,
  borderRadius: '16px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  userSelect: 'none',
  fontWeight: 650,
  boxShadow: THEME.shadow
};

// Razmak od dna ekrana za SVE plutajuće elemente pri dnu (donji meni, info
// kartica, obaveštenja) - jedna vrednost, da se ne razdvoje kad zamenjuju
// jedno drugo na istom mestu. env(safe-area-inset-bottom) izbegava
// home-indikator/traku pregledača (uz viewportFit:'cover' u layout.tsx).
export const SCREEN_BOTTOM = 'calc(env(safe-area-inset-bottom, 0px) + 6px)';
