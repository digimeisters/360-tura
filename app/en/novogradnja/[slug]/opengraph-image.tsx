import { PROJECT_OG_SIZE, renderProjectOgImage } from '../../../lib/projectOgImage';

// Engleska slika za deljenje strane projekta - vidi lib/projectOgImage.tsx.
export const size = PROJECT_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'New development - choose your apartment · Kvadrat360';
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderProjectOgImage(slug, 'en');
}
