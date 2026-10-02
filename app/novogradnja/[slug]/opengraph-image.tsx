import { PROJECT_OG_SIZE, renderProjectOgImage } from '../../lib/projectOgImage';

// Slika za deljenje strane projekta - vidi lib/projectOgImage.tsx.
export const size = PROJECT_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Novogradnja - izbor stana · Kvadrat360';
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderProjectOgImage(slug, 'sr');
}
