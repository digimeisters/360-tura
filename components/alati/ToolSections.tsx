import Link from 'next/link';
import { SiteNav } from '../SiteChrome';
import { accent } from '../../app/lib/accent';
import { TOOLS_NAV } from '../../app/alati/toolsNav';

/**
 * Delovi strana „Alati" (/alati, kalkulator kredita, procena vrednosti) u
 * istom jeziku kao ostatak sajta: poglavlja sa brojem (.section-head), traka
 * pozadine (.band), plava traka sa pozivom (.mid-cta) i pitanja kao na strani
 * za agencije (.faq-split). Klase su iz zajedničkog CSS-a sajta (siteStyles).
 * U naslovima *zvezdice* označavaju plavi akcenat (vidi app/lib/accent).
 */

type LinkAction = { href: string; label: string; track: string };

/** Zaglavlje sa glavnim menijem sajta (components/MainMenu). */
export function ToolsNav() {
  return <SiteNav brandHref="/" brandAria={TOOLS_NAV.brandAria} cta={{ href: '/#kontakt', label: TOOLS_NAV.cta, track: 'cta:tools_nav' }} mainMenu={{}} />;
}

export function ToolExplain({
  id,
  eyebrow,
  title,
  note,
  items,
  fine,
  columns = 3,
  band = true
}: {
  id: string;
  eyebrow: string;
  title: string;
  note?: string;
  items: ReadonlyArray<{ title: string; value?: string; text: string }>;
  fine?: string;
  columns?: 3 | 4;
  /** Siva traka pozadine - isključiti kad je i sekcija iznad u traci. */
  band?: boolean;
}) {
  return (
    <section className={band ? 'band' : undefined} id={id}>
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow" data-reveal="up">{eyebrow}</span>
          <h2 data-reveal="blur">{accent(title)}</h2>
          {note && <p className="note" data-reveal="up">{note}</p>}
        </div>
        <div className={`tl-explain${columns === 4 ? ' is-4' : ''}`}>
          {items.map((item) => (
            <div key={item.title} className="card tl-explain-card" data-reveal="up">
              <h3>{item.title}</h3>
              {item.value && <b>{item.value}</b>}
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        {fine && <p className="tl-explain-fine" data-reveal="up">{fine}</p>}
      </div>
    </section>
  );
}

export function ToolCta({
  id,
  title,
  text,
  points,
  primary,
  secondary
}: {
  id: string;
  title: string;
  text?: string;
  points?: ReadonlyArray<string>;
  primary: LinkAction;
  secondary?: LinkAction;
}) {
  return (
    <section id={id} className="mid-cta-sec">
      <div className="wrap mid-cta">
        <div className="mid-cta-text" data-reveal="up">
          <h2>{accent(title)}</h2>
          {text && <p>{text}</p>}
          {points && points.length > 0 && (
            <ul>
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="mid-cta-actions" data-reveal="up">
          <Link className="btn btn-primary" href={primary.href} data-track={primary.track}>
            {primary.label}
          </Link>
          {secondary && (
            <Link className="btn btn-secondary" href={secondary.href} data-track={secondary.track}>
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function ToolFaq({
  eyebrow,
  title,
  note,
  items
}: {
  eyebrow: string;
  title: string;
  note?: string;
  items: ReadonlyArray<{ q: string; a: string }>;
}) {
  return (
    <section id="pitanja">
      <div className="wrap faq-split">
        <div className="section-head left">
          <span className="eyebrow" data-reveal="up">{eyebrow}</span>
          <h2 data-reveal="blur">{accent(title)}</h2>
          {note && <p className="note" data-reveal="up">{note}</p>}
        </div>
        <div className="faq-list">
          {items.map((f) => (
            <details key={f.q} className="card faq-item" data-reveal="up">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Veza ka drugom alatu na dnu strane. */
export function ToolCrossLink({ title, text, link }: { title: string; text: string; link: LinkAction }) {
  return (
    <div className="wrap">
      <div className="tl-strip">
        <span>
          <b>{title}</b> {text}
        </span>
        <Link href={link.href} data-track={link.track}>
          {link.label}
        </Link>
      </div>
    </div>
  );
}
