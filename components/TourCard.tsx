import type { ShowcaseTour } from '../app/lib/showcaseTours';
import { tourHref } from '../app/lib/tourHref';

/**
 * Kartica ture - ista na početnoj strani ("Primeri tura") i na spisku
 * svih tura (/ture), da se ne razdvoje kad se nešto promeni.
 */

export type TourCardLabels = {
  /** Naziv kategorije: prodaja / izdavanje / smeštaj. */
  category: (category: NonNullable<ShowcaseTour['category']>) => string;
  rooms: (count: number) => string;
  open: string;
};

/** Natpisi kartice iz teksta početne strane (HOME_COPY). */
export function tourCardLabels(copy: {
  categories: Record<'sale' | 'rent' | 'booking', string>;
  tourCard: { rooms: (count: number) => string; open: string };
}): TourCardLabels {
  return {
    category: (category) => copy.categories[category],
    rooms: copy.tourCard.rooms,
    open: copy.tourCard.open
  };
}

export default function TourCard({
  tour,
  labels,
  lang = 'sr'
}: {
  tour: ShowcaseTour;
  labels: TourCardLabels;
  lang?: string;
}) {
  const category = tour.category ? labels.category(tour.category) : null;
  const rooms = labels.rooms(tour.roomCount);

  return (
    <a
      className="card tour-card"
      href={tourHref(tour.slug, tour.languages, lang)}
      data-track={`cta:tour_card:${tour.slug}`}
    >
      <div className="tour-photo">
        {tour.coverUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- sličica je
             već 1200x630 JPG sa CDN-a, next/image nema šta da doda */
          <img src={tour.coverUrl} alt="" loading="lazy" decoding="async" />
        )}
        {category && (
          <span className="glass tag">
            <span className="dot" />
            {category}
          </span>
        )}
        <span className="tour-langs">
          {tour.languages.map((l) => (
            <span key={l} className="glass">
              {l.toUpperCase()}
            </span>
          ))}
        </span>
      </div>
      <div className="tour-body">
        <h3>{tour.title}</h3>
        <p className="tour-meta">{[tour.city, tour.agency, rooms].filter(Boolean).join(' · ')}</p>
        <span className="btn btn-secondary btn-sm tour-open">{labels.open}</span>
      </div>
    </a>
  );
}
