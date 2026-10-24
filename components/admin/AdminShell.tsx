'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../app/lib/supabaseClient';
import { FORM, FormThemeStyle, formBtnStyle } from '../../app/lib/formTheme';
import { Logo } from '../../app/tour/[slug]/Logo';
import PasswordInput from '../PasswordInput';

/**
 * Zajednički okvir admina (vlasnik, 24. 10. 2026 - spec
 * docs/superpowers/specs/2026-10-24-admin-okvir-design.md): jedna prijava i
 * isti meni levo na svim /admin stranama. Strane same više ne proveravaju
 * sesiju - kad se prikažu, prijava je već tu.
 *
 *  - računar: tamna traka 210 px; u editorima (Plan, jedan projekat) uska
 *    traka sa ikonama, da editor ima mesta;
 *  - ispod 900 px: gornja traka sa dugmetom "Meni".
 */

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

const ITEMS: NavItem[] = [
  { href: '/admin/ture', label: 'Ture', icon: 'tour' },
  { href: '/admin/agencije', label: 'Agencije', icon: 'agency' },
  { href: '/admin/analitika', label: 'Analitika', icon: 'chart' },
  { href: '/admin/projekti', label: 'Novogradnja', icon: 'building' }
];

const ICONS = {
  tour: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2 5.5 5.5 3.5-5.5 3.5v-7Z" />,
  agency: <path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />,
  chart: <path d="M4 20h16M7 16V9M12 16V5M17 16v-4" />,
  building: <path d="M6 20V4h9v16M15 9h3v11M9 8h3M9 12h3M9 16h3M4 20h16" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="k-adm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/** Editori koji traže ceo ekran: Plan tlocrta i uređivanje jednog projekta (ne lista projekata). */
export function isEditorPath(pathname: string): boolean {
  return pathname.startsWith('/admin/plan/') || /^\/admin\/projekti\/[^/]+/.test(pathname);
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/** Meni levo. compact = samo ikone (editori). */
export function AdminNav({ pathname, compact, email, onNavigate }: { pathname: string; compact: boolean; email?: string; onNavigate?: () => void }) {
  return (
    <nav className={`k-adm-nav${compact ? ' is-compact' : ''}`} aria-label="Admin meni">
      <Link href="/admin/ture" className="k-adm-brand" onClick={onNavigate} aria-label="Kvadrat360 admin - Ture">
        {compact ? <span className="k-adm-mark" aria-hidden="true" /> : <Logo />}
      </Link>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`k-adm-item${isActive(pathname, item.href) ? ' is-on' : ''}`}
          aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          title={compact ? item.label : undefined}
          onClick={onNavigate}
        >
          <Icon name={item.icon} />
          {!compact && <span>{item.label}</span>}
        </Link>
      ))}
      <span className="k-adm-spacer" />
      <button type="button" className="k-adm-item" onClick={() => void supabase.auth.signOut()} title={compact ? 'Odjava' : undefined}>
        <Icon name="logout" />
        {!compact && <span>Odjava</span>}
      </button>
      {!compact && email && <span className="k-adm-user">{email}</span>}
    </nav>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="k-form k-adm-center">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (authError) setError('Prijava nije uspela. Proverite email i lozinku.');
          setBusy(false);
        }}
        className="k-adm-login"
      >
        <Logo />
        <h1 style={{ fontSize: '19px', margin: '4px 0 0', fontFamily: FORM.fontDisplay }}>Admin</h1>
        <p style={{ margin: 0, fontSize: '14px', color: FORM.textSecondary }}>Prijavite se administratorskim nalogom.</p>
        <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" required autoComplete="username" style={inputStyle} />
        <PasswordInput id="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="lozinka" required style={inputStyle} />
        {error && <p style={{ margin: 0, color: FORM.danger, fontSize: '13px' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ ...formBtnStyle, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent, padding: '11px 18px', fontSize: '14px' }}>
          {busy ? 'Prijava...' : 'Prijavi se'}
        </button>
      </form>
    </main>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const [session, setSession] = useState<'checking' | 'in' | 'out'>('checking');
  const [email, setEmail] = useState('');
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ? 'in' : 'out');
      setEmail(data.session?.user.email ?? '');
    });
    // Odjava ili istek sesije na bilo kojoj strani vraća na prijavu.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ? 'in' : 'out');
      setEmail(s?.user.email ?? '');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Telefon: meni preko ekrana se zatvara pri prelasku na drugu stranu
  // (poređenje sa prethodnom adresom tokom iscrtavanja) i na Esc.
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setSheet(false);
  }
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const compact = isEditorPath(pathname);

  return (
    <>
      <FormThemeStyle />
      <AdminShellStyles />
      {session === 'checking' && (
        <main className="k-form k-adm-center">
          <p style={{ color: FORM.textSecondary }}>Učitavanje…</p>
        </main>
      )}
      {session === 'out' && <LoginScreen />}
      {session === 'in' && (
        <div className={`k-adm${compact ? ' is-compact' : ''}`}>
          <div className="k-adm-side">
            <AdminNav pathname={pathname} compact={compact} email={email} />
          </div>
          <header className="k-adm-top">
            <Link href="/admin/ture" className="k-adm-brand" aria-label="Kvadrat360 admin - Ture">
              <Logo />
            </Link>
            <button type="button" className="k-adm-menu-btn" aria-expanded={sheet} onClick={() => setSheet(true)}>
              Meni
            </button>
          </header>
          {sheet && (
            <div className="k-adm-sheet" role="dialog" aria-modal="true" aria-label="Admin meni">
              <button type="button" className="k-adm-sheet-close" onClick={() => setSheet(false)} aria-label="Zatvori meni">
                ×
              </button>
              <AdminNav pathname={pathname} compact={false} email={email} onNavigate={() => setSheet(false)} />
            </div>
          )}
          <div className="k-adm-content">{children}</div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid ' + FORM.border,
  fontSize: '14px',
  fontFamily: 'inherit',
  background: FORM.surfaceAlt,
  color: FORM.textPrimary,
  width: '100%'
};

/** Stilovi okvira (izvezeni da ih i privremena test-strana učita van /admin). */
export function AdminShellStyles() {
  return <style>{SHELL_CSS}</style>;
}

const SHELL_CSS = `
  .k-adm{display:flex; min-height:100dvh; background:var(--bg);}
  .k-adm-side{flex:none; width:210px; position:sticky; top:0; height:100dvh;}
  .k-adm.is-compact .k-adm-side{width:56px;}
  .k-adm-content{flex:1; min-width:0;}
  .k-adm-nav{display:flex; flex-direction:column; gap:4px; height:100%; padding:18px 12px; background:#111318; color:#C9CBD2;
    font-family:var(--font-body); --ink:#FFFFFF; --accent:#7FB0EC; box-sizing:border-box;}
  .k-adm-nav.is-compact{padding:14px 8px; align-items:center;}
  .k-adm-brand{display:flex; align-items:center; padding:2px 8px 18px; color:inherit; text-decoration:none;}
  .k-adm-mark{width:20px; height:20px; border:2.5px solid #7FB0EC; border-radius:5px; transform:rotate(45deg); margin:4px 0 6px;}
  .k-adm-item{display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px; color:#C9CBD2; text-decoration:none;
    font:600 14px/1.2 var(--font-body); background:none; border:none; cursor:pointer; text-align:left; width:100%;}
  .k-adm-nav.is-compact .k-adm-item{justify-content:center; padding:10px; width:40px;}
  .k-adm-item:hover{background:#1C2029; color:#FFFFFF;}
  .k-adm-item.is-on{background:#232733; color:#FFFFFF;}
  .k-adm-item:focus-visible{outline:2px solid #7FB0EC; outline-offset:1px;}
  .k-adm-ico{width:18px; height:18px; flex:none;}
  .k-adm-spacer{flex:1;}
  .k-adm-user{font-size:12px; color:#8C8F98; padding:10px 10px 0; border-top:1px solid #262A33; margin-top:6px; overflow-wrap:anywhere;}
  .k-adm-top{display:none;}
  .k-adm-center{min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:24px 20px; background:var(--bg);
    color:var(--ink); font-family:var(--font-body); box-sizing:border-box;}
  .k-adm-login{background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:22px; width:100%; max-width:380px;
    box-shadow:var(--shadow); display:flex; flex-direction:column; gap:12px;}
  .k-adm-sheet{display:none; position:fixed; inset:0; z-index:200; background:#111318;}
  .k-adm-sheet .k-adm-nav{padding-top:56px;}
  .k-adm-sheet-close{position:absolute; top:10px; right:12px; width:40px; height:40px; border-radius:10px; border:none;
    background:#232733; color:#FFFFFF; font-size:22px; cursor:pointer; z-index:1;}
  @media (max-width:899px){
    .k-adm{flex-direction:column;}
    .k-adm-side{display:none;}
    .k-adm-sheet{display:block;}
    .k-adm-top{display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:100;
      padding:10px 14px; background:#111318; --ink:#FFFFFF; --accent:#7FB0EC;}
    .k-adm-top .k-adm-brand{padding:0;}
    .k-adm-menu-btn{height:38px; padding:0 14px; border-radius:10px; border:1px solid #2C303A; background:#1C2029; color:#FFFFFF;
      font:600 14px var(--font-body); cursor:pointer;}
  }
`;
