/**
 * Boje za strane VAN ture: upitnik (/unos) i admin (/admin/ture).
 *
 * Tura ima svoju paletu (tour/[slug]/theme.ts) jer stoji preko fotografije i
 * uvek je tamna. Ove strane su obične strane sajta, pa moraju da prate
 * početnu stranu - uključujući tamni režim telefona/računara. Vrednosti su
 * PREPISANE iz HomePage.tsx, samo kao CSS promenljive, da sve tri strane
 * ostanu iste boje.
 *
 * Upotreba: <FormThemeStyle /> jednom u strani, pa FORM.* umesto THEME.*.
 */

export const FORM = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surfaceAlt: 'var(--surface-2)',
  border: 'var(--line)',
  borderStrong: 'var(--line-strong)',
  textPrimary: 'var(--ink)',
  textSecondary: 'var(--ink-soft)',
  textMuted: 'var(--ink-faint)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-strong)',
  accentSoft: 'var(--accent-soft)',
  onAccent: 'var(--on-accent)',
  danger: 'var(--danger)',
  dangerSoft: 'var(--danger-soft)',
  success: 'var(--ok)',
  shadow: 'var(--shadow)',
  shadowLg: 'var(--shadow-lg)',
  overlay: 'var(--overlay)',
  fontBody: 'var(--font-body)',
  fontDisplay: 'var(--font-display)'
};

/** Isti oblik kao btnStyle u turi, samo sa bojama koje prate režim. */
export const formBtnStyle: React.CSSProperties = {
  backgroundColor: FORM.surface,
  color: FORM.textPrimary,
  border: '1px solid ' + FORM.border,
  borderRadius: '16px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  userSelect: 'none',
  fontWeight: 650,
  boxShadow: FORM.shadow
};

export function FormThemeStyle() {
  return (
    <style>{`
      :root{
        --bg:#FAFAF7; --surface:#FFFFFF; --surface-2:#F1F1EC;
        --ink:#111113; --ink-soft:#5B5D63; --ink-faint:#8C8E93;
        --line:#E4E4DE; --line-strong:#D3D3CB;
        --accent:#1E5AA8; --accent-strong:#17447E; --accent-soft:#E9EFF6; --on-accent:#FFFFFF;
        --danger:#dc2626; --danger-soft:#fef2f2; --ok:#15803d;
        --overlay:rgba(17,17,19,.45);
        --shadow:0 2px 8px rgba(17,17,19,.08); --shadow-lg:0 10px 30px rgba(17,17,19,.13);
      }
      @media (prefers-color-scheme: dark){
        :root:not([data-theme="light"]){
          --bg:#101012; --surface:#17171A; --surface-2:#1D1D21;
          --ink:#F2F2EF; --ink-soft:#AEB0B6; --ink-faint:#797B81;
          --line:#2A2A2E; --line-strong:#38383D;
          --accent:#5B92D6; --accent-strong:#7FADE4; --accent-soft:#1A2433; --on-accent:#0B0E1A;
          --danger:#f87171; --danger-soft:#2A1618; --ok:#4ade80;
          --overlay:rgba(0,0,0,.6);
          --shadow:0 2px 8px rgba(0,0,0,.4); --shadow-lg:0 14px 34px rgba(0,0,0,.5);
        }
      }
      :root[data-theme="dark"]{
        --bg:#101012; --surface:#17171A; --surface-2:#1D1D21;
        --ink:#F2F2EF; --ink-soft:#AEB0B6; --ink-faint:#797B81;
        --line:#2A2A2E; --line-strong:#38383D;
        --accent:#5B92D6; --accent-strong:#7FADE4; --accent-soft:#1A2433; --on-accent:#0B0E1A;
        --danger:#f87171; --danger-soft:#2A1618; --ok:#4ade80;
        --overlay:rgba(0,0,0,.6);
        --shadow:0 2px 8px rgba(0,0,0,.4); --shadow-lg:0 14px 34px rgba(0,0,0,.5);
      }

      /* Polja: ista vidljiva žiža kao na početnoj strani, i uredan izbor
         fajla umesto sivog "Choose File" dugmeta pregledača. */
      body{background:var(--bg);}
      .k-form input, .k-form select, .k-form textarea{color-scheme:light dark;}
      .k-form :focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
      .k-form input[type="file"]{padding:8px 10px; cursor:pointer;}
      .k-form input[type="file"]::file-selector-button{
        margin-right:10px; border:1px solid var(--line-strong); background:var(--surface);
        color:var(--ink); border-radius:999px; padding:6px 14px; font:inherit; font-size:13px;
        font-weight:650; cursor:pointer;
      }
      .k-form input[type="file"]::file-selector-button:hover{border-color:var(--accent); color:var(--accent);}
      .k-form input::placeholder, .k-form textarea::placeholder{color:var(--ink-faint);}
    `}</style>
  );
}
