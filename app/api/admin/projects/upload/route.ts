import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/app/lib/r2';
import { requireAdmin } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * ============================================================
 * POST /api/admin/projects/upload
 * ============================================================
 * Potpisan R2 URL za sliku fasade ili osnove sprata. Pregledač šalje fajl
 * DIREKTNO na R2 (Vercel ne pušta telo veće od 4,5MB - vidi
 * upload-panorama), pa posle upisuje dobijeni javni URL kroz
 * /api/admin/projects (update / floor-save). Stari fajl se ne briše:
 * slike su male, a ovako izmena nikad ne ostavi projekat bez slike.
 *
 * Body: { projectId: string, kind: 'view' | 'plan' | 'unit', fileType: string, fileSize: number }
 */
export async function POST(req: Request) {
  const ctx = await requireAdmin(req);
  if (!ctx.ok) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  const bucket = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (!bucket || !cdnUrl) {
    return NextResponse.json({ success: false, error: 'Nedostaju R2_BUCKET_NAME ili NEXT_PUBLIC_CDN_URL.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  // view (fasada ili kompleks - migracija 025; stari naziv facade) / plan (sprata) / unit (osnova, 3D osnova i slike stana - migracija 024)
  const kind = ['view', 'facade', 'plan', 'unit'].includes(body.kind) ? (body.kind as string) : '';
  const fileType = typeof body.fileType === 'string' ? body.fileType : '';
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;

  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !kind) {
    return NextResponse.json({ success: false, error: 'Nedostaje projekat ili vrsta slike.' }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[fileType];
  if (!ext) {
    return NextResponse.json({ success: false, error: 'Dozvoljene su samo JPG, PNG i WEBP slike.' }, { status: 400 });
  }
  if (fileSize > MAX_FILE_BYTES) {
    return NextResponse.json({ success: false, error: 'Slika je veća od 25MB.' }, { status: 400 });
  }

  const { data: project } = await ctx.supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ success: false, error: 'Projekat nije pronađen.' }, { status: 404 });

  const key = `projekti/${projectId}/${kind}-${Date.now()}.${ext}`;
  const uploadUrl = await getSignedUrl(r2Client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType }), {
    expiresIn: 300
  });

  return NextResponse.json({
    success: true,
    uploadUrl,
    contentType: fileType,
    publicUrl: `${cdnUrl.replace(/\/+$/, '')}/${key}`
  });
}
