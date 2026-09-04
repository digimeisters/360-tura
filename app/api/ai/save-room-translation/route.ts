import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { roomId, translations } = await req.json();

    if (!roomId || !translations) {
      return NextResponse.json({ error: 'Nedostaju podaci za čuvanje' }, { status: 400 });
    }

    // Upisujemo ceo objekat prevoda direktno u i18n kolonu u Supabase-u
    const { data, error } = await supabase
      .from('rooms')
      .update({ i18n: translations })
      .eq('id', roomId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Greška pri čuvanju u bazu:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}