'use client';

import Link from 'next/link';
import { FormThemeStyle } from '../../../lib/formTheme';
import { PROJECT_ADMIN_STYLES } from '../../../../components/projekat/adminStyles';
import SalesAccessPanel from '../../../../components/projekat/SalesAccessPanel';
import EmbedCodePanel from '../../../../components/projekat/EmbedCodePanel';
import InsightsPanel from '../../../../components/projekat/InsightsPanel';
import ProgressPanel from '../../../../components/projekat/ProgressPanel';
import UnitMediaModal from '../../../../components/projekat/UnitMediaModal';
import NearbyPanel from '../../../../components/projekat/NearbyPanel';
import BulkPlansPanel from '../../../../components/projekat/BulkPlansPanel';
import MoreMenu from '../../../../components/admin/MoreMenu';
import { useProjectEditor, editorView } from './editorState';
import InfoSection from './_sections/InfoSection';
import BuildingsSection from './_sections/BuildingsSection';
import SiteSection from './_sections/SiteSection';
import FacadeSection from './_sections/FacadeSection';
import FloorPlanSection from './_sections/FloorPlanSection';
import UnitsSection from './_sections/UnitsSection';

/**
 * Uređivanje jednog projekta novogradnje:
 *   1) podaci projekta i objava
 *   2) lamele i slika kompleksa iz vazduha (migracija 025, samo za komplekse)
 *   3) fasada izabrane zgrade: više slika (rotacija), na svakoj oblici
 *      spratova i/ili stanova (klik po klik)
 *   4) osnova izabranog sprata: slika + oblik svakog stana, pogled sa sprata
 *   5) tabela stanova: status, cena, tura... + uvoz iz Excela
 *
 * Sve izmene idu kroz /api/admin/projects; ture se ovde samo biraju.
 */

export default function ProjectEditorPage() {
  const ed = useProjectEditor();
  if (!ed.data || !ed.info) {
    const { loadError } = ed;
    return (
      <main className="pa k-form">
        <FormThemeStyle />
        <style>{PROJECT_ADMIN_STYLES}</style>
        <div className="pa-wrap">{loadError ? <p className="pa-msg is-err">{loadError}</p> : 'Učitavam projekat...'}</div>
      </main>
    );
  }
  const v = editorView(ed, ed.data, ed.info);
  const { id, setData, mediaUnitId, setMediaUnitId, busy, msg, setMsg, load, api, run, upload, floors, units, patchUnit, deleteProject, sections, project, tours } = v;

  return (
    <main className="pa k-form">
      <FormThemeStyle />
      <style>{PROJECT_ADMIN_STYLES}</style>
      <div className="pa-wrap">
        <div className="pa-top">
          <div>
            <div className="pa-crumbs">
              <Link href="/admin/projekti">← Projekti</Link>
              <span>/novogradnja/{project.slug}</span>
            </div>
            <h1>{project.title}</h1>
          </div>
          <div className="pa-row">
            <span className={project.published ? 'pa-pill is-pub' : 'pa-pill is-draft'}>{project.published ? 'Objavljen' : 'U pripremi'}</span>
            {project.published && (
              <a className="pa-btn" href={`/novogradnja/${project.slug}`} target="_blank" rel="noreferrer">
                Otvori javnu stranu ↗
              </a>
            )}
            <button
              type="button"
              className="pa-btn"
              disabled={busy === 'preview'}
              title="Poseban link: strana izgleda kao prava i radi i pre objave, ali je ne vidi niko bez linka. Važi 30 dana."
              onClick={() => {
                // Prozor se otvara odmah na klik, pa mu se adresa postavi kad
                // stigne link - inače pregledač blokira prozor otvoren posle await-a.
                const win = window.open('', '_blank');
                run('preview', async () => {
                  try {
                    const json = await api('preview-link', { id });
                    const url = `${window.location.origin}${json.url}`;
                    if (win) win.location.href = url;
                    else window.open(url, '_blank');
                    await navigator.clipboard?.writeText(url).catch(() => undefined);
                    return 'Link za pokazivanje je otvoren i kopiran - izgleda kao prava strana, važi 30 dana, a bez njega projekat niko ne vidi.';
                  } catch (e) {
                    win?.close();
                    throw e;
                  }
                });
              }}
            >
              Link za pokazivanje ↗
            </button>
            <button
              type="button"
              className={project.published ? 'pa-btn' : 'pa-btn is-primary'}
              disabled={busy === 'publish'}
              onClick={() =>
                run('publish', async () => {
                  await api('update', { id, fields: { published: !project.published } });
                  setData((d) => (d ? { ...d, project: { ...d.project, published: !project.published } } : d));
                  return project.published ? 'Projekat je sklonjen sa sajta.' : 'Projekat je objavljen.';
                })
              }
            >
              {project.published ? 'Skloni sa sajta' : 'Objavi'}
            </button>
            <MoreMenu items={[{ label: '🗑 Obriši projekat', danger: true, disabled: busy === 'delete', onClick: deleteProject }]} />
          </div>
        </div>

        {/* Traka sekcija: skroluje do dela strane (ne menja karticu), pa
            nesačuvano crtanje obrisa ostaje gde je. */}
        <nav className="pa-sections" aria-label="Delovi projekta">
          {sections.map((sec) => (
            <button key={sec.id} type="button" onClick={() => document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {sec.label}
            </button>
          ))}
        </nav>

        {/* Poruka je pričvršćena na dno ekrana: dugmići su često daleko ispod
            vrha strane, pa poruka u vrhu ostane van vidokruga (vlasnik nije
            video grešku pri dodavanju sprata, 2. 10. 2026). */}
        {msg && (
          <p className={msg.ok ? 'pa-msg pa-toast is-ok' : 'pa-msg pa-toast is-err'} role="status">
            <span>{msg.text}</span>
            <button type="button" aria-label="Zatvori poruku" onClick={() => setMsg(null)}>
              ×
            </button>
          </p>
        )}

        {/* 1) Podaci projekta */}
        <InfoSection v={v} />

        <div className="pa-anchor" id="sec-okolina" />
        <NearbyPanel
          projectId={id}
          lat={project.lat}
          lng={project.lng}
          nearby={project.nearby}
          nearbyUpdatedAt={project.nearby_updated_at}
          onChange={(patch) => setData((d) => (d ? { ...d, project: { ...d.project, ...patch } } : d))}
        />

        <div className="pa-anchor" id="sec-upiti" />
        <InsightsPanel projectId={id} projectTitle={project.title} />

        {/* 2) Lamele (migracija 025) */}
        <BuildingsSection v={v} />

        {/* 3) Kompleks iz vazduha - samo kad ima bar dve lamele */}
        <SiteSection v={v} />

        {/* 4) Fasada i spratovi (izabrane lamele) */}
        <FacadeSection v={v} />

        {/* 3) Osnova izabranog sprata */}
        <FloorPlanSection v={v} />

        {/* 4) Tabela stanova */}
        <UnitsSection v={v} />

        <div className="pa-anchor" id="sec-osnove-ai" />
        <BulkPlansPanel projectId={id} units={units} floors={floors} api={api} upload={upload} onSaved={load} />

        <div className="pa-anchor" id="sec-gradiliste" />
        <ProgressPanel projectId={id} tours={tours} />

        <div className="pa-anchor" id="sec-ugradnja" />
        <EmbedCodePanel slug={project.slug} title={project.title} published={project.published} />

        <div className="pa-anchor" id="sec-prodaja" />
        <SalesAccessPanel
          projectId={id}
          notifySales={project.notify_sales}
          onNotifyChange={(value) => setData((d) => (d ? { ...d, project: { ...d.project, notify_sales: value } } : d))}
        />

        {mediaUnitId && units.find((u) => u.id === mediaUnitId) && (
          <UnitMediaModal
            key={mediaUnitId}
            unit={units.find((u) => u.id === mediaUnitId)!}
            projectId={id}
            api={api}
            upload={upload}
            onSaved={patchUnit}
            onClose={() => setMediaUnitId(null)}
            onCopied={load}
          />
        )}

      </div>
    </main>
  );
}
