import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '../app/tour/[slug]/Logo';

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
  children
}: {
  /** Početna strana vodi na svoj vrh (#pocetna), ostale na "/". */
  brandHref: string;
  brandAria: string;
  cta: { href: string; label: string; track: string };
  children: ReactNode;
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
              <Logo />
            </a>
          ) : (
            <Link className="brand" href={brandHref} aria-label={brandAria}>
              <Logo />
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

export function SiteFooter({ note }: { note: string }) {
  return (
    <footer>
      <div className="wrap">
        <Logo />
        <p>{note}</p>
      </div>
    </footer>
  );
}
