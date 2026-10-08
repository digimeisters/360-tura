'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cleanRooms, floorName, matchPlanToUnit, type FloorRow, type PlanMatch, type UnitRoom, type UnitRow } from '../../app/lib/projects';
import { srPlural } from '../../app/lib/projectI18n';

/**
 * Admin → „Osnove stanova odjednom": investitor pošalje folder sa osnovama,
 * ovde se prevuku sve slike. Za svaku: otpremanje na R2 → AI (akcija
 * plan-read) pročita oznaku stana i prostorije → uparivanje sa stanom
 * (matchPlanToUnit). Admin pregleda tabelu, ispravi stan gde treba i klikne
 * „Sačuvaj sve" - tek tada se upisuje (unit-save, po želji i
 * unit-media-copy na iste stanove).
 *
 * Dve slike se obrađuju istovremeno (svaka je poseban poziv rute, ispod
 * Vercel limita od 60 s; sa tri je Flash pod opterećenjem prekoračivao vreme).
 */

type Api = (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
type Upload = (file: File, kind: 'unit') => Promise<string>;

type RowStatus = 'wait' | 'upload' | 'read' | 'done' | 'error';
type Row = {
  key: string;
  file: File;
  preview: string;
  status: RowStatus;
  error: string;
  url: string | null;
  label: string;
  unitId: string;
  how: PlanMatch['how'] | 'manual' | null;
  rooms: UnitRoom[];
  dims: string[];
  backup: boolean;
  copy: boolean;
};

const PARALLEL = 2;
const HOW_LABEL: Record<NonNullable<Row['how']>, string> = {
  label: 'oznaka sa osnove',
  file: 'ime fajla',
  type: 'tip stana',
  manual: 'ručno'
};

export default function BulkPlansPanel({
  projectId,
  units,
  floors,
  api,
  upload,
  onSaved
}: {
  projectId: string;
  units: UnitRow[];
  floors: FloorRow[];
  api: Api;
  upload: Upload;
  /** Posle čuvanja - roditelj ponovo učita stanove. */
  onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [withRooms, setWithRooms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const levelOf = useMemo(() => new Map(floors.map((f) => [f.id, f.level])), [floors]);
  const unitList = useMemo(
    () =>
      units
        .map((u) => ({ id: u.id, code: u.code, level: levelOf.get(u.floor_id) ?? 0 }))
        .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code, 'sr', { numeric: true })),
    [units, levelOf]
  );
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  // Oslobodi sličice kad se panel zatvori.
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const patch = (key: string, p: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...p } : r)));

  async function processRow(row: Row) {
    try {
      patch(row.key, { status: 'upload', error: '' });
      const url = await upload(row.file, 'unit');
      patch(row.key, { status: 'read', url });
      const json = await api('plan-read', { projectId, imageUrl: url, fileName: row.file.name, codes: unitList.map((u) => u.code) });
      const label = String(json.label ?? '');
      const matchedCode = String(json.matchedCode ?? '');
      const byAi = matchedCode ? unitList.find((u) => u.code === matchedCode) : undefined;
      // AI je oznaku našao na osnovi ili (bez natpisa na osnovi) u imenu fajla.
      const match: PlanMatch | null = byAi ? { unitId: byAi.id, how: label.trim() ? 'label' : 'file' } : matchPlanToUnit(label, row.file.name, unitList);
      patch(row.key, {
        status: 'done',
        label,
        unitId: match?.unitId ?? '',
        how: match?.how ?? null,
        rooms: cleanRooms(json.rooms),
        dims: Array.isArray(json.dims) ? (json.dims as string[]) : [],
        backup: Boolean(json.backup),
        copy: match?.how === 'type'
      });
    } catch (e) {
      patch(row.key, { status: 'error', error: e instanceof Error ? e.message : 'Greška.' });
    }
  }

  async function runQueue(list: Row[]) {
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const row = list[next++];
        await processRow(row);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, list.length) }, worker));
  }

  function addFiles(files: File[]) {
    setMsg(null);
    const fresh: Row[] = files
      .filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type))
      .map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'wait',
        error: '',
        url: null,
        label: '',
        unitId: '',
        how: null,
        rooms: [],
        dims: [],
        backup: false,
        copy: false
      }));
    if (fresh.length < files.length) setMsg({ ok: false, text: 'Preskočeni su fajlovi koji nisu JPG, PNG ili WEBP (PDF prvo sačuvajte kao slike).' });
    if (!fresh.length) return;
    setRows((all) => [...all, ...fresh]);
    runQueue(fresh);
  }

  const ready = rows.filter((r) => r.status === 'done' && r.unitId && r.url);
  const busy = rows.some((r) => r.status === 'wait' || r.status === 'upload' || r.status === 'read');
  // Isti stan dodeljen dvema slikama - čuva se samo jedna, pa admin bira.
  const dupUnits = new Set(ready.map((r) => r.unitId).filter((id, i, a) => a.indexOf(id) !== i));

  async function saveAll() {
    if (!ready.length || dupUnits.size) return;
    setSaving(true);
    setMsg(null);
    try {
      // Prvo prenos tipskih osnova na iste stanove, pa tek onda osnove
      // dodeljene baš tom stanu - one moraju da ostanu (ne sme da ih
      // pregazi tip sa drugog sprata).
      const copies = ready.filter((r) => r.copy);
      const direct = ready.filter((r) => !r.copy);
      const save = (r: Row) =>
        api('unit-save', {
          projectId,
          id: r.unitId,
          fields: withRooms && r.rooms.length ? { plan_url: r.url, rooms: r.rooms } : { plan_url: r.url }
        });
      let copied = 0;
      for (const r of copies) {
        await save(r);
        const res = await api('unit-media-copy', { projectId, sourceId: r.unitId, includeTour: false }).catch(() => null);
        copied += Number(res?.count ?? 0);
      }
      for (const r of direct) await save(r);
      await onSaved();
      const savedKeys = new Set(ready.map((r) => r.key));
      setRows((all) => {
        all.filter((r) => savedKeys.has(r.key)).forEach((r) => URL.revokeObjectURL(r.preview));
        return all.filter((r) => !savedKeys.has(r.key));
      });
      setMsg({
        ok: true,
        text: `Sačuvano osnova: ${ready.length}${copied ? `, prenete i na još ${copied} ${srPlural(copied, 'stan', 'stana', 'stanova')} istog tipa` : ''}.${
          withRooms ? ' Prostorije su popunjene gde ih je AI pročitao - proverite ih u „Detalji".' : ''
        }`
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Čuvanje nije uspelo.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pa-card">
      <h2>Osnove stanova odjednom (AI)</h2>
      <p className="pa-hint">
        Izaberite ili prevucite sve osnove koje je poslao investitor. AI na svakoj pročita oznaku stana i prostorije, a vi samo proverite tabelu
        i kliknete „Sačuvaj sve“. Osnova tipa („Tip A“) ide na najniži takav stan i prenosi se na iste stanove na drugim spratovima.
      </p>
      {msg && <p className={msg.ok ? 'pa-msg is-ok' : 'pa-msg is-err'}>{msg.text}</p>}

      <label
        className="pa-empty pa-empty-upload"
        style={{ padding: 18 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        Prevucite slike osnova ovde (JPG, PNG, WEBP)
        <span className="pa-btn is-primary">Izaberi osnove</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={saving}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            addFiles(files);
          }}
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="pa-table-wrap" style={{ marginTop: 12 }}>
            <table className="pa-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Osnova</th>
                  <th>Pročitano</th>
                  <th>Stan</th>
                  <th>Prostorije</th>
                  <th>Iste stanove</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const unit = r.unitId ? unitById.get(r.unitId) : null;
                  const total = Math.round(r.rooms.reduce((s, x) => s + x.m2, 0) * 100) / 100;
                  const area = unit?.area_sqm === null || unit?.area_sqm === undefined ? null : Number(unit.area_sqm);
                  const off = area !== null && r.rooms.length > 0 && Math.abs(total - area) > 1.5;
                  return (
                    <tr key={r.key}>
                      <td>
                        <a href={r.preview} target="_blank" rel="noreferrer" title={r.file.name}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- lokalna sličica pre otpremanja */}
                          <img src={r.preview} alt="" style={{ width: 84, height: 60, objectFit: 'contain', background: '#fff', borderRadius: 6, border: '1px solid var(--line)' }} />
                        </a>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 190 }}>
                        <div style={{ overflowWrap: 'anywhere', color: 'var(--ink-soft)' }}>{r.file.name}</div>
                        {r.status === 'wait' && <span style={{ color: 'var(--ink-faint)' }}>čeka…</span>}
                        {r.status === 'upload' && <span>otpremam…</span>}
                        {r.status === 'read' && <span>AI čita osnovu…</span>}
                        {r.status === 'error' && <span style={{ color: 'var(--danger)' }}>{r.error}</span>}
                        {r.status === 'done' && (
                          <span>
                            {r.label ? <b>„{r.label}“</b> : <span style={{ color: 'var(--ink-faint)' }}>bez oznake</span>}
                            {r.backup && <span style={{ display: 'block', color: '#B45309' }}>rezervni model - proverite mere</span>}
                          </span>
                        )}
                      </td>
                      <td>
                        {r.status === 'done' && (
                          <>
                            <select
                              value={r.unitId}
                              style={{ maxWidth: 150, borderColor: !r.unitId || dupUnits.has(r.unitId) ? 'var(--danger)' : undefined }}
                              onChange={(e) => patch(r.key, { unitId: e.target.value, how: e.target.value ? 'manual' : null })}
                            >
                              <option value="">— izaberite stan —</option>
                              {unitList.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.code} · {floorName(u.level).toLowerCase()}
                                </option>
                              ))}
                            </select>
                            <small style={{ display: 'block', color: dupUnits.has(r.unitId) ? 'var(--danger)' : 'var(--ink-faint)', fontSize: 11 }}>
                              {dupUnits.has(r.unitId) ? 'isti stan na dve slike' : r.how ? `po: ${HOW_LABEL[r.how]}` : 'nije prepoznat'}
                            </small>
                          </>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {r.status === 'done' &&
                          (r.rooms.length ? (
                            <details>
                              <summary style={{ cursor: 'pointer' }}>
                                {r.rooms.length} · {String(total).replace('.', ',')} m²
                                {off && <span style={{ color: '#B45309' }}> (stan: {String(area).replace('.', ',')})</span>}
                              </summary>
                              <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                                {r.rooms.map((x, i) => (
                                  <div key={i}>
                                    {x.name}
                                    {r.dims[i] ? ` ${r.dims[i]}` : ''} = {String(x.m2).replace('.', ',')}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span style={{ color: 'var(--ink-faint)' }}>nisu pročitane</span>
                          ))}
                      </td>
                      <td>
                        {r.status === 'done' && (
                          <label className="pa-row" style={{ fontSize: 12, gap: 6 }} title="Ista osnova i prostorije i na 2A → 3A, 4A…">
                            <input type="checkbox" checked={r.copy} disabled={!r.unitId} onChange={(e) => patch(r.key, { copy: e.target.checked })} />
                            prenesi
                          </label>
                        )}
                      </td>
                      <td>
                        <span className="pa-row" style={{ gap: 4 }}>
                          {r.status === 'error' && (
                            <button type="button" className="pa-btn" onClick={() => runQueue([r])}>
                              Ponovo
                            </button>
                          )}
                          <button
                            type="button"
                            className="pa-btn"
                            aria-label="Ukloni iz spiska"
                            disabled={saving || r.status === 'upload' || r.status === 'read'}
                            onClick={() => {
                              URL.revokeObjectURL(r.preview);
                              setRows((all) => all.filter((x) => x.key !== r.key));
                            }}
                          >
                            ×
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pa-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <label className="pa-row" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
              <input type="checkbox" checked={withRooms} onChange={(e) => setWithRooms(e.target.checked)} />
              Popuni i prostorije sa kvadraturom (zamenjuje postojeće)
            </label>
            <button type="button" className="pa-btn is-primary" disabled={saving || busy || !ready.length || dupUnits.size > 0} onClick={saveAll}>
              {saving ? 'Čuvam…' : busy ? 'AI još čita…' : `Sačuvaj sve (${ready.length})`}
            </button>
          </div>
          {rows.some((r) => r.status === 'done' && !r.unitId) && (
            <p className="pa-hint" style={{ margin: '6px 0 0' }}>
              Osnove bez izabranog stana se ne čuvaju - izaberite stan ili ih uklonite ×.
            </p>
          )}
        </>
      )}
    </section>
  );
}
