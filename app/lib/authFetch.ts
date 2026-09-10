import { supabase } from './supabaseClient';

/**
 * Zaglavlje sa tokenom trenutne admin sesije, za pozive ka rutama koje
 * menjaju podatke (upload panorame, AI obrada). Vraća prazan objekat kad
 * sesije nema - ruta će tada uredno odbiti zahtev umesto da klijent puca.
 */
export async function adminAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
