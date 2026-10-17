import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '../app/tour/[slug]/Logo';
import { CONTACT, CONTACT_LINKS } from '../app/lib/site';
import MainMenu, { type MenuLang } from './MainMenu';

/**
 * Zaglavlje i podnožje zajednički za sve javne strane sajta (/, /en, /ture,
 * /za-agencije). Stajali su prepisani na svakoj strani, pa je izmena morala
 * da se pamti na tri mesta - odatle su nastale razlike (npr. jedna strana
 * ostane bez veze ka drugoj).
 *
 * Srpske strane koriste glavni meni sajta (`mainMenu`, components/MainMenu:
 * Ture · Usluge · Alati · Cenovnik · Blog). Engleska početna i strane
 * projekata daju svoje veze kao sadržaj (`<li>` stavke).
 */

export function SiteNav({
  brandHref,
  brandAria,
  cta,
  children,
  mainMenu,
  brandLogo,
  logoSpin
}: {
  /** Početna strana vodi na svoj vrh (#pocetna), ostale na "/". */
  brandHref: string;
  brandAria: string;
  cta: { href: string; label: string; track: string };
  children?: ReactNode;
  /** Glavni meni sajta umesto `children`; `lang` = čip druge jezičke verzije. */
  mainMenu?: { lang?: MenuLang };
  /**
   * Logo investitora umesto znaka Kvadrat360 (strane projekta novogradnje,
   * migracija 034). `dark` = svetao logo, dobija tamnu podlogu.
   */
  brandLogo?: { src: string; alt: string; dark: boolean } | null;
  /** Jedan obrtaj znaka pri učitavanju - samo početna strana ovo prosleđuje. */
  logoSpin?: boolean;
}) {
  // Unutrašnje veze idu kroz Link (bez ponovnog učitavanja strane), a veza
  // ka delu iste strane (#kontakt) mora da ostane običan skok.
  const Cta = cta.href.startsWith('#') ? 'a' : Link;
  const mark = brandLogo ? (
    <span className={brandLogo.dark ? 'brand-logo is-dark' : 'brand-logo'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo investitora sa R2 CDN-a, bilo kog oblika (i SVG) */}
      <img src={brandLogo.src} alt={brandLogo.alt} />
    </span>
  ) : (
    <Logo spin={logoSpin} />
  );

  return (
    <header className="nav">
      <div className="wrap">
        <div className="nav-bar">
          {brandHref.startsWith('#') ? (
            <a className="brand" href={brandHref} aria-label={brandAria}>
              {mark}
            </a>
          ) : (
            <Link className="brand" href={brandHref} aria-label={brandAria}>
              {mark}
            </Link>
          )}
          {mainMenu ? (
            <MainMenu lang={mainMenu.lang} cta={cta} />
          ) : (
            <>
              <ul className="navlinks">{children}</ul>
              <Cta className="btn btn-primary btn-sm" href={cta.href} data-track={cta.track}>
                {cta.label}
              </Cta>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Podnožje: logo, veze ka ostalim stranama, kontakt i red sa ©. Veze
 * (Ture, Za agencije, Blog) postoje samo na srpskom, pa ih engleska strana
 * ne prikazuje - tamo ostaje samo kontakt.
 */
export function SiteFooter({ note, lang = 'sr' }: { note: string; lang?: 'sr' | 'en' }) {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-main">
          <Logo />
          {lang === 'sr' && (
            <nav className="foot-links" aria-label="Strane sajta">
              <Link href="/ture">Ture</Link>
              <Link href="/za-agencije">Za agencije</Link>
              <Link href="/za-investitore">Za investitore</Link>
              <Link href="/alati">Alati</Link>
              <Link href="/blog">Blog</Link>
            </nav>
          )}
          <p className="foot-contact">
            <a href={CONTACT_LINKS.phone} data-track="contact:phone">{CONTACT.phoneDisplay}</a>
            <a href={CONTACT_LINKS.email} data-track="contact:email">{CONTACT.email}</a>
            <span>{CONTACT.city}</span>
          </p>
        </div>
        <p className="foot-note">{note}</p>
      </div>
    </footer>
  );
}
