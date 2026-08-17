'use client';

import { useEffect, useRef } from 'react';

// Zameni ovo sa URL-om slike koji si kopirao/la u Koraku 5
const PANORAMA_URL = 'https://aifpttsqwkvaopoqieov.supabase.co/storage/v1/object/public/panoramas/IMG_20231207_140331_S.jpg';

declare global {
  interface Window {
    pannellum: any;
  }
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
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
          panorama: PANORAMA_URL,
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
  }, []);

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}