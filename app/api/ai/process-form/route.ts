import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    console.log("CEO TELO ZAHTEVA:", JSON.stringify(body, null, 2));

    let slug = body.slug || body.parameter?.slug || body.tour_slug;
    let rawAnswers = body.answers || body.namedValues || body.data || body;
    let updateData: Record<string, any> = {};

    if (Array.isArray(rawAnswers)) {
      for (const item of rawAnswers) {
        if (item && typeof item === 'object') {
          const key = item.field || item.id || item.name || item.question || item.label || item.key;
          const val = item.value !== undefined ? item.value : (item.text !== undefined ? item.text : item.answer);
          if (key) {
            updateData[String(key).trim()] = val;
          }
        }
      }
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      updateData = { ...rawAnswers };
    }

    if (!slug) {
      slug = updateData.slug || updateData.tour_slug || updateData.id;
    }

    console.log("PARSIRANI SLUG:", slug);
    console.log("PODACI ZA UPDATE:", updateData);

    if (!slug) {
      return NextResponse.json({ error: "Nedostaje slug (identifikator ture)" }, { status: 400 });
    }

    delete updateData.slug;
    delete updateData.tour_slug;

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
    return NextResponse.json({ error: error.message || String(error) }, { status: 400 });
  }
}