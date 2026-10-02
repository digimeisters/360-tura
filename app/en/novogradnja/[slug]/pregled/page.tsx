import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectView, { projectTitle } from '../../../../../components/projekat/ProjectView';
import { getPreviewProject } from '../../../../lib/projectData';

/** Engleski poseban link za pokazivanje - vidi app/novogradnja/[slug]/pregled. */

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

export const dynamic = 'force-dynamic';

async function load({ params, searchParams }: Props) {
  const { slug } = await params;
  const { t } = await searchParams;
  const token = (Array.isArray(t) ? t[0] : t) ?? null;
  return { token, data: await getPreviewProject(slug, token) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { data } = await load(props);
  return {
    title: { absolute: data ? `${projectTitle(data, 'en')} - choose your apartment` : 'Kvadrat360' },
    robots: { index: false, follow: false },
    referrer: 'no-referrer'
  };
}

export default async function ProjectPreviewPageEn(props: Props) {
  const { token, data } = await load(props);
  if (!data || !token) notFound();
  return <ProjectView data={data} previewToken={token} lang="en" />;
}
