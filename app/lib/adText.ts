import { Type, type Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_DESCRIPTIVE } from '@/app/lib/gemini';
import { factsFor } from '@/app/lib/tourIntro';
import { formatListingPrice } from '@/app/lib/listingPrice';
import { nearestByCategory, parseNearby, NEARBY_LABELS } from '@/app/lib/nearby';
import { SITE_URL } from '@/app/lib/site';
import { getLocalizedText } from '@/app/tour/[slug]/utils';
import type { Room, Tour } from '@/app/tour/[slug]/types';
import { AD_LIMITS, type AdLang, type AdOptions, type AdPlatform } from '@/app/lib/adTextShared';
import { tidyBody } from '@/app/lib/adTextTidy';

export { AD_PLATFORMS, type AdLang, type AdPlatform } from '@/app/lib/adTextShared';

/**
 * "Tekst oglasa" (admin, 2026-10-31): AI piše naslov i opis oglasa iz podataka
 * ture, posebno za svaki sajt - oglasni sajtovi i mreže se čitaju drugačije.
 * Link na turu nosi ?utm_source=<sajt>, pa mesečni izveštaj agencije pokazuje
 * koliko je kupaca došlo iz kog oglasa (tour_events.source, migracija 042).
 */

const PLATFORM_RULES: Record<AdPlatform, string> = {
  '4zida': `SAJT: 4zida (oglasni sajt nekretnina). Kvadratura, sprat, grejanje i cena se upisuju u posebna polja i prikazuju kao tabela - u opisu ih NE nabrajaj redom, pomeni ih samo u prvoj rečenici.
- NASLOV: do ${AD_LIMITS['4zida'].title} znakova: vrsta + struktura + kvadratura + naselje (npr. "Dvosoban stan, 54 m², Centar preko Lepenice").
- OPIS: ${AD_LIMITS['4zida'].body[0]}-${AD_LIMITS['4zida'].body[1]} znakova, 3-5 kratkih pasusa: (1) šta je i gde, (2) raspored prostorija i stanje, (3) okolina ako je data, (4) red sa linkom na 360° turu, (5) uslovi (cena/depozit) ako su uključeni.`,
  halooglasi: `SAJT: Halo oglasi. Kupci porede oglase u spisku, uglavnom na telefonu.
- NASLOV: do ${AD_LIMITS.halooglasi.title} znakova, odmah najvažnije: struktura + naselje (+ cena ako je uključena).
- OPIS: ${AD_LIMITS.halooglasi.body[0]}-${AD_LIMITS.halooglasi.body[1]} znakova. ODMAH POSLE PRVE REČENICE red sa linkom na 360° turu. Zatim kratke natuknice (svaka u svom redu, počinje sa "• "): prostorije, grejanje, terasa, parking, okolina, uslovi.`,
  instagram: `MREŽA: Instagram objava. Link u opisu NIJE klikabilan.
- NASLOV: prazan string.
- OPIS: ${AD_LIMITS.instagram.body[0]}-${AD_LIMITS.instagram.body[1]} znakova. Prva rečenica mora da zaustavi skrolovanje (konkretna činjenica, ne pitanje tipa "Tražite stan?"). Zatim 2-3 kratke rečenice. Pa poziv: "Prošetajte kroz stan u 360° - link je u opisu profila" (ili "pišite nam u poruku"). NE stavljaj URL u tekst. Na kraju posebnim redom 3-5 heštega po lokaciji i vrsti (npr. #Kragujevac #stanizdavanje).`,
  facebook: `MREŽA: Facebook objava. Link u tekstu je klikabilan.
- NASLOV: prazan string.
- OPIS: ${AD_LIMITS.facebook.body[0]}-${AD_LIMITS.facebook.body[1]} znakova. Prva rečenica konkretna činjenica, pa 2-3 kratke rečenice, pa red "Prošetajte kroz stan u 360°:" i odmah ispod URL ture. Bez heštega ili najviše 2.`
};

const PURPOSE: Record<string, string> = {
  sale: 'Nekretnina je NA PRODAJU (kupac traži dom ili investiciju).',
  rent: 'Nekretnina se IZDAJE na duže.',
  booking: 'Nekretnina se izdaje NA DAN (kraći boravak, gosti).'
};

export function adLink(slug: string, platform: AdPlatform, lang: AdLang): string {
  return `${SITE_URL}/tour/${slug}?utm_source=${platform}${lang === 'en' ? '&lang=en' : ''}`;
}

function nearbyLines(tour: Tour & { nearby?: unknown }, lang: AdLang): string[] {
  const nearest = nearestByCategory(parseNearby(tour.nearby));
  const labels = NEARBY_LABELS[lang];
  return Object.entries(nearest).map(([cat, p]) => `${labels[cat as keyof typeof labels]}: ${p!.name ? `${p!.name}, ` : ''}${Math.round(p!.m / 10) * 10} m`);
}

function buildPrompt(tour: Tour & { nearby?: unknown }, rooms: Room[], platform: AdPlatform, lang: AdLang, opts: AdOptions, previous: string): string {
  const facts = factsFor(tour);
  const about = getLocalizedText(tour.about_text_i18n, 'sr').trim();
  const roomNames = [...new Set(rooms.map((r) => getLocalizedText(r.title_i18n, 'sr').trim()).filter(Boolean))];
  const price = opts.price ? formatListingPrice(tour.price, tour.category, 'sr') : null;
  const near = opts.nearby ? nearbyLines(tour, 'sr') : [];
  const contact = opts.contact ? [tour.agent_name, tour.agent_phone].filter((x) => x && String(x).trim()).join(', ') : '';
  const link = adLink(tour.slug, platform, lang);

  return `Napiši OGLAS za nekretninu koja ima 360° virtuelnu turu.
${PURPOSE[tour.category ?? 'sale'] ?? PURPOSE.sale}
JEZIK OGLASA: ${lang === 'en' ? 'engleski (English)' : 'srpski, latinica, ekavica'}.

${PLATFORM_RULES[platform]}

PODACI (jedino na šta se smeš osloniti):
${facts.map((f) => `- ${f.label}: ${f.value}`).join('\n') || '- (nema)'}
GRAD: ${tour.city?.trim() || '(nije upisan)'}
PROSTORIJE U TURI: ${roomNames.join(', ') || '(nema)'}
OPIS AGENTA (konkretne činjenice; prepričaj, ne prepisuj): ${about || '(nema)'}
${price ? `CENA: ${[price.amount, price.unit].filter(Boolean).join(' ')}` : 'CENA: ne pominji cenu.'}
${near.length ? `U BLIZINI (vazdušna udaljenost):\n${near.map((n) => `- ${n}`).join('\n')}` : 'OKOLINA: ne pominji.'}
${contact ? `KONTAKT AGENTA (na kraju opisa): ${contact}` : 'KONTAKT: ne navodi telefon ni ime.'}
URL TURE: ${link}

PRAVILA:
1. Samo činjenice iz podataka. Ništa ne izmišljaj (ni sprat, ni stanje, ni namenu prostorija).
2. Bez kućnog broja i tačne adrese - samo ulica i naselje ako su u podacima.
3. Bez praznih pohvala ("savršen", "jedinstven", "očaravajući", "san snova") i bez velikih slova za naglašavanje.
4. TAČNO JEDNA rečenica o 360° turi (šta kupac dobija, npr. "Prošetajte kroz ceo stan, sobu po sobu, pre razgledanja") - ne ponavljaj je drugim rečima. URL (kad sajt dozvoljava link) UVEK sam u svom redu, ispod te rečenice.
5. Nedostatke ne pominji ("bez lifta", "nema parking").
6. Ne ocenjuj lokaciju opštim rečima ("odlično povezana", "mirno okruženje" - osim ako tako piše u opisu agenta); navedi šta je blizu i koliko (npr. "škola na 300 m").
7. Izbegavaj ukočeno "poseduje" i "raspolaže" - piši "ima".
8. FORMAT: svaki pasus odvojen praznim redom (\n\n); natuknice svaka u svom redu (\n); heštegovi u posebnom, poslednjem redu posle praznog reda. Nikad ceo tekst u jednom bloku.
${previous ? `9. DRUGA VERZIJA: drugačija formulacija i redosled od prethodne, ista pravila. Prethodna:\n"""${previous.slice(0, 1500)}"""` : ''}

Vrati JSON: { "title": "...", "body": "..." } (title je prazan string za Instagram i Facebook).`;
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { title: { type: Type.STRING }, body: { type: Type.STRING } },
  required: ['title', 'body']
};

export async function draftAdText(
  tour: Tour & { nearby?: unknown },
  rooms: Room[],
  platform: AdPlatform,
  lang: AdLang,
  opts: AdOptions,
  previous = ''
): Promise<{ title: string; body: string; link: string }> {
  const { data } = await generateJsonWithRetry<{ title?: string; body?: string }>({
    contents: [{ text: buildPrompt(tour, rooms, platform, lang, opts, previous) }],
    config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: previous ? TEMP_DESCRIPTIVE : 0.45 },
    model: GEMINI_FALLBACK_MODEL,
    fallbackModel: GEMINI_MODEL,
    // Samo tekst (bez slike) - drugi pokušaj staje u rok rute i pomaže kad je Gemini preopterećen (503).
    attempts: 2,
    label: `ad-text ${platform}`
  });
  const body = tidyBody(String(data?.body ?? ''), platform);
  if (!body) throw new Error('AI nije vratio tekst oglasa.');
  const title = platform === 'instagram' || platform === 'facebook' ? '' : String(data?.title ?? '').replace(/\s+/g, ' ').trim();
  return { title, body, link: adLink(tour.slug, platform, lang) };
}

