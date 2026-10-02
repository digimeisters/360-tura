import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectView, { projectTitle } from '../../../../components/projekat/ProjectView';
import { getPreviewProject } from '../../../lib/projectData';

/**
 * Poseban link za pokazivanje projekta: /novogradnja/[slug]/pregled?t=<potpis>
 * (engleski: /en/novogradnja/[slug]/pregled?t=). Radi i kad projekat nije
 * objavljen. Link pravi admin (dugme „Pregledaj" u /admin/projekti/[id]),
 * važi 30 dana; bez važećeg potpisa strana je 404.
 *
 * Izgleda tačno kao prava strana (bez trake „pregled"), ali: nikad u
 * pretrazi, ne broji se u posetama, uvek dinamična (čita ?t=). Javna strana
 * ostaje statična - zato je ovo posebna adresa, a ne ?pregled na javnoj.
 */

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
    title: { absolute: data ? `${projectTitle(data, 'sr')} - izbor stana` : 'Kvadrat360' },
    robots: { index: false, follow: false },
    // Potpis u adresi ne sme da ode drugom sajtu kroz Referer.
    referrer: 'no-referrer'
  };
}

export default async function ProjectPreviewPage(props: Props) {
  const { token, data } = await load(props);
  if (!data || !token) notFound();
  return <ProjectView data={data} previewToken={token} />;
}
