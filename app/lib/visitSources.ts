/**
 * Izvor posete ture za izveštaj agencije ("Odakle dolaze posetioci"): sirova
 * vrednost je utm_source iz linka (npr. 4zida iz alata "Tekst oglasa") ili
 * domen prethodne strane. Isti sajt pod različitim oznakama se spaja.
 */

const KNOWN: { match: RegExp; key: string; label: string }[] = [
  { match: /(^|\.)4zida(\.rs)?$/, key: '4zida', label: '4zida' },
  { match: /(^|\.)halo-?oglasi(\.com)?$/, key: 'halooglasi', label: 'Halo oglasi' },
  { match: /(^|\.)instagram(\.com)?$/, key: 'instagram', label: 'Instagram' },
  { match: /(^|\.)(facebook|fb)(\.com)?$/, key: 'facebook', label: 'Facebook' },
  { match: /(^|\.)(viber|wa|whatsapp)(\.com|\.me)?$/, key: 'poruke', label: 'Viber / WhatsApp' },
  { match: /(^|\.)google\./, key: 'google', label: 'Google' },
  { match: /^qr$/, key: 'qr', label: 'QR kod' },
  { match: /(^|\.)kvadrat360\.com$/, key: 'kvadrat360', label: 'Kvadrat360 sajt' }
];

export type VisitSource = { key: string; label: string };

export function normalizeSource(raw: string | null | undefined): VisitSource {
  const value = (raw ?? '').trim().toLowerCase().replace(/^(www|m|l|lm)\./, '');
  if (!value) return { key: 'direktno', label: 'Direktan link (Viber, poruka, mejl…)' };
  for (const k of KNOWN) if (k.match.test(value)) return { key: k.key, label: k.label };
  return { key: value, label: value };
}

/** Različiti posetioci po izvoru (sesija se broji jednom, po prvom otvaranju), najviše prvi. */
export function countSources(opens: { session_id: string; source: string | null }[]): (VisitSource & { visitors: number })[] {
  const bySession = new Map<string, VisitSource>();
  for (const e of opens) if (!bySession.has(e.session_id)) bySession.set(e.session_id, normalizeSource(e.source));
  const counts = new Map<string, VisitSource & { visitors: number }>();
  for (const s of bySession.values()) {
    const c = counts.get(s.key) ?? { ...s, visitors: 0 };
    c.visitors++;
    counts.set(s.key, c);
  }
  return [...counts.values()].sort((a, b) => b.visitors - a.visitors);
}
