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

    const slug = body.slug || body.parameter?.slug;
    
    if (!slug) {
      return NextResponse.json({ error: "Nedostaje slug (identifikator ture)" }, { status: 400 });
    }

    // Izvlačimo odgovore iz forme (prilagodi polja u zavisnosti šta forma tačno šalje)
    const formData = body.answers || body.namedValues || body;

    // Ažuriramo postojeći red u 'tours' tabeli na osnovu slug-a
    const { data, error } = await supabase
      .from('tours')
      .update(formData)
      .eq('slug', slug);

    if (error) {
      console.error("Supabase greska:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.errog("Greska u API-ju:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}