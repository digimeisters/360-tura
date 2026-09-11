// Link ka turi sa početne strane; na engleskoj strani otvara turu na
// engleskom ako ga tura ima (tura čita ?lang=). Namerno bez ikakvih uvoza:
// koristi ga i klijentska komponenta (HeroDevice), pa ne sme da povuče
// Supabase klijent u JavaScript početne strane.
export function tourHref(slug: string, languages: readonly string[], lang: string): string {
  const base = `/tour/${slug}`;
  return lang !== 'sr' && languages.includes(lang) ? `${base}?lang=${lang}` : base;
}
