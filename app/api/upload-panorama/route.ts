import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '@/app/lib/r2';
import { generatePanoramaPreview, convertPanoramaToWebp } from '@/app/lib/panoramaPreview';
import { requireAdmin } from '@/app/lib/adminAuth';

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
    // Bez ovoga bi svako ko zna adresu mogao da otprema fajlove u bucket i
    // zameni panoramu postojeće sobe.
    const ctx = await requireAdmin(req);
    if (!ctx.ok) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
    }

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

    // Panorama se čuva kao WebP: isti kadar u punoj rezoluciji, ali oko 90%
    // manji od JPEG-a. Ako konverzija pukne, ide original - bolje teška
    // panorama nego nikakva.
    let body: Buffer = buffer;
    let contentType = file.type;
    let key = `${roomId}-panorama.${ext}`;
    try {
      body = await convertPanoramaToWebp(buffer);
      contentType = 'image/webp';
      key = `${roomId}-panorama.webp`;
    } catch (convertError) {
      console.error('UPLOAD PANORAMA: WebP konverzija nije uspela:', convertError);
    }

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    const base = cdnUrl.replace(/\/+$/, '');

    // Ime fajla je izvedeno iz id-a sobe, pa zamena panorame piše preko iste
    // putanje. Bez oznake verzije URL ostaje identičan: React ne primeti
    // promenu i ne učita scenu ponovo, a i CDN i pretraživač i dalje drže
    // staru sliku. Vreme otpremanja u query-ju rešava oboje.
    const version = Date.now();
    const r2Url = `${base}/${key}?v=${version}`;

    // Izvedene slike: mali isečak za share karticu i lakša panorama za
    // telefone. Ako neka pukne, original je već gore i soba radi - to su
    // dodaci koji ne smeju da obore upload.
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
      previewUrl = `${base}/${previewKey}?v=${version}`;
    } catch (previewError) {
      console.error('UPLOAD PANORAMA: preview nije generisan:', previewError);
    }

    const updates: Record<string, string> = { panorama_url_cf: r2Url };
    if (previewUrl) updates.preview_url = previewUrl;

    const { error: updateError } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId);

    if (updateError) {
      throw new Error(`Supabase upis greška: ${updateError.message}`);
    }

    // Nova sličica može biti naslovna slika ture na početnoj strani (obe
    // jezičke verzije).
    revalidatePath('/');
    revalidatePath('/en');

    return NextResponse.json({
      success: true,
      roomId,
      r2Url,
      previewUrl,
      bytes: body.length,
      originalBytes: buffer.length,
    });
  } catch (error: any) {
    console.error('UPLOAD PANORAMA ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Greška tokom upload-a panorame.' },
      { status: 500 }
    );
  }
}
