import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("PRIMLJENO IZ FORME:", JSON.stringify(body));

    // Izvuci podatke koje saljes iz Google Forme
    const { slug, answers } = body;

    // Upis u Supabase tabelu (promeni 'tvoja_tabela' u naziv tvoje tabele)
    const { data, error } = await supabase
      .from('tours')
      .insert([{ slug: slug, answers: answers }]);

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