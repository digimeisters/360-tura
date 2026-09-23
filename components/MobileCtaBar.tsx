import { CONTACT_LINKS } from '../app/lib/site';

/**
 * Stalna traka pri dnu ekrana na telefonu: glavni poziv strane i dugme za
 * poziv. Na računaru je nema (CSS: .mobile-cta), jer je tamo dugme uvek u
 * meniju. Podnožje strane ima rezervisan prostor ispod, da traka ne pokrije
 * poslednji red teksta.
 */
export default function MobileCtaBar({
  href,
  label,
  callLabel,
  track
}: {
  href: string;
  label: string;
  callLabel: string;
  track: string;
}) {
  return (
    <div className="mobile-cta">
      <a className="mobile-cta-main" href={href} data-track={track}>
        {label}
      </a>
      <a className="mobile-cta-call" href={CONTACT_LINKS.phone} data-track="contact:phone" aria-label={callLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      </a>
    </div>
  );
}
