'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { adminAuthHeader } from '../../lib/authFetch';
import { FormThemeStyle } from '../../lib/formTheme';
import { PROJECT_ADMIN_STYLES } from '../../../components/projekat/adminStyles';
import { projectNameAdvice, type UnitStatus } from '../../lib/projects';
import { srPlural } from '../../lib/projectI18n';
import { slugify } from '../../lib/slug';
import NameAdvice from '../../../components/projekat/NameAdvice';

/**
 * Spisak projekata novogradnje (paket za investitore) i pravljenje novog.
 * Prijava je ista kao za ture - ko nije prijavljen, ide na /admin/ture.
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
  const [session, setSession] = useState<'checking' | 'in' | 'out'>('checking');
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'in' : 'out'));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/projects', { headers: await adminAuthHeader() });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      setError(json?.error || 'Projekti nisu učitani.');
      return;
    }
    setProjects(json.projects);
  }, []);

  useEffect(() => {
    if (session === 'in') Promise.resolve().then(load);
  }, [session, load]);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await adminAuthHeader()) },
        body: JSON.stringify({ action: 'create', title })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Projekat nije napravljen.');
        return;
      }
      router.push(`/admin/projekti/${json.id}`);
    } catch {
      setError('Nema veze sa serverom.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="pa k-form">
      <FormThemeStyle />
      <style>{PROJECT_ADMIN_STYLES}</style>
      <div className="pa-wrap">
        <div className="pa-top">
          <div>
            <div className="pa-crumbs">
              <a href="/admin/ture">← Ture</a>
            </div>
            <h1>Novogradnja · projekti</h1>
          </div>
        </div>

        {session === 'checking' && <p>Provera pristupa...</p>}
        {session === 'out' && (
          <p>
            Prvo se prijavite u <a href="/admin/ture">admin</a>, pa se vratite ovde.
          </p>
        )}

        {session === 'in' && (
          <>
            {error && <p className="pa-msg is-err">{error}</p>}
            <section className="pa-card">
              <h2>Novi projekat</h2>
              <p className="pa-hint">Naziv kako ga investitor prodaje, npr. „Rezidencija Lipa“. Ostalo se popunjava posle.</p>
              <form
                className="pa-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const advice = projectNameAdvice(title);
                  if (
                    advice.warnings.length &&
                    !window.confirm(`${advice.warnings.join(' ')}\n\nAdresa strane se posle ne menja. Ipak napraviti projekat „${title.trim()}“?`)
                  ) {
                    return;
                  }
                  create();
                }}
              >
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naziv projekta" style={{ maxWidth: 360 }} />
                <button className="pa-btn is-primary" type="submit" disabled={creating || !title.trim()}>
                  {creating ? 'Pravim...' : '+ Napravi projekat'}
                </button>
              </form>
              {title.trim() && (
                <p className="pa-hint" style={{ margin: '8px 0 0' }}>
                  Adresa strane: <b>/novogradnja/{slugify(title) || '…'}</b> — pravi se iz naziva i <b>posle se ne menja</b>.
                </p>
              )}
              <NameAdvice title={title} onAccept={setTitle} />
            </section>

            <section className="pa-card">
              <h2>Projekti</h2>
              {projects === null && !error && <p className="pa-hint">Učitavam...</p>}
              {projects?.length === 0 && <div className="pa-empty">Još nema projekata.</div>}
              <div className="pa-list">
                {projects?.map((p) => {
                  const total = p.counts.available + p.counts.reserved + p.counts.sold;
                  return (
                    <a key={p.id} className="pa-item" href={`/admin/projekti/${p.id}`}>
                      <span>
                        <b>{p.title}</b>
                        <small>
                          {[p.developer_name, p.city].filter(Boolean).join(' · ') || 'bez investitora'} ·{' '}
                          {total
                            ? `${total} ${srPlural(total, 'stan', 'stana', 'stanova')}: ${p.counts.available} slob., ${p.counts.reserved} rez., ${p.counts.sold} prod.`
                            : 'nema stanova'}
                        </small>
                      </span>
                      <span className={p.published ? 'pa-pill is-pub' : 'pa-pill is-draft'}>{p.published ? 'Objavljen' : 'U pripremi'}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
