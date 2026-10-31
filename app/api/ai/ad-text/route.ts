import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { AD_PLATFORMS, draftAdText, type AdLang, type AdPlatform } from '@/app/lib/adText';
import type { Room, Tour } from '@/app/tour/[slug]/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** "Tekst oglasa" (admin): naslov i opis oglasa za izabrani sajt - vidi app/lib/adText.ts. */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin.ok) return NextResponse.json({ success: false, error: admin.error }, { status: admin.status });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const platform = AD_PLATFORMS.includes(body.platform as AdPlatform) ? (body.platform as AdPlatform) : null;
    const lang: AdLang = body.lang === 'en' ? 'en' : 'sr';
    if (!slug || !platform) return NextResponse.json({ success: false, error: 'Nedostaje tura ili sajt.' }, { status: 400 });
    const opts = {
      price: body.price !== false,
      nearby: body.nearby !== false,
      contact: body.contact === true
    };
    const previous = typeof body.previous === 'string' ? body.previous : '';

    const [tourRes, roomsRes] = await Promise.all([
      admin.supabase.from('tours').select('*').eq('slug', slug).single(),
      admin.supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true })
    ]);
    if (tourRes.error || !tourRes.data) return NextResponse.json({ success: false, error: 'Tura nije pronađena.' }, { status: 404 });

    const ad = await draftAdText(
      tourRes.data as unknown as Tour & { nearby?: unknown },
      (roomsRes.data ?? []) as unknown as Room[],
      platform,
      lang,
      opts,
      previous
    );
    return NextResponse.json({ success: true, ...ad });
  } catch (error) {
    console.error('[ad-text]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Greška.' }, { status: 500 });
  }
}
