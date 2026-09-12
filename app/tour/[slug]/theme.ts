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

// Providno dugme sa ikonicom (ceo ekran, žiroskop, zvuk, vodič) - bez
// podloge, plava ikonica sa senkom, isti tretman kao donji meni.
export const overlayIconStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: GLASS_ACCENT,
  filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55))',
  borderRadius: '50%',
  width: '44px',
  height: '44px',
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
export function applyGlassHotspotStyle(hotSpotDiv: HTMLDivElement, isNav: boolean, label: string) {
  hotSpotDiv.style.backgroundImage = 'none';
  hotSpotDiv.style.backgroundColor = 'rgba(15, 23, 42, 0.32)';
  // @ts-ignore - backdropFilter nije u starijim CSSProperties tipovima za sve DOM lib verzije
  hotSpotDiv.style.backdropFilter = 'blur(6px)';
  // @ts-ignore
  hotSpotDiv.style.webkitBackdropFilter = 'blur(6px)';
  hotSpotDiv.style.border = '1px solid rgba(255, 255, 255, 0.7)';
  hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
  hotSpotDiv.style.color = '#fff';
  hotSpotDiv.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.45)';
  hotSpotDiv.style.display = 'flex';
  hotSpotDiv.style.alignItems = 'center';
  hotSpotDiv.style.justifyContent = 'center';
  hotSpotDiv.style.gap = '4px';
  hotSpotDiv.style.cursor = 'pointer';
  hotSpotDiv.style.padding = isNav ? '4px 9px' : '0.5px';
  hotSpotDiv.style.width = isNav ? 'auto' : '22px';
  hotSpotDiv.style.height = isNav ? 'auto' : '22px';
  hotSpotDiv.style.fontWeight = '700';
  hotSpotDiv.style.fontSize = isNav ? '10.5px' : '12px';
  hotSpotDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
  hotSpotDiv.style.whiteSpace = 'nowrap';

  if (isNav) {
    const dot = '<span style="width:5px;height:5px;border-radius:50%;background:#5B92D6;box-shadow:0 0 0 2px rgba(255,255,255,0.25);flex:none;"></span>';
    hotSpotDiv.innerHTML = `${dot}<span>${label}</span>`;
  } else {
    hotSpotDiv.style.color = '#fde68a';
    hotSpotDiv.innerHTML = 'ℹ';
  }
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
