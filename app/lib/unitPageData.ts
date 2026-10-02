import type { Metadata } from 'next';
import { getPublicProject } from './projectData';
import { PROJECT_PAGES_INDEXABLE } from './projectMeta';
import { formatArea, formatPrice, structureText, type ProjectLang } from './projectI18n';
import { SITE_NAME } from './site';

/**
 * Podaci i metapodaci strane stana (/novogradnja/[slug]/stan/[oznaka] i
 * /en/...). Samo objavljen projekat (kao PDF letak); pregled pre objave
 * nema stranu stana.
 */

export async function loadUnitPage(slug: string, code: string) {
  const data = await getPublicProject(slug);
  const unitCode = decodeURIComponent(code);
  const unit = data?.units.find((u) => u.code === unitCode) ?? null;
  const floor = unit && data ? data.floors.find((f) => f.id === unit.floorId) ?? null : null;
  return { data, unit, floor };
}

export async function unitPageMetadata(slug: string, code: string, lang: ProjectLang): Promise<Metadata> {
  const { data, unit } = await loadUnitPage(slug, code);
  if (!data || !unit) return { title: 'Kvadrat360', robots: { index: false } };
  const name = (lang === 'en' && data.project.title_en?.trim()) || data.project.title;
  const word = lang === 'en' ? 'Apartment' : 'Stan';
  const bits = [structureText(unit.structure, lang), unit.areaSqm ? formatArea(unit.areaSqm, lang) : null].filter(Boolean).join(', ');
  const price = unit.status !== 'sold' && unit.price ? formatPrice(unit.price, lang) : null;
  const title = `${word} ${unit.code}${bits ? ` · ${bits}` : ''} - ${name} | ${SITE_NAME}`;
  const description =
    lang === 'en'
      ? `${name}${data.project.city ? `, ${data.project.city}` : ''}: apartment ${unit.code}${bits ? ` (${bits})` : ''}${price ? `, ${price}` : ''}. Floor plan, rooms, 360° tour and a payment plan.`
      : `${name}${data.project.city ? `, ${data.project.city}` : ''}: stan ${unit.code}${bits ? ` (${bits})` : ''}${price ? `, ${price}` : ''}. Osnova, prostorije, 360° tura i plan plaćanja.`;
  const path = `/novogradnja/${slug}/stan/${encodeURIComponent(unit.code)}`;
  const url = lang === 'en' ? `/en${path}` : path;
  return {
    title: { absolute: title },
    description,
    robots: PROJECT_PAGES_INDEXABLE ? undefined : { index: false, follow: false },
    alternates: { canonical: url, languages: { sr: path, en: `/en${path}`, 'x-default': path } },
    openGraph: { type: 'website', siteName: SITE_NAME, url, title, description, locale: lang === 'en' ? 'en_GB' : 'sr_RS' }
  };
}
