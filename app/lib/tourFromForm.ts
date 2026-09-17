import { Type, Schema } from '@google/genai';
import { generateJsonWithRetry, TEMP_EXTRACT } from './gemini';

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
  /** Samo naziv grada - filter na /ture. Vidi migraciju 011. */
  city: string | null;
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

/**
 * Pet FAQ tema po kategoriji, svaka vezana za TAČNO određena polja iz
 * upitnika (odgovori[] je spisak ključeva odgovora - vidi FormAnswers).
 *
 * MORA da prati pitanja u app/tour/[slug]/translations.ts (categoryQuestions)
 * redosledom i temom 1:1 - to je pitanje koje posetilac vidi na dugmetu, pa
 * odgovor koji AI napiše mora da odgovara BAŠ na njega, ne na nešto šire.
 */
const FAQ_CONTEXT: Record<string, { topic: string; fields: string[] }[]> = {
  rent: [
    { topic: 'zakupnina i mesečni troškovi (režije)', fields: ['Mesečna zakupnina', 'Režije'] },
    { topic: 'depozit', fields: ['Depozit'] },
    { topic: 'minimalni period zakupa i datum useljenja', fields: ['Minimalni period zakupa', 'Dostupno od'] },
    { topic: 'da li su dozvoljeni kućni ljubimci', fields: ['Kućni ljubimci'] },
    { topic: 'dodatni uslovi ugovora', fields: ['Dodatni uslovi ugovora'] }
  ],
  sale: [
    { topic: 'prodajna cena i mogućnost kupovine na kredit', fields: ['Prodajna cena', 'Mogućnost kupovine na kredit'] },
    { topic: 'status gradnje i stanje enterijera', fields: ['Status gradnje', 'Stanje'] },
    { topic: 'uknjiženost i vlasništvo (1/1, suvlasništvo, pravno lice)', fields: ['Uknjiženost', 'Vlasništvo'] },
    { topic: 'da li su porezi i agencijska provizija uključeni u cenu', fields: ['Porezi i provizija'] },
    { topic: 'šta sve ide uz stan (podrum, terasa, garažno mesto)', fields: ['Pripadajući prostor'] }
  ],
  booking: [
    { topic: 'cena po noćenju i minimalan broj noćenja', fields: ['Cena po noćenju', 'Minimalan broj noćenja'] },
    { topic: 'kapacitet (broj gostiju) i pravila kuće', fields: ['Maksimalan broj gostiju', 'Pravila kuće'] },
    { topic: 'vreme za check-in i check-out', fields: ['Check-in i check-out'] },
    { topic: 'taksa za čišćenje', fields: ['Taksa za čišćenje'] },
    { topic: 'dostupne pogodnosti i pravila otkazivanja', fields: ['Dostupne pogodnosti', 'Pravila otkazivanja'] }
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

  // Za svaku FAQ temu se eksplicitno navodi IZ KOJIH polja odgovor sme da se
  // sastavi - to je ono što posetilac čita kao odgovor na kratko pitanje
  // ("Kolika je zakupnina i mesečni troškovi?"), pa odgovor mora da bude
  // isto tako uzak: brojevi/vrednosti tih polja, bez širenja na drugo.
  const faqList = FAQ_CONTEXT[category]
    .map((q, i) => `- faq_${i + 1}_i18n: ${q.topic}. Koristi ISKLJUČIVO polja: ${q.fields.join(', ')}.`)
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
   - address: ispravi domaće nazive ulica i gradova, sa našim slovima, i
     zadrži pun oblik "Ulica i broj, Grad" - grad ostaje i u adresi, ne samo
     u polju city. Strane adrese NE prevodi i NE preslovljavaj: ostaju kako
     se pišu na licu mesta ("Stangasse 12, Wien", ne "Štangase 12, Beč"),
     jer se po adresi pravi mapa nekretnine.
   - city: SAMO naziv grada ("Kragujevac"), bez ulice, broja i poštanskog
     broja, tačno onako kako je napisan u adresi. Ako grad nije upisan
     zasebno, izvuci ga iz adrese. Ako ni tamo nije naveden, ostavi prazno.
     Naselje ("Aerodrom", "Šumarice") NIJE grad - ono ide u naslov i opis,
     nikad u polje city, i ne prevodi se ni na jedan jezik.
   - property_type: spoji tip i strukturu iz upitnika u jedan izraz, na
     srpskom, po obrascu "Stan - dvosoban (2.0)" ili "Kuća - spratna (Pr+1)".
     Ako struktura nije navedena, ostavi samo tip.
   - title_i18n: profesionalan, sažet naslov oglasa na svakom ciljnom jeziku.
     Struktura nekretnine ide u naslov kad je poznata ("Dvosoban stan 58 m²"),
     na svakom jeziku u njegovom uobičajenom obliku ("2-room apartment",
     "Zweizimmerwohnung") - nikad srpska oznaka u stranom naslovu.

2. about_text_i18n: NAJVIŠE 2 kratke rečenice, na svakom ciljnom jeziku,
   isključivo iz polja "Kratak opis nekretnine". Ako to polje nije popunjeno,
   vrati prazan string - ne izmišljaj rečenicu ni iz čega drugog. Naselje,
   kvadratura, sprat, lift, podrum, grejanje, struktura, status gradnje i
   stanje NE idu ovde: posetilac ih već vidi kao zasebnu tabelu u turi, pa
   bi ponavljanje bilo suvišno.

3. FAQ odgovori - TELEGRAFSKI kratko, kao SMS, ne kao rečenica u pasusu:
   brojevi i ključne reči, bez uvodnih fraza ("Zakupnina iznosi..."). Jedan
   red, najviše 10-12 reči. Piši SAMO odgovor, bez ponavljanja pitanja.
   Primer dobrog odgovora: "450 €/mesečno, režije oko 60 €." Primer lošeg
   odgovora (predugačak): "Mesečna zakupnina za ovu nekretninu iznosi 450
   evra, dok prosečni mesečni troškovi za režije iznose oko 60 evra."
${faqList}

4. NAJVAŽNIJE - ne izmišljaj. Ako u upitniku nema podatka za neki odgovor,
   napiši kratko da nije navedeno (npr. "Nije navedeno, pitajte agenta.").
   Nikad ne navodi cenu, površinu, datum ili uslov koji ne postoji u ulazu.
`;

  const { data } = await generateJsonWithRetry<Record<string, any>>({
    contents: prompt,
    label: 'Obrada upitnika',
    // Obrada upitnika je duža od jednog opisa sobe: 7 polja puta do 4 jezika.
    timeoutMs: 60_000,
    config: {
      responseMimeType: 'application/json',
      temperature: TEMP_EXTRACT,
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
          city: { type: Type.STRING },
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
    }
  });

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
    city: data.city || null,
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
