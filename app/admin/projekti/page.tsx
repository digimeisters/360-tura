'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuthHeader } from '../../lib/authFetch';
import { PROJECT_ADMIN_STYLES } from '../../../components/projekat/adminStyles';
import { projectNameAdvice, type UnitStatus } from '../../lib/projects';
import { srPlural } from '../../lib/projectI18n';
import { slugify } from '../../lib/slug';
import NameAdvice from '../../../components/projekat/NameAdvice';
import AdminDrawer from '../../../components/admin/AdminDrawer';

/**
 * Spisak projekata novogradnje (paket za investitore) i pravljenje novog,
 * u istom rasporedu kao strana Ture: zaglavlje, "+ Novi projekat" u panelu
 * sa desne strane i tabela. Prijavu drži okvir admina (AdminShell).
 */

type ProjectListItem = {
  id: string;
  slug: string;
  title: string;
  developer_name: string | null;
  city: string | null;
  published: boolean;
  counts: Record<UnitStatus, number>;
};

export default function ProjectsAdminPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/projects', { headers: await adminAuthHeader() });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      setError(json?.error || 'Projekti nisu učitani.');
      return;
    }
    setProjects(json.projects);
  }, []);

  // Prijavu drži okvir admina (components/admin/AdminShell.tsx).
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ action: 'create', title })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setCreateError(json?.error || 'Projekat nije napravljen.');
        return;
      }
      router.push(`/admin/projekti/${json.id}`);
    } catch {
      setCreateError('Nema veze sa serverom.');
    } finally {
      setCreating(false);
    }
  };

  const submitCreate = () => {
    if (!title.trim()) return;
    const advice = projectNameAdvice(title);
    if (
      advice.warnings.length &&
      !window.confirm(`${advice.warnings.join(' ')}\n\nAdresa strane se posle ne menja. Ipak napraviti projekat „${title.trim()}“?`)
    ) {
      return;
    }
    void create();
  };

  const publishedCount = projects?.filter((p) => p.published).length ?? 0;

  return (
    <main className="pa k-form">
      <style>{PROJECT_ADMIN_STYLES}</style>
      <div className="pa-wrap">
        <div className="pa-top">
          <div>
            <h1>Novogradnja</h1>
            {projects && (
              <p className="pa-sub">
                {projects.length} {srPlural(projects.length, 'projekat', 'projekta', 'projekata')} · {publishedCount}{' '}
                {srPlural(publishedCount, 'objavljen', 'objavljena', 'objavljenih')}
              </p>
            )}
          </div>
          <button
            type="button"
            className="pa-btn is-primary"
            onClick={() => {
              setTitle('');
              setCreateError('');
              setCreateOpen(true);
            }}
          >
            + Novi projekat
          </button>
        </div>

        {error && <p className="pa-msg is-err">{error}</p>}
        {projects === null && !error && <p className="pa-hint">Učitavam...</p>}
        {projects?.length === 0 && <div className="pa-empty">Još nema projekata. Napravite prvi preko „+ Novi projekat“.</div>}

        {projects && projects.length > 0 && (
          <div className="pa-table-card">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Projekat</th>
                  <th>Stanovi</th>
                  <th>Stanje</th>
                  <th aria-label="Radnje" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const total = p.counts.available + p.counts.reserved + p.counts.sold;
                  return (
                    <tr key={p.id}>
                      <td>
                        <b className="pa-t">{p.title}</b>
                        <small className="pa-s">
                          {[p.developer_name, p.city].filter(Boolean).join(' · ') || 'bez investitora'} · /novogradnja/{p.slug}
                        </small>
                      </td>
                      <td>
                        {total ? (
                          <>
                            {total} {srPlural(total, 'stan', 'stana', 'stanova')}
                            <small className="pa-s">
                              {p.counts.available} slob. · {p.counts.reserved} rez. · {p.counts.sold} prod.
                            </small>
                          </>
                        ) : (
                          <span className="pa-s">nema stanova</span>
                        )}
                      </td>
                      <td>
                        <span className={p.published ? 'pa-pill is-pub' : 'pa-pill is-draft'}>{p.published ? 'Objavljen' : 'U pripremi'}</span>
                      </td>
                      <td className="pa-actions">
                        <a className="pa-btn" href={`/admin/projekti/${p.id}`}>
                          Uredi
                        </a>
                        {p.published && (
                          <a className="pa-btn" href={`/novogradnja/${p.slug}`} target="_blank" rel="noreferrer">
                            Otvori ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminDrawer
        open={createOpen}
        title="Novi projekat"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="pa-btn" onClick={() => setCreateOpen(false)}>
              Otkaži
            </button>
            <button type="submit" form="pa-create" className="pa-btn is-primary" disabled={creating || !title.trim()}>
              {creating ? 'Pravim...' : 'Napravi projekat'}
            </button>
          </>
        }
      >
        <form
          id="pa-create"
          className="pa"
          style={{ minHeight: 0, padding: 0, background: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
          onSubmit={(e) => {
            e.preventDefault();
            submitCreate();
          }}
        >
          <label className="pa-field">
            Naziv projekta
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="npr. Jadranska" autoFocus />
          </label>
          <p className="pa-hint" style={{ margin: 0 }}>
            Naziv kako ga investitor prodaje. Ostalo se popunjava posle, u uređivanju projekta.
          </p>
          {title.trim() && (
            <p className="pa-hint" style={{ margin: 0 }}>
              Adresa strane: <b>/novogradnja/{slugify(title) || '…'}</b> — pravi se iz naziva i <b>posle se ne menja</b>.
            </p>
          )}
          <NameAdvice title={title} onAccept={setTitle} />
          {createError && <p className="pa-msg is-err">{createError}</p>}
        </form>
      </AdminDrawer>
    </main>
  );
}
