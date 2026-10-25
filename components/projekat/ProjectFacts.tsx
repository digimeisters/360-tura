import { PROJECT_TEXT, type ProjectLang } from '../../app/lib/projectI18n';

/**
 * Tabla „O projektu" na strani projekta (spec 2026-10-25, odeljak 1.4):
 * samo podaci koji postoje - prazno se ne prikazuje kao „—". Ispod table
 * traka sa spratovima gde ima najviše slobodnih i skokom nazad na zgradu.
 */
export default function ProjectFacts({
  lang,
  developer,
  address,
  city,
  floorsSpan,
  unitsCount,
  areaRange,
  moveIn,
  mostFree
}: {
  lang: ProjectLang;
  developer: string | null;
  address: string | null;
  city: string | null;
  /** „P + 4" iz spratova; null kad spratova nema. */
  floorsSpan: string | null;
  unitsCount: number;
  areaRange: [number, number] | null;
  moveIn: string | null;
  /** „I, II i III sprat" - spratovi sa najviše slobodnih; null = nema slobodnih. */
  mostFree: string | null;
}) {
  const t = PROJECT_TEXT[lang];
  const facts: { label: string; value: string }[] = [];
  if (developer) facts.push({ label: t.factInvestor, value: developer });
  const where = [address, city].filter(Boolean).join(', ');
  if (where) facts.push({ label: t.factAddress, value: where });
  if (floorsSpan) facts.push({ label: t.factFloors, value: floorsSpan });
  if (unitsCount > 0) facts.push({ label: t.factUnits, value: String(unitsCount) });
  if (areaRange) facts.push({ label: t.factSizes, value: `${areaRange[0]}–${areaRange[1]} m²` });
  if (moveIn?.trim()) facts.push({ label: t.factMoveIn, value: moveIn.trim() });

  return (
    <div className="pf">
      {facts.length > 0 && (
        <dl className="pf-grid">
          {facts.map((f) => (
            <div key={f.label} className="pf-item">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {mostFree && (
        <p className="pf-cta">
          <span>{t.mostFree(mostFree)}</span>
          <a href="#izbor" data-track="cta:project_facts_building">
            {t.toBuilding} ↑
          </a>
        </p>
      )}
    </div>
  );
}
