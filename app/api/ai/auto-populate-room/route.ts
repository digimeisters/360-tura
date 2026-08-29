import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const roomAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    room_title: {
      type: Type.OBJECT,
      properties: {
        sr: { type: Type.STRING },
        en: { type: Type.STRING },
        de: { type: Type.STRING },
      },
      required: ['sr', 'en', 'de'],
    },
    establish: {
      type: Type.OBJECT,
      properties: {
        fromYaw: { type: Type.NUMBER },
        pitch: { type: Type.NUMBER },
        text_i18n: {
          type: Type.OBJECT,
          properties: {
            sr: { type: Type.STRING },
            en: { type: Type.STRING },
            de: { type: Type.STRING },
          },
          required: ['sr', 'en', 'de'],
        },
      },
      required: ['fromYaw', 'pitch', 'text_i18n'],
    },
    waypoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          yaw: { type: Type.NUMBER },
          pitch: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ['info', 'navigation'] },
          title_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
          text_i18n: {
            type: Type.OBJECT,
            properties: {
              sr: { type: Type.STRING },
              en: { type: Type.STRING },
              de: { type: Type.STRING },
            },
            required: ['sr', 'en', 'de'],
          },
        },
        required: ['yaw', 'pitch', 'type', 'title_i18n', 'text_i18n'],
      },
    },
  },
  required: ['room_title', 'establish', 'waypoints'],
};

export async function POST(req: Request) {
  try {
    const { roomId, panoramaUrl } = await req.json();

    if (!roomId || !panoramaUrl) {
      return NextResponse.json({ error: 'roomId i panoramaUrl su obavezni' }, { status: 400 });
    }

    const imageResp = await fetch(panoramaUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        {
          text: `Analiziraj ovu equirectangular 360 panorama sliku nekretnine.
          1. Odredi tačan naziv prostorije (srpski, engleski, nemački).
          2. Odredi uvodni ugao gledanja (fromYaw izmedju -180 i 180, pitch izmedju -90 i 90) i uvodni tekst naracije na 3 jezika.
          3. Identifikuj do 4 najvažnija detalja i proceni njihove yaw i pitch koordinate u panorami. Generiši naslov i detaljan opis za svaki detalj na 3 jezika (sr, en, de).`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: roomAnalysisSchema,
      },
    });

    const aiData = JSON.parse(response.text!);

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        title_i18n: aiData.room_title,
        establish_i18n: aiData.establish,
        waypoints_i18n: aiData.waypoints,
      })
      .eq('id', roomId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: aiData });
  } catch (err: any) {
    console.error('AI Processing Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}