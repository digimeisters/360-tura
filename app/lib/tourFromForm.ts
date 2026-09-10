import { GoogleGenAI, Type, Schema } from '@google/genai';

const MODEL_NAME = 'gemini-3.1-flash-lite';

export type Language = 'sr' | 'en' | 'de' | 'ru';

export type FormAnswers = Record<string, string>;

export type ProcessedTour = {
  slug: string;
  category: 'sale' | 'rent' | 'booking';
  property_type: string | null;
  advertiser_type: string | null;
  agency_name: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  address: string | null;
  location_map_url: string | null;
  title: string;
  title_i18n: Record<string, string>;
  about_text_i18n: Record<string, string>;
  faq_1_i18n: Record<string, string>;
  faq_2_i18n: Record<string, string>;
  faq_3_i18n: Record<string, string>;
  faq_4_i18n: Record<string, string>;
  faq_5_i18n: Record<string, string>;
  target_languages: Language[];
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function callGeminiWithRetry(prompt: string, config: object, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({ model: MODEL_NAME, contents: prompt, config });
    } catch (err: unknown) {
      const status = (err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code;
      const retryable = status === 503 || status === 429 || /50[23]|429/.test(String(err));
      if (retryable && i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Svi pokušaji pozivanja Gemini API-ja su neuspešni.');
}

function i18nSchema(languages: string[]): Schema {
  const properties: Record<string, Schema> = {};
  languages.forEach((l) => {
    properties[l] = { type: Type.STRING };
  });
  return { type: Type.OBJECT, properties, required: languages };
}

/**
 * Modal "Lokacija" prikazuje mapu u <iframe>, a Google odbija ugrađivanje
 * običnog share linka (maps.app.goo.gl) sa X-Frame-Options. Jedini oblik
 * koji se prikazuje je /maps/embed, pa se on gradi iz adrese - agent ne
 * mora ništa da lepi. Ako je ipak nalepio pravi embed link, on ima prednost.
 */
export function buildMapEmbedUrl(address: string | null, pasted?: string): string | null {
  if (pasted && /\/maps\/embed/i.test(pasted)) return pasted;
  if (!address) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

export function detectLanguages(text: string): Language[] {
  const found = new Set<Language>();
  if (/srpski|\b(sr|rs)\b/i.test(text)) found.add('sr');
  if (/ruski|\b(ru)\b/i.test(text)) found.add('ru');
  if (/engleski|\benglish\b|\b(en)\b/i.test(text)) found.add('en');
  if (/nemački|nemacki|\bgerman\b|\b(de)\b/i.test(text)) found.add('de');
  const list = [...found];
  return list.length ? list : ['sr', 'en'];
}

const FAQ_CONTEXT: Record<string, string[]> = {
  sale: [
    'prodajna cena i mogućnost kupovine na kredit',
    'kvadratura i stanje objekta (novogradnja, starogradnja, renoviran)',
    'uknjiženost i vlasništvo (1/1, suvlasništvo, pravno lice)',
    'da li su porezi i agencijska provizija uključeni u cenu',
    'pripadajući prostor: podrum, terasa, garažno ili parking mesto'
  ],
  rent: [
    'mesečna zakupnina i uslovi za depozit',
    'minimalni period zakupa i datum useljenja',
    'prosečni mesečni troškovi (režije) i tip grejanja',
    'da li su dozvoljeni kućni ljubimci',
    'dodatni uslovi ugovora i obaveze zakupca'
  ],
  booking: [
    'cena po noćenju i minimalan broj noćenja',
    'kapacitet (broj gostiju) i pravila kuće',
    'vreme za check-in i check-out',
    'taksa za čišćenje i eventualne doplate',
    'dostupne pogodnosti (parking, Wi-Fi) i pravila otkazivanja'
  ]
};

/**
 * Pretvara sirove odgovore iz upitnika u zapis ture: čisti podatke, prevodi
 * na izabrane jezike i sastavlja 5 FAQ odgovora.
 *
 * `knownSlug` je slug izveden iz naslova na serveru - AI ga ne izmišlja, da
 * bi link bio predvidiv i da bi izmena naslova mogla da ga zadrži.
 */
export async function processTourForm(
  answers: FormAnswers,
  knownSlug: string
): Promise<ProcessedTour> {
  const asText = Object.entries(answers)
    .filter(([, v]) => String(v ?? '').trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const langSource = Object.entries(answers)
    .filter(([k]) => /jezi|language/i.test(k))
    .map(([, v]) => v)
    .join(' ');

  const targetLanguages = detectLanguages(langSource || asText);
  const langList = targetLanguages.map((l) => l.toUpperCase()).join(', ');
  const textSchema = i18nSchema(targetLanguages);

  const categoryRaw = Object.entries(answers)
    .filter(([k]) => /kategorij|category/i.test(k))
    .map(([, v]) => String(v).toLowerCase())
    .join(' ');
  let category: ProcessedTour['category'] = 'rent';
  if (/sale|prodaj|kupovin/.test(categoryRaw)) category = 'sale';
  else if (/booking|na dan|kratkoro/.test(categoryRaw)) category = 'booking';

  const faqList = FAQ_CONTEXT[category]
    .map((q, i) => `- faq_${i + 1}_i18n: odgovor na pitanje o: ${q}`)
    .join('\n');

  const prompt = `
Ti si stručni administrator baze podataka za nekretnine i 360° virtuelne ture.
Obradi sledeće odgovore iz upitnika koji je popunio agent.

CILJNI JEZICI: generiši prevode ISKLJUČIVO za: ${langList}. Nijedan drugi jezik.

Odgovori iz upitnika:
"""
${asText}
"""

PRAVILA:

1. Čišćenje podataka:
   - agent_email: ispravi očigledne greške ("gmail.con" -> "gmail.com").
   - agent_name i agency_name: pravilno kapitalizuj ("marko MARKOVIC" -> "Marko Markovic").
   - address: ispravi nazive ulica i gradova, sa našim slovima.
   - title_i18n: profesionalan, sažet naslov oglasa na svakom ciljnom jeziku.

2. about_text_i18n: kratak opis nekretnine (3-5 rečenica), na svakom ciljnom
   jeziku, sastavljen isključivo od podataka iz upitnika.

3. FAQ odgovori - piši SAMO odgovor, bez ponavljanja pitanja:
${faqList}

4. NAJVAŽNIJE - ne izmišljaj. Ako u upitniku nema podatka za neki odgovor,
   napiši da informacija nije navedena i da se dobija na upit kod agenta.
   Nikad ne navodi cenu, površinu, datum ili uslov koji ne postoji u ulazu.
`;

  const response = await callGeminiWithRetry(prompt, {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        property_type: { type: Type.STRING },
        advertiser_type: { type: Type.STRING },
        agency_name: { type: Type.STRING },
        agent_name: { type: Type.STRING },
        agent_phone: { type: Type.STRING },
        agent_email: { type: Type.STRING },
        address: { type: Type.STRING },
        title_i18n: textSchema,
        about_text_i18n: textSchema,
        faq_1_i18n: textSchema,
        faq_2_i18n: textSchema,
        faq_3_i18n: textSchema,
        faq_4_i18n: textSchema,
        faq_5_i18n: textSchema
      },
      required: [
        'title_i18n',
        'about_text_i18n',
        'faq_1_i18n',
        'faq_2_i18n',
        'faq_3_i18n',
        'faq_4_i18n',
        'faq_5_i18n'
      ]
    }
  });

  if (!response?.text) throw new Error('AI nije vratio odgovor.');

  const data = JSON.parse(response.text);
  const primaryTitle = data.title_i18n?.sr || data.title_i18n?.[targetLanguages[0]] || '';

  const pastedMap = Object.entries(answers)
    .filter(([k]) => /maps|mapa|lokacij/i.test(k))
    .map(([, v]) => String(v).trim())
    .find((v) => /^https?:\/\//i.test(v));

  return {
    slug: knownSlug,
    category,
    property_type: data.property_type || null,
    advertiser_type: data.advertiser_type || null,
    agency_name: data.agency_name || null,
    agent_name: data.agent_name || null,
    agent_phone: data.agent_phone || null,
    agent_email: data.agent_email || null,
    address: data.address || null,
    location_map_url: buildMapEmbedUrl(data.address || null, pastedMap),
    title: primaryTitle,
    title_i18n: data.title_i18n,
    about_text_i18n: data.about_text_i18n,
    faq_1_i18n: data.faq_1_i18n,
    faq_2_i18n: data.faq_2_i18n,
    faq_3_i18n: data.faq_3_i18n,
    faq_4_i18n: data.faq_4_i18n,
    faq_5_i18n: data.faq_5_i18n,
    target_languages: targetLanguages
  };
}
