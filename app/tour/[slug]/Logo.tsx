import { THEME } from './theme';

// Boje idu kroz CSS promenljive sa rezervnom vrednošću iz teme: stranice
// aplikacije ih ne definišu, pa logo izgleda isto kao do sada, a početna
// strana sajta ih definiše za svetli i tamni režim, pa logo prati temu.
const ACCENT = `var(--accent, ${THEME.accent})`;
const INK = `var(--ink, ${THEME.textPrimary})`;

export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: ACCENT, color: '#fff', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: THEME.fontDisplay }}>
        K
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.2px', fontFamily: THEME.fontDisplay }}>
        <b style={{ color: INK }}>Kvadrat</b>
        <b style={{ color: ACCENT }}>360</b>
      </div>
    </div>
  );
}
