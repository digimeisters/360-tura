import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '../app/tour/[slug]/Logo';
import { CONTACT, CONTACT_LINKS } from '../app/lib/site';

/**
 * Zaglavlje i podnožje zajednički za sve javne strane sajta (/, /en, /ture,
 * /za-agencije). Stajali su prepisani na svakoj strani, pa je izmena morala
 * da se pamti na tri mesta - odatle su nastale razlike (npr. jedna strana
 * ostane bez veze ka drugoj).
 *
 * Same veze se razlikuju od strane do strane, pa ih svaka daje kao sadržaj
 * (`<li>` stavke); zajedničko je samo ono što mora svuda isto da izgleda.
 */

export function SiteNav({
  brandHref,
  brandAria,
  cta,
  children,
  logoSpin
}: {
  /** Početna strana vodi na svoj vrh (#pocetna), ostale na "/". */
  brandHref: string;
  brandAria: string;
  cta: { href: string; label: string; track: string };
  children: ReactNode;
  /** Jedan obrtaj znaka pri učitavanju - samo početna strana ovo prosleđuje. */
  logoSpin?: boolean;
}) {
  // Unutrašnje veze idu kroz Link (bez ponovnog učitavanja strane), a veza
  // ka delu iste strane (#kontakt) mora da ostane običan skok.
  const Cta = cta.href.startsWith('#') ? 'a' : Link;

  return (
    <header className="nav">
      <div className="wrap">
        <div className="nav-bar">
          {brandHref.startsWith('#') ? (
            <a className="brand" href={brandHref} aria-label={brandAria}>
              <Logo spin={logoSpin} />
            </a>
          ) : (
            <Link className="brand" href={brandHref} aria-label={brandAria}>
              <Logo spin={logoSpin} />
            </Link>
          )}
          <ul className="navlinks">{children}</ul>
          <Cta className="btn btn-primary btn-sm" href={cta.href} data-track={cta.track}>
            {cta.label}
          </Cta>
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
