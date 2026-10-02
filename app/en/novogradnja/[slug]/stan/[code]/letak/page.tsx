import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UnitSheet from '../../../../../../../components/projekat/UnitSheet';
import { getPublicProject } from '../../../../../../lib/projectData';

/** Engleski PDF letak stana - vidi app/novogradnja/[slug]/stan/[code]/letak. */

type Props = { params: Promise<{ slug: string; code: string }> };

export const revalidate = 3600;

async function load({ params }: Props) {
  const { slug, code } = await params;
  const data = await getPublicProject(slug);
  const unitCode = decodeURIComponent(code);
  const unit = data?.units.find((u) => u.code === unitCode) ?? null;
  const floor = unit ? data!.floors.find((f) => f.id === unit.floorId) ?? null : null;
  return { data, unit, floor };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { data, unit } = await load(props);
  const title = data ? (data.project.title_en?.trim() || data.project.title) : '';
  return {
    title: { absolute: data && unit ? `Apartment ${unit.code} - ${title}` : 'Kvadrat360' },
    robots: { index: false, follow: false }
  };
}

export default async function UnitSheetPageEn(props: Props) {
  const { data, unit, floor } = await load(props);
  if (!data || !unit) notFound();
  return <UnitSheet data={data} unit={unit} floor={floor} lang="en" />;
}
