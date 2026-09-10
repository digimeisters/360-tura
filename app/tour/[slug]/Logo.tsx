import { THEME } from './theme';

export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: THEME.accent, color: '#fff', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        K
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.2px', fontFamily: THEME.fontDisplay }}>
        <b style={{ color: THEME.textPrimary }}>Kvadrat</b>
        <b style={{ color: THEME.accent }}>360</b>
      </div>
    </div>
  );
}
