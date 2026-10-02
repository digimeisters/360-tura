import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectEmbed, projectTitle } from '../../../../components/projekat/ProjectView';
import { getPublicProject } from '../../../lib/projectData';

/**
 * Izbor stana za ugradnju na sajt investitora (iframe):
 * /novogradnja/[slug]/ugradnja (engleski: /en/novogradnja/[slug]/ugradnja).
 * Samo izbor stana, gradilište i potpis - bez našeg menija i podnožja.
 * Kod za ugradnju je u adminu projekta (EmbedCodePanel).
 *
 * Isti podaci i isti keš kao javna strana (objavljen projekat, RLS);
 * admin rute osvežavaju i ovu adresu. Nije za Google - kanonska je javna
 * strana projekta.
 */

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  return {
    title: { absolute: data ? `${projectTitle(data, 'sr')} - izbor stana` : 'Izbor stana' },
    robots: { index: false, follow: true },
    alternates: { canonical: `/novogradnja/${slug}` }
  };
}

export default async function ProjectEmbedPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicProject(slug);
  if (!data) notFound();
  return <ProjectEmbed data={data} />;
}
