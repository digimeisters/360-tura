import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, answers } = body;

    if (!slug || !answers) {
      return NextResponse.json({ success: false, error: 'Nedostaju podaci' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const prompt = `
      Ti si profesionalni prevodilac i copywriter za nekretnine. 
      Evo sirovih odgovora iz upitnika: ${JSON.stringify(answers)}.
      Zadatak: 
      1. Oblikuj i lektorisi ove odgovore da zvuče profesionalno.
      2. Prevedi ih na tri jezika: srpski (sr), engleski (en) i nemački (de).
      3. Vrati ISKLJUČIVO validan JSON objekat u sledećem formatu, bez dodatnog teksta:
      {
        "faq_1_i18n": { "sr": "...", "en": "...", "de": "..." },
        "faq_2_i18n": { "sr": "...", "en": "...", "de": "..." },
        "faq_3_i18n": { "sr": "...", "en": "...", "de": "..." },
        "faq_4_i18n": { "sr": "...", "en": "...", "de": "..." }
      }
    `;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const aiData = await aiRes.json();
    const rawText = aiData.candidates[0].content.parts[0].text;
    const cleanJson = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

    const { error: dbError } = await supabase
      .from('tours')
      .update(cleanJson)
      .eq('slug', slug);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

