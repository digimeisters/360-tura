import { revalidatePath } from 'next/cache';

/**
 * Javne strane koje prikazuju spisak objavljenih tura keširane su do sat
 * vremena (`export const revalidate = 3600`). Svaka izmena koja menja taj
 * spisak mora da ih osveži odmah - inače nekretnina koja je upravo izdata
 * ostaje na spisku do sat vremena, a nova tura se toliko ne vidi.
 *
 * Drži se na jednom mestu da se ne desi da nova javna strana dobije keš, a
 * neko je zaboravi u nekoj od admin ruta (tako je /ture ispalo iz osvežavanja).
 */
export function refreshPublicPages(): void {
  revalidatePath('/');
  revalidatePath('/en');
  revalidatePath('/ture');
  revalidatePath('/sitemap.xml');
}
