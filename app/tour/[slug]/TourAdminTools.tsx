'use client';

import { createPortal } from 'react-dom';
import { THEME } from './theme';
import { type TourAdminToolsProps } from './_admin/shared';
import { useTourAdmin } from './_admin/useTourAdmin';
import AdminToolbar from './_admin/AdminToolbar';
import DraftModal from './_admin/DraftModal';
import VoiceModal from './_admin/VoiceModal';
import RenameModal from './_admin/RenameModal';
import NarrationModal from './_admin/NarrationModal';
import AddLanguageModal from './_admin/AddLanguageModal';
import GuidePathModal from './_admin/GuidePathModal';
import ProgressModal from './_admin/ProgressModal';

export type { TourAdminToolsProps } from './_admin/shared';

/**
 * Admin alati ture: dodavanje sobe, otpremanje panorame, AI popuna, glas i
 * jezici, sa svojim modalima.
 *
 * Stoji u posebnom fajlu jer page.tsx ovo učitava preko next/dynamic tek kad
 * postoji admin sesija. Posetilac ture ga nikad ne skida - a to je oko
 * polovine koda koji je ranije stizao svakome ko otvori link.
 *
 * Uređivanje hotspotova namerno NIJE ovde: klik na tačku u panorami ga
 * pokreće direktno iz viewer-a, pa mora da živi uz viewer u page.tsx.
 */

export default function TourAdminTools(props: TourAdminToolsProps) {
  const a = useTourAdmin(props);
  const { variant, creatingRoom, handleAddRoom, toolbarSlot } = a;

  // Tura bez ijedne sobe: jedino što admin može da uradi je da napravi prvu.
  if (variant === 'empty') {
    return (
      <button
        onClick={handleAddRoom}
        disabled={creatingRoom}
        style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', backgroundColor: THEME.accent, color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30, 90, 168, 0.35)' }}
      >
        {creatingRoom ? 'Kreiranje...' : '➕ Kreiraj prvu sobu'}
      </button>
    );
  }

  return (
    <>
      {toolbarSlot && createPortal(<AdminToolbar a={a} />, toolbarSlot)}

      {/* MODAL: PREGLED I IZMENA SRPSKOG DRAFTA + ODABIR JEZIKA */}
      <DraftModal a={a} />

      {/* MODAL: SAMOSTALNO GENERISANJE/OSVEŽAVANJE AI GLASA ZA POSTOJEĆI SADRŽAJ */}
      <VoiceModal a={a} />

      {/* MODAL: PREIMENOVANJE TRENUTNE SOBE, U BILO KOM TRENUTKU */}
      <RenameModal a={a} />

      {/* MODAL: IZMENA TEKSTA UVODNE NARACIJE, U BILO KOM TRENUTKU */}
      <NarrationModal a={a} />

      {/* MODAL: DODAVANJE (PREVOĐENJE) SOBE NA DODATNI JEZIK U BILO KOM TRENUTKU */}
      <AddLanguageModal a={a} />

      {/* MODAL: PUTANJA AUTOMATSKOG VODIČA (na nivou cele ture, ne sobe) */}
      <GuidePathModal a={a} />

      {/* MODAL: NAPREDAK PREVOĐENJA / GENERISANJA GLASA / UPLOAD-A PANORAME */}
      <ProgressModal a={a} />
    </>
  );
}
