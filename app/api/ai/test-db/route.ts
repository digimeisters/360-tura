import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Izbor ključa
  const keyToUse = serviceKey || anonKey;

  // Provera dužine i formata ključa
  const info = {
    hasUrl: !!url,
    urlValue: url || 'Nedostaje',
    hasServiceKey: !!serviceKey,
    hasAnonKey: !!anonKey,
    keyTypeUsed: serviceKey ? 'SERVICE_ROLE' : 'ANON',
    keyFirst10Chars: keyToUse ? keyToUse.slice(0, 10) : 'NEMA',
    keyHasQuotes: keyToUse ? (keyToUse.startsWith('"') || keyToUse.startsWith("'")) : false,
  };

  if (!url || !keyToUse) {
    return NextResponse.json({ status: 'ERROR', message: 'Nedostaju ključevi u env vars', info });
  }

  try {
    const supabase = createClient(url, keyToUse);
    // Prosta provera konekcije
    const { data, error } = await supabase.from('tours').select('count', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({ status: 'SUPABASE_ERROR', supabaseError: error, info });
    }

    return NextResponse.json({ status: 'SUCCESS', message: 'Konekcija sa bazu radi perfektno!', info, data });
  } catch (err: any) {
    return NextResponse.json({ status: 'CRASH', error: err.message, info });
  }
}