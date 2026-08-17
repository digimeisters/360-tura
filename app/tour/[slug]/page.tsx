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
  const slug = params.slug as string;

  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Učitaj podatke o turi iz baze, na osnovu slug-a iz linka
  useEffect(() => {
    async function loadTour() {
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setError('Tura nije pronađena.');
      } else {
        setTour(data);
      }
      setLoading(false);
    }
    loadTour();
  }, [slug]);

  // Kad podaci stignu, pokreni 360 viewer
  useEffect(() => {
    if (!tour) return;

    if (!document.querySelector('link[data-pannellum]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';
      link.setAttribute('data-pannellum', 'true');
      document.head.appendChild(link);
    }

    function initViewer() {
      if (containerRef.current && window.pannellum && !viewerRef.current) {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: 'equirectangular',
          panorama: tour.panorama_url,
          autoLoad: true,
        });
      }
    }

    if (window.pannellum) {
      initViewer();
    } else if (!document.querySelector('script[data-pannellum]')) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
      script.setAttribute('data-pannellum', 'true');
      script.onload = initViewer;
      document.body.appendChild(script);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [tour]);

  if (loading) {
    return (
      <div style={{ color: 'white', background: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Učitavanje...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'white', background: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <h1 style={{ position: 'absolute', top: 16, left: 16, color: 'white', fontFamily: 'sans-serif', textShadow: '0 2px 6px black', margin: 0 }}>
        {tour.title}
      </h1>
    </main>
  );
}