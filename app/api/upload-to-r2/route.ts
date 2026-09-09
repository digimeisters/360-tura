import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/app/lib/r2';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * POST /api/upload-to-r2
 * ============================================================
 * Preuzima panoramu sa postojećeg (Supabase) URL-a i šalje je na
 * Cloudflare R2, pa upisuje novi CDN URL u rooms.panorama_url_cf.
 *
 * Body: { roomId: string, currentPanoramaUrl: string, force?: boolean }
 *
 * Ako je panorama_url_cf već popunjen za tu sobu, upload se
 * preskače (osim ako je force: true) — sigurno je zvati više puta
 * (npr. iz migracionog skripta) bez duplog upload-a.
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Nedostaju Supabase environment varijable.' },
        { status: 500 }
      );
    }

    const bucket = process.env.R2_BUCKET_NAME;
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

    if (!bucket || !cdnUrl) {
      return NextResponse.json(
        { success: false, error: 'Nedostaju R2_BUCKET_NAME ili NEXT_PUBLIC_CDN_URL environment varijable.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const roomId = body.roomId ?? body.room_id;
    const currentPanoramaUrl = body.currentPanoramaUrl ?? body.panoramaUrl ?? body.panorama_url;
    const force = Boolean(body.force);

    if (!roomId || !currentPanoramaUrl) {
      return NextResponse.json(
        { success: false, error: 'Nedostaju roomId ili currentPanoramaUrl.' },
        { status: 400 }
      );
    }

    // Ako slika već postoji na R2, ne šaljemo ponovo (osim force)
    if (!force) {
      const { data: existingRoom, error: existingErr } = await supabase
        .from('rooms')
        .select('panorama_url_cf')
        .eq('id', roomId)
        .single();

      if (existingErr) {
        console.warn('[UPLOAD-TO-R2] Provera postojećeg panorama_url_cf nije uspela:', existingErr.message);
      }

      if (existingRoom?.panorama_url_cf) {
        return NextResponse.json({
          success: true,
          skipped: true,
          roomId,
          r2Url: existingRoom.panorama_url_cf,
        });
      }
    }

    // Preuzmi sliku sa postojećeg (Supabase) URL-a
    const imageRes = await fetch(currentPanoramaUrl);
    if (!imageRes.ok) {
      throw new Error(`HTTP greška ${imageRes.status} pri preuzimanju panorame sa ${currentPanoramaUrl}`);
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    const extFromType = contentType.includes('webp')
      ? 'webp'
      : contentType.includes('png')
      ? 'png'
      : 'jpg';
    const key = `${roomId}-panorama.${extFromType}`;

    // Pošalji na Cloudflare R2 (public bucket)
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const r2Url = `${cdnUrl.replace(/\/+$/, '')}/${key}`;

    // Upiši novi URL u Supabase
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ panorama_url_cf: r2Url })
      .eq('id', roomId);

    if (updateError) {
      throw new Error(`Supabase upis greška: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      roomId,
      r2Url,
      bytes: buffer.length,
    });
  } catch (error: any) {
    console.error('UPLOAD TO R2 ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom upload-a na R2.' },
      { status: 500 }
    );
  }
}
