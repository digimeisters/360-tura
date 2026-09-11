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

  // Anon rola posle migracije 007 ionako vidi samo objavljene ture, ali uslov
  // stoji i ovde: sitemap ne sme da zavisi od toga kojim ključem se čita.
  // Cast jer types/supabase.ts još ne zna za `published` (migracija 007) -
  // ukloniti kad se tipovi regenerišu.
  const { data: tours } = await supabase
    .from('tours')
    .select('slug, created_at')
    .eq('published' as never, true as never)
    .order('created_at', { ascending: false });

  const tourRoutes: MetadataRoute.Sitemap = (tours || []).map((tour) => ({
    url: `${SITE_URL}/tour/${tour.slug}`,
    lastModified: tour.created_at ? new Date(tour.created_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...tourRoutes];
}
