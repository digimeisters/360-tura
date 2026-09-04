import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { roomId, targetLang, draftData } = await req.json();

    if (!roomId || !targetLang || !draftData) {
      return NextResponse.json({ error: 'Nedostaju parametri' }, { status: 400 });
    }

    const langNames: Record<string, string> = {
      en: 'English',
      de: 'German',
      ru: 'Russian'
    };

    const targetLangName = langNames[targetLang.toLowerCase()] || targetLang;

    const prompt = `You are a professional translator. 
Translate the following text content from Serbian to ${targetLangName}. 
Maintain an engaging, natural tone appropriate for a luxury property virtual tour narration.

Input JSON:
${JSON.stringify(draftData)}

Respond STRICTLY in valid JSON with this exact structure:
{
  "establish_text": "Translated narration text...",
  "waypoints": [
    {
      "title": "Translated title...",
      "text": "Translated description..."
    }
  ]
}`;

    
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const translatedJSON = JSON.parse(result.response.text());

    // 2. SAČUVAJ PREVOD NARACIJE ZAN SOBE U 'ROOMS' TABELU
    if (translatedJSON.establish_text) {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('i18n')
        .eq('id', roomId)
        .single();

      const existingRoomI18n = roomData?.i18n || {};
      const updatedRoomI18n = {
        ...existingRoomI18n,
        [targetLang.toLowerCase()]: {
          establish_text: translatedJSON.establish_text
        }
      };

      await supabase
        .from('rooms')
        .update({ i18n: updatedRoomI18n })
        .eq('id', roomId);
    }

    // 3. SAČUVAJ PREVODE TAČAKA (WAYPOINTS/HOTSPOTS) U 'HOTSPOTS' TABELU
    if (Array.isArray(draftData.waypoints) && Array.isArray(translatedJSON.waypoints)) {
      for (let i = 0; i < draftData.waypoints.length; i++) {
        const originalHp = draftData.waypoints[i];
        const translatedHp = translatedJSON.waypoints[i];

        if (originalHp?.id && translatedHp) {
          const { data: hpData } = await supabase
            .from('hotspots')
            .select('i18n')
            .eq('id', originalHp.id)
            .single();

          const existingHpI18n = hpData?.i18n || {};
          const updatedHpI18n = {
            ...existingHpI18n,
            [targetLang.toLowerCase()]: {
              title: translatedHp.title,
              description: translatedHp.text
            }
          };

          await supabase
            .from('hotspots')
            .update({ i18n: updatedHpI18n })
            .eq('id', originalHp.id);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      targetLang, 
      translations: translatedJSON 
    });

  } catch (err: any) {
    console.error('Translation generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}