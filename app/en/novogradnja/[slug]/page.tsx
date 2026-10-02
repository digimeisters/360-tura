import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectView from '../../../../components/projekat/ProjectView';
import { getPublicProject } from '../../../lib/projectData';
import { projectMetadata } from '../../../lib/projectMeta';

/**
 * Engleska strana projekta novogradnje (/en/novogradnja/[slug]) - isti
 * podaci kao /novogradnja/[slug]; tekst interfejsa iz lib/projectI18n.ts,
 * naziv i opis iz projects.title_en / description_en (admin, „Engleski").
 */

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return projectMetadata(await getPublicProject(slug), slug, 'en');
}

export default async function ProjectPageEn({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  if (!data) notFound();
  return <ProjectView data={data} lang="en" />;
}
