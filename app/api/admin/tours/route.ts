import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/adminAuth';
import { uniqueSlug } from '@/app/lib/slug';

export const dynamic = 'force-dynamic';

const CATEGORIES = new Set(['rent', 'sale', 'booking']);

const LIMITS: Record<string, number> = {
  title: 160,
  agency_name: 160,
  address: 200,
  property_type: 80,
  agent_name: 120,
  agent_phone: 60,
  agent_email: 160
};

function clean(value: unknown, field: string): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, LIMITS[field] ?? 200);
}

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const [{ data: tours, error }, { data: rooms }] = await Promise.all([
    ctx.supabase
      .from('tours')
      .select(
        'slug, title, title_i18n, agency_name, address, category, property_type, agent_name, agent_phone, agent_email, created_at, published' as '*'
      )
      .order('created_at', { ascending: false }),
    ctx.supabase.from('rooms').select('tour_slug, panorama_url, panorama_url_cf')
  ]);

  if (error) {
    console.error('[api/admin/tours] read failed:', error.message);
    return NextResponse.json({ success: false, error: 'Greška pri čitanju tura.' }, { status: 500 });
  }

  const roomCount = new Map<string, { total: number; withPanorama: number }>();
  for (const room of rooms ?? []) {
    const entry = roomCount.get(room.tour_slug) ?? { total: 0, withPanorama: 0 };
    entry.total++;
    if (room.panorama_url_cf || room.panorama_url) entry.withPanorama++;
    roomCount.set(room.tour_slug, entry);
  }

  return NextResponse.json({
    success: true,
    tours: (tours ?? []).map((tour) => ({
      ...tour,
      rooms: roomCount.get(tour.slug)?.total ?? 0,
      roomsWithPanorama: roomCount.get(tour.slug)?.withPanorama ?? 0
    }))
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));

  const title = clean(body.title, 'title');
  if (!title) {
    return NextResponse.json({ success: false, error: 'Naslov je obavezan.' }, { status: 400 });
  }

  const category = CATEGORIES.has(body.category) ? body.category : 'rent';

  // Slug se izvodi iz naslova umesto da se kuca ručno - odatle su nastali
  // linkovi sa velikim slovima koji lome deljenje.
  const { data: existing } = await ctx.supabase.from('tours').select('slug');
  const taken = new Set((existing ?? []).map((t) => t.slug.toLowerCase()));
  const slug = uniqueSlug(clean(body.slug, 'title') || title, taken);

  const { error } = await ctx.supabase.from('tours').insert({
    slug,
    title,
    // Nova tura nema nijednu sobu, pa kreće kao nacrt - objavljuje se tek kad
    // se otpreme panorame. Do tada je link mrtav za sve osim za admina.
    published: false,
    // Tura čita title_i18n pre title-a, pa se naslov upisuje na oba mesta.
    title_i18n: { sr: title },
    agency_name: clean(body.agency_name, 'agency_name') || null,
    address: clean(body.address, 'address') || null,
    property_type: clean(body.property_type, 'property_type') || null,
    agent_name: clean(body.agent_name, 'agent_name') || null,
    agent_phone: clean(body.agent_phone, 'agent_phone') || null,
    agent_email: clean(body.agent_email, 'agent_email') || null,
    category
  });

  if (error) {
    console.error('[api/admin/tours] insert failed:', error.message);
    return NextResponse.json({ success: false, error: 'Tura nije kreirana.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Nedostaje slug.' }, { status: 400 });
  }

  // Prekidač objave se šalje sam, bez ostatka formulara - lista tura ga menja
  // jednim klikom, bez otvaranja izmene.
  if (typeof body.published === 'boolean' && body.title === undefined) {
    const { error: pubError } = await ctx.supabase
      .from('tours')
      .update({ published: body.published } as never)
      .eq('slug', slug);

    if (pubError) {
      console.error('[api/admin/tours] publish toggle failed:', pubError.message);
      return NextResponse.json({ success: false, error: 'Stanje nije promenjeno.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, published: body.published });
  }

  const title = clean(body.title, 'title');
  if (!title) {
    return NextResponse.json({ success: false, error: 'Naslov je obavezan.' }, { status: 400 });
  }

  // Slug se namerno ne menja pri izmeni: postojeći podeljeni linkovi i
  // zabeležena analitika vezani su za njega.
  const { data: current } = await ctx.supabase
    .from('tours')
    .select('title_i18n')
    .eq('slug', slug)
    .maybeSingle();

  let titleI18n: Record<string, string> = { sr: title };
  if (current?.title_i18n) {
    const raw = current.title_i18n;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (parsed && typeof parsed === 'object') {
      // Prevodi na ostale jezike se čuvaju - menja se samo srpski.
      titleI18n = { ...(parsed as Record<string, string>), sr: title };
    }
  }

  const { error } = await ctx.supabase
    .from('tours')
    .update({
      title,
      title_i18n: titleI18n,
      agency_name: clean(body.agency_name, 'agency_name') || null,
      address: clean(body.address, 'address') || null,
      property_type: clean(body.property_type, 'property_type') || null,
      agent_name: clean(body.agent_name, 'agent_name') || null,
      agent_phone: clean(body.agent_phone, 'agent_phone') || null,
      agent_email: clean(body.agent_email, 'agent_email') || null,
      category: CATEGORIES.has(body.category) ? body.category : 'rent'
    })
    .eq('slug', slug);

  if (error) {
    console.error('[api/admin/tours] update failed:', error.message);
    return NextResponse.json({ success: false, error: 'Izmena nije sačuvana.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
