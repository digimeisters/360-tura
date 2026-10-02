import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UnitPage from '../../../../../components/projekat/UnitPage';
import { loadUnitPage, unitPageMetadata } from '../../../../lib/unitPageData';

/**
 * Strana stana: /novogradnja/[slug]/stan/[oznaka] (components/projekat/UnitPage).
 * Samo objavljen projekat; ISR kao strana projekta, izmene je osvežavaju
 * (revalidateProject osvežava ceo /novogradnja/[slug] sa 'layout').
 */

type Props = { params: Promise<{ slug: string; code: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, code } = await params;
  return unitPageMetadata(slug, code, 'sr');
}

export default async function UnitPageSr({ params }: Props) {
  const { slug, code } = await params;
  const { data, unit, floor } = await loadUnitPage(slug, code);
  if (!data || !unit) notFound();
  return <UnitPage data={data} unit={unit} floor={floor} />;
}
