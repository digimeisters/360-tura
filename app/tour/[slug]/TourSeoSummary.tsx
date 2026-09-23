import { SITE_URL } from '../../lib/site';
import { formatListingPrice } from '../../lib/listingPrice';
import { keepUnitsTogether } from '../../lib/typography';
import { categoryQuestions } from './translations';
import { buildFactList } from './utils';
import { pickLang, realValue, type TourMetaFull } from './getTourMeta';

/**
 * Tekstualni sažetak ture, renderovan na SERVERU (iz layout.tsx).
 *
 * Tura je klijentska aplikacija preko celog ekrana, pa je HTML koji stiže
 * sa servera do sada nosio samo "Učitavanje ture..." - Google nije video
 * ni naslov, ni cenu, ni tabelu podataka, ni odgovore na pitanja, a čitač
 * ekrana (slepi i slabovidi) nije imao šta da pročita, jer 360° prikaz
 * nije tekst.
 *
 * Sadržaj je ISTI onaj koji posetilac vidi u turi (uvodni ekran, Info,
 * Pitanja) - ništa se ne dodaje samo za pretraživač. Vizuelno je sakriven
 * (.sr-only obrazac, isti kao za čitače ekrana), jer bi ispod ture preko
 * celog ekrana ionako bio nevidljiv.
 */

const CATEGORY_LABEL: Record<string, string> = {
  sale: 'Prodaja',
  rent: 'Izdavanje',
  booking: 'Stan na dan'
};

// Isti obrazac kao Tailwind-ov sr-only: element ostaje u stablu dokumenta
// (čitač ekrana i Google ga čitaju), ali ne zauzima mesto na ekranu.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
};

export function faqForTour(tour: TourMetaFull): { question: string; answer: string }[] {
  const questions = categoryQuestions[tour.category || 'rent']?.sr ?? categoryQuestions.rent.sr;
  const d = tour.details;
  const answers = [d.faq_1_i18n, d.faq_2_i18n, d.faq_3_i18n, d.faq_4_i18n, d.faq_5_i18n].map(
    (value) => realValue(pickLang(value)) || ''
  );
  // Pitanje bez odgovora se ne prikazuje - prazan odgovor nije sadržaj.
  return questions
    .map((question, i) => ({ question, answer: answers[i] || '' }))
    .filter((item) => item.answer);
}

export function TourSeoSummary({ tour }: { tour: TourMetaFull }) {
  const d = tour.details;
  const facts = buildFactList(d, 'sr');
  const faq = faqForTour(tour);
  const price = formatListingPrice(d.price, tour.category, 'sr');
  const category = tour.category ? CATEGORY_LABEL[tour.category] : null;
  const place = [realValue(d.district ?? null), realValue(d.city ?? null)].filter(Boolean).join(', ');

  return (
    <article style={srOnly} aria-labelledby="tura-naslov">
      <h1 id="tura-naslov">{keepUnitsTogether(tour.title)}</h1>
      <p>
        {[category, place, tour.agencyName].filter(Boolean).join(' · ')}
        {price && ` · ${price.amount}${price.unit ? ` ${price.unit}` : ''}`}
      </p>
      <p>
        360° virtuelna tura sa audio vodičem: prošetajte kroz svaku prostoriju pre nego što
        zakažete razgledanje.
      </p>
      {tour.about && <p>{tour.about}</p>}

      {facts.length > 0 && (
        <section>
          <h2>Osnovni podaci</h2>
          <dl>
            {facts.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {tour.roomTitles.length > 0 && (
        <section>
          <h2>Prostorije u turi</h2>
          <ul>
            {tour.roomTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </section>
      )}

      {faq.length > 0 && (
        <section>
          <h2>Česta pitanja</h2>
          {faq.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>
      )}

      {tour.address && <p>Adresa: {tour.address}</p>}
      <p>
        <a href={`${SITE_URL}/ture`}>Sve virtuelne ture na Kvadrat360</a>
      </p>
    </article>
  );
}
