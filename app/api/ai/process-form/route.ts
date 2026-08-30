import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL = 'gemini-3.6-flash';

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

    // Schema za pojedinačno FAQ polje (pitanje + odgovor na 3 jezika)
    const faqItemSchema = {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
        answer: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
      },
      required: ['question', 'answer'],
    };

    // 2. Prompt sa definisanim fiksnim pitanjima i biznis logikom
    const prompt = `
Ti si stručni AI administrator baze podataka za nekretnine i 360 virtuelne ture.
Analiziraj sledeće sirove podatke iz popunjene Google Forme/Tabele, očisti ih od tipfera, odredi kategoriju i popuni tačno 5 zasebnih FAQ polja: faq_1_i18n, faq_2_i18n, faq_3_i18n, faq_4_i18n, faq_5_i18n.

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

4. **FAKTOI (faq_1_i18n do faq_5_i18n)**:
U zavisnosti od prepoznate kategorije, MORAŠ upotrebiti sledeća fiksna pitanja i sastaviti tačne i precizne odgovore na osnovu unetih podataka. Pitanja i odgovore prevedi na srpski (sr), engleski (en) i nemački (de).

AKO JE CATEGORY = "sale":
- faq_1_i18n: Pitanje: "Kolika je prodajna cena i da li postoji mogućnost kupovine na kredit?"
- faq_2_i18n: Pitanje: "Kolika je kvadratura i kakvo je stanje objekta (novogradnja, starogradnja, renoviran)?"
- faq_3_i18n: Pitanje: "Da li je nekretnina uknjižena i kakvo je vlasništvo (1/1, suvlasništvo)?"
- faq_4_i18n: Pitanje: "Da li su porezi i agencijska provizija uključeni u cenu ili su dodatni?"
- faq_5_i18n: Pitanje: "Da li nekretnina ima pripadajući podrum, terasu ili garažno mesto?"

AKO JE CATEGORY = "rent":
- faq_1_i18n: Pitanje: "Kolika je mesečna zakupnina i kakvi su uslovi za depozit?"
- faq_2_i18n: Pitanje: "Koji je minimalni period zakupa i od kog datuma je stan useljiv?"
- faq_3_i18n: Pitanje: "Koliki su prosečni mesečni troškovi (režije i informatika) i kakvo je grejanje?"
- faq_4_i18n: Pitanje: "Da li su dozvoljeni kućni ljubimci (pet friendly)?"
- faq_5_i18n: Pitanje: "Kakvi su dodatni uslovi ugovora i obaveze zakupca?"

AKO JE CATEGORY = "booking":
- faq_1_i18n: Pitanje: "Kolika je cena po noćenju i koliki je minimalni boravak?"
- faq_2_i18n: Pitanje: "Koliki je maksimalan broj gostiju (kapacitet) i kakva su pravila kuće?"
- faq_3_i18n: Pitanje: "Koje je tačno vreme za check-in i check-out?"
- faq_4_i18n: Pitanje: "Koliki je iznos takse za čišćenje po boravku?"
- faq_5_i18n: Pitanje: "Da li je obezbeđen parking, Wi-Fi i kakva su pravila otkazivanja?"
`;

    // 3. Poziv Gemini API-ja sa strogom JSON šemom koja odgovara pojedinačnim kolonama
    const aiResponse = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
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
            title_i18n: {
              type: Type.OBJECT,
              properties: {
                sr: { type: Type.STRING },
                en: { type: Type.STRING },
                de: { type: Type.STRING },
              },
              required: ['sr', 'en', 'de'],
            },
            faq_1_i18n: faqItemSchema,
            faq_2_i18n: faqItemSchema,
            faq_3_i18n: faqItemSchema,
            faq_4_i18n: faqItemSchema,
            faq_5_i18n: faqItemSchema,
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