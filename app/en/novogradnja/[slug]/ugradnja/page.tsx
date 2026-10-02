import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectEmbed, projectTitle } from '../../../../../components/projekat/ProjectView';
import { getPublicProject } from '../../../../lib/projectData';

/** Engleska ugradnja na sajt investitora - vidi app/novogradnja/[slug]/ugradnja. */

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  return {
    title: { absolute: data ? `${projectTitle(data, 'en')} - choose your apartment` : 'Choose your apartment' },
    robots: { index: false, follow: true },
    alternates: { canonical: `/en/novogradnja/${slug}` }
  };
}

export default async function ProjectEmbedPageEn({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  if (!data) notFound();
  return <ProjectEmbed data={data} lang="en" />;
}
