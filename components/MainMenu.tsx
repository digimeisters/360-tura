'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Glavni meni sajta (srpske strane): isti na svakoj strani, umesto da svaka
 * strana ima svoj spisak (vlasnik, 15. 10. 2026 - posetilac početne nije
 * video agencije, investitore ni alate).
 *
 *   Ture · Usluge ▾ · Alati ▾ · Cenovnik · Blog   (+ EN)
 *
 * Na računaru „Usluge“ i „Alati“ otvaraju padajući spisak; na telefonu
 * (ispod 980px) je jedno dugme „Meni“ koje otvara sve stavke preko celog
 * ekrana. Delovi pojedinačnih strana (Kako radimo, Pitanja...) nisu u
 * meniju - do njih se dolazi skrolovanjem.
 *
 * Engleska početna i strane projekata novogradnje imaju svoj meni
 * (SiteNav sa children) - njihova publika je druga.
 */

type Item = {
  href: string;
  label: string;
  note: string;
  icon: keyof typeof ICONS;
  isNew?: boolean;
};

const SERVICES: Item[] = [
  {
    href: '/#kako-radimo',
    label: 'Za vlasnike',
    note: 'Tura za vaš stan na prodaju ili izdavanje',
    icon: 'home'
  },
  {
    href: '/za-agencije',
    label: 'Za agencije',
    note: 'Ture za oglase, izveštaj vlasniku svakog meseca',
    icon: 'agency'
  },
  {
    href: '/za-investitore',
    label: 'Za investitore',
    note: 'Izbor stana na zgradi za novogradnju',
    icon: 'building',
    isNew: true
  }
];

const TOOLS: Item[] = [
  {
    href: '/alati/kalkulator-kredita',
    label: 'Kalkulator kredita',
    note: 'Rata, notar, katastar, povrat PDV-a',
    icon: 'calc'
  },
  {
    href: '/alati/procena-vrednosti',
    label: 'Procena vrednosti',
    note: 'Prodajna cena ili kirija vaše nekretnine',
    icon: 'value'
  },
  {
    href: '/alati/cene-nekretnina-kragujevac',
    label: 'Cene po naseljima',
    note: 'Cena kvadrata u Kragujevcu',
    icon: 'chart',
    isNew: true
  }
];

const ICONS = {
  tour: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2 5.5 5.5 3.5-5.5 3.5v-7Z" />,
  price: <path d="M4 7h16M4 12h16M4 17h10" />,
  blog: <path d="M5 4h10l4 4v12H5V4Zm10 0v4h4M8 12h8M8 16h6" />,
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" />,
  agency: <path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />,
  building: <path d="M6 20V4h9v16M15 9h3v11M9 8h3M9 12h3M9 16h3M4 20h16" />,
  calc: <path d="M6 3h12v18H6V3Zm3 4h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01" />,
  value: <path d="M4 17l5-5 4 4 7-8M15 8h5v5" />,
  chart: <path d="M4 20h16M7 16V9M12 16V5M17 16v-4" />
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="mm-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </svg>
    </span>
  );
}

function Entry({ item, onClick, current }: { item: Item; onClick: () => void; current: boolean }) {
  return (
    <Link href={item.href} className="mm-entry" onClick={onClick} aria-current={current ? 'page' : undefined}>
      <Icon name={item.icon} />
      <span>
        <b>
          {item.label}
          {item.isNew && <span className="mm-new">Novo</span>}
        </b>
        <small>{item.note}</small>
      </span>
    </Link>
  );
}

export type MenuLang = {
  href: string;
  label: string;
  hrefLang: string;
  aria: string;
};
export type MenuCta = { href: string; label: string; track: string };

export default function MainMenu({ lang, cta }: { lang?: MenuLang; cta: MenuCta }) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState<'services' | 'tools' | null>(null);
  const [sheet, setSheet] = useState(false);
  const root = useRef<HTMLUListElement>(null);

  // Zatvori sve pri prelasku na drugu stranu (i dugmetom Nazad) - poređenje
  // sa prethodnom adresom tokom iscrtavanja, bez dodatnog effect-a.
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(null);
    setSheet(false);
  }

  // Padajući spisak: klik van njega ili Esc ga zatvara.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Meni preko celog ekrana (telefon): strana ispod se ne skroluje, Esc zatvara.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [sheet]);

  const isCurrent = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));
  const inGroup = (items: Item[]) => items.some((i) => isCurrent(i.href));
  const close = () => {
    setOpen(null);
    setSheet(false);
  };

  const group = (key: 'services' | 'tools', label: string, items: Item[]) => (
    <li className="mm-group">
      <button
        type="button"
        className={inGroup(items) ? 'mm-btn is-here' : 'mm-btn'}
        aria-expanded={open === key}
        aria-controls={`mm-${key}`}
        onClick={() => setOpen((o) => (o === key ? null : key))}
      >
        {label}{' '}
        <span className="mm-chev" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className="mm-drop" id={`mm-${key}`} hidden={open !== key}>
        {items.map((i) => (
          <Entry key={i.href} item={i} onClick={close} current={isCurrent(i.href)} />
        ))}
      </div>
    </li>
  );

  return (
    <>
      <ul className="navlinks mm" ref={root}>
        <li>
          <Link href="/ture" aria-current={isCurrent('/ture') ? 'page' : undefined} data-track="cta:menu_tours">
            Ture
          </Link>
        </li>
        {group('services', 'Usluge', SERVICES)}
        {group('tools', 'Alati', TOOLS)}
        <li>
          <Link href="/#cenovnik" data-track="cta:menu_pricing">
            Cenovnik
          </Link>
        </li>
        <li>
          <Link href="/blog" aria-current={isCurrent('/blog') ? 'page' : undefined} data-track="cta:menu_blog">
            Blog
          </Link>
        </li>
        {lang && (
          <li className="nav-lang">
            <a href={lang.href} hrefLang={lang.hrefLang} lang={lang.hrefLang} aria-label={lang.aria}>
              {lang.label}
            </a>
          </li>
        )}
      </ul>

      <div className="mm-end">
        {cta.href.startsWith('#') ? (
          <a className="btn btn-primary btn-sm" href={cta.href} data-track={cta.track}>
            {cta.label}
          </a>
        ) : (
          <Link className="btn btn-primary btn-sm" href={cta.href} data-track={cta.track}>
            {cta.label}
          </Link>
        )}
        <button type="button" className="mm-burger" aria-expanded={sheet} aria-controls="mm-sheet" onClick={() => setSheet(true)}>
          <span aria-hidden="true" className="mm-lines">
            <i />
            <i />
            <i />
          </span>
          Meni
        </button>
      </div>

      {/* U <body>, ne u zaglavlju: zaglavlje ima backdrop-filter, pa bi fixed
          sloj unutar njega bio zarobljen u visini trake. */}
      {sheet &&
        createPortal(
          <div className="mm-sheet" id="mm-sheet" role="dialog" aria-modal="true" aria-label="Meni">
            <div className="mm-sheet-top">
              <span className="mm-sheet-title">Meni</span>
              <button type="button" className="mm-x" onClick={() => setSheet(false)} aria-label="Zatvori meni">
                ×
              </button>
            </div>
            <Entry
              item={{
                href: '/ture',
                label: 'Ture',
                note: 'Primeri 360° tura',
                icon: 'tour'
              }}
              onClick={close}
              current={isCurrent('/ture')}
            />
            <Entry
              item={{
                href: '/#cenovnik',
                label: 'Cenovnik',
                note: 'Paketi i cene snimanja',
                icon: 'price'
              }}
              onClick={close}
              current={false}
            />
            <p className="mm-sheet-grp">Usluge</p>
            {SERVICES.map((i) => (
              <Entry key={i.href} item={i} onClick={close} current={isCurrent(i.href)} />
            ))}
            <p className="mm-sheet-grp">Alati</p>
            {TOOLS.map((i) => (
              <Entry key={i.href} item={i} onClick={close} current={isCurrent(i.href)} />
            ))}
            <Entry
              item={{
                href: '/blog',
                label: 'Blog',
                note: 'Saveti o prodaji i izdavanju',
                icon: 'blog'
              }}
              onClick={close}
              current={isCurrent('/blog')}
            />
            <div className="mm-sheet-end">
              {lang && (
                <a className="btn btn-secondary" href={lang.href} hrefLang={lang.hrefLang} lang={lang.hrefLang} aria-label={lang.aria}>
                  {lang.label}
                </a>
              )}
              {cta.href.startsWith('#') ? (
                <a className="btn btn-primary" href={cta.href} onClick={close} data-track={`${cta.track}_sheet`}>
                  {cta.label}
                </a>
              ) : (
                <Link className="btn btn-primary" href={cta.href} onClick={close} data-track={`${cta.track}_sheet`}>
                  {cta.label}
                </Link>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
