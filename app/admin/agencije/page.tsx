'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FORM, formBtnStyle } from '../../lib/formTheme';
import AgencyTable, { type AgencyReport } from './AgencyTable';
import SendOfferDialog from './SendOfferDialog';

/**
 * Strana "Agencije" u adminu: logo agencije u turama i link mesečnog
 * izveštaja. Podaci dolaze iz istog GET /api/admin/tours koji koristi strana
 * Ture (polje agencyReports). Prijavu drži okvir admina (AdminShell).
 */
export default function AgenciesAdminPage() {
  const [reports, setReports] = useState<AgencyReport[] | null>(null);
  const [error, setError] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/tours', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Agencije nisu učitane.');
        return;
      }
      setReports(json.agencyReports ?? []);
    } catch {
      setError('Nema veze sa serverom.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const count = reports?.length ?? 0;

  return (
    <main className="k-form" style={{ minHeight: '100dvh', background: FORM.bg, color: FORM.textPrimary, fontFamily: FORM.fontBody, padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '20px', margin: 0, fontFamily: FORM.fontDisplay }}>Agencije</h1>
            {reports && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: FORM.textSecondary }}>
                {count} {count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'agencije' : 'agencija'} · mesečni izveštaj i logo u turama
              </p>
            )}
          </div>
          {/* Ponuda ide agenciji koja još nema ture, pa je dugme ovde, ne u redu tabele. */}
          <button type="button" onClick={() => setOfferOpen(true)} style={{ ...formBtnStyle, background: FORM.accent, color: FORM.onAccent, borderColor: FORM.accent }}>
            ✉ Pošalji ponudu
          </button>
        </header>
        {offerOpen && <SendOfferDialog onClose={() => setOfferOpen(false)} />}
        {error && <p style={{ margin: '0 0 12px', color: FORM.danger, fontSize: '13.5px' }}>{error}</p>}
        {!reports && !error && <p style={{ color: FORM.textSecondary }}>Učitavanje…</p>}
        {reports && <AgencyTable reports={reports} onLogoChanged={() => void load()} />}
      </div>
    </main>
  );
}
