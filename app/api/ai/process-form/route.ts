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

    const { slug, answers } = body;

    // Ovde ide tvoja logika za upis u Supabase...
    // Na primer:
    // const { data, error } = await supabase.from('tvoja_tabela').insert([...]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Greska u API-ju:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  }