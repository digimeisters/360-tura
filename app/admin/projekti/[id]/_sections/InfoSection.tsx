'use client';

import { neighbourhoodsFor } from '../../../../lib/propertyTaxonomy';
import NameAdvice from '../../../../../components/projekat/NameAdvice';
import { INFO_FIELDS, type EditorView } from '../editorState';

/** Podaci projekta: naziv, opis, kontakt, slike, video, cenovnik. */
export default function InfoSection({ v }: { v: EditorView }) {
  const { id, setData, info, setInfo, projectVideo, setProjectVideo, busy, api, run, upload, project, tours } = v;
  return (
    <>
      <section className="pa-card pa-anchor" id="sec-podaci">
        <h2>Podaci projekta</h2>
        <p className="pa-hint">Prikazuju se u vrhu javne strane projekta.</p>
        <div className="pa-grid">
          {INFO_FIELDS.map((f) => (
            <label key={f.key} className={f.wide ? 'pa-field is-wide' : 'pa-field'}>
              {f.label}
              {f.area ? (
                <textarea value={info[f.key] ?? ''} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
              ) : f.key === 'neighborhood' && neighbourhoodsFor(info.city).length ? (
                <select value={info.neighborhood ?? ''} onChange={(e) => setInfo({ ...info, neighborhood: e.target.value || null })}>
                  <option value="">Izaberite naselje</option>
                  {/* Zatečena vrednost van liste (npr. promenjen grad) ostaje vidljiva. */}
                  {info.neighborhood && !neighbourhoodsFor(info.city).includes(info.neighborhood) && (
                    <option value={info.neighborhood}>{info.neighborhood}</option>
                  )}
                  {neighbourhoodsFor(info.city).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={info[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
              )}
              {/* Naziv na strani se ovde menja slobodno (adresa ostaje ista), ali isti savet važi. */}
              {f.key === 'title' && <NameAdvice title={info.title ?? ''} onAccept={(fixed) => setInfo({ ...info, title: fixed })} />}
            </label>
          ))}
        </div>
        <div className="pa-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pa-btn is-primary"
            disabled={busy === 'info'}
            onClick={() =>
              run('info', async () => {
                const json = await api('update', { id, fields: info });
                // Nova adresa -> server je možda našao i koordinate (za mapu okoline).
                const coords = json.coords as { lat: number; lng: number } | null;
                setData((d) => (d ? { ...d, project: { ...d.project, ...info, ...(coords ?? {}) } } : d));
                return coords ? 'Podaci projekta su sačuvani, a adresa je pronađena na mapi.' : 'Podaci projekta su sačuvani.';
              })
            }
          >
            {busy === 'info' ? 'Čuvam...' : 'Sačuvaj podatke'}
          </button>
          <button
            type="button"
            className="pa-btn"
            disabled={busy === 'translate' || !info.description?.trim()}
            title="AI predlog prevoda srpskog opisa; proverite ga pa kliknite „Sačuvaj podatke“"
            onClick={() =>
              run('translate', async () => {
                const json = await api('translate-en', { description: info.description });
                setInfo({ ...info, description_en: json.description_en });
                return 'Engleski opis je predložen - proverite ga i kliknite „Sačuvaj podatke“.';
              })
            }
          >
            {busy === 'translate' ? 'Prevodim...' : '🌐 Prevedi opis na engleski'}
          </button>
          {project.published && (
            <a className="pa-btn" href={`/en/novogradnja/${project.slug}`} target="_blank" rel="noreferrer">
              Engleska strana ↗
            </a>
          )}
        </div>

        {/* Logo investitora (migracija 034): zaglavlje strane projekta i stanova, PDF letak. */}
        <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
          <b style={{ fontSize: 14 }}>Logo investitora</b>
          <p className="pa-hint" style={{ margin: '4px 0 10px' }}>
            Stoji gore levo na strani projekta i stanova (umesto znaka Kvadrat360) i iznad naziva stana na PDF letku. PNG ili SVG, najbolje
            vodoravan logo na providnoj pozadini, do 2MB. Bez loga strana izgleda kao do sada.
          </p>
          <div className="pa-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {project.logo_url && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 64,
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: '1.5px dashed #9DBBE3',
                  background: project.logo_dark ? '#111113' : '#FFFFFF'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pregled loga sa R2 CDN-a */}
                <img src={project.logo_url} alt="Logo investitora" style={{ maxHeight: 44, maxWidth: 200, display: 'block' }} />
              </span>
            )}
            <label className="pa-btn" style={{ cursor: busy === 'logo' ? 'wait' : 'pointer' }}>
              {busy === 'logo' ? 'Otpremam...' : project.logo_url ? 'Zameni logo' : 'Dodaj logo'}
              <input
                type="file"
                accept="image/png,image/svg+xml,image/webp,image/jpeg"
                hidden
                disabled={busy === 'logo'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  run('logo', async () => {
                    const logo_url = await upload(file, 'logo');
                    await api('update', { id, fields: { logo_url } });
                    setData((d) => (d ? { ...d, project: { ...d.project, logo_url } } : d));
                    return 'Logo investitora je sačuvan.';
                  });
                }}
              />
            </label>
            {project.logo_url && (
              <button
                type="button"
                className="pa-btn"
                style={{ color: '#B42318' }}
                disabled={busy === 'logo'}
                onClick={() =>
                  run('logo', async () => {
                    await api('update', { id, fields: { logo_url: null } });
                    setData((d) => (d ? { ...d, project: { ...d.project, logo_url: null } } : d));
                    return 'Logo je uklonjen - strana opet ima znak Kvadrat360.';
                  })
                }
              >
                Ukloni
              </button>
            )}
          </div>
          {project.logo_url && (
            <label className="pa-row" style={{ marginTop: 10, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={project.logo_dark}
                disabled={busy === 'logo'}
                onChange={(e) => {
                  const logo_dark = e.target.checked;
                  run('logo', async () => {
                    await api('update', { id, fields: { logo_dark } });
                    setData((d) => (d ? { ...d, project: { ...d.project, logo_dark } } : d));
                    return logo_dark ? 'Logo se prikazuje na tamnoj podlozi.' : 'Logo se prikazuje bez podloge.';
                  });
                }}
              />
              Logo je svetao (beo) - prikaži ga na tamnoj podlozi
            </label>
          )}
        </div>

        {/* 3D render i video projekta (migracija 040): prekidač „Zgrada · 3D render · Video" na strani. */}
        <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
          <b style={{ fontSize: 14 }}>3D render i video projekta</b>
          <p className="pa-hint" style={{ margin: '4px 0 10px' }}>
            Kad postoji bar jedno, iznad slike zgrade na strani se pojavi prekidač „Zgrada · 3D render · Video“. Render je slika (JPG/PNG/WEBP), a
            video je link na YouTube, Vimeo ili .mp4 fajl.
          </p>
          <div className="pa-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {project.render_url && (
              // eslint-disable-next-line @next/next/no-img-element -- pregled rendera sa R2 CDN-a
              <img src={project.render_url} alt="3D render projekta" style={{ height: 72, borderRadius: 10, display: 'block' }} />
            )}
            <label className="pa-btn" style={{ cursor: busy === 'render' ? 'wait' : 'pointer' }}>
              {busy === 'render' ? 'Otpremam...' : project.render_url ? 'Zameni render' : 'Dodaj 3D render'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={busy === 'render'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  run('render', async () => {
                    const render_url = await upload(file, 'render');
                    await api('update', { id, fields: { render_url } });
                    setData((d) => (d ? { ...d, project: { ...d.project, render_url } } : d));
                    return '3D render projekta je sačuvan.';
                  });
                }}
              />
            </label>
            {project.render_url && (
              <button
                type="button"
                className="pa-btn"
                style={{ color: '#B42318' }}
                disabled={busy === 'render'}
                onClick={() =>
                  run('render', async () => {
                    await api('update', { id, fields: { render_url: null } });
                    setData((d) => (d ? { ...d, project: { ...d.project, render_url: null } } : d));
                    return '3D render je uklonjen.';
                  })
                }
              >
                Ukloni
              </button>
            )}
          </div>
          <div className="pa-row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            <input
              type="url"
              style={{ flex: '1 1 260px' }}
              value={projectVideo ?? project.video_url ?? ''}
              placeholder="Video projekta: https://youtu.be/…"
              onChange={(e) => setProjectVideo(e.target.value)}
            />
            <button
              type="button"
              className="pa-btn"
              disabled={busy === 'video' || projectVideo === null || projectVideo === (project.video_url ?? '')}
              onClick={() =>
                run('video', async () => {
                  const video_url = (projectVideo ?? '').trim() || null;
                  await api('update', { id, fields: { video_url } });
                  setData((d) => (d ? { ...d, project: { ...d.project, video_url } } : d));
                  setProjectVideo(null);
                  return video_url ? 'Video projekta je sačuvan.' : 'Video projekta je uklonjen.';
                })
              }
            >
              {busy === 'video' ? 'Čuvam...' : 'Sačuvaj video'}
            </button>
          </div>
        </div>

        {/* Statistika cena (migracija 033): cenovnik ulazi u cene novogradnje za naselje. */}
        <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
          <label className="pa-row" style={{ fontSize: 14, fontWeight: 650 }}>
            <input
              type="checkbox"
              checked={project.include_in_price_stats}
              disabled={busy === 'stats'}
              onChange={(e) => {
                const include_in_price_stats = e.target.checked;
                run('stats', async () => {
                  await api('update', { id, fields: { include_in_price_stats } });
                  setData((d) => (d ? { ...d, project: { ...d.project, include_in_price_stats } } : d));
                  return include_in_price_stats
                    ? 'Cenovnik projekta ulazi u statistiku cena novogradnje.'
                    : 'Cenovnik projekta je isključen iz statistike cena.';
                });
              }}
            />
            Uključi u statistiku cena novogradnje
          </label>
          <p className="pa-hint" style={{ margin: '4px 0 0' }}>
            Cene slobodnih i rezervisanih stanova ulaze u cene novogradnje za izabrano naselje (procena vrednosti i strana „Cene po
            naseljima“) - samo zbirno, bez imena projekta i pojedinačnih stanova. Računa se tek kad projekat ima naselje, objavljen je, i
            u naselju postoje bar 2 takva projekta.
            {!project.neighborhood && ' Izaberite naselje iznad i sačuvajte podatke.'}
          </p>
        </div>

        {/* Prezentacija (migracija 026): sve kartice stana, i kad stan nema sadržaj. */}
        <div className="pa-card" style={{ marginTop: 14, marginBottom: 0, padding: 14, background: 'var(--surface-2)' }}>
          <label className="pa-row" style={{ fontSize: 14, fontWeight: 650 }}>
            <input
              type="checkbox"
              checked={project.show_all_tabs}
              disabled={busy === 'demo'}
              onChange={(e) => {
                const show_all_tabs = e.target.checked;
                run('demo', async () => {
                  await api('update', { id, fields: { show_all_tabs } });
                  setData((d) => (d ? { ...d, project: { ...d.project, show_all_tabs } } : d));
                  return show_all_tabs
                    ? 'Prezentacija uključena: svaki stan ima sve kartice (Osnova, 360° tura, 3D osnova, Slike).'
                    : 'Prezentacija isključena: stan pokazuje samo ono što ima.';
                });
              }}
            />
            Prezentacija: prikaži sve kartice stana
          </label>
          <p className="pa-hint" style={{ margin: '4px 0 8px' }}>
            Za pokazivanje investitoru. Stan bez ture dobija demo turu (sa oznakom „Primer ture“), bez slika - rendere zgrade, a 3D osnova
            oznaku „uskoro“. Za pravi projekat isključite - tada se vidi samo ono što stan stvarno ima.
          </p>
          {project.show_all_tabs && (
            <label className="pa-field" style={{ maxWidth: 360 }}>
              Demo tura
              <select
                value={project.demo_tour_id ?? ''}
                onChange={(e) => {
                  const demo_tour_id = e.target.value || null;
                  run('demo', async () => {
                    await api('update', { id, fields: { demo_tour_id } });
                    setData((d) => (d ? { ...d, project: { ...d.project, demo_tour_id } } : d));
                    return 'Demo tura je sačuvana.';
                  });
                }}
              >
                <option value="">— bez demo ture —</option>
                {tours
                  .filter((t) => t.published)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title || t.slug}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </section>
    </>
  );
}
