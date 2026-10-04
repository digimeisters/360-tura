import { createHash } from 'node:crypto';
import { SITE_STYLES } from './siteStyles';
import { SELECTOR_STYLES } from '../../components/projekat/selectorStyles';

/**
 * Zajednički CSS sajta kao pravi fajl (/styles/site.css, /styles/selector.css)
 * umesto <style> u svakoj strani. Ranije je ~75 KB (+45 KB za izbor stana)
 * stajalo u HTML-u svake strane i još jednom u podacima za React, pa ga je
 * telefon obrađivao pri svakom otvaranju; sada ga skine jednom i pamti.
 *
 * Verzija (?v=) je otisak sadržaja: posle izmene stila adresa se menja, pa
 * pregledač ne drži stari stil iz keša. Samo za serverske komponente.
 */

const version = (css: string) => createHash('sha1').update(css).digest('hex').slice(0, 10);

export const STYLE_FILES = {
  site: { css: SITE_STYLES, href: `/styles/site.css?v=${version(SITE_STYLES)}` },
  selector: { css: SELECTOR_STYLES, href: `/styles/selector.css?v=${version(SELECTOR_STYLES)}` }
} as const;

export const cssResponse = (css: string) =>
  new Response(css, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      // Adresa nosi verziju sadržaja, pa sme da se pamti dugo.
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
