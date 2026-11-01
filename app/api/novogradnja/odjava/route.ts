import { NextResponse } from 'next/server';
import { serviceClient } from '@/app/lib/salesAccess';
import { unsubscribe, verifyUnsubscribe } from '@/app/lib/unitWatch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/novogradnja/odjava - { w, s }: odjava sa "Obavesti me" (link iz
 * mejla, potpisan). Strana /obavestenja/odjava traži klik pre ovoga, jer
 * programi za proveru mejla sami otvaraju linkove (GET).
 *
 * Isti poziv stiže i kao "one-click" odjava iz Gmail-a (List-Unsubscribe),
 * sa w i s u adresi umesto u telu.
 */

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => null);
  const w = typeof body?.w === 'string' ? body.w : (url.searchParams.get('w') ?? '');
  const s = typeof body?.s === 'string' ? body.s : (url.searchParams.get('s') ?? '');
  if (!verifyUnsubscribe(w, s)) return NextResponse.json({ success: false, error: 'Link za odjavu nije ispravan.' }, { status: 400 });
  const db = serviceClient();
  if (!db || !(await unsubscribe(db, w))) return NextResponse.json({ success: false, error: 'Odjava trenutno nije uspela. Pokušajte ponovo.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
