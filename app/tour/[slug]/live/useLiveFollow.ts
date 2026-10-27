'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Room, Waypoint } from '../types';
import { parseWaypoints } from '../utils';
import { LIVE_TIMING, type LiveAngles, type LiveEvent, type LiveViewer } from './protocol';
import { roomChangeDetaches, stepToward, viewChanged } from './liveMath';
import { hfovFromMobile } from '../transition';
import type { LiveSession } from './useLiveSession';

/**
 * Razgledanje uživo, strana kupca: kamera glatko prati agenta, dok kupac sam
 * ne pipne panoramu ili ne promeni sobu - tada se odvaja i gleda sam, a
 * "Vrati se agentu" (rejoin) ga vraća.
 *
 * Viewer se pravi iznova za svaku sobu, pa se uvek čita viewerRef.current.
 */

type ViewTarget = Extract<LiveEvent, { type: 'view' }>;

const ROOM_RETRY_MS = 3000;

export function useLiveFollow({
  session,
  active,
  viewerRef,
  rooms,
  roomIdx,
  walkToRoom,
  changeRoomById,
  sceneReadyRef,
  walkingRef
}: {
  session: LiveSession;
  active: boolean;
  viewerRef: MutableRefObject<LiveViewer | null>;
  rooms: Room[];
  roomIdx: number;
  walkToRoom: (wp: Waypoint) => void;
  changeRoomById: (id: string | number) => void;
  sceneReadyRef: MutableRefObject<boolean>;
  walkingRef: MutableRefObject<boolean>;
}) {
  const [following, setFollowingState] = useState(true);
  const followingRef = useRef(true);
  const targetRef = useRef<ViewTarget | null>(null);
  // Soba u koju ga praćenje upravo vodi; dolazak u bilo koju drugu = sam je izabrao.
  const expectedRoomRef = useRef<string | null>(null);
  const roomId = rooms[roomIdx] ? String(rooms[roomIdx].id) : null;
  // Petlja i poruke čitaju sobu kroz ref-ove; ovaj efekat je prvi, pa ostali
  // efekti istog rendera već vide novu sobu.
  const roomIdRef = useRef<string | null>(roomId);
  const roomsRef = useRef(rooms);
  useEffect(() => {
    roomIdRef.current = roomId;
    roomsRef.current = rooms;
  }, [roomId, rooms]);
  const forceSendRef = useRef(false);
  const { send, onEvent } = session;

  const setFollowing = useCallback((next: boolean) => {
    if (followingRef.current === next) return;
    followingRef.current = next;
    setFollowingState(next);
    forceSendRef.current = true;
  }, []);

  // Poslednji zahtev za prelaz: view poruke stižu 10 puta u sekundi, a soba se
  // promeni tek posle rendera - bez ovoga bi se isti prelaz pokrenuo više puta.
  // Posle ROOM_RETRY_MS se pokušava ponovo (npr. šetnja koja se nije pokrenula).
  const pendingRoomRef = useRef<{ id: string; at: number } | null>(null);

  const goToRoom = useCallback(
    (roomId: string) => {
      if (roomId === roomIdRef.current) return;
      const pending = pendingRoomRef.current;
      if (pending && pending.id === roomId && performance.now() - pending.at < ROOM_RETRY_MS) return;
      pendingRoomRef.current = { id: roomId, at: performance.now() };
      expectedRoomRef.current = roomId;
      changeRoomById(roomId);
    },
    [changeRoomById]
  );

  // Početak gledanja: trenutna soba je "očekivana". Praćenje kreće uključeno
  // (početno stanje), jer odvajanje postoji samo dok je gledanje aktivno.
  useEffect(() => {
    if (active) expectedRoomRef.current = roomIdRef.current;
  }, [active]);

  // Poruke agenta.
  useEffect(() => {
    if (!active) return;
    return onEvent((e) => {
      if (e.type === 'view') {
        // Zum stiže u telefonskoj meri (transition.ts) - ovde se vraća na meru ovog ekrana.
        targetRef.current = { ...e, hfov: hfovFromMobile(e.hfov) };
        // Kasni ulazak ili propušten prelaz: agent je u drugoj sobi.
        if (followingRef.current && e.roomId !== roomIdRef.current && !walkingRef.current) goToRoom(e.roomId);
        return;
      }
      if (e.type !== 'room' || !followingRef.current) return;
      const room = roomsRef.current.find((r) => String(r.id) === roomIdRef.current);
      const wp = e.waypointIndex != null && room ? parseWaypoints(room.waypoints_i18n)[e.waypointIndex] : undefined;
      if (wp && String(wp.targetRoomId) === e.roomId) {
        expectedRoomRef.current = e.roomId;
        pendingRoomRef.current = { id: e.roomId, at: performance.now() };
        walkToRoom(wp);
      } else {
        goToRoom(e.roomId);
      }
    });
  }, [active, onEvent, goToRoom, walkToRoom, walkingRef]);

  // Kupac sam promenio sobu → odvaja se.
  useEffect(() => {
    if (!active || !roomId) return;
    if (roomChangeDetaches(roomId, expectedRoomRef.current)) setFollowing(false);
    expectedRoomRef.current = roomId;
    pendingRoomRef.current = null;
  }, [active, roomId, setFollowing]);

  // Kupac sam pipnuo panoramu → odvaja se. Programski setYaw ne pravi ove događaje.
  useEffect(() => {
    if (!active) return;
    const el = document.getElementById('panorama');
    if (!el) return;
    const detach = () => setFollowing(false);
    el.addEventListener('pointerdown', detach, true);
    el.addEventListener('wheel', detach, { capture: true, passive: true });
    return () => {
      el.removeEventListener('pointerdown', detach, true);
      el.removeEventListener('wheel', detach, true);
    };
  }, [active, setFollowing]);

  // Jedna petlja: glatko praćenje cilja + javljanje agentu gde kupac gleda.
  useEffect(() => {
    if (!active) return;    let raf = 0;
    let prev = performance.now();
    let lastSent: (LiveAngles & { roomId: string }) | null = null;
    let lastSentAt = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = performance.now();
      const dt = t - prev;
      prev = t;
      const v = viewerRef.current;
      const roomId = roomIdRef.current;
      if (!v || !roomId) return;
      let cur: LiveAngles;
      try {
        cur = { yaw: v.getYaw(), pitch: v.getPitch(), hfov: v.getHfov() };
      } catch {
        return;
      }

      const target = targetRef.current;
      if (followingRef.current && target && target.roomId === roomId && sceneReadyRef.current && !walkingRef.current) {
        const next = stepToward(cur, target, dt);
        if (viewChanged(cur, next) || next.yaw !== cur.yaw || next.pitch !== cur.pitch || next.hfov !== cur.hfov) {
          try {
            v.setPitch(next.pitch, 0);
            v.setYaw(next.yaw, 0);
            v.setHfov(next.hfov, 0);
          } catch {}
        }
      }

      const changed = !lastSent || lastSent.roomId !== roomId || viewChanged(lastSent, cur);
      if (
        forceSendRef.current ||
        (changed && t - lastSentAt >= LIVE_TIMING.viewerMinMs) ||
        t - lastSentAt >= LIVE_TIMING.heartbeatMs
      ) {
        forceSendRef.current = false;
        lastSent = { roomId, ...cur };
        lastSentAt = t;
        send({ type: 'viewer', roomId, yaw: cur.yaw, pitch: cur.pitch, following: followingRef.current });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, send, viewerRef, sceneReadyRef, walkingRef]);

  /** "Vrati se agentu": prvo u agentovu sobu ako treba, pa glatko na njegov pogled. */
  const rejoin = useCallback(() => {
    setFollowing(true);
    const target = targetRef.current;
    if (target && target.roomId !== roomIdRef.current) goToRoom(target.roomId);
  }, [goToRoom, setFollowing]);

  return { following, rejoin };
}
