'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Room } from '../types';
import { parseWaypoints } from '../utils';
import { LIVE_TIMING, type LiveAngles, type LiveViewer } from './protocol';
import { viewChanged } from './liveMath';
import { hfovToMobile } from '../transition';
import type { LiveSession } from './useLiveSession';

/**
 * Razgledanje uživo, strana agenta: šalje kupcu svoj pogled i sobu, i prati
 * gde kupac gleda (za traku i strelicu na ivici).
 */

export type PeerView = { roomId: string; yaw: number; pitch: number; following: boolean; lastSeen: number } | null;

export function useLiveGuide({
  session,
  active,
  viewerRef,
  rooms,
  roomIdx,
  changeRoomById
}: {
  session: LiveSession;
  active: boolean;
  viewerRef: MutableRefObject<LiveViewer | null>;
  rooms: Room[];
  roomIdx: number;
  changeRoomById: (id: string | number) => void;
}) {
  const [peer, setPeer] = useState<PeerView>(null);

  const roomId = rooms[roomIdx] ? String(rooms[roomIdx].id) : null;
  // Petlja i povratni pozivi čitaju sobu kroz ref, da se ne prave iznova.
  const roomIdRef = useRef<string | null>(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);
  // Soba koju je najavio klik na vrata (announceWalk) - njen dolazak se ne
  // šalje još jednom kao običan prelaz.
  const announcedRoomRef = useRef<string | null>(null);
  const { send, onEvent } = session;

  // Pogled: šalje se kad se promeni (najviše na viewMinMs) i kao otkucaj.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let lastSent: (LiveAngles & { roomId: string }) | null = null;
    let lastSentAt = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v = viewerRef.current;
      const roomId = roomIdRef.current;
      if (!v || !roomId) return;
      let now: LiveAngles;
      try {
        now = { yaw: v.getYaw(), pitch: v.getPitch(), hfov: v.getHfov() };
      } catch {
        return;
      }
      const t = performance.now();
      const changed = !lastSent || lastSent.roomId !== roomId || viewChanged(lastSent, now);
      if ((changed && t - lastSentAt >= LIVE_TIMING.viewMinMs) || t - lastSentAt >= LIVE_TIMING.heartbeatMs) {
        lastSent = { roomId, ...now };
        lastSentAt = t;
        send({ type: 'view', roomId, yaw: now.yaw, pitch: now.pitch, hfov: hfovToMobile(now.hfov) });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, send, viewerRef]);

  // Soba promenjena na bilo koji drugi način (spisak, strelice, tlocrt).
  useEffect(() => {
    if (!active || !roomId) return;
    if (announcedRoomRef.current === roomId) {
      announcedRoomRef.current = null;
      return;
    }
    send({ type: 'room', roomId, waypointIndex: null });
  }, [active, roomId, send]);

  useEffect(() => {
    if (!active) return;
    return onEvent((e) => {
      if (e.type !== 'viewer') return;
      setPeer({ roomId: e.roomId, yaw: e.yaw, pitch: e.pitch, following: e.following, lastSeen: Date.now() });
    });
  }, [active, onEvent]);

  /** Klik na tačku na vratima - zove se PRE walkToRoom, da kupac krene istom šetnjom. */
  const announceWalk = useCallback(
    (waypointIndex: number) => {
      if (!active) return;
      const room = rooms[roomIdx];
      const wp = room ? parseWaypoints(room.waypoints_i18n)[waypointIndex] : undefined;
      if (!wp || wp.targetRoomId == null) return;
      const target = String(wp.targetRoomId);
      announcedRoomRef.current = target;
      send({ type: 'room', roomId: target, waypointIndex });
    },
    [active, rooms, roomIdx, send]
  );

  /** Dodir na strelicu: agent se okreće tamo gde kupac gleda (ili ide u njegovu sobu). */
  const lookAtPeer = useCallback(() => {
    if (!peer) return;
    if (peer.roomId !== roomIdRef.current) {
      changeRoomById(peer.roomId);
      return;
    }
    try {
      viewerRef.current?.lookAt(peer.pitch, peer.yaw, undefined, 600);
    } catch {}
  }, [peer, changeRoomById, viewerRef]);

  // Posle završenog gledanja stari podatak o kupcu više ne važi.
  return { peer: active ? peer : null, announceWalk, lookAtPeer };
}
