'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
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
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // 1. Sigurno učitavanje podataka uz try/catch/finally
  useEffect(() => {
    if (!slug) return;

    async function loadTour() {
      setLoading(true);
      try {
        const { data, error: dbError } = await supabase
          .from('tours')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (dbError || !data) {
          setError('Tura nije pronađena.');
        } else {
          setTour(data);
        }
      } catch (e: any) {
        console.error('Greška pri učitavanju:', e);
        setError('Došlo je do greške u komunikaciji sa bazom.');
      } finally {
        setLoading(false); // Gasi loading ekran bez obzira na ishod
      }
    }

    loadTour();
  }, [slug]);

  // 2. Inicijalizacija Pannellum-a
  useEffect(() => {
    if (!tour || !containerRef.current || !scriptLoaded) return;

    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch (e) {}
    }

    if (window.pannellum) {
      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: tour.panorama_url,
        autoLoad: true,
      });
    }
  }, [tour, scriptLoaded]);

  if (loading) {
    return (
      <div style={{ color: 'white', padding: '20px', background: '#111', height: '100vh' }}>
        Učitavanje podataka...
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div style={{ color: 'white', padding: '20px', background: '#111', height: '100vh' }}>
        {error || 'Tura nije pronađena.'}
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <main style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
        <h1
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10,
            color: 'white',
            background: 'rgba(0,0,0,0.6)',
            padding: '8px 16px',
            borderRadius: '6px',
            margin: 0,
            fontSize: '18px',
            fontFamily: 'sans-serif',
          }}
        >
          {tour.title}
        </h1>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </main>
    </>
  );
}
