'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

declare global {
  interface Window {
    pannellum: any;
  }
}

export default function TourPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    // Ako slug još uvek nije dostupan, sačekaj
    if (!slug) return;

    async function loadTour() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setError('Tura nije pronađena.');
        setLoading(false);
        return;
      }

      setTour(data);
      setLoading(false);
    }

    loadTour();
  }, [slug]);

  if (loading) {
    return <div style={{ color: 'white', padding: '20px' }}>Učitavanje...</div>;
  }

  if (error || !tour) {
    return <div style={{ color: 'white', padding: '20px' }}>{error || 'Tura nije pronađena.'}</div>;
  }

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <h1 style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white' }}>
        {tour.title}
      </h1>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}