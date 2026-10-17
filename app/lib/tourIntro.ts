import { Type, type Schema } from '@google/genai';
import { generateJsonWithRetry, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, TEMP_DESCRIPTIVE } from '@/app/lib/gemini';
import { buildFactList, getLocalizedText } from '@/app/tour/[slug]/utils';
import type { Tour } from '@/app/tour/[slug]/types';
import type { VoiceLang } from '@/app/lib/tts';

/**
 * AI predlog uvoda ture (vidi /api/ai/tour-intro i TourIntroOverlay): kratak
 * tekst za glas iz OSNOVNIH podataka ture, prema nameni nekretnine.
 */

export type Purpose = 'sale' | 'rent' | 'booking';
export const PURPOSES: Purpose[] = ['sale', 'rent', 'booking'];
export const INTRO_LANGS: VoiceLang[] = ['sr', 'en', 'de', 'ru'];
/** ~25 s glasa; iznad toga posetilac čeka predugo na prvu sobu. */
export const MAX_WORDS = 65;
export const MAX_CHARS = 520;

const PURPOSE_TONE: Record<Purpose, string> = {
  sale: 'Nekretnina je NA PRODAJU. Naglasak: lokacija, struktura, zgrada i ono što kupcu znači dugoročno (uknjiženost, status gradnje, parking).',
  rent: 'Nekretnina se IZDAJE na duže. Naglasak: udobnost svakodnevnog života i praktične stvari (grejanje, opremljenost, parking, depozit ako postoji).',
  booking: 'Nekretnina se izdaje NA DAN (kraći boravak). Naglasak: prijatan boravak i dolazak (lokacija, parking, terasa, lift). Bez reči "kupac".'
};


export function factsFor(tour: Tour) {
  return buildFactList(tour, 'sr').map((f) => ({ key: f.key, label: f.label, value: f.value }));
}

function buildDraftPrompt(tour: Tour, purpose: Purpose, previous: string): string {
  const facts = factsFor(tour);
  const about = getLocalizedText(tour.about_text_i18n, 'sr').trim();
  const title = getLocalizedText(tour.title_i18n, 'sr').trim();
  return `Napiši UVODNU NARACIJU za 360° turu nekretnine. Tekst izgovara glas (ElevenLabs) na početku ture, dok posetilac na mapi "dolazi" do nekretnine. Tekst se NE prikazuje na ekranu.

${PURPOSE_TONE[purpose]}

NASLOV TURE: ${title || '(nema)'}
GRAD: ${tour.city?.trim() || '(nije upisan)'}
OSNOVNI PODACI (jedino na šta se smeš osloniti):
${facts.length ? facts.map((f) => `- ${f.label}: ${f.value}`).join('\n') : '- (nema podataka)'}
OPIS AGENTA (samo za konkretne, proverljive činjenice - npr. "renoviran", "nova stolarija", "pogled na park"):
${about || '(nema)'}

PRAVILA:
1. Srpski jezik, latinica, ekavica. Prirodan govorni ton, kao agent koji ukratko predstavlja nekretninu.
2. Prva rečenica: vrsta i struktura, kvadratura, naselje, sprat (i lift ako postoji). Zatim ostali podaci, istim redom kao u listi.
3. Iz opisa agenta uzmi NAJVIŠE jednu-dve konkretne posebnosti, samo ako tamo izričito piše. Ništa ne izmišljaj i ne zaključuj.
4. Podatak koga nema u listi ili opisu NE pominji. Bez cene. Bez praznih pohvala ("prelep", "savršen", "jedinstven", "očaravajući").
5. Dužina prema količini podataka: 1-4 rečenice, najviše ${MAX_WORDS} reči. Malo podataka = kraće.
6. Piši za izgovor: "54 kvadrata" ili "54 kvadratna metra" umesto "54 m²"; sprat rečima ("na trećem spratu", "u prizemlju"); bez skraćenica i zagrada; strukturu kao reč ("dvosoban stan", ne "2.0").
7. Ne obraćaj se posetiocu ("dobrodošli", "predstavljamo vam") i ne najavljuj turu ("prošetajte", "pogledajte") - posle uvoda odmah kreće prva prostorija. Počni direktno, npr. "Dvosoban stan od 54 kvadrata…".
8. Samo ono što nekretnina IMA. Nedostatke ne pominji ("bez lifta", "nema parking", "nije uknjižen").
9. Ne nabrajaj prostorije (kupatilo, špajz, hodnik) - njih posetilac vidi odmah posle uvoda. Izbegavaj ukočene reči "poseduje", "raspolaže", "smešten".
${previous ? `10. Ovo je DRUGA VERZIJA: napiši drugačije od prethodne (drugi redosled ili formulacija), uz ista pravila. Prethodna: "${previous}"` : ''}

Vrati JSON: { "text": "..." }`;
}

const DRAFT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { text: { type: Type.STRING } },
  required: ['text']
};


/** Jedan AI poziv: predlog uvoda na srpskom (previous = "druga verzija"). */
export async function draftIntro(tour: Tour, purpose: Purpose, previous = ''): Promise<string> {
  const { data } = await generateJsonWithRetry<{ text?: string }>({
    contents: [{ text: buildDraftPrompt(tour, purpose, previous) }],
    config: { responseMimeType: 'application/json', responseSchema: DRAFT_SCHEMA, temperature: previous ? TEMP_DESCRIPTIVE : 0.4 },
    model: GEMINI_FALLBACK_MODEL,
    fallbackModel: GEMINI_MODEL,
    attempts: 1,
    label: 'tour-intro draft'
  });
  const text = String(data?.text ?? '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('AI nije vratio tekst uvoda.');
  return text;
}
