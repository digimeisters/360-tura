import type { MetadataRoute } from 'next';
import { supabase } from './lib/supabaseClient';
import { SITE_URL } from './lib/site';

// Ture se dodaju/menjaju bez redeploy-a, pa se sitemap generiše na zahtev
// umesto da se zaledi u build-u.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    }
  ];

  const { data: tours } = await supabase
    .from('tours')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  const tourRoutes: MetadataRoute.Sitemap = (tours || []).map((tour) => ({
    url: `${SITE_URL}/tour/${tour.slug}`,
    lastModified: tour.created_at ? new Date(tour.created_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...tourRoutes];
}
