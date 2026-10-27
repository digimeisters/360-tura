'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabaseClient';
import {
  LIVE_TIMING,
  liveChannelName,
  parseLiveEvent,
  toPayload,
  type LiveEvent,
  type LiveEventType,
  type LiveRole
} from './protocol';

/**
 * Razgledanje uživo: jedan Supabase Realtime kanal po gledanju.
 *
 * Kanal je javan (anon ključ), bez tabele i bez našeg servera: broadcast nosi
 * poruke (protocol.ts), a presence kaže ko je trenutno tu - agent ("guide")
 * ili kupac ("viewer"). Ponovno povezivanje posle kratkog prekida (tunel,
 * WiFi → mobilni) radi Supabase klijent sam; ovde se samo prate statusi.
 */

export type LiveStatus = 'connecting' | 'waiting' | 'live' | 'ended' | 'never' | 'lost' | 'failed';

export type LiveSession = {
  status: LiveStatus;
  /** Agent: bar jedan kupac je na kanalu. Kupac: agent je na kanalu. */
  peerPresent: boolean;
  /** Tiho ne radi ništa dok kanal nije spreman ili posle kraja. */
  send: (e: LiveEvent) => void;
  /** Prijava na poruke druge strane; vraća odjavu. */
  onEvent: (handler: (e: LiveEvent) => void) => () => void;
  /** Agent: javlja kupcu kraj i zatvara kanal. */
  end: () => void;
};

const EVENT_TYPES: LiveEventType[] = ['view', 'room', 'point', 'end', 'viewer'];
/** Kraj iz kog nema povratka - kanal je zatvoren. */
export const TERMINAL: LiveStatus[] = ['ended', 'failed'];
/**
 * Kupcu se pokazuje završna kartica. "lost" i "never" nisu konačni: kanal
 * ostaje otvoren, pa ako se agent vrati (npr. bio je u Viberu na telefonu,
 * pa mu je pregledač zaspao), gledanje se samo nastavlja i kartica nestaje.
 */
export const LIVE_OVER: LiveStatus[] = ['ended', 'never', 'lost', 'failed'];

export function useLiveSession({ slug, code, role }: { slug: string; code: string | null; role: LiveRole }): LiveSession {
  // Stanje pamti i kod gledanja na koje se odnosi: novo gledanje (novi kod)
  // tako odmah kreće od "connecting", bez resetovanja u efektu.
  const [state, setState] = useState<{ code: string | null; status: LiveStatus; peerPresent: boolean }>({
    code: null,
    status: 'connecting',
    peerPresent: false
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const statusRef = useRef<LiveStatus>('connecting');
  const handlersRef = useRef(new Set<(e: LiveEvent) => void>());
  // Presence ključ: jedan po tabu, da agent i kupac na istom računaru
  // (provera sa dva taba) ne budu jedna ista osoba za kanal.
  const [presenceKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2)
  );

  useEffect(() => {
    statusRef.current = 'connecting';
    subscribedRef.current = false;
    if (!code) return;

    const update = (next: LiveStatus) => {
      if (TERMINAL.includes(statusRef.current)) return;
      statusRef.current = next;
      setState((s) => ({ code, status: next, peerPresent: s.code === code ? s.peerPresent : false }));
    };
    const setPeerPresent = (present: boolean) =>
      setState((s) => ({ code, status: s.code === code ? s.status : statusRef.current, peerPresent: present }));

    let noGuideTimer: ReturnType<typeof setTimeout> | null = null;
    let lostTimer: ReturnType<typeof setTimeout> | null = null;
    let hadGuide = false;
    const clearTimers = () => {
      if (noGuideTimer) clearTimeout(noGuideTimer);
      if (lostTimer) clearTimeout(lostTimer);
      noGuideTimer = lostTimer = null;
    };

    const channel = supabase.channel(liveChannelName(slug, code), {
      config: { broadcast: { self: false }, presence: { key: presenceKey } }
    });
    channelRef.current = channel;

    const close = () => {
      clearTimers();
      subscribedRef.current = false;
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };

    for (const type of EVENT_TYPES) {
      channel.on('broadcast', { event: type }, (msg) => {
        const e = parseLiveEvent(type, msg.payload);
        if (!e) return;
        // Kupac sluša samo agenta, agent samo kupca.
        const fromGuide = e.type !== 'viewer';
        if (fromGuide !== (role === 'viewer')) return;
        if (e.type === 'end') {
          update('ended');
          close();
        }
        handlersRef.current.forEach((h) => h(e));
      });
    }

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ role?: LiveRole }>();
      const wanted: LiveRole = role === 'guide' ? 'viewer' : 'guide';
      const present = Object.entries(state).some(
        ([key, metas]) => key !== presenceKey && metas.some((m) => m.role === wanted)
      );
      setPeerPresent(present);

      if (role === 'guide') {
        update(present ? 'live' : 'waiting');
        return;
      }
      if (present) {
        hadGuide = true;
        clearTimers();
        update('live');
      } else if (hadGuide && !lostTimer) {
        update('waiting');
        lostTimer = setTimeout(() => {
          update('lost');
        }, LIVE_TIMING.guideLostMs);
      }
    });

    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        subscribedRef.current = true;
        void channel.track({ role });
        if (statusRef.current === 'connecting') update('waiting');
        if (role === 'viewer' && !hadGuide && !noGuideTimer) {
          noGuideTimer = setTimeout(() => {
            if (!hadGuide) {
              update('never');
            }
          }, LIVE_TIMING.noGuideMs);
        }
      } else if ((state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') && statusRef.current === 'connecting') {
        update('failed');
        close();
      }
    });

    return close;
  }, [slug, code, role, presenceKey]);

  const send = useCallback((e: LiveEvent) => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current) return;
    void channel.send({ type: 'broadcast', event: e.type, payload: toPayload(e) });
  }, []);

  const onEvent = useCallback((handler: (e: LiveEvent) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const end = useCallback(() => {
    const channel = channelRef.current;
    if (channel && subscribedRef.current) {
      void channel.send({ type: 'broadcast', event: 'end', payload: toPayload({ type: 'end' }) });
    }
    if (!TERMINAL.includes(statusRef.current)) {
      statusRef.current = 'ended';
      setState((s) => ({ ...s, status: 'ended' }));
    }
    if (channel) {
      subscribedRef.current = false;
      // Kratak predah da poruka o kraju stigne pre zatvaranja kanala.
      setTimeout(() => void supabase.removeChannel(channel), 300);
      channelRef.current = null;
    }
  }, []);

  const current = state.code === code && code !== null;
  return {
    status: current ? state.status : 'connecting',
    peerPresent: current ? state.peerPresent : false,
    send,
    onEvent,
    end
  };
}
