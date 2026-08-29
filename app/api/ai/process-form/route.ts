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

    const slug = body.slug || body.parameter?.slug || "nepoznato";
    const answers = body.answers || body.namedValues || body;

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
