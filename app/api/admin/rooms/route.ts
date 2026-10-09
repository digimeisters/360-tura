import { NextResponse } from 'next/server';
import { mobilePanoramaKey } from '@/app/lib/panoramaPreview';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/app/lib/adminAuth';
import { r2Client } from '@/app/lib/r2';
import { refreshPublicPages } from '@/app/lib/revalidatePublic';
import type { Json } from '@/types/supabase';

type Waypoint = { targetRoomId?: string | number | null; [key: string]: unknown };

export const dynamic = 'force-dynamic';

function r2KeyFromUrl(url: string | null | undefined, cdnBase: string): string | null {
  if (!url) return null;
  const base = cdnBase.replace(/\/+$/, '') + '/';
  if (!url.startsWith(base)) return null;
  return url.slice(base.length).split('?')[0];
}

/**
 * ============================================================
 * DELETE /api/admin/rooms
 * ============================================================
 * Trajno briše sobu - ne samo red u tabeli, nego i sve što na nju upire:
 *   1) panoramu/sličicu na R2 (best effort);
 *   2) navigacione tačke u DRUGIM sobama koje vode baš u ovu (inače bi
 *      posetilac kliknuo na vrata koja nikud ne vode);
 *   3) redni broj ove sobe iz putanje automatskog vodiča (tours.guide_path),
 *      ako je tu - inače bi vodič pokušao da "uđe" u obrisanu sobu.
 * Klijent (TourAdminTools) posle poziva radi ISTO filtriranje nad svojim
 * lokalnim stanjem, da ne mora da čeka novi odgovor sa sadržajem - ovde se
 * samo upisuje ono što se tamo već izračuna.
 *
 * Body (JSON): { roomId: string }
 */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireAdmin(req);
    if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

    const body = await req.json().catch(() => ({}));
    const roomId = typeof body.roomId === 'string' ? body.roomId : '';
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId.' }, { status: 400 });
    }

    const { data: room, error: roomErr } = await ctx.supabase
      .from('rooms')
      .select('id, tour_slug, order_index, panorama_url_cf, preview_url')
      .eq('id', roomId)
      .maybeSingle();

    if (roomErr || !room || !room.tour_slug) {
      return NextResponse.json({ success: false, error: `Soba ${roomId} nije pronađena.` }, { status: 404 });
    }
    const tourSlug = room.tour_slug;
    const orderIndex = room.order_index;

    // 1) R2 - best effort, greška ovde ne sme da spreči brisanje sobe.
    const bucket = process.env.R2_BUCKET_NAME;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
    if (bucket && cdnUrl) {
      const panoramaKey = r2KeyFromUrl(room.panorama_url_cf, cdnUrl);
      const keys = [
        panoramaKey,
        // Kopija za telefone (migracija 018) - ime je izvedeno iz glavne.
        panoramaKey ? mobilePanoramaKey(panoramaKey) : null,
        r2KeyFromUrl(room.preview_url, cdnUrl)
      ].filter((k): k is string => Boolean(k));
      if (keys.length > 0) {
        try {
          await r2Client.send(
            new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } })
          );
        } catch (r2Error) {
          console.error('DELETE ROOM: R2 brisanje nije uspelo:', r2Error);
        }
      }
    }

    // 2) Navigacione tačke u drugim sobama ove ture koje vode baš u ovu.
    const { data: siblings } = await ctx.supabase
      .from('rooms')
      .select('id, waypoints_i18n')
      .eq('tour_slug', tourSlug)
      .neq('id', roomId);

    for (const sibling of siblings ?? []) {
      let waypoints: unknown;
      try {
        waypoints =
          typeof sibling.waypoints_i18n === 'string' ? JSON.parse(sibling.waypoints_i18n) : sibling.waypoints_i18n;
      } catch {
        waypoints = null;
      }
      if (!Array.isArray(waypoints)) continue;

      const list = waypoints as Waypoint[];
      const filtered = list.filter((wp) => String(wp?.targetRoomId ?? '') !== String(roomId));
      if (filtered.length !== list.length) {
        await ctx.supabase.from('rooms').update({ waypoints_i18n: filtered as unknown as Json }).eq('id', sibling.id);
      }
    }

    // 3) Redni broj ove sobe iz putanje vodiča.
    if (orderIndex !== null) {
      const { data: tour } = await ctx.supabase.from('tours').select('guide_path').eq('slug', tourSlug).maybeSingle();
      const rawPath = tour?.guide_path;
      if (rawPath) {
        const steps = rawPath
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0);
        const filteredSteps = steps.filter((n) => n !== orderIndex);
        if (filteredSteps.length !== steps.length) {
          await ctx.supabase
            .from('tours')
            .update({ guide_path: filteredSteps.length > 0 ? filteredSteps.join(',') : null })
            .eq('slug', tourSlug);
        }
      }
    }

    // 4) Sama soba.
    const { error: deleteErr } = await ctx.supabase.from('rooms').delete().eq('id', roomId);
    if (deleteErr) {
      return NextResponse.json({ success: false, error: `Brisanje sobe nije uspelo: ${deleteErr.message}` }, { status: 500 });
    }

    refreshPublicPages();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE ROOM ERROR:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Greška tokom brisanja sobe.' },
      { status: 500 }
    );
  }
}
