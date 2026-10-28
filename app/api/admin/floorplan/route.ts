import { NextResponse } from 'next/server';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/app/lib/adminAuth';
import { r2Client } from '@/app/lib/r2';
import { buildSchematicLayout, type SchematicRoomInput } from '@/app/lib/schematicFloorplan';
import { layoutMarkers, parseLayout, renderFloorplanSvg, type FloorplanLayout, type PlanLang } from '@/app/lib/floorplanLayout';
import { planLanguages } from '@/app/lib/roomNames';
import { refreshPublicPages } from '@/app/lib/revalidatePublic';

export const dynamic = 'force-dynamic';

/**
 * Šematski tlocrt ture (editor: /admin/plan/[slug]).
 *
 * GET  ?slug=  -> sobe ture + raspored: ranije sačuvan (JSON pored SVG-a na
 *                 R2), ili automatski nacrt (lib/schematicFloorplan.ts).
 * POST { slug, layout, replaceCustom? } -> crta SVG istom funkcijom kao
 *                 editor, čuva SVG i JSON na R2 (folder ture), upisuje
 *                 tours.floorplan_url i oznake soba (floorplan_x / _y).
 *
 * Pravi tlocrt (slika koju je poslala agencija) se ne zamenjuje bez
 * izričite potvrde (replaceCustom).
 */

const PLAN_NAME = 'floorplan-schematic';
// PNG plana od 1200px je ~60-150 KB; granica čuva rutu od ogromnog tela.
const MAX_PNG_BASE64 = 2_000_000;

/** title_i18n (objekat ili JSON string) -> naslovi po jezicima ture. */
function titlesOf(value: unknown): Partial<Record<PlanLang, string>> {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  const out: Partial<Record<PlanLang, string>> = {};
  if (parsed && typeof parsed === 'object') {
    for (const lang of ['sr', 'en', 'de', 'ru'] as const) {
      const v = (parsed as Record<string, unknown>)[lang];
      if (typeof v === 'string' && v.trim()) out[lang] = v.trim();
    }
  }
  return out;
}

/** "floorplan-schematic.svg" za srpski, "floorplan-schematic.en.svg" za ostale. */
const planKey = (slug: string, lang: PlanLang, ext: 'svg' | 'png') => `${slug}/${PLAN_NAME}${lang === 'sr' ? '' : '.' + lang}.${ext}`;

function pickSr(value: unknown, fallback: string | null): string {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value || fallback || '';
    }
  }
  if (parsed && typeof parsed === 'object') {
    const rec = parsed as Record<string, string>;
    return rec.sr || Object.values(rec)[0] || fallback || '';
  }
  return fallback || '';
}

type WaypointLike = { targetRoomId?: string | number | null; yaw?: number };

function parseWaypoints(value: unknown): WaypointLike[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? (parsed as WaypointLike[]) : [];
}

const isSchematic = (url: string | null | undefined) => Boolean(url && url.includes(`/${PLAN_NAME}.svg`));

async function readSavedLayout(slug: string): Promise<FloorplanLayout | null> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return null;
  try {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: `${slug}/${PLAN_NAME}.json` }));
    const text = await res.Body?.transformToString();
    return text ? parseLayout(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const slug = new URL(req.url).searchParams.get('slug') || '';
  const { data: tour } = await ctx.supabase
    .from('tours')
    .select('slug, title, title_i18n, floorplan_url, target_languages')
    .eq('slug', slug)
    .maybeSingle();
  if (!tour) return NextResponse.json({ success: false, error: 'Tura nije pronađena.' }, { status: 404 });

  const { data: roomRows } = await ctx.supabase
    .from('rooms')
    .select('id, title, title_i18n, waypoints_i18n, order_index')
    .eq('tour_slug', slug)
    .order('order_index', { ascending: true });

  const rooms: SchematicRoomInput[] = (roomRows ?? []).map((r) => ({
    id: String(r.id),
    title: pickSr(r.title_i18n, r.title) || 'Prostorija',
    doors: parseWaypoints(r.waypoints_i18n)
      .filter((w) => w.targetRoomId != null)
      .map((w) => ({ targetId: String(w.targetRoomId), yaw: typeof w.yaw === 'number' ? w.yaw : 0 }))
  }));

  const saved = isSchematic(tour.floorplan_url) ? await readSavedLayout(slug) : null;
  const draft = buildSchematicLayout(rooms);

  return NextResponse.json({
    success: true,
    tour: {
      slug: tour.slug,
      title: pickSr(tour.title_i18n, tour.title) || tour.slug,
      floorplanUrl: tour.floorplan_url,
      // Tura ima pravi tlocrt (sliku), ne šematski - čuvanje traži potvrdu.
      hasCustomPlan: Boolean(tour.floorplan_url) && !isSchematic(tour.floorplan_url),
      // Jezici na kojima se pravi tlocrt (pored srpskog).
      languages: planLanguages(tour.target_languages, (roomRows ?? []).map((r) => r.title_i18n))
    },
    rooms: rooms.map((r, i) => ({
      id: r.id,
      title: r.title,
      titles: { ...titlesOf(roomRows?.[i]?.title_i18n), sr: r.title },
      links: [...new Set(r.doors.map((d) => d.targetId))]
    })),
    layout: saved ?? draft,
    draft,
    fromSaved: Boolean(saved)
  });
}

export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const bucket = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!bucket || !cdnUrl) {
    return NextResponse.json({ success: false, error: 'R2 nije podešen na serveru.' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  const layout = parseLayout(body?.layout);
  if (!slug || !layout) {
    return NextResponse.json({ success: false, error: 'Raspored nije ispravan.' }, { status: 400 });
  }

  const { data: tour } = await ctx.supabase.from('tours').select('slug, floorplan_url').eq('slug', slug).maybeSingle();
  if (!tour) return NextResponse.json({ success: false, error: 'Tura nije pronađena.' }, { status: 404 });
  if (tour.floorplan_url && !isSchematic(tour.floorplan_url) && body?.replaceCustom !== true) {
    return NextResponse.json(
      { success: false, error: 'Tura već ima pravi tlocrt. Potvrdite zamenu.', needsConfirm: true },
      { status: 409 }
    );
  }

  // Samo sobe ove ture mogu dobiti oznaku.
  const { data: roomRows } = await ctx.supabase.from('rooms').select('id').eq('tour_slug', slug);
  const ownRooms = new Set((roomRows ?? []).map((r) => String(r.id)));
  layout.rooms = layout.rooms.filter((r) => ownRooms.has(r.roomId));

  // Po jedan tlocrt za svaki jezik (nazivi i napomena na tom jeziku); srpski
  // ostaje na staroj adresi. Uvek sva četiri: tura nudi jezik i po glasu, a
  // kopija jezika koji se ovde preskoči ostala bi stara uz nove oznake soba.
  const langs: PlanLang[] = ['sr', 'en', 'de', 'ru'];
  const { bounds } = renderFloorplanSvg(layout);
  const version = Date.now();
  // PNG-ovi istog plana, nacrtani u editoru (lib/floorplanImage.ts, mejl posetiocu).
  // Stari editor šalje samo `png` (srpski).
  const pngIn: Record<string, unknown> = body?.pngs && typeof body.pngs === 'object' ? body.pngs : { sr: body?.png };
  const pngOf = (lang: PlanLang) => {
    const v = pngIn[lang];
    return typeof v === 'string' && v && v.length <= MAX_PNG_BASE64 ? v : '';
  };

  try {
    await Promise.all([
      ...langs.flatMap((lang) => {
        const png = pngOf(lang);
        return [
          r2Client.send(
            new PutObjectCommand({ Bucket: bucket, Key: planKey(slug, lang, 'svg'), Body: renderFloorplanSvg(layout, lang).svg, ContentType: 'image/svg+xml' })
          ),
          ...(png
            ? [r2Client.send(new PutObjectCommand({ Bucket: bucket, Key: planKey(slug, lang, 'png'), Body: Buffer.from(png, 'base64'), ContentType: 'image/png' }))]
            : [])
        ];
      }),
      r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${slug}/${PLAN_NAME}.json`,
          Body: JSON.stringify(layout),
          ContentType: 'application/json'
        })
      )
    ]);
  } catch (err) {
    console.error('[api/admin/floorplan] R2 upload failed:', err);
    return NextResponse.json({ success: false, error: 'Plan nije sačuvan (R2).' }, { status: 500 });
  }

  // ?v= - da CDN i pregledač posle izmene ne vrate stari plan.
  const floorplanUrl = `${cdnUrl.replace(/\/+$/, '')}/${slug}/${PLAN_NAME}.svg?v=${version}`;
  const { error: tourErr } = await ctx.supabase.from('tours').update({ floorplan_url: floorplanUrl }).eq('slug', slug);
  if (tourErr) {
    console.error('[api/admin/floorplan] tour update failed:', tourErr.message);
    return NextResponse.json({ success: false, error: 'Plan je otpremljen, ali tura nije ažurirana.' }, { status: 500 });
  }

  // Oznake soba: sobe bez prostorije na planu gube oznaku.
  const markers = layoutMarkers(layout, bounds);
  const marked = new Set(markers.map((m) => m.roomId));
  const updates = [
    ...markers.map((m) =>
      ctx.supabase.from('rooms').update({ floorplan_x: m.xPct, floorplan_y: m.yPct }).eq('id', m.roomId)
    ),
    ...[...ownRooms]
      .filter((id) => !marked.has(id))
      .map((id) => ctx.supabase.from('rooms').update({ floorplan_x: null, floorplan_y: null }).eq('id', id))
  ];
  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error);
  if (failed.length) console.error('[api/admin/floorplan] marker updates failed:', failed.map((f) => f.error?.message));

  refreshPublicPages();
  return NextResponse.json({ success: true, floorplanUrl, markersFailed: failed.length });
}
