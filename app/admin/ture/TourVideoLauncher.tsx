'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TourVideoModal from '../../tour/[slug]/video/TourVideoModal';
import type { Room, Tour } from '../../tour/[slug]/types';
import { FORM, formBtnStyle } from '../../lib/formTheme';

/**
 * Dugme "Video" u spisku tura (pored "Iframe" i "QR") otvara ovo: učita celu
 * turu i sobe (spisak ima samo osnovne podatke), pa otvori isti prozor za
 * video kao ranije u turi. Vlasnik je 1. 10. 2026 tražio da video stoji uz
 * ostale gotove stvari za agenciju, a ne u admin traci ture.
 */
export default function TourVideoLauncher({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<{ tour: Tour; rooms: Room[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.from('tours').select('*').eq('slug', slug).single(),
      supabase.from('rooms').select('*').eq('tour_slug', slug).order('order_index', { ascending: true })
    ]).then(([tourRes, roomsRes]) => {
      if (cancelled) return;
      if (tourRes.error || !tourRes.data) {
        setError('Tura nije mogla da se učita. Proverite da li ste prijavljeni i pokušajte ponovo.');
        return;
      }
      const tour = tourRes.data as unknown as Tour;
      const rooms = (roomsRes.data ?? []) as unknown as Room[];
      // Logo agencije za uvodnu i završnu karticu videa (agency_branding, 027).
      const agency = tour.agency_name;
      if (!agency) {
        setData({ tour, rooms });
        return;
      }
      void supabase
        .from('agency_branding')
        .select('logo_url')
        .eq('agency_name', agency)
        .maybeSingle()
        .then(({ data: branding }) => {
          if (!cancelled) setData({ tour: { ...tour, agency_logo_url: branding?.logo_url ?? null }, rooms });
        });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (data) return <TourVideoModal tour={data.tour} rooms={data.rooms} initialLang="sr" onClose={onClose} />;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17, 17, 19, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 22px', maxWidth: '360px', textAlign: 'center', color: FORM.textMuted, fontSize: '14px' }}>
        {error ? (
          <>
            <p style={{ margin: '0 0 14px', color: FORM.danger }}>{error}</p>
            <button onClick={onClose} style={{ ...formBtnStyle, padding: '8px 16px' }}>Zatvori</button>
          </>
        ) : (
          'Učitavam turu…'
        )}
      </div>
    </div>
  );
}
