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
