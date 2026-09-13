import { THEME } from './theme';

// Boje idu kroz CSS promenljive sa rezervnom vrednošću iz teme: stranice
// aplikacije ih ne definišu, pa logo izgleda isto kao do sada, a početna
// strana sajta ih definiše za svetli i tamni režim, pa logo prati temu.
const ACCENT = `var(--accent, ${THEME.accent})`;
const INK = `var(--ink, ${THEME.textPrimary})`;

/**
 * `spin`: jedan obrtaj znaka pri učitavanju - koristi se SAMO u zaglavlju
 * početne strane (SiteChrome.tsx), da se brend predstavi na prvom prikazu.
 * Svih ostalih 14 mesta (tura, admin, forme, podnožje) prosto ne prosleđuju
 * ovaj prop, pa ostaju mirna - isti znak, bez pokreta.
 *
 * Poštuje prefers-reduced-motion: animacija postoji samo unutar
 * `(prefers-reduced-motion: no-preference)`, pa ko je isključio pokrete u
 * sistemu vidi znak odmah u mirnom položaju.
 */
export function Logo({ spin = false }: { spin?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {spin && (
        <style>{`
          @keyframes k360-logo-spin {
            from { transform: rotate(-675deg); }
            to { transform: rotate(45deg); }
          }
          @media (prefers-reduced-motion: no-preference) {
            /* Linear, ne ease-out: usporavanje pred kraj bi izgledalo kao
               da se znak zaglavio, umesto mirnog obrtaja. Ista brzina kao
               pre (6s po krugu), sada dva kruga pa stane. */
            .k360-logo-mark { animation: k360-logo-spin 12000ms linear both; }
          }
        `}</style>
      )}
      <div
        className={spin ? 'k360-logo-mark' : undefined}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          border: `3px solid ${ACCENT}`,
          transform: 'rotate(45deg)',
          flexShrink: 0
        }}
      />
      <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.2px', fontFamily: THEME.fontDisplay }}>
        <b style={{ color: INK }}>Kvadrat</b>
        <b style={{ color: ACCENT }}>360</b>
      </div>
    </div>
  );
}
