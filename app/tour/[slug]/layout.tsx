import type { Metadata } from 'next';
import { getTourMeta } from './getTourMeta';
import { SITE_NAME, SITE_URL } from '../../lib/site';
import { tourJsonLd, serializeJsonLd } from '../../lib/structuredData';

type Props = { params: Promise<{ slug: string }> };
type LayoutProps = Props & { children: React.ReactNode };

function buildDescription(
  about: string,
  address: string | null,
  agencyName: string | null
): string {
  if (about) {
    const trimmed = about.replace(/\s+/g, ' ').trim();
    return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
  }
  const parts = ['360° virtuelna tura sa audio vodičem na srpskom, engleskom, nemačkom i ruskom.'];
  if (address) parts.push(`Lokacija: ${address}.`);
  if (agencyName) parts.push(agencyName);
  return parts.join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourMeta(slug);

  if (!tour) {
    // Bez sufiksa - root layout već dodaje "| Kvadrat360" preko title.template.
    return {
      title: 'Tura nije pronađena',
      robots: { index: false, follow: false }
    };
  }

  const title = tour.agencyName ? `${tour.title} — ${tour.agencyName}` : tour.title;
  const description = buildDescription(tour.about, tour.address, tour.agencyName);
  const url = `${SITE_URL}/tour/${tour.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'sr_RS'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  };
}

export default async function TourLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const tour = await getTourMeta(slug);

  if (!tour) return children;

  const url = `${SITE_URL}/tour/${tour.slug}`;
  const description = buildDescription(tour.about, tour.address, tour.agencyName);
  const jsonLd = tourJsonLd({
    title: tour.title,
    description,
    url,
    previewUrl: tour.previewUrl,
    address: tour.address
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {children}
    </>
  );
}
