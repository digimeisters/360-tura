'use client';

import { useSyncExternalStore } from 'react';

/**
 * Svetla / tamna tema sajta (vlasnik, 4. 11. 2026; maketa public/mockup/Tema.html).
 *
 * Bez klika sajt prati uređaj (prefers-color-scheme u siteStyles.ts). Klik
 * postavlja data-theme na <html> i pamti izbor u localStorage; skripta u
 * app/layout.tsx isto to vraća PRE prvog crtanja, da nema bljeska u
 * pogrešnoj boji. Dva stanja, namerno bez trećeg "Automatski".
 *
 * Koja je tema trenutno na ekranu (ikonica, istaknuta opcija) odlučuje
 * isključivo CSS, preko istih selektora kao boje - zato je tačna i pre nego
 * što se strana "probudi". Ovde je samo ono što CSS ne zna: klik i opis za
 * čitač ekrana.
 */

export const THEME_KEY = 'k360-theme';
type Theme = 'light' | 'dark';

const COPY = {
  sr: {
    group: 'Tema',
    light: 'Svetla',
    dark: 'Tamna',
    toLight: 'Prebaci na svetlu temu',
    toDark: 'Prebaci na tamnu temu',
    toggle: 'Promeni temu'
  },
  en: {
    group: 'Theme',
    light: 'Light',
    dark: 'Dark',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    toggle: 'Change theme'
  }
} as const;

/** Tema koja je sada na ekranu: izbor na <html>, a bez njega podešavanje uređaja. */
function currentTheme(): Theme {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const CHANGED = 'k360-theme-change';

function subscribe(notify: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener(CHANGED, notify);
  media.addEventListener('change', notify);
  return () => {
    window.removeEventListener(CHANGED, notify);
    media.removeEventListener('change', notify);
  };
}

function choose(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Privatni prozor ili blokiran prostor: tema važi dok se strana ne zatvori.
  }
  window.dispatchEvent(new Event(CHANGED));
}

const SUN = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);
const MOON = <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />;

export default function ThemeToggle({ variant = 'icon', lang = 'sr' }: { variant?: 'icon' | 'seg'; lang?: 'sr' | 'en' }) {
  const t = COPY[lang];
  // Na serveru nema teme (null), pa prvi prikaz u pregledaču ne odstupa od HTML-a.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  if (variant === 'seg') {
    return (
      <div className="theme-seg" role="group" aria-label={t.group}>
        <button type="button" data-t="light" aria-pressed={theme === 'light'} onClick={() => choose('light')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{SUN}</svg>
          {t.light}
        </button>
        <button type="button" data-t="dark" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{MOON}</svg>
          {t.dark}
        </button>
      </div>
    );
  }

  const label = theme === 'dark' ? t.toLight : theme === 'light' ? t.toDark : t.toggle;
  return (
    <button
      type="button"
      className="theme-btn"
      aria-label={label}
      title={label}
      onClick={() => choose(currentTheme() === 'dark' ? 'light' : 'dark')}
    >
      <svg className="t-moon" viewBox="0 0 24 24" aria-hidden="true">{MOON}</svg>
      <svg className="t-sun" viewBox="0 0 24 24" aria-hidden="true">{SUN}</svg>
    </button>
  );
}
