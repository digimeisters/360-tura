'use client';

import { useEffect, useState } from 'react';
import { CONTACT_LINKS, whatsappLink } from '../app/lib/site';
import type { HomeLang } from '../app/lib/homeCopy';

/**
 * Mali krug u donjem desnom uglu, samo na telefonu: jedan dodir do poruke.
 * Na srpskoj strani Viber (tako se ovde dopisuje), na engleskoj WhatsApp.
 * "Zakažite snimanje" u meniju ostaje glavni put do forme; ovo je za one koji
 * bi radije pisali nego popunjavali formu.
 *
 * Krug se sklanja kad je na ekranu kontakt deo (#kontakt) - tamo već stoje
 * dugmad za Viber i WhatsApp, pa bi bio višak i pokrivao ih.
 */
export default function ChatBubble({ lang }: { lang: HomeLang }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const contact = document.getElementById('kontakt');
    if (!contact) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      threshold: 0.05
    });
    observer.observe(contact);
    return () => observer.disconnect();
  }, []);

  const viber = lang === 'sr';
  const label = viber ? 'Pišite nam na Viber' : 'Message us on WhatsApp';

  return (
    <a
      className={`chat-bubble ${viber ? 'is-viber' : 'is-whatsapp'}${hidden ? ' is-hidden' : ''}`}
      href={viber ? CONTACT_LINKS.viber : whatsappLink(lang)}
      {...(viber ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      aria-label={label}
      title={label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      data-track={viber ? 'contact:viber_bubble' : 'contact:whatsapp_bubble'}
    >
      {/* Beli oblačić sa slušalicom u boji aplikacije - prepoznaje se kao
          Viber (zaobljen kvadrat) ili WhatsApp (krug) i bez pravog logoa. */}
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
        {viber ? (
          <path d="M7 2.5h10A4.5 4.5 0 0 1 21.5 7v6.5A4.5 4.5 0 0 1 17 18h-5.2L7.5 21.5V18H7A4.5 4.5 0 0 1 2.5 13.5V7A4.5 4.5 0 0 1 7 2.5Z" fill="#fff" />
        ) : (
          <path d="M12 2.5a9.5 9.5 0 0 1 0 19 9.4 9.4 0 0 1-4.6-1.2L2.5 21.5l1.3-4.7A9.5 9.5 0 0 1 12 2.5Z" fill="#fff" />
        )}
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor" transform={viber ? 'translate(6.3 4.3) scale(0.48)' : 'translate(6.5 6.3) scale(0.48)'} />
      </svg>
    </a>
  );
}
