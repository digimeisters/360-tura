import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectView from '../../../components/projekat/ProjectView';
import { getPublicProject } from '../../lib/projectData';
import { projectMetadata } from '../../lib/projectMeta';

/**
 * Javna strana projekta novogradnje: izbor stana (fasada -> sprat -> stan),
 * upit za tačan stan i gradilište po mesecima. Podaci iz migracija
 * 019-021, uređuju se u /admin/projekti. Vidi se samo kad je projekat
 * objavljen (RLS); pre objave admin ima /novogradnja/[slug]/pregled.
 * Engleski: /en/novogradnja/[slug]. Slika za deljenje: opengraph-image.tsx.
 *
 * Statusi i cene se menjaju u adminu i kod prodaje, a obe rute odmah
 * osvežavaju ovu stranu (revalidatePath) - zato keš od sat vremena ne smeta.
 */

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return projectMetadata(await getPublicProject(slug), slug, 'sr');
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  if (!data) notFound();
  return <ProjectView data={data} />;
}
