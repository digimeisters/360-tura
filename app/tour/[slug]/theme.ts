export const THEME = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentSoft: '#eff6ff',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
  shadowLg: '0 10px 30px rgba(15, 23, 42, 0.15)'
};

// Providna ikonica preko panorame (fullscreen, žiroskop, zvuk, deljenje) -
// bez pozadine/okvira, beli glif sa senkom radi čitljivosti na svetlim i
// tamnim delovima fotografije.
export const overlayIconStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: '#fff',
  borderRadius: '50%',
  width: '38px',
  height: '38px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '18px',
  filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.55))',
  transition: 'transform 0.15s ease'
};

// Isti providni tretman za donji toolbar (Pitanja/Lokacija/Info/Skica/Kontakt)
// - ikonica + label, bez belog kartona. Boja/senka se dodaju odvojeno u
// page.tsx jer se ovo dugme koristi i preko panorame (tamna pozadina, treba
// beo tekst+senka) i na svetlom welcome ekranu (treba tamniji tekst).
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
  hotSpotDiv.style.border = '1.5px solid rgba(255, 255, 255, 0.75)';
  hotSpotDiv.style.borderRadius = isNav ? '50px' : '50%';
  hotSpotDiv.style.color = '#fff';
  hotSpotDiv.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.45)';
  hotSpotDiv.style.display = 'flex';
  hotSpotDiv.style.alignItems = 'center';
  hotSpotDiv.style.justifyContent = 'center';
  hotSpotDiv.style.gap = '6px';
  hotSpotDiv.style.cursor = 'pointer';
  hotSpotDiv.style.padding = isNav ? '8px 14px' : '0.5px';
  hotSpotDiv.style.width = isNav ? 'auto' : '26px';
  hotSpotDiv.style.height = isNav ? 'auto' : '26px';
  hotSpotDiv.style.fontWeight = '700';
  hotSpotDiv.style.fontSize = isNav ? '12.5px' : '13px';
  hotSpotDiv.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
  hotSpotDiv.style.whiteSpace = 'nowrap';

  if (isNav) {
    const dot = '<span style="width:6px;height:6px;border-radius:50%;background:#5b8cff;box-shadow:0 0 0 3px rgba(255,255,255,0.25);flex:none;"></span>';
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
