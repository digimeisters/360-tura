import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/app/lib/r2';
import { generatePanoramaPreview } from '@/app/lib/panoramaPreview';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40MB - panorame su velike equirectangular slike

/**
 * ============================================================
 * POST /api/upload-panorama
 * ============================================================
 * Prima fajl panorame direktno sa admin računara (multipart/form-data),
 * šalje ga na Cloudflare R2 i upisuje novi CDN URL u rooms.panorama_url_cf.
 *
 * Za razliku od /api/upload-to-r2 (koji migrira sliku sa POSTOJEĆEG URL-a,
 * npr. iz starog Supabase Storage-a), ova ruta prima sirov fajl sa diska -
 * to je put kojim admin panel dodaje/menja panoramu za sobu.
 *
 * Body (FormData): roomId (string), file (File)
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

    const formData = await req.formData();
    const roomId = formData.get('roomId');
    const file = formData.get('file');

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ success: false, error: 'Nedostaje roomId.' }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Nedostaje fajl (file).' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { success: false, error: `Nepodržan tip fajla: ${file.type || 'nepoznat'}. Dozvoljeno: JPG, PNG, WEBP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Fajl je prevelik (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimum je 40MB.` },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json(
        { success: false, error: `Soba ${roomId} nije pronađena u bazi.` },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${roomId}-panorama.${ext}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const base = cdnUrl.replace(/\/+$/, '');
    const r2Url = `${base}/${key}`;

    // Mali isečak za share/OG karticu. Ako generisanje pukne, panorama je
    // već gore i soba radi - preview je dodatak, ne sme da obori upload.
    let previewUrl: string | null = null;
    try {
      const preview = await generatePanoramaPreview(buffer);
      const previewKey = `${roomId}-preview.jpg`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: previewKey,
          Body: preview,
          ContentType: 'image/jpeg',
        })
      );
      previewUrl = `${base}/${previewKey}`;
    } catch (previewError) {
      console.error('UPLOAD PANORAMA: preview nije generisan:', previewError);
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update(previewUrl ? { panorama_url_cf: r2Url, preview_url: previewUrl } : { panorama_url_cf: r2Url })
      .eq('id', roomId);

    if (updateError) {
      throw new Error(`Supabase upis greška: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      roomId,
      r2Url,
      previewUrl,
      bytes: buffer.length,
    });
  } catch (error: any) {
    console.error('UPLOAD PANORAMA ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom upload-a panorame.' },
      { status: 500 }
    );
  }
}
