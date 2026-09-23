import type { MetadataRoute } from 'next';
import { supabase } from './lib/supabaseClient';
import { SITE_URL } from './lib/site';
import { BLOG_POSTS } from './lib/blogPosts';

// Ture se dodaju/menjaju bez redeploy-a, pa se sitemap generiše na zahtev
// umesto da se zaledi u build-u.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Obe jezičke verzije početne, svaka sa oznakom druge (hreflang).
  const homeAlternates = { languages: { sr: SITE_URL, en: `${SITE_URL}/en` } };
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: homeAlternates
    },
    {
      url: `${SITE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: homeAlternates
    },
    // Prodajna strana za agencije - zasebna adresa da može da se šalje
    // direktno agenciji i da je Google nađe po upitu za agencije.
    {
      url: `${SITE_URL}/za-agencije`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8
    },
    // Spisak svih objavljenih tura - ulaz ka pojedinačnim turama.
    {
      url: `${SITE_URL}/ture`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    // Spisak blog postova - ulaz ka pojedinačnim tekstovima.
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6
    }
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6
  }));

  // Anon rola posle migracije 007 ionako vidi samo objavljene ture, ali uslov
  // stoji i ovde: sitemap ne sme da zavisi od toga kojim ključem se čita.
  const { data: tours } = await supabase
    .from('tours')
    .select('slug, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  const tourRoutes: MetadataRoute.Sitemap = (tours || []).map((tour) => ({
    url: `${SITE_URL}/tour/${tour.slug}`,
    lastModified: tour.created_at ? new Date(tour.created_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...blogRoutes, ...tourRoutes];
}
