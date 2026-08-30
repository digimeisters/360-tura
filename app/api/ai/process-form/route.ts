import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL_NAME = 'gemini-3.6-flash';

// Pomoćna funkcija za automatsko ponavljanje poziva u slučaju 503 greške (API overload)
async function callGeminiWithRetry(prompt: string, config: any, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: config,
      });
    } catch (err: any) {
      const is503 = err?.status === 503 || String(err).includes('503');
      if (is503 && i < retries - 1) {
        console.warn(`Gemini API preopterećen (503). Pokušaj ${i + 1}/${retries} za ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Svi pokušaji pozivanja Gemini API-ja su neuspešni.");
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    console.log("Sirovi ulazni podaci iz forme/tabele:", JSON.stringify(body, null, 2));

    // 1. Ekstrakcija i spajanje svih dobijenih ključeva i vrednosti
    let rawAnswers = body.answers || body.namedValues || body.data || body;
    let extractedText = "";

    if (Array.isArray(rawAnswers)) {
      extractedText = rawAnswers
        .map((item) => {
          const k = item.field || item.id || item.name || item.question || item.label || item.key || '';
          const v = item.value !== undefined ? item.value : (item.text !== undefined ? item.text : item.answer);
          return `${k}: ${Array.isArray(v) ? v.join(', ') : v}`;
        })
        .join('\n');
    } else if (typeof rawAnswers === 'object' && rawAnswers !== null) {
      extractedText = Object.entries(rawAnswers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
        .join('\n');
    } else {
      extractedText = String(rawAnswers);
    }

    // Schema za i18n tekstualni objekat (samo i18n jezici direktno)
    const i18nTextSchema = {
      type: Type.OBJECT,
      properties: {
        sr: { type: Type.STRING },
        en: { type: Type.STRING },
        de: { type: Type.STRING },
      },
      required: ['sr', 'en', 'de'],
    };

    // 2. Prompt sa definisanim fiksnim pitanjima i biznis logikom za sastavljanje DIREKTNIH odgovora
    const prompt = `
Ti si stručni AI administrator baze podataka za nekretnine i 360 virtuelne ture.
Analiziraj sledeće sirove podatke iz popunjene Google Forme/Tabele, očisti ih od tipfera, odredi kategoriju i sastavi ODGOVORE na tačno 5 zasebnih FAQ polja: faq_1_i18n, faq_2_i18n, faq_3_i18n, faq_4_i18n, faq_5_i18n.

Sirovi ulaz:
"""
${extractedText}
"""

UPOZORENJA I PRAVILA OBRADE:
1. **category**: MORA biti tačno jedna od tri vrednosti: "sale", "rent" ili "booking".
   - Ako piše "Prodaja/Sale", "Prodaja", "Kupovina" -> postavi "sale".
   - Ako piše "Izdavanje", "Zakup", "Najam" -> postavi "rent".
   - Ako piše "Booking", "Stan na dan", "Kratkoročno" -> postavi "booking".

2. **slug**: Identifikator za URL (isključivo mala engleska slova, brojevi i crtice, bez razmaka i dijakritika). Ako je uneti slug loše formatiran, popravi ga.

3. **Čišćenje podataka**:
   - agent_email: Ispravi očigledne greške (npr. "gmail.con" -> "gmail.com").
   - agent_name: Pravilno kapitalizuj (npr. "Nikola STOJA" -> "Nikola Stoja").
   - address: Ispravi nazive ulica/gradova (npr. "janka katica 17" -> "Janka Katica 17").
   - title_i18n: Prevedi profesionalan i ulepšan naslov na tri jezika (sr, en, de).

4. **FAKTOI ODGOVORI (faq_1_i18n do faq_5_i18n)**:
Generiši SAMO ODGOVORE (bez reči "answer" ili "question" i bez ponavljanja samog pitanja u JSON-u).
Odgovore sastavi na osnovu unetih podataka i prevedi ih direktno na tri jezika (sr, en, de).

Kontekst pitanja za koje sastavljaš odgovore prema kategoriji:

AKO JE CATEGORY = "sale":
- faq_1_i18n: Odgovor na pitanje o prodajnoj ceni i mogućnosti kupovine na kredit.
- faq_2_i18n: Odgovor na pitanje o kvadraturi i stanju objekta (novogradnja, starogradnja, renoviran).
- faq_3_i18n: Odgovor na pitanje o uknjiženosti i vlasništvu (1/1, suvlasništvo).
- faq_4_i18n: Odgovor na pitanje da li su porezi i agencijska provizija uključeni u cenu.
- faq_5_i18n: Odgovor na pitanje o pripadajućem podrumu, terasi ili garažnom mestu.

AKO JE CATEGORY = "rent":
- faq_1_i18n: Odgovor na pitanje o mesečnoj zakupnini i uslovima za depozit.
- faq_2_i18n: Odgovor na pitanje o minimalnom periodu zakupa i datumu useljenja.
- faq_3_i18n: Odgovor na pitanje o mesečnim troškovima (režije) i grejanju.
- faq_4_i18n: Odgovor na pitanje da li su dozvoljeni kućni ljubimci (pet friendly).
- faq_5_i18n: Odgovor na pitanje o dodatnim uslovima ugovora i obavezama zakupca.

AKO JE CATEGORY = "booking":
- faq_1_i18n: Odgovor na pitanje o ceni po noćenju i minimalnom boravku.
- faq_2_i18n: Odgovor na pitanje o kapacitetu gostiju i pravilima kuće.
- faq_3_i18n: Odgovor na pitanje o vremenu za check-in i check-out.
- faq_4_i18n: Odgovor na pitanje o iznosu takse za čišćenje.
- faq_5_i18n: Odgovor na pitanje o parking-u, Wi-Fi-ju i pravilima otkazivanja.
`;

    // 3. Poziv Gemini API-ja preko retry funkcije
    const aiResponse = await callGeminiWithRetry(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          slug: { type: Type.STRING },
          category: { 
            type: Type.STRING,
            enum: ['sale', 'rent', 'booking']
          },
          property_type: { type: Type.STRING },
          advertiser_type: { type: Type.STRING },
          agent_name: { type: Type.STRING },
          agent_phone: { type: Type.STRING },
          agent_email: { type: Type.STRING },
          address: { type: Type.STRING },
          floorplan_url: { type: Type.STRING },
          title_i18n: i18nTextSchema,
          faq_1_i18n: i18nTextSchema,
          faq_2_i18n: i18nTextSchema,
          faq_3_i18n: i18nTextSchema,
          faq_4_i18n: i18nTextSchema,
          faq_5_i18n: i18nTextSchema,
        },
        required: [
          'slug', 
          'category', 
          'title_i18n', 
          'faq_1_i18n', 
          'faq_2_i18n', 
          'faq_3_i18n', 
          'faq_4_i18n', 
          'faq_5_i18n'
        ],
      },
    });

    if (!aiResponse.text) {
      throw new Error("AI nije vratio validan tekstualni odgovor.");
    }

    const processedData = JSON.parse(aiResponse.text);
    console.log("Obrađeni podaci od strane AI-ja:", processedData);

    // Sigurna provera i generisanje slug-a ako iz nekog razloga nedostaje
    if (!processedData.slug || processedData.slug.trim() === '') {
      const fallbackSource = processedData.address || "tura";
      processedData.slug = fallbackSource
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') + '-' + Date.now();
    }

    // 4. Filtriranje samo onih polja koja stvarno postoje u Supabase tabeli 'tours'
    const supabasePayload = {
      slug: processedData.slug,
      title: processedData.title_i18n.sr,
      category: processedData.category,
      property_type: processedData.property_type || null,
      advertiser_type: processedData.advertiser_type || null,
      agent_name: processedData.agent_name || null,
      agent_phone: processedData.agent_phone || null,
      agent_email: processedData.agent_email || null,
      address: processedData.address || null,
      floorplan_url: processedData.floorplan_url || null,
      title_i18n: processedData.title_i18n,
      faq_1_i18n: processedData.faq_1_i18n,
      faq_2_i18n: processedData.faq_2_i18n,
      faq_3_i18n: processedData.faq_3_i18n,
      faq_4_i18n: processedData.faq_4_i18n,
      faq_5_i18n: processedData.faq_5_i18n,
    };

    console.log("ČIST PAYLOAD ZA SUPABASE:", supabasePayload);

    // 5. Upis u Supabase
    const { data, error } = await supabase
      .from('tours')
      .upsert(supabasePayload, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error("Supabase greška pri upisu:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Greška u API obradi:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}