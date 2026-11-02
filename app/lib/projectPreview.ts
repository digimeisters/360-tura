import { checkLinkSignature, signLink } from './signedLink.ts';

/**
 * Potpisan link za pregled projekta pre objave
 * (/novogradnja/[slug]/pregled?t=...). Pravi ga samo admin ruta, a strana
 * pregleda proverava potpis i tek onda čita projekat service role ključem -
 * bez potpisa neobjavljen projekat ostaje nevidljiv kao i do sada.
 *
 * Token = rok važenja + potpis (id projekta + rok), isti ključ kao
 * mesečni izveštaj (lib/signedLink.ts). Važi 30 dana - dovoljno za pokazivanje
 * investitoru na proveru pre objave, a da stari link ne radi zauvek.
 */

const VALID_MS = 30 * 24 * 60 * 60 * 1000;

const message = (projectId: string, expires: number) => `project-preview:${projectId}:${expires}`;

export function projectPreviewToken(projectId: string, now = Date.now()): string {
  const expires = now + VALID_MS;
  return `${expires.toString(36)}.${signLink(message(projectId, expires))}`;
}

export function isValidPreviewToken(projectId: string, token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, signature] = token.split('.');
  const expires = parseInt(expRaw ?? '', 36);
  if (!Number.isFinite(expires) || expires < now || !signature) return false;
  return checkLinkSignature(message(projectId, expires), signature);
}
