import { STYLE_FILES } from '../app/lib/styleSheets';

/**
 * Zajednički CSS sajta kao fajl u <head> (React ga podiže i čeka da se učita
 * pre prikaza, pa nema bljeska bez stila). `selector` dodaje CSS izbora stana
 * (novogradnja). Stil same strane ide posle, u <style>, pa i dalje pobeđuje.
 */
export default function SiteStylesheets({ selector = false }: { selector?: boolean }) {
  return (
    <>
      <link rel="stylesheet" href={STYLE_FILES.site.href} precedence="kvadrat" />
      {selector && <link rel="stylesheet" href={STYLE_FILES.selector.href} precedence="kvadrat" />}
    </>
  );
}
