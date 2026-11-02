import type { SupabaseClient } from '@supabase/supabase-js';
import { looksLikeEmail, sendEmail } from './email';
import { unitAvailableEmail, type AvailableUnit } from './emails/unitAvailable';
import { floorLabel, type ProjectLang } from './projectI18n';
import { CONTACT, SITE_URL } from './site';
import { escapeHtml, sendTelegramMessage } from './telegram';
import type { UnitStatus } from './projects';
import { sameStructure } from './unitWatchShared';
import { checkLinkSignature, signLink } from './signedLink.ts';

/**
 * "Obavesti me" (migracija 045, maketa public/mockup/ObavestiMe.html).
 *
 * Kupac na kartici rezervisanog ili prodatog stana ostavi mejl; kad stan
 * (ili, ako je štiklirao, sličan stan iste strukture) pređe u "slobodan",
 * mejl mu ode sam - sa prodajne table (uz potvrdu prodavca) ili iz admina.
 *
 * Pravila: jedan mejl po pozivu za jednog kupca (najviše MAX_UNITS stanova u
 * njemu), o istom stanu nikad dvaput; za "sličan" stan najviše jedan mejl
 * dnevno; prijava ističe posle 90 dana; odjava jednim klikom.
 */

const MAX_UNITS = 3;
const SIMILAR_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const message = (watchId: string) => `unit-watch:${watchId}`;
const sign = (watchId: string) => signLink(message(watchId));

/** Link za odjavu iz mejla (strana traži klik, da je skeneri mejla ne okinu sami). */
export function unsubscribeUrl(watchId: string): string {
  return `${SITE_URL}/obavestenja/odjava?w=${watchId}&s=${sign(watchId)}`;
}

/** Ista odjava bez strane - "one-click" iz Gmail-a/Outlook-a (RFC 8058, POST). */
export function oneClickUnsubscribeUrl(watchId: string): string {
  return `${SITE_URL}/api/novogradnja/odjava?w=${watchId}&s=${sign(watchId)}`;
}

export function verifyUnsubscribe(watchId: string, signature: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(watchId)) return false;
  return checkLinkSignature(message(watchId), signature);
}

export type WatchRow = {
  id: string;
  unit_code: string;
  structure: string | null;
  or_similar: boolean;
  email: string;
  phone: string | null;
  created_at: string;
};

/** Aktivne prijave projekta (nisu odjavljene, nisu istekle), najstarije prve. */
export async function activeWatches(db: SupabaseClient, projectId: string): Promise<(WatchRow & { lang: string; notified_codes: string[]; last_mail_at: string | null })[]> {
  const { data, error } = await db
    .from('project_unit_watches')
    .select('id, unit_code, structure, or_similar, email, phone, lang, notified_codes, last_mail_at, created_at')
    .eq('project_id', projectId)
    .is('unsubscribed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw new Error(`project_unit_watches: ${error.message}`);
  return data ?? [];
}

export type SubscribeInput = {
  unitId: string;
  email: string;
  phone: string | null;
  orSimilar: boolean;
  lang: ProjectLang;
  embedded: boolean;
};

/** Upis kupca. Ponovni upis istog mejla za isti stan samo produži prijavu. */
export async function subscribe(db: SupabaseClient, input: SubscribeInput): Promise<{ ok: true; code: string } | { ok: false; error: string; status: number }> {
  const { data: unit } = await db.from('project_units').select('id, code, structure, status, project_id').eq('id', input.unitId).maybeSingle();
  if (!unit) return { ok: false, error: 'Stan nije pronađen.', status: 404 };
  const { data: project } = await db.from('projects').select('id, title, published').eq('id', unit.project_id).eq('published', true).maybeSingle();
  if (!project) return { ok: false, error: 'Stan nije pronađen.', status: 404 };
  if ((unit.status as UnitStatus) === 'available') return { ok: false, error: 'Stan je slobodan - pošaljite upit.', status: 409 };
  // Prodat stan se ne vraća; prijava ima smisla samo za sličan (ista struktura).
  if (unit.status === 'sold' && !unit.structure) return { ok: false, error: 'Za ovaj stan prijava nije moguća.', status: 409 };
  const orSimilar = unit.status === 'sold' ? true : input.orSimilar && Boolean(unit.structure);

  const email = input.email.trim().toLowerCase();
  const { data: existing } = await db
    .from('project_unit_watches')
    .select('id')
    .eq('project_id', unit.project_id)
    .eq('unit_code', unit.code)
    .ilike('email', email)
    .maybeSingle();
  const row = {
    project_id: unit.project_id,
    unit_id: unit.id,
    unit_code: unit.code,
    structure: unit.structure,
    or_similar: orSimilar,
    email,
    phone: input.phone,
    lang: input.lang,
    embedded: input.embedded,
    unsubscribed_at: null,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  };
  const { error } = existing
    ? await db.from('project_unit_watches').update(row).eq('id', existing.id)
    : await db.from('project_unit_watches').insert(row);
  if (error) {
    console.error('[unitWatch] upis nije uspeo:', error.message);
    return { ok: false, error: 'Prijava nije sačuvana. Pokušajte ponovo.', status: 500 };
  }

  // Prodaja prijavu vidi i među upitima (kao do sada), a vlasnik na Telegramu.
  const status = unit.status === 'sold' ? 'prodat' : 'rezervisan';
  const kind = unit.structure?.toLowerCase();
  const message =
    unit.status === 'sold'
      ? `Javite mi kad se pojavi sličan stan (${kind}).`
      : row.or_similar
        ? `Javite mi ako se stan ${unit.code} oslobodi ili se pojavi sličan (${kind}).`
        : `Javite mi ako se stan ${unit.code} oslobodi.`;
  const { error: inqError } = await db.from('project_inquiries').insert({
    project_id: unit.project_id,
    unit_id: unit.id,
    unit_code: unit.code,
    name: 'Obavesti me',
    contact: [email, input.phone].filter(Boolean).join(' · '),
    message,
    embedded: input.embedded,
    lang: input.lang
  });
  if (inqError) console.error('[unitWatch] upit nije upisan:', inqError.message);
  await sendTelegramMessage(
    [
      `🔔 <b>Obavesti me — ${escapeHtml(project.title)}</b>`,
      `Stan <b>${escapeHtml(unit.code)}</b> (${status})${row.or_similar ? ' + sličan' : ''}`,
      `✉️ ${escapeHtml(email)}${input.phone ? ` · 📞 ${escapeHtml(input.phone)}` : ''}`
    ].join('\n')
  ).catch(() => false);
  return { ok: true, code: unit.code };
}

export async function unsubscribe(db: SupabaseClient, watchId: string): Promise<boolean> {
  const { error } = await db.from('project_unit_watches').update({ unsubscribed_at: new Date().toISOString() }).eq('id', watchId);
  return !error;
}

/**
 * Stanovi koji su upravo prešli u "slobodan" → mejl kupcima koji čekaju.
 * Poziva se posle upisa izmene (after()), pa greška ovde ne obara izmenu.
 * Vraća broj poslatih mejlova.
 */
export async function notifyWatchers(db: SupabaseClient, projectId: string, freedUnitIds: string[]): Promise<number> {
  if (!freedUnitIds.length) return 0;
  const { data: project } = await db
    .from('projects')
    .select('id, slug, title, developer_name, contact_email, contact_phone, published')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.published) return 0;

  const [{ data: units }, { data: floors }, watches] = await Promise.all([
    db.from('project_units').select('id, code, structure, area_sqm, price, status, floor_id').in('id', freedUnitIds),
    db.from('project_floors').select('id, level, label').eq('project_id', projectId),
    activeWatches(db, projectId)
  ]);
  const freed = (units ?? []).filter((u) => u.status === 'available');
  if (!freed.length || !watches.length) return 0;
  const floorOf = new Map((floors ?? []).map((f) => [f.id as string, f]));

  const now = Date.now();
  let sent = 0;
  const lines: string[] = [];
  for (const w of watches) {
    if (!looksLikeEmail(w.email)) continue;
    const recent = w.last_mail_at ? now - new Date(w.last_mail_at).getTime() < SIMILAR_COOLDOWN_MS : false;
    const matches = freed
      .filter((u) => !w.notified_codes.includes(u.code))
      .filter((u) => u.code === w.unit_code || (w.or_similar && !recent && sameStructure(w.structure, u.structure)))
      // Baš njegov stan prvi.
      .sort((a, b) => Number(b.code === w.unit_code) - Number(a.code === w.unit_code))
      .slice(0, MAX_UNITS);
    if (!matches.length) continue;

    const lang: ProjectLang = w.lang === 'en' ? 'en' : 'sr';
    const base = `${SITE_URL}${lang === 'en' ? '/en' : ''}/novogradnja/${project.slug}`;
    const list: AvailableUnit[] = matches.map((u) => {
      const f = floorOf.get(u.floor_id as string);
      return {
        code: u.code,
        structure: u.structure,
        areaSqm: u.area_sqm != null ? Number(u.area_sqm) : null,
        price: u.price != null ? Number(u.price) : null,
        floor: f ? floorLabel(Number(f.level ?? 0), f.label, lang) : null,
        url: `${base}/stan/${encodeURIComponent(u.code)}?utm_source=obavesti-me`,
        own: u.code === w.unit_code
      };
    });
    const email = unitAvailableEmail({
      lang,
      projectTitle: project.title,
      developer: project.developer_name,
      watchedCode: w.unit_code,
      since: w.created_at,
      units: list,
      salesPhone: project.contact_phone,
      unsubscribeUrl: unsubscribeUrl(w.id),
      oneClickUrl: oneClickUnsubscribeUrl(w.id)
    });
    const result = await sendEmail({ to: w.email, ...email, replyTo: looksLikeEmail(project.contact_email) ? project.contact_email : CONTACT.email });
    if (!result.ok) {
      console.error('[unitWatch] mejl nije poslat:', w.id, result.reason);
      continue;
    }
    sent++;
    const codes = matches.map((u) => u.code);
    lines.push(`✉️ ${escapeHtml(w.email)} → ${escapeHtml(codes.join(', '))}`);
    await Promise.all([
      db
        .from('project_unit_watches')
        .update({ notified_codes: [...w.notified_codes, ...codes], last_mail_at: new Date().toISOString() })
        .eq('id', w.id),
      db.from('project_watch_mails').insert({ project_id: projectId, watch_id: w.id, unit_codes: codes })
    ]);
  }

  if (sent) {
    await sendTelegramMessage([`📨 <b>Obavesti me — ${escapeHtml(project.title)}</b>`, `Kupaca obavešteno da je stan slobodan: ${sent}`, ...lines].join('\n')).catch(
      () => false
    );
  }
  return sent;
}

/** Stanovi koji su ovom izmenom postali slobodni (iz rezervisanog ili prodatog). */
export function freedUnits(changes: { unitId: string; oldStatus: UnitStatus; newStatus: UnitStatus }[]): string[] {
  return changes.filter((c) => c.oldStatus !== 'available' && c.newStatus === 'available').map((c) => c.unitId);
}
