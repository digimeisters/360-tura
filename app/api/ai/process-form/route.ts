import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    console.log("PRIMLJENO IZ FORME:", JSON.stringify(body));

    let slug = body.slug || body.parameter?.slug;
    let rawAnswers = body.answers || body.namedValues || body;
    let updateData: Record<string, any> = {};

    // Ako je answers niz, pretvaramo ga u objekat ključ-vrednost
    if (Array.isArray(rawAnswers)) {
      for (const item of rawAnswers) {
        const key = item.field || item.id || item.name;
        const val = item.value !== undefined ? item.value : (item.text || item.answer);
        if (key) {
          updateData[key] = val;
        }
      }
    } else if (typeof rawAnswers === 'object' && rawAnswers !== null) {
      updateData = { ...rawAnswers };
    }

    if (!slug) {
      slug = updateData.slug;
    }

    if (!slug) {
      return NextResponse.json({ error: "Nedostaje slug (identifikator ture)" }, { status: 400 });
    }

    delete updateData.slug;

    const { data, error } = await supabase
      .from('tours')
      .update(updateData)
      .eq('slug', slug);

    if (error) {
      console.error("Supabase greska:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Greska u API-ju:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}