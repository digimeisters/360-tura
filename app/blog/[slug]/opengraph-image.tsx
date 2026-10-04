import { HOME_OG_SIZE, renderHomeOgImage } from '../../lib/homeOgImage';
import { getBlogPost } from '../../lib/blogPosts';

// Kartica članka: naslov članka i kratak opis.
export const size = HOME_OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Članak sa bloga Kvadrat360';

// Prva rečenica uvoda - bez sečenja usred rečenice.
const firstSentence = (s: string) => (s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s).trim();

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  return renderHomeOgImage({
    title: post?.title ?? 'Blog Kvadrat360',
    subtitle: firstSentence(post?.excerpt ?? '')
  });
}
