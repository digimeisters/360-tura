import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { slugify } from '@/app/lib/slug';
import { projectPreviewToken } from '@/app/lib/projectPreview';
import { loadProjectStats } from '@/app/lib/projectStats';
import { translateTexts } from '@/app/lib/translateTexts';
import { parseVideo } from '@/app/lib/videoEmbed';
import { geocodeAddress } from '@/app/lib/geocode';
import { fetchNearby } from '@/app/lib/nearby';
import { loadNotes } from '@/app/lib/salesAccess';
import { fail, text, num, PROJECT_FIELDS, VIDEO_ERROR, refresh, uniqueSlug, projectSlug, type Action } from './shared';

/** Projekat: podaci, brisanje, link za pregled, okolina, prevod, izveštaj. */
export const projectActions: Record<string, Action> = {
  'create': async (db, body) => {
    const title = text(body.title, 120);
    if (!title) return fail('Upišite naziv projekta.');
    const slug = await uniqueSlug(db, slugify(title));
    const { data, error } = await db.from('projects').insert({ title, slug }).select('id, slug').single();
    if (error) return fail(error.message, 500);
    return NextResponse.json({ success: true, id: data.id, slug: data.slug });
  },

  'update': async (db, body) => {
    const id = text(body.id, 40);
    if (!id) return fail('Nedostaje id projekta.');
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = (body.fields ?? {}) as Record<string, unknown>;
    for (const [key, max] of Object.entries(PROJECT_FIELDS)) {
      if (key in fields) patch[key] = text(fields[key], max);
    }
    if ('title' in fields && !patch.title) return fail('Naziv projekta ne sme biti prazan.');
    if ('published' in fields) patch.published = Boolean(fields.published);
    if ('notify_sales' in fields) patch.notify_sales = Boolean(fields.notify_sales);
    // Prezentacija (migracija 026).
    if ('show_all_tabs' in fields) patch.show_all_tabs = Boolean(fields.show_all_tabs);
    if ('demo_tour_id' in fields) patch.demo_tour_id = text(fields.demo_tour_id, 40);
    // Cenovnik u statistici cena novogradnje (migracija 033).
    if ('include_in_price_stats' in fields) patch.include_in_price_stats = Boolean(fields.include_in_price_stats);
    // Logo investitora (migracija 034): samo naš CDN, ili null za uklanjanje.
    if ('logo_url' in fields) {
      const logo = text(fields.logo_url, 500);
      const cdn = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/+$/, '');
      if (logo && (!cdn || !logo.startsWith(`${cdn}/projekti/${id}/logo-`))) return fail('Logo mora biti otpremljen kroz admin.');
      patch.logo_url = logo;
    }
    if ('logo_dark' in fields) patch.logo_dark = Boolean(fields.logo_dark);
    // 3D render (samo naš CDN) i video link projekta (migracija 040).
    if ('render_url' in fields) {
      const render = text(fields.render_url, 500);
      const cdn = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/+$/, '');
      if (render && (!cdn || !render.startsWith(`${cdn}/projekti/${id}/render-`))) return fail('Render mora biti otpremljen kroz admin.');
      patch.render_url = render;
    }
    if ('video_url' in fields) {
      const video = text(fields.video_url, 600);
      if (video && !parseVideo(video)) return fail(VIDEO_ERROR);
      patch.video_url = video;
    }

    // Ručno upisane koordinate (npr. prekopirane iz Google mapa) imaju prednost.
    let coords: { lat: number; lng: number } | null = null;
    if ('lat' in fields || 'lng' in fields) {
      const lat = num(fields.lat);
      const lng = num(fields.lng);
      if (lat === null && lng === null) {
        patch.lat = null;
        patch.lng = null;
      } else if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return fail('Koordinate nisu ispravne - upišite širinu i dužinu, npr. 44.0128, 20.9114.');
      } else {
        patch.lat = lat;
        patch.lng = lng;
        coords = { lat, lng };
      }
    } else if ('address' in fields || 'city' in fields) {
      // Nova adresa -> koordinate iz Nominatim-a (best effort, kao kod tura).
      const { data: prev } = await db.from('projects').select('address, city, lat').eq('id', id).maybeSingle();
      const p = prev as { address: string | null; city: string | null; lat: number | null } | null;
      const changed = !p || p.address !== patch.address || p.city !== patch.city || p.lat === null;
      if (changed && (patch.address || p?.address)) {
        const found = await geocodeAddress((patch.address as string | null) ?? p?.address, (patch.city as string | null) ?? p?.city);
        if (found) {
          patch.lat = found.lat;
          patch.lng = found.lng;
          coords = found;
        }
      }
    }

    const { data, error } = await db
      .from('projects')
      .update(patch as Database['public']['Tables']['projects']['Update'])
      .eq('id', id)
      .select('slug')
      .single();
    if (error) return fail(error.message, 500);
    refresh(data.slug);
    return NextResponse.json({ success: true, coords });
  },

  'delete': async (db, body) => {
    const id = text(body.id, 40);
    if (!id) return fail('Nedostaje id projekta.');
    const slug = await projectSlug(db, id);
    // Spratovi i stanovi idu kaskadno (on delete cascade); ture ostaju.
    const { error } = await db.from('projects').delete().eq('id', id);
    if (error) return fail(error.message, 500);
    refresh(slug);
    return NextResponse.json({ success: true });
  },

  // Poseban link za pokazivanje (važi 30 dana, app/lib/projectPreview.ts).
  'preview-link': async (db, body) => {
    const id = text(body.id, 40);
    if (!id) return fail('Nedostaje id projekta.');
    const slug = await projectSlug(db, id);
    if (!slug) return fail('Projekat nije pronađen.', 404);
    return NextResponse.json({ success: true, url: `/novogradnja/${slug}/pregled?t=${projectPreviewToken(id)}` });
  },

  // Okolina na mapi (OpenStreetMap/Overpass, migracija 022). Bez
  // koordinata ih prvo traži iz adrese.
  'nearby-refresh': async (db, body) => {
    const id = text(body.id, 40);
    if (!id) return fail('Nedostaje id projekta.');
    const { data: proj } = await db.from('projects').select('slug, address, city, lat, lng').eq('id', id).maybeSingle();
    const p = proj as { slug: string; address: string | null; city: string | null; lat: number | null; lng: number | null } | null;
    if (!p) return fail('Projekat nije pronađen.', 404);
    let lat = p.lat;
    let lng = p.lng;
    if (lat === null || lng === null) {
      const found = await geocodeAddress(p.address, p.city);
      if (!found) return fail('Adresa nije pronađena na mapi. Upišite tačnu adresu ili koordinate, pa pokušajte ponovo.');
      lat = found.lat;
      lng = found.lng;
    }
    let places;
    try {
      places = await fetchNearby(lat, lng);
    } catch (err) {
      console.error('[api/admin/projects] nearby', err);
      return fail('OpenStreetMap trenutno ne odgovara. Pokušajte ponovo za minut.', 502);
    }
    const updatedAt = new Date().toISOString();
    const { error } = await db.from('projects').update({ lat, lng, nearby: places, nearby_updated_at: updatedAt }).eq('id', id);
    if (error) return fail(error.message, 500);
    refresh(p.slug);
    return NextResponse.json({ success: true, lat, lng, nearby: places, nearby_updated_at: updatedAt });
  },

  // Predlog engleskog opisa (Gemini) - ne čuva se sam; admin ga pregleda i klikne „Sačuvaj podatke".
  'translate-en': async (db, body) => {
    const description = text(body.description, 2000);
    if (!description) return fail('Prvo upišite srpski opis projekta.');
    try {
      const [en] = await translateTexts([description], 'en');
      return NextResponse.json({ success: true, description_en: en ?? '' });
    } catch (err) {
      console.error('[api/admin/projects] translate-en', err);
      return fail('Prevod trenutno nije uspeo. Pokušajte ponovo ili upišite engleski opis ručno.', 502);
    }
  },

  'insights': async (db, body) => {
    const projectId = text(body.projectId, 40);
    if (!projectId) return fail('Nedostaje projekat.');
    const [{ data: proj }, { data: unitRows }, { data: inquiries }] = await Promise.all([
      db.from('projects').select('slug').eq('id', projectId).maybeSingle(),
      db.from('project_units').select('code').eq('project_id', projectId),
      db
        .from('project_inquiries')
        .select('id, created_at, unit_code, name, contact, message, embedded, lang, handled_at, handled_by')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);
    if (!proj) return fail('Projekat nije pronađen.', 404);
    const stats = await loadProjectStats(
      db,
      projectId,
      (proj as { slug: string }).slug,
      ((unitRows ?? []) as { code: string }[]).map((u) => u.code)
    );
    const notes = await loadNotes(db, projectId);
    return NextResponse.json({
      success: true,
      stats,
      inquiries: ((inquiries ?? []) as { id: string }[]).map((q) => ({ ...q, note: notes.byInquiry.get(q.id) ?? null }))
    });
  }
};
