import type { Metadata } from 'next';
import { SITE_NAME } from './site';
import type { ProjectPageData } from './projectData';
import type { ProjectLang } from './projectI18n';

/**
 * Metapodaci strane projekta, srpski i engleski, sa hreflang vezom između
 * njih. Slika za deljenje se pravi sama (opengraph-image.tsx u istom
 * folderu rute) - zato ovde nema openGraph.images.
 */
/**
 * Dok novogradnja nije zvanično puštena (vlasnik, 2. 10. 2026: „da se ne
 * vidi na sajtu"), ni objavljen projekat ne ide u Google - strana radi samo
 * za onoga ko ima link. Kad se novogradnja pusti u javnost: true, i dodati
 * projekte u sitemap.
 */
export const PROJECT_PAGES_INDEXABLE = false;

export function projectMetadata(data: ProjectPageData | null, slug: string, lang: ProjectLang): Metadata {
  if (!data) {
    return { title: lang === 'en' ? 'Project not found' : 'Projekat nije pronađen', robots: { index: false } };
  }
  const { project, units } = data;
  const free = units.filter((u) => u.status === 'available').length;
  const name = (lang === 'en' && project.title_en?.trim()) || project.title;
  const city = project.city ? `, ${project.city}` : '';
  const title = lang === 'en' ? `${name} - choose your apartment | ${SITE_NAME}` : `${name} - izbor stana | ${SITE_NAME}`;
  const description =
    lang === 'en'
      ? `${name}${city}: choose a floor and an apartment, see the layout, price and 360° tour. Available apartments: ${free}.`
      : `${name}${city}: izaberite sprat i stan, pogledajte raspored, cenu i 360° turu. Slobodnih stanova: ${free}.`;
  const sr = `/novogradnja/${slug}`;
  const en = `/en/novogradnja/${slug}`;
  const url = lang === 'en' ? en : sr;
  return {
    title: { absolute: title },
    description,
    robots: PROJECT_PAGES_INDEXABLE ? undefined : { index: false, follow: false },
    alternates: { canonical: url, languages: { sr, en, 'x-default': sr } },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
      locale: lang === 'en' ? 'en_GB' : 'sr_RS'
    }
  };
}
