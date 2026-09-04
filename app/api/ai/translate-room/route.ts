import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    const targetLangName = langNames[targetLang] || targetLang;

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
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const translatedJSON = JSON.parse(result.response.text());

    // Samo vraćamo izgenerisani objekat frontend-u
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