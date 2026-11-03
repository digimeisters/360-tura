import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { normalizeAiNotes } from '@/app/lib/aiNotes';

export const dynamic = 'force-dynamic';

/**
 * Napomene za AI popunu soba (tabela tour_ai_notes, migracija 046).
 * GET ?slug=  -> napomene ture (prazne ako ih nema)
 * PUT { slug, notes?, roomNotes? } -> čuva; polje koje nije poslato ostaje.
 * roomNotes se spaja po sobi: poslata soba sa praznim tekstom se briše.
 */

type Row = { notes: string | null; room_notes: unknown };

async function readNotes(supabase: Awaited<ReturnType<typeof requireAdmin>> & { ok: true }, slug: string) {
  const { data, error } = await supabase.supabase
    .from('tour_ai_notes')
    .select('notes, room_notes')
    .eq('tour_slug', slug)
    .maybeSingle<Row>();
  if (error) throw error;
  return normalizeAiNotes({ notes: data?.notes ?? '', roomNotes: data?.room_notes ?? {} });
}

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!slug) return NextResponse.json({ success: false, error: 'Nedostaje slug.' }, { status: 400 });

  try {
    return NextResponse.json({ success: true, notes: await readNotes(ctx, slug) });
  } catch (err) {
    console.error('[api/admin/ai-notes] GET', err);
    return NextResponse.json({ success: false, error: 'Napomene nisu učitane.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!slug) return NextResponse.json({ success: false, error: 'Nedostaje slug.' }, { status: 400 });

  const { data: tour } = await ctx.supabase.from('tours').select('slug').eq('slug', slug).maybeSingle();
  if (!tour) return NextResponse.json({ success: false, error: 'Tura ne postoji.' }, { status: 404 });

  try {
    const current = await readNotes(ctx, slug);
    const roomNotes: Record<string, string> = { ...current.roomNotes };
    if (body.roomNotes && typeof body.roomNotes === 'object' && !Array.isArray(body.roomNotes)) {
      for (const [id, text] of Object.entries(body.roomNotes as Record<string, unknown>)) {
        if (typeof text === 'string') roomNotes[id] = text;
      }
    }
    const next = normalizeAiNotes({
      notes: typeof body.notes === 'string' ? body.notes : current.notes,
      roomNotes
    });

    const { error } = await ctx.supabase.from('tour_ai_notes').upsert({
      tour_slug: slug,
      notes: next.notes,
      room_notes: next.roomNotes,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return NextResponse.json({ success: true, notes: next });
  } catch (err) {
    console.error('[api/admin/ai-notes] PUT', err);
    return NextResponse.json({ success: false, error: 'Napomene nisu sačuvane.' }, { status: 500 });
  }
}
