import { NextResponse } from 'next/server';
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/app/lib/adminAuth';
import { uniqueSlug } from '@/app/lib/slug';
import { refreshPublicPages } from '@/app/lib/revalidatePublic';
import { r2Client } from '@/app/lib/r2';
import { geocodeAddress } from '@/app/lib/geocode';

export const dynamic = 'force-dynamic';

const CATEGORIES = new Set(['rent', 'sale', 'booking']);
const TOUR_STATUSES = new Set(['active', 'rented', 'sold', 'paused']);

const LIMITS: Record<string, number> = {
  title: 160,
  agency_name: 160,
  address: 200,
  city: 80,
  district: 80,
  structure: 80,
  floor: 40,
  has_elevator: 10,
  has_basement: 10,
  heating: 40,
  build_status: 40,
  finish_status: 40,
  property_type: 80,
  agent_name: 120,
  agent_phone: 60,
  agent_email: 160
};

function clean(value: unknown, field: string): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, LIMITS[field] ?? 200);
}

/**
 * Kvadratura i cena (migracija 013) su brojevi, a iz formulara stižu kao
 * tekst iz polja. Prazno polje znači "nije poznato", a ne nula: tura tada
 * prolazi kroz klizače na /ture bez ograničenja.
 */
function cleanNumber(value: unknown, max: number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) return null;
  return Math.round(parsed * 100) / 100;
}

const MAX_AREA_SQM = 10_000;
const MAX_PRICE_EUR = 100_000_000;

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const BASE_COLUMNS =
    'slug, title, title_i18n, agency_name, address, city, category, property_type, agent_name, agent_phone, agent_email, created_at, published, status';
  // `district` i `structure` postoje tek posle migracije 012, `area_sqm` i
  // `price` posle 013, `floor`/`has_elevator`/`has_basement`/`heating`
  // posle 014, `build_status`/`finish_status` posle 015. Nabrajanje kolone
  // koje nema obara ceo upit, pa bi ceo spisak tura ostao prazan - zato se
  // na tu grešku čita bez njih.
  const readTours = (columns: string) =>
    ctx.supabase
      .from('tours')
      .select(columns as '*')
      .order('created_at', { ascending: false });

  const [toursResult, { data: rooms }] = await Promise.all([
    readTours(
      `${BASE_COLUMNS}, district, structure, area_sqm, price, floor, has_elevator, has_basement, heating, build_status, finish_status`
    ),
    ctx.supabase.from('rooms').select('tour_slug, panorama_url, panorama_url_cf')
  ]);
  let { data: tours, error } = toursResult;

  if (
    error &&
    /\b(district|structure|area_sqm|price|floor|has_elevator|has_basement|heating|build_status|finish_status)\b/i.test(
      error.message
    )
  ) {
    console.warn('[api/admin/tours] nedostaju migracije 012-015 - čitanje bez tih polja.');
    ({ data: tours, error } = await readTours(BASE_COLUMNS));
  }

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

  const address = clean(body.address, 'address') || null;
  const city = clean(body.city, 'city') || null;
  // "Best effort": pogrešna adresa ili pad Nominatim-a ne sme da obori
  // kreiranje ture - tura samo ostaje bez pina na mapi.
  const coords = await geocodeAddress(address, city);

  const { error } = await ctx.supabase.from('tours').insert({
    slug,
    title,
    // Nova tura nema nijednu sobu, pa kreće kao nacrt - objavljuje se tek kad
    // se otpreme panorame. Do tada je link mrtav za sve osim za admina.
    published: false,
    // Tura čita title_i18n pre title-a, pa se naslov upisuje na oba mesta.
    title_i18n: { sr: title },
    agency_name: clean(body.agency_name, 'agency_name') || null,
    address,
    city,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    district: clean(body.district, 'district') || null,
    structure: clean(body.structure, 'structure') || null,
    area_sqm: cleanNumber(body.area_sqm, MAX_AREA_SQM),
    price: cleanNumber(body.price, MAX_PRICE_EUR),
    floor: clean(body.floor, 'floor') || null,
    has_elevator: clean(body.has_elevator, 'has_elevator') || null,
    has_basement: clean(body.has_basement, 'has_basement') || null,
    heating: clean(body.heating, 'heating') || null,
    build_status: clean(body.build_status, 'build_status') || null,
    finish_status: clean(body.finish_status, 'finish_status') || null,
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

    refreshPublicPages();
    return NextResponse.json({ success: true, published: body.published });
  }

  // Stanje nekretnine (aktivna/izdato/prodato/pauza, migracija 010) se
  // menja samo, bez ostatka formulara - lista tura ga menja jednim klikom.
  // Nezavisno od `published`: posetilac i dalje ima link, ali vidi poruku
  // umesto ture (page.tsx) dok status nije 'active'.
  if (typeof body.status === 'string' && body.title === undefined) {
    if (!TOUR_STATUSES.has(body.status)) {
      return NextResponse.json({ success: false, error: 'Nepoznato stanje.' }, { status: 400 });
    }

    const { error: statusErr } = await ctx.supabase
      .from('tours')
      .update({ status: body.status } as never)
      .eq('slug', slug);

    if (statusErr) {
      console.error('[api/admin/tours] status update failed:', statusErr.message);
      return NextResponse.json({ success: false, error: 'Stanje nije promenjeno.' }, { status: 500 });
    }

    // Bez ovoga bi izdata nekretnina ostala na početnoj i na /ture do sat
    // vremena, iako sama tura odmah pokazuje poruku - poenta je baš da
    // nestane sa spiskova istog trena.
    refreshPublicPages();
    return NextResponse.json({ success: true, status: body.status });
  }

  // Putanja vodiča se čuva sama, bez ostatka formulara - TourAdminTools je
  // menja iz same ture, gde ostala polja (naziv, agencija...) nisu učitana.
  // Admin je već proverio putanju pre slanja (validateGuidePath), ovde se
  // samo još jednom potvrđuje da svaki broj odgovara postojećoj sobi - da
  // ručno sastavljen zahtev ne upiše besmislenu putanju.
  if (typeof body.guide_path === 'string' && body.title === undefined) {
    const path = body.guide_path
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => Number.isInteger(n) && n > 0);

    if (body.guide_path.trim() !== '' && path.length < 2) {
      return NextResponse.json({ success: false, error: 'Putanja mora imati bar dva broja.' }, { status: 400 });
    }

    if (path.length > 0) {
      const { data: rooms } = await ctx.supabase
        .from('rooms')
        .select('order_index')
        .eq('tour_slug', slug);
      const known = new Set((rooms ?? []).map((r) => r.order_index));
      const unknown = path.find((n: number) => !known.has(n));
      if (unknown !== undefined) {
        return NextResponse.json(
          { success: false, error: `Soba pod brojem ${unknown} ne postoji.` },
          { status: 400 }
        );
      }
    }

    const { error: guideErr } = await ctx.supabase
      .from('tours')
      .update({ guide_path: path.length > 0 ? path.join(',') : null } as never)
      .eq('slug', slug);

    if (guideErr) {
      console.error('[api/admin/tours] guide_path update failed:', guideErr.message);
      return NextResponse.json({ success: false, error: 'Putanja nije sačuvana.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const title = clean(body.title, 'title');
  if (!title) {
    return NextResponse.json({ success: false, error: 'Naslov je obavezan.' }, { status: 400 });
  }

  // Slug se namerno ne menja pri izmeni: postojeći podeljeni linkovi i
  // zabeležena analitika vezani su za njega.
  const { data: current } = await ctx.supabase
    .from('tours')
    .select('title_i18n, address, city, lat, lng')
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

  const address = clean(body.address, 'address') || null;
  const city = clean(body.city, 'city') || null;
  // Ponovo geokodira SAMO ako se adresa/grad stvarno promenio - ne troši
  // Nominatim upit na svaku izmenu (cena, sprat...) koja lokaciju ne dira.
  const addressChanged = address !== (current?.address ?? null) || city !== (current?.city ?? null);
  const coords = addressChanged
    ? await geocodeAddress(address, city)
    : { lat: current?.lat ?? null, lng: current?.lng ?? null };

  const { error } = await ctx.supabase
    .from('tours')
    .update({
      title,
      title_i18n: titleI18n,
      agency_name: clean(body.agency_name, 'agency_name') || null,
      address,
      city,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      district: clean(body.district, 'district') || null,
      structure: clean(body.structure, 'structure') || null,
      area_sqm: cleanNumber(body.area_sqm, MAX_AREA_SQM),
      price: cleanNumber(body.price, MAX_PRICE_EUR),
      floor: clean(body.floor, 'floor') || null,
      has_elevator: clean(body.has_elevator, 'has_elevator') || null,
      has_basement: clean(body.has_basement, 'has_basement') || null,
      heating: clean(body.heating, 'heating') || null,
      build_status: clean(body.build_status, 'build_status') || null,
      finish_status: clean(body.finish_status, 'finish_status') || null,
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

  refreshPublicPages();
  return NextResponse.json({ success: true });
}

// R2 key iz snimljenog CDN URL-a (bazu + ?v=... skida, ostaje isti "put"
// kojim je fajl upisan - vidi upload-panorama/finish/route.ts).
function r2KeyFromUrl(url: string | null | undefined, cdnBase: string): string | null {
  if (!url) return null;
  const base = cdnBase.replace(/\/+$/, '') + '/';
  if (!url.startsWith(base)) return null;
  return url.slice(base.length).split('?')[0];
}

/**
 * ============================================================
 * DELETE /api/admin/tours
 * ============================================================
 * Trajno briše turu: sve sobe, panorame/sličice na R2 i statistiku poseta.
 * Bez povratka - admin panel traži da se upiše tačan slug pre poziva ove
 * rute (vidi deleteTour u app/admin/ture/page.tsx), ovde se samo još
 * jednom proveri da slug postoji.
 *
 * Body (JSON): { slug: string }
 */
export async function DELETE(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Nedostaje slug.' }, { status: 400 });
  }

  const { data: tour, error: tourErr } = await ctx.supabase
    .from('tours')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (tourErr || !tour) {
    return NextResponse.json({ success: false, error: `Tura "${slug}" nije pronađena.` }, { status: 404 });
  }

  const { data: rooms } = await ctx.supabase
    .from('rooms')
    .select('panorama_url_cf, preview_url')
    .eq('tour_slug', slug);

  // Brisanje fajlova na R2 je "best effort": ako pukne, tura se ipak briše
  // iz baze - osiročeli fajl na R2 je manje loše od ture koja ne može da se
  // obriše zato što je neka slika zaglavljena.
  const bucket = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (bucket && cdnUrl) {
    try {
      const keys = new Set<string>();
      for (const r of (rooms ?? []) as { panorama_url_cf?: string; preview_url?: string }[]) {
        const a = r2KeyFromUrl(r.panorama_url_cf, cdnUrl);
        const b = r2KeyFromUrl(r.preview_url, cdnUrl);
        if (a) keys.add(a);
        if (b) keys.add(b);
      }

      // Dopuna preko liste "foldera" ture (vidi upload-panorama/finish) -
      // hvata i ono što URL parsiranje gore promaši.
      const listed = await r2Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${slug}/` }));
      for (const obj of listed.Contents ?? []) {
        if (obj.Key) keys.add(obj.Key);
      }

      if (keys.size > 0) {
        await r2Client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: Array.from(keys).map((Key) => ({ Key })) }
          })
        );
      }
    } catch (r2Error) {
      console.error('[api/admin/tours] R2 cleanup nije uspeo:', r2Error);
    }
  }

  const { error: eventsErr } = await ctx.supabase.from('tour_events').delete().eq('tour_slug', slug);
  if (eventsErr) console.error('[api/admin/tours] brisanje tour_events nije uspelo:', eventsErr.message);

  const { error: roomsErr } = await ctx.supabase.from('rooms').delete().eq('tour_slug', slug);
  if (roomsErr) {
    console.error('[api/admin/tours] brisanje soba nije uspelo:', roomsErr.message);
    return NextResponse.json({ success: false, error: 'Brisanje soba nije uspelo.' }, { status: 500 });
  }

  const { error: tourDeleteErr } = await ctx.supabase.from('tours').delete().eq('slug', slug);
  if (tourDeleteErr) {
    console.error('[api/admin/tours] brisanje ture nije uspelo:', tourDeleteErr.message);
    return NextResponse.json({ success: false, error: 'Brisanje ture nije uspelo.' }, { status: 500 });
  }

  refreshPublicPages();
  return NextResponse.json({ success: true });
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
