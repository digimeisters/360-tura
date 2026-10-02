import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Potpisan link za pregled projekta pre objave
 * (/novogradnja/[slug]/pregled?t=...). Pravi ga samo admin ruta, a strana
 * pregleda proverava potpis i tek onda čita projekat service role ključem -
 * bez potpisa neobjavljen projekat ostaje nevidljiv kao i do sada.
 *
 * Token = rok važenja + potpis (id projekta + rok), isti ključ kao
 * mesečni izveštaj (agencyReport.ts). Važi 30 dana - dovoljno za pokazivanje
 * investitoru na proveru pre objave, a da stari link ne radi zauvek.
 */

const VALID_MS = 30 * 24 * 60 * 60 * 1000;
const SIG_LENGTH = 24;

function signingKey(): string {
  const key = process.env.REPORT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Nema ključa za potpis linka pregleda.');
  return key;
}

function sign(projectId: string, expires: number): string {
  return createHmac('sha256', signingKey()).update(`project-preview:${projectId}:${expires}`).digest('base64url').slice(0, SIG_LENGTH);
}

export function projectPreviewToken(projectId: string, now = Date.now()): string {
  const expires = now + VALID_MS;
  return `${expires.toString(36)}.${sign(projectId, expires)}`;
}

export function isValidPreviewToken(projectId: string, token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, signature] = token.split('.');
  const expires = parseInt(expRaw ?? '', 36);
  if (!Number.isFinite(expires) || expires < now || !signature) return false;
  const expected = Buffer.from(sign(projectId, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
