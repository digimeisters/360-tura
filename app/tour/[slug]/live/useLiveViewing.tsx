'use client';

import { useEffect, useState, useSyncExternalStore, type MutableRefObject, type ReactNode } from 'react';
import type { Language, Room, Tour, Waypoint } from '../types';
import { getLocalizedText } from '../utils';
import { LIVE_CODE_RE, LIVE_TIMING, type LiveRole, type LiveViewer } from './protocol';
import { edgeSide } from './liveMath';
import { useLiveSession, LIVE_OVER } from './useLiveSession';
import { useLiveGuide, type PeerView } from './useLiveGuide';
import { useLiveFollow } from './useLiveFollow';
import { showLivePoint, useLongPress } from './livePointer';
import {
  LiveBackButton,
  LiveBar,
  LiveEndCard,
  LiveJoinCard,
  LivePeerArrow,
  LiveShareCard,
  LiveStartButton,
  LiveStyles,
  fill
} from './LiveUi';

/**
 * Razgledanje uživo: jedino mesto koje tura (page.tsx) poziva.
 *
 * ?agent=<token> → agent (proverava se na serveru, /api/live/start)
 * ?uzivo=<KOD>   → kupac
 * Bez njih (ili u admin režimu) ništa se ne menja.
 */

export type LiveViewing = {
  role: LiveRole | null;
  /** Kupac je u razgledanju i prati agenta (gasi žiroskop). */
  viewerFollowing: boolean;
  /** Gasi uvod, glas sobe i automatsko vođenje. */
  blocksAutoplay: boolean;
  /** Kupac umesto uvodnog ekrana vidi karticu za ulazak. */
  skipWelcome: boolean;
  announceWalk: (waypointIndex: number) => void;
  /** Traka "UŽIVO" - ide u gornju kolonu ture, ispod izbora sobe. */
  topBar: ReactNode;
  /** Dugme "Uživo" - ide ispod dugmadi sa strane. */
  sideButton: ReactNode;
  /** Kartice, strelica, dugme za povratak. */
  ui: ReactNode;
};

const noSubscribe = () => () => {};

/** Proverava agentov link na serveru; vraća kod za jedno gledanje ili null. */
async function requestLiveCode(slug: string, token: string): Promise<string | null> {
  try {
    const res = await fetch('/api/live/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, token })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string };
    return data.code && LIVE_CODE_RE.test(data.code) ? data.code : null;
  } catch {
    return null;
  }
}

function PeerArrow({
  peer,
  roomId,
  rooms,
  lang,
  viewerRef,
  onClick,
  t
}: {
  peer: PeerView;
  roomId: string | null;
  rooms: Room[];
  lang: Language;
  viewerRef: MutableRefObject<LiveViewer | null>;
  onClick: () => void;
  t: Record<string, string>;
}) {
  // Agentov pogled se čita iz viewera na 4 Hz - dovoljno za strelicu.
  const [self, setSelf] = useState<{ yaw: number; hfov: number } | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const v = viewerRef.current;
        if (v) setSelf({ yaw: v.getYaw(), hfov: v.getHfov() });
      } catch {}
    }, 250);
    return () => clearInterval(id);
  }, [viewerRef]);

  if (!peer || peer.following) return null;
  if (peer.roomId !== roomId) {
    const room = rooms.find((r) => String(r.id) === peer.roomId);
    return <LivePeerArrow side={null} peerRoomTitle={room ? getLocalizedText(room.title_i18n, lang) : null} onClick={onClick} t={t} />;
  }
  if (!self) return null;
  return <LivePeerArrow side={edgeSide(self.yaw, peer.yaw, self.hfov)} peerRoomTitle={null} onClick={onClick} t={t} />;
}

export function useLiveViewing({
  slug,
  tour,
  lang,
  t,
  rooms,
  roomIdx,
  viewerRef,
  walkToRoom,
  changeRoomById,
  sceneReadyRef,
  walkingRef,
  tourStarted,
  startTour,
  adminMode,
  coverUrl,
  tourTitle
}: {
  slug: string;
  tour: Tour | null;
  lang: Language;
  t: Record<string, string>;
  rooms: Room[];
  roomIdx: number;
  viewerRef: MutableRefObject<LiveViewer | null>;
  walkToRoom: (wp: Waypoint) => void;
  changeRoomById: (id: string | number) => void;
  sceneReadyRef: MutableRefObject<boolean>;
  walkingRef: MutableRefObject<boolean>;
  tourStarted: boolean;
  startTour: () => void;
  adminMode: boolean;
  coverUrl: string | null;
  tourTitle: string;
}): LiveViewing {
  // Adresa se čita bez efekta (na serveru je prazna, u pregledaču prava).
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => '');
  const params = new URLSearchParams(search);
  const agentToken = params.get('agent');
  const rawCode = params.get('uzivo');
  const viewerCode = rawCode && LIVE_CODE_RE.test(rawCode) ? rawCode : null;
  const role: LiveRole | null = adminMode ? null : agentToken ? 'guide' : viewerCode ? 'viewer' : null;

  // Agent: kod iz /api/live/start čeka klik na "Uživo"; svako gledanje dobija nov kod.
  const [nextCode, setNextCode] = useState<string | null>(null);
  const [guideCode, setGuideCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  // Kupac: ušao u razgledanje / zatvorio završnu karticu.
  const [joined, setJoined] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (role !== 'guide' || !agentToken) return;
    let cancelled = false;
    void requestLiveCode(slug, agentToken).then((code) => {
      if (!cancelled) setNextCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, [role, agentToken, slug]);

  const session = useLiveSession({
    slug,
    code: role === 'guide' ? guideCode : role === 'viewer' && !dismissed ? viewerCode : null,
    role: role ?? 'viewer'
  });
  const terminal = LIVE_OVER.includes(session.status);
  const roomId = rooms[roomIdx] ? String(rooms[roomIdx].id) : null;
  const agentName = tour?.agent_name?.trim() || t.liveAgentFallback;

  const guideActive = role === 'guide' && guideCode !== null && !terminal;
  const viewerActive = role === 'viewer' && joined && !dismissed && !terminal;

  const guide = useLiveGuide({ session, active: guideActive, viewerRef, rooms, roomIdx, changeRoomById });
  const follow = useLiveFollow({
    session,
    active: viewerActive,
    viewerRef,
    rooms,
    roomIdx,
    walkToRoom,
    changeRoomById,
    sceneReadyRef,
    walkingRef
  });

  // Pokazivač: agent ga pravi dugim pritiskom, kupac ga dobija porukom.
  const { send, onEvent } = session;
  useLongPress({
    enabled: guideActive,
    viewerRef,
    onPoint: (p) => {
      if (!roomId) return;
      showLivePoint(viewerRef.current, p);
      send({ type: 'point', roomId, ...p });
    }
  });
  // Kupac koji gleda na drugu stranu dobija strelicu ka tački (spec §6).
  const [pointSide, setPointSide] = useState<'left' | 'right' | null>(null);
  useEffect(() => {
    if (!viewerActive) return;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const off = onEvent((e) => {
      if (e.type !== 'point' || e.roomId !== roomId) return;
      const v = viewerRef.current;
      showLivePoint(v, e, fill(t.livePointing, { name: agentName }));
      let side: 'left' | 'right' | null = null;
      try {
        if (v) side = edgeSide(v.getYaw(), e.yaw, v.getHfov());
      } catch {}
      setPointSide(side);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setPointSide(null), LIVE_TIMING.pointTtlMs);
    });
    return () => {
      off();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [viewerActive, onEvent, roomId, viewerRef, t.livePointing, agentName]);

  const startLive = () => {
    if (!nextCode) return;
    setGuideCode(nextCode);
    setShareUrl(`${window.location.origin}/tour/${slug}?uzivo=${nextCode}`);
    setShareOpen(true);
    setNextCode(null);
  };

  const endLive = () => {
    session.end();
    setGuideCode(null);
    setShareOpen(false);
    // Kod za sledeće gledanje.
    if (agentToken) void requestLiveCode(slug, agentToken).then(setNextCode);
  };

  const join = () => {
    setJoined(true);
    startTour();
  };

  const leaveLive = () => {
    setDismissed(true);
    // ?uzivo više ne važi - osvežavanje strane ne sme da vrati karticu.
    const url = new URL(window.location.href);
    url.searchParams.delete('uzivo');
    window.history.replaceState(null, '', url.toString());
    if (!tourStarted) startTour();
  };

  let topBar: ReactNode = null;
  let sideButton: ReactNode = null;
  let ui: ReactNode = null;

  if (role === 'guide') {
    if (guideActive) {
      topBar = (
        <LiveBar
          role="guide"
          status={session.status}
          peer={guide.peer}
          peerPresent={session.peerPresent}
          following={false}
          agentName={agentName}
          onEnd={endLive}
          t={t}
        />
      );
      ui = (
        <>
          <LiveStyles />
          {shareOpen && !session.peerPresent && (
            <LiveShareCard url={shareUrl} peerPresent={session.peerPresent} onClose={() => setShareOpen(false)} t={t} />
          )}
          <PeerArrow peer={guide.peer} roomId={roomId} rooms={rooms} lang={lang} viewerRef={viewerRef} onClick={guide.lookAtPeer} t={t} />
        </>
      );
    } else if (nextCode && tourStarted) {
      sideButton = (
        <div style={{ alignSelf: 'flex-end', marginRight: 4, marginTop: 8 }}>
          <LiveStartButton onClick={startLive} t={t} />
        </div>
      );
    }
  } else if (role === 'viewer' && !dismissed) {
    if (terminal) {
      const reason = session.status === 'ended' ? 'ended' : session.status === 'never' ? 'never' : session.status === 'lost' ? 'lost' : 'failed';
      ui = <LiveEndCard reason={reason} agentName={agentName} onContinue={leaveLive} t={t} />;
    } else if (!joined) {
      ui = (
        <LiveJoinCard
          agentName={agentName}
          agencyName={tour?.agency_name ?? null}
          tourTitle={tourTitle}
          coverUrl={coverUrl}
          guidePresent={session.peerPresent}
          onJoin={join}
          t={t}
        />
      );
    } else {
      topBar = (
        <LiveBar
          role="viewer"
          status={session.status}
          peer={null}
          peerPresent={session.peerPresent}
          following={follow.following}
          agentName={agentName}
          onEnd={() => {}}
          t={t}
        />
      );
      ui = (
        <>
          <LiveStyles />
          {!follow.following && session.status === 'live' && <LiveBackButton onClick={follow.rejoin} t={t} />}
          {pointSide && (
            <LivePeerArrow
              side={pointSide}
              peerRoomTitle={null}
              label={fill(t.livePointing, { name: agentName })}
              onClick={() => {
                setPointSide(null);
                follow.rejoin();
              }}
              t={t}
            />
          )}
        </>
      );
    }
  }

  return {
    role,
    viewerFollowing: viewerActive && follow.following,
    blocksAutoplay: role === 'guide' || (role === 'viewer' && !dismissed),
    skipWelcome: role === 'viewer' && !dismissed,
    announceWalk: guide.announceWalk,
    topBar,
    sideButton,
    ui
  };
}
