import { NextResponse } from 'next/server';
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL, generateJsonWithRetry, TEMP_EXTRACT } from '@/app/lib/gemini';
import {
  buildFacadeFloorsPrompt,
  buildFacadeUnitsPrompt,
  facadeSpansToPolygons,
  facadeUnitsSchema,
  fetchFacadeWithFloors,
  fetchPlanWithUnits,
  type FacadeUnitSpan,
  buildPlanReadPrompt,
  facadeFloorsSchema,
  fetchFacadeImage,
  storeyBoxesToPolygons,
  type StoreyBox,
  buildRoomsFromPlanPrompt,
  fetchDocForAi,
  fetchPlanImage,
  planReadSchema,
  buildPlanUnitsPrompt,
  planUnitBoxesToPolygons,
  planUnitsSchema,
  PRICE_LIST_PROMPT,
  priceListSchema,
  priceRowToLine,
  roomsFromPlanSchema,
  type PriceRow
} from '@/app/lib/planAi';
import { cleanRooms, type Polygon, unitSuffix } from '@/app/lib/projects';
import { fail, text, num, type Action } from './shared';

/** AI čitanje osnova, fasada i cenovnika. Ništa se ne upisuje - admin pregleda predlog i čuva ga drugom radnjom. */
export const planAiActions: Record<string, Action> = {
  // AI čitanje osnove stana: iz slike sa merama u mm predlaže spisak
  // prostorija i kvadraturu (draft - admin ga proverava pre čuvanja).
  'rooms-from-plan': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const imageUrl = text(body.imageUrl, 600);
    if (!projectId || !imageUrl || !/^https:\/\//.test(imageUrl)) return fail('Nedostaje slika osnove.');
    const areaSqm = num(body.areaSqm);
    try {
      const image = await fetchPlanImage(imageUrl);
      // Flash čita mere tačno (test 3. 10. 2026: 8/8 prostorija); Lite uzima mere
      // susednih prostorija, pa je samo rezerva kad je Flash preopterećen (503).
      const { data, usedModel } = await generateJsonWithRetry<{ rooms: { name: string; dims?: string; m2: number }[] }>({
        contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: buildRoomsFromPlanPrompt(areaSqm) }],
        config: { responseMimeType: 'application/json', responseSchema: roomsFromPlanSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_FALLBACK_MODEL,
        fallbackModel: GEMINI_MODEL,
        timeoutMs: 24_000,
        attempts: 1,
        label: 'rooms-from-plan'
      });
      const rooms = cleanRooms(data.rooms);
      if (!rooms.length) return fail('AI nije prepoznao nijednu prostoriju na ovoj slici. Probajte jasniju sliku osnove ili unesite prostorije ručno.');
      // Pročitane mere, istim redom - admin ih poredi sa osnovom pre čuvanja.
      const dims = (data.rooms ?? []).slice(0, rooms.length).map((r) => (typeof r.dims === 'string' ? r.dims.slice(0, 40) : ''));
      return NextResponse.json({ success: true, rooms, dims, backup: usedModel !== GEMINI_FALLBACK_MODEL });
    } catch (err) {
      console.error('[api/admin/projects] rooms-from-plan', err);
      return fail('Čitanje osnove trenutno nije uspelo. Pokušajte ponovo ili unesite prostorije ručno.', 502);
    }
  },

  // Masovne osnove: jedna slika = oznaka stana + prostorije. Uparivanje
  // završava admin (matchPlanToUnit + ručni izbor), ništa se ne upisuje.
  'plan-read': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const imageUrl = text(body.imageUrl, 600);
    const fileName = text(body.fileName, 160) ?? '';
    const codes: string[] = Array.isArray(body.codes)
      ? body.codes.filter((c: unknown): c is string => typeof c === 'string').map((c: string) => c.slice(0, 20)).slice(0, 400)
      : [];
    if (!projectId || !imageUrl || !/^https:\/\//.test(imageUrl)) return fail('Nedostaje slika osnove.');
    try {
      const image = await fetchPlanImage(imageUrl);
      const { data, usedModel } = await generateJsonWithRetry<{ label?: string; matchedCode?: string; rooms: { name: string; dims?: string; m2: number }[] }>({
        contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: buildPlanReadPrompt(codes, fileName) }],
        config: { responseMimeType: 'application/json', responseSchema: planReadSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_FALLBACK_MODEL,
        fallbackModel: GEMINI_MODEL,
        timeoutMs: 24_000,
        attempts: 1,
        label: 'plan-read'
      });
      const rooms = cleanRooms(data.rooms);
      const dims = (data.rooms ?? []).slice(0, rooms.length).map((r) => (typeof r.dims === 'string' ? r.dims.slice(0, 40) : ''));
      const matched = typeof data.matchedCode === 'string' && codes.includes(data.matchedCode) ? data.matchedCode : '';
      return NextResponse.json({
        success: true,
        label: typeof data.label === 'string' ? data.label.slice(0, 60) : '',
        matchedCode: matched,
        rooms,
        dims,
        backup: usedModel !== GEMINI_FALLBACK_MODEL
      });
    } catch (err) {
      console.error('[api/admin/projects] plan-read', err);
      return fail('Čitanje osnove nije uspelo - probajte ponovo za ovu sliku.', 502);
    }
  },

  // Osnova sprata → predlog oblika stanova (okviri sa natpisom „STAN N"
  // koje arhitekta već iscrta na osnovi). Ništa se ne upisuje: admin vidi
  // predlog preko slike i čuva ga (unit-save, isto kao ručno crtanje).
  'plan-units': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const floorId = text(body.floorId, 40);
    if (!projectId || !floorId) return fail('Nedostaje sprat.');
    const { data: floorRow, error: flErr } = await db
      .from('project_floors')
      .select('id, level, plan_url')
      .eq('id', floorId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (flErr) return fail(flErr.message, 500);
    const f = floorRow as { id: string; level: number; plan_url: string | null } | null;
    if (!f || !f.plan_url) return fail('Ovaj sprat još nema osnovu (sliku).');
    const { data: unitsRaw, error: uErr } = await db
      .from('project_units')
      .select('id, code')
      .eq('project_id', projectId)
      .eq('floor_id', floorId)
      .order('sort');
    if (uErr) return fail(uErr.message, 500);
    const unitRows = (unitsRaw ?? []) as { id: string; code: string }[];
    if (!unitRows.length) return fail('Ovaj sprat još nema dodatih stanova.');
    try {
      const image = await fetchPlanImage(f.plan_url);
      const { data, usedModel } = await generateJsonWithRetry<{ units: { code: string; box_2d: number[] }[] }>({
        contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: buildPlanUnitsPrompt(unitRows.map((u) => u.code)) }],
        config: { responseMimeType: 'application/json', responseSchema: planUnitsSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_FALLBACK_MODEL,
        fallbackModel: GEMINI_MODEL,
        timeoutMs: 26_000,
        attempts: 1,
        label: 'plan-units'
      });
      const boxes = planUnitBoxesToPolygons(data.units ?? []);
      const proposals = boxes
        .map((b) => {
          const u = unitRows.find((x) => x.code.trim() === b.code);
          return u ? { unitId: u.id, code: u.code, polygon: b.polygon } : null;
        })
        .filter((x): x is { unitId: string; code: string; polygon: Polygon } => Boolean(x));
      if (!proposals.length) return fail('AI nije prepoznao stanove na ovoj osnovi. Iscrtajte ih ručno.');
      return NextResponse.json({ success: true, proposals, seen: proposals.length, units: unitRows.length, backup: usedModel !== GEMINI_FALLBACK_MODEL });
    } catch (err) {
      console.error('[api/admin/projects] plan-units', err);
      return fail('Predlog stanova na osnovi trenutno nije uspeo. Pokušajte ponovo ili ih iscrtajte ručno.', 502);
    }
  },

  // Fasada → predlog oblika stanova: traka svakog sprata (već sačuvana na
  // toj slici) podeljena na stanove koji se vide. Ništa se ne upisuje.
  'facade-units': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const viewId = text(body.viewId, 40);
    if (!projectId || !viewId) return fail('Nedostaje slika fasade.');
    const { data: view } = await db
      .from('project_views')
      .select('id, kind, label, image_url')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .maybeSingle();
    const v = view as { id: string; kind: string; label: string | null; image_url: string } | null;
    if (!v || v.kind !== 'building') return fail('Stanovi se predlažu samo na slici fasade.');
    const { data: shapesRaw, error: sErr } = await db.from('project_view_shapes').select('floor_id, polygon').eq('view_id', viewId).not('floor_id', 'is', null);
    if (sErr) return fail(sErr.message, 500);
    const floorShapes = (shapesRaw ?? []) as { floor_id: string; polygon: Polygon }[];
    if (!floorShapes.length) return fail('Prvo označite spratove na ovoj slici (dugme „✨ Predloži spratove"), pa onda stanove.');
    const floorIds = floorShapes.map((x) => x.floor_id);
    const [{ data: floorsRaw, error: fErr }, { data: unitsRaw, error: uErr }] = await Promise.all([
      db.from('project_floors').select('id, level, plan_url').in('id', floorIds),
      db.from('project_units').select('id, code, structure, orientation, area_sqm, polygon, floor_id').eq('project_id', projectId).in('floor_id', floorIds)
    ]);
    if (fErr || uErr) return fail((fErr ?? uErr)!.message, 500);
    type URow = { id: string; code: string; structure: string | null; orientation: string | null; area_sqm: number | null; polygon: Polygon | null; floor_id: string };
    const unitRows = (unitsRaw ?? []) as URow[];
    const fl = ((floorsRaw ?? []) as { id: string; level: number; plan_url: string | null }[])
      .map((x) => ({
        ...x,
        polygon: floorShapes.find((sh) => sh.floor_id === x.id)!.polygon,
        units: unitRows.filter((u) => u.floor_id === x.id).sort((a, b) => a.code.localeCompare(b.code, 'sr', { numeric: true }))
      }))
      .filter((x) => x.units.length)
      .sort((a, b) => a.level - b.level);
    if (!fl.length) return fail('Spratovi označeni na ovoj slici još nemaju stanove.');
    // Osnova tipskog sprata sa iscrtanim stanovima pomaže AI-ju da nađe koja strana zgrade je na slici.
    const typical = fl.find((x) => x.level >= 1 && x.plan_url && x.units.filter((u) => u.polygon).length >= 2);
    try {
      const [facade, plan] = await Promise.all([
        fetchFacadeWithFloors(v.image_url, fl),
        typical ? fetchPlanWithUnits(typical.plan_url!, typical.units.filter((u) => u.polygon).map((u) => ({ code: u.code, polygon: u.polygon! }))) : null
      ]);
      const prompt = buildFacadeUnitsPrompt(
        fl.map((x) => ({ level: x.level, units: x.units.map((u) => ({ code: u.code, structure: u.structure, orientation: u.orientation, areaSqm: u.area_sqm })) })),
        Boolean(plan),
        v.label
      );
      // Lite: tačan i brz na fasadi (6-13 s); Flash je rezerva.
      const { data, usedModel } = await generateJsonWithRetry<{ units: FacadeUnitSpan[] }>({
        contents: [
          { inlineData: { mimeType: facade.contentType, data: facade.base64 } },
          ...(plan ? [{ inlineData: { mimeType: plan.contentType, data: plan.base64 } }] : []),
          { text: prompt }
        ],
        config: { responseMimeType: 'application/json', responseSchema: facadeUnitsSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_MODEL,
        fallbackModel: GEMINI_FALLBACK_MODEL,
        timeoutMs: 26_000,
        attempts: 1,
        label: 'facade-units'
      });
      const proposals = facadeSpansToPolygons(
        data.units ?? [],
        fl.map((x) => ({ level: x.level, polygon: x.polygon, units: x.units.map((u) => ({ id: u.id, code: u.code, suffix: unitSuffix(u.code, x.level) })) }))
      );
      if (!proposals.length) return fail('AI nije prepoznao stanove na ovoj slici. Iscrtajte ih ručno.');
      return NextResponse.json({ success: true, proposals, floors: fl.length, withPlan: Boolean(plan), backup: usedModel !== GEMINI_MODEL });
    } catch (err) {
      console.error('[api/admin/projects] facade-units', err);
      return fail('Predlog stanova trenutno nije uspeo. Pokušajte ponovo ili ih iscrtajte ručno.', 502);
    }
  },

  // Fasada → predlog oblika spratova (prizemlje i nagore) za jednu sliku.
  // Ništa se ne upisuje: admin vidi predlog na slici i čuva ga (shape-save).
  'facade-floors': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const viewId = text(body.viewId, 40);
    if (!projectId || !viewId) return fail('Nedostaje slika fasade.');
    const { data: view } = await db
      .from('project_views')
      .select('id, kind, building_id, image_url')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .maybeSingle();
    const v = view as { id: string; kind: string; building_id: string | null; image_url: string } | null;
    if (!v || v.kind !== 'building') return fail('Spratovi se predlažu samo na slici fasade.');
    let fq = db.from('project_floors').select('id, level').eq('project_id', projectId).gte('level', 0).order('level');
    fq = v.building_id ? fq.eq('building_id', v.building_id) : fq.is('building_id', null);
    const { data: floorsRaw, error: fErr } = await fq;
    if (fErr) return fail(fErr.message, 500);
    const floorRows = (floorsRaw ?? []) as { id: string; level: number }[];
    if (!floorRows.length) return fail('Prvo dodajte spratove (npr. „P-6"), pa onda predložite njihove oblike na fasadi.');
    try {
      const image = await fetchFacadeImage(v.image_url);
      // Lite je na fasadi tačniji i brži od Flash-a (vidi planAi.ts).
      const { data, usedModel } = await generateJsonWithRetry<{ storeys: StoreyBox[] }>({
        contents: [{ inlineData: { mimeType: image.contentType, data: image.base64 } }, { text: buildFacadeFloorsPrompt(floorRows.length) }],
        config: { responseMimeType: 'application/json', responseSchema: facadeFloorsSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_MODEL,
        fallbackModel: GEMINI_FALLBACK_MODEL,
        timeoutMs: 28_000,
        attempts: 1,
        label: 'facade-floors'
      });
      const polygons = storeyBoxesToPolygons(data.storeys ?? []);
      if (!polygons.length) return fail('AI nije prepoznao spratove na ovoj slici. Iscrtajte ih ručno.');
      // Odozdo nagore: najniži oblik = najniža etaža (prizemlje).
      const proposals = polygons.slice(0, floorRows.length).map((polygon, i) => ({ floorId: floorRows[i].id, level: floorRows[i].level, polygon }));
      return NextResponse.json({ success: true, proposals, seen: polygons.length, floors: floorRows.length, backup: usedModel !== GEMINI_MODEL });
    } catch (err) {
      console.error('[api/admin/projects] facade-floors', err);
      return fail('Predlog spratova trenutno nije uspeo. Pokušajte ponovo ili ih iscrtajte ručno.', 502);
    }
  },

  // Cenovnik investitora (PDF ili slika) → tekst za „Uvoz iz Excela".
  // Ništa se ne upisuje: admin pregleda tabelu i klikne „Uvezi".
  'pricelist-read': async (db, body) => {
    const projectId = text(body.projectId, 40);
    const fileUrl = text(body.fileUrl, 600);
    if (!projectId || !fileUrl || !/^https:\/\//.test(fileUrl)) return fail('Nedostaje cenovnik.');
    const { count: buildingCount } = await db.from('project_buildings').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    try {
      const doc = await fetchDocForAi(fileUrl);
      const { data, usedModel } = await generateJsonWithRetry<{ units: PriceRow[] }>({
        contents: [{ inlineData: doc }, { text: PRICE_LIST_PROMPT }],
        config: { responseMimeType: 'application/json', responseSchema: priceListSchema(), temperature: TEMP_EXTRACT },
        model: GEMINI_FALLBACK_MODEL,
        fallbackModel: GEMINI_MODEL,
        timeoutMs: 26_000,
        attempts: 1,
        label: 'pricelist-read'
      });
      const rows = (data.units ?? []).filter((r) => r && typeof r.code === 'string' && r.code.trim()).slice(0, 600);
      if (!rows.length) return fail('U cenovniku nije pronađen nijedan stan. Proverite da li je to prava strana sa tabelom.');
      const withBuilding = (buildingCount ?? 0) > 0;
      const lines = rows.map((r) => priceRowToLine(r, withBuilding));
      return NextResponse.json({ success: true, text: lines.join('\n'), count: rows.length, backup: usedModel !== GEMINI_FALLBACK_MODEL });
    } catch (err) {
      console.error('[api/admin/projects] pricelist-read', err);
      return fail('Čitanje cenovnika trenutno nije uspelo. Pokušajte ponovo ili nalepite tabelu iz Excela.', 502);
    }
  }
};
