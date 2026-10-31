import { revalidatePath } from 'next/cache';

/**
 * Sve keširane adrese jednog projekta novogradnje: srpska i engleska strana,
 * obe ugradnje i slike za deljenje. Zove se posle svake izmene (admin,
 * prodaja), da kupac i sajt investitora odmah vide novi status i cenu.
 */
export function revalidateProject(slug: string | null | undefined): void {
  if (!slug) return;
  for (const base of [`/novogradnja/${slug}`, `/en/novogradnja/${slug}`]) {
    revalidatePath(base);
    revalidatePath(`${base}/ugradnja`);
    revalidatePath(`${base}/opengraph-image`);
    // PDF letci svih stanova (/stan/[oznaka]/letak) - 'layout' osvežava i ugnežđene adrese.
    revalidatePath(base, 'layout');
  }
  // Cenovnik projekta ulazi u cene po naseljima (strana je inače keširana dan) -
  // nova cena se vidi odmah, isto kao u proceni.
  revalidatePath('/alati/cene-nekretnina-kragujevac');
}
