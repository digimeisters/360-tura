'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ABOVE_MENU_BOTTOM, FILL_ACCENT, FILL_GLASS_ACCENT, GLASS, GLASS_ACCENT, SCREEN_BOTTOM, THEME, overlayIconStyle } from '../theme';
import { LIVE_POINT_CSS } from './livePointer';
import { LIVE_TIMING, type LiveRole } from './protocol';
import type { LiveStatus } from './useLiveSession';
import type { PeerView } from './useLiveGuide';

/**
 * Razgledanje uživo: svi ekrani (mockup public/mockup/RazgledanjeUzivo.html).
 * Tamno staklo kao ostatak ture, mete od najmanje 44 px.
 */

type T = Record<string, string>;

const LIVE_RED = '#E5484D';

/** "{name} vas vodi" → "Marko vas vodi". */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

const cardStyle: CSSProperties = {
  ...GLASS,
  position: 'fixed',
  left: 12,
  right: 12,
  margin: '0 auto',
  maxWidth: 420,
  zIndex: 60,
  background: 'rgba(15, 20, 34, 0.86)',
  borderRadius: 20,
  padding: '15px 16px 16px',
  color: '#fff',
  fontFamily: THEME.fontBody,
  pointerEvents: 'auto'
};
const kickerStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: '#9cc3ff',
  fontWeight: 700,
  paddingRight: 36
};
const titleStyle: CSSProperties = {
  fontFamily: THEME.fontDisplay,
  fontWeight: 800,
  fontSize: 17,
  lineHeight: 1.2,
  margin: '5px 0 8px',
  paddingRight: 24
};
const textStyle: CSSProperties = { fontSize: 12.5, color: 'rgba(255,255,255,.8)', lineHeight: 1.45, margin: '0 0 10px' };
const primaryBtn: CSSProperties = {
  ...FILL_ACCENT,
  height: 44,
  width: '100%',
  border: 'none',
  borderRadius: 999,
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  fontFamily: THEME.fontBody,
  cursor: 'pointer'
};
const lineBtn: CSSProperties = {
  ...primaryBtn,
  background: 'none',
  boxShadow: 'none',
  border: '1px solid rgba(255,255,255,.4)',
  fontWeight: 600
};
const closeBtn: CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 44,
  height: 44,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  color: 'rgba(255,255,255,.85)',
  fontSize: 15,
  cursor: 'pointer'
};

function Dot() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 8, height: 8, borderRadius: '50%', background: LIVE_RED, boxShadow: '0 0 0 3px rgba(229,72,77,.3)', flex: 'none' }}
    />
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 10 }}>
      <span className="k360-live-spin" aria-hidden="true" />
      {text}
    </div>
  );
}

/** Stilovi koji ne mogu inline (pokazivač, okretanje, puls). */
export function LiveStyles() {
  return (
    <style>{`${LIVE_POINT_CSS}
.k360-live-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:k360-live-spin 1s linear infinite}
@keyframes k360-live-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.k360-live-spin{animation:none}}`}</style>
  );
}

/** Agent: dugme ispod dugmadi sa strane. */
export function LiveStartButton({ onClick, t }: { onClick: () => void; t: T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...overlayIconStyle,
        width: 'auto',
        minWidth: 44,
        padding: '0 14px 0 12px',
        gap: 8,
        borderRadius: 999,
        fontFamily: THEME.fontBody,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        pointerEvents: 'auto'
      }}
    >
      <Dot />
      {t.liveStart}
    </button>
  );
}

/** Agent: link za kupca. */
export function LiveShareCard({ url, peerPresent, onClose, t }: { url: string; peerPresent: boolean; onClose: () => void; t: T }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t.liveCopy, url);
    }
  };
  return (
    <div role="dialog" aria-label={t.liveShareTitle} style={{ ...cardStyle, bottom: ABOVE_MENU_BOTTOM }}>
      <button type="button" onClick={onClose} aria-label="×" style={closeBtn}>✕</button>
      <div style={kickerStyle}>{t.liveStart}</div>
      <div style={titleStyle}>{t.liveShareTitle}</div>
      <p style={textStyle}>{t.liveShareText}</p>
      <div
        style={{
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,.95)',
          color: '#111',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          marginBottom: 9,
          fontFamily: 'ui-monospace, Consolas, monospace',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          userSelect: 'all'
        }}
      >
        {url.replace(/^https?:\/\//, '')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={`viber://forward?text=${encodeURIComponent(url)}`}
          style={{ ...primaryBtn, background: 'linear-gradient(180deg,#8C7CF7,#5F4BDB)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        >
          Viber
        </a>
        <button type="button" onClick={copy} style={lineBtn}>
          {copied ? `✓ ${t.liveCopied}` : t.liveCopy}
        </button>
      </div>
      {!peerPresent && <Waiting text={t.liveWaitingBuyer} />}
    </div>
  );
}

/** Kupac: ulazak u razgledanje (preko naslovne slike ture, umesto uvodnog ekrana). */
export function LiveJoinCard({
  agentName,
  agencyName,
  tourTitle,
  coverUrl,
  guidePresent,
  onJoin,
  t
}: {
  agentName: string;
  agencyName: string | null;
  tourTitle: string;
  coverUrl: string | null;
  guidePresent: boolean;
  onJoin: () => void;
  t: T;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: coverUrl ? `#111 center/cover no-repeat url("${coverUrl}")` : '#111'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
      <div role="dialog" aria-label={fill(t.liveJoinTitle, { name: agentName })} style={{ ...cardStyle, bottom: `calc(${SCREEN_BOTTOM} + 24px)` }}>
        <div style={{ ...kickerStyle, paddingRight: 0 }}>
          {t.liveStart} · {tourTitle}
        </div>
        <div style={{ ...titleStyle, paddingRight: 0 }}>{fill(t.liveJoinTitle, { name: agentName })}</div>
        <p style={textStyle}>
          {agencyName ? `${agencyName}. ` : ''}
          {t.liveJoinText}
        </p>
        {guidePresent ? (
          <button type="button" onClick={onJoin} style={primaryBtn}>
            {t.liveJoin}
          </button>
        ) : (
          <Waiting text={t.liveWaitingAgent} />
        )}
      </div>
    </div>
  );
}

/**
 * Traka gore levo, ispod izbora sobe. Stoji u gornjoj koloni ture kao sidro
 * nulte visine, pa ne gura dugmad sa strane naniže.
 */
export function LiveBar({
  role,
  status,
  peer,
  peerPresent,
  following,
  agentName,
  onEnd,
  t
}: {
  role: LiveRole;
  status: LiveStatus;
  peer: PeerView;
  peerPresent: boolean;
  following: boolean;
  agentName: string;
  onEnd: () => void;
  t: T;
}) {
  // Agent: "Kupac je izašao" kad kupčev otkucaj ne stiže duže od guideLostMs.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (role !== 'guide') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [role]);

  let label: ReactNode;
  if (role === 'guide') {
    const left = peer && now - peer.lastSeen > LIVE_TIMING.guideLostMs;
    if (!peerPresent && !peer) label = <span>{t.liveWaitingBuyer}</span>;
    else if (!peerPresent || left) label = <span style={{ color: '#ffd27a' }}>● {t.liveBuyerLeft}</span>;
    else if (!peer) label = <span style={{ color: '#7ee2a0' }}>● {t.liveBuyerHere}</span>;
    else if (peer.following) label = <span style={{ color: '#7ee2a0' }}>● {t.liveBuyerFollows}</span>;
    else label = <span style={{ color: '#ffd27a' }}>● {t.liveBuyerAlone}</span>;
  } else {
    label = following && status === 'live'
      ? <span>{fill(t.liveLedBy, { name: agentName })}</span>
      : status === 'live'
        ? <span style={{ color: '#ffd27a' }}>{t.liveAlone}</span>
        : <span>{t.liveWaitingAgent}</span>;
  }

  return (
    <div style={{ position: 'relative', height: 0, alignSelf: 'stretch' }}>
      <div
        role="status"
        style={{
          ...GLASS,
          position: 'absolute',
          left: 4,
          top: 6,
          height: 36,
          borderRadius: 999,
          padding: role === 'guide' ? '0 4px 0 12px' : '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#fff',
          fontFamily: THEME.fontBody,
          fontSize: 12.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          maxWidth: 'calc(100vw - 80px)',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        <Dot />
        <span style={{ fontWeight: 800, letterSpacing: '.06em', fontSize: 11, color: '#ff8a8d' }}>{t.liveBadge}</span>
        {label}
        {role === 'guide' && (
          <button
            type="button"
            onClick={onEnd}
            style={{
              height: 28,
              padding: '0 12px',
              border: 'none',
              borderRadius: 999,
              background: 'rgba(255,255,255,.14)',
              color: '#fff',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: THEME.fontBody,
              cursor: 'pointer'
            }}
          >
            {t.liveEnd}
          </button>
        )}
      </div>
    </div>
  );
}

/** Kupac, kad je odlutao. */
export function LiveBackButton({ onClick, t }: { onClick: () => void; t: T }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...FILL_GLASS_ACCENT,
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: `calc(${ABOVE_MENU_BOTTOM} + 110px)`,
        zIndex: 45,
        height: 44,
        padding: '0 18px',
        border: '1px solid rgba(255,255,255,.35)',
        borderRadius: 999,
        color: '#fff',
        fontFamily: THEME.fontBody,
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: 'nowrap',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), 0 8px 20px rgba(0,0,0,.3)',
        cursor: 'pointer'
      }}
    >
      ↺ {t.liveBack}
    </button>
  );
}

/** Agent: gde kupac gleda kad je odlutao (strelica na ivici ili njegova soba). */
export function LivePeerArrow({
  side,
  peerRoomTitle,
  label,
  onClick,
  t
}: {
  side: 'left' | 'right' | null;
  peerRoomTitle: string | null;
  /** Natpis uz strelicu; podrazumevano "Kupac gleda ovde". */
  label?: string;
  onClick: () => void;
  t: T;
}) {
  if (!side && !peerRoomTitle) return null;
  const right = side === 'right';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...GLASS,
        position: 'fixed',
        top: '44%',
        [right ? 'right' : 'left']: 10,
        zIndex: 45,
        minHeight: 44,
        padding: '6px 12px',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexDirection: right ? 'row-reverse' : 'row',
        color: '#fff',
        fontFamily: THEME.fontBody,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer'
      }}
    >
      {peerRoomTitle ? (
        fill(t.livePeerInRoom, { room: peerRoomTitle })
      ) : (
        <>
          <b style={{ fontSize: 16, lineHeight: 1, color: GLASS_ACCENT }}>{right ? '→' : '←'}</b>
          {label ?? t.livePeerHere}
        </>
      )}
    </button>
  );
}

/** Kupac: kraj gledanja (završio, prekinuto, nije ni počelo, nije uspelo). */
export function LiveEndCard({
  reason,
  agentName,
  onContinue,
  t
}: {
  reason: 'ended' | 'lost' | 'never' | 'failed';
  agentName: string;
  onContinue: () => void;
  t: T;
}) {
  const title = {
    ended: fill(t.liveEndedTitle, { name: agentName }),
    lost: t.liveLostTitle,
    never: t.liveNeverTitle,
    failed: t.liveFailedTitle
  }[reason];
  return (
    <div role="dialog" aria-label={title} style={{ ...cardStyle, bottom: ABOVE_MENU_BOTTOM }}>
      <div style={kickerStyle}>{t.liveStart}</div>
      <div style={titleStyle}>{title}</div>
      <p style={textStyle}>{t.liveEndText}</p>
      <button type="button" onClick={onContinue} style={primaryBtn}>
        {t.liveContinue}
      </button>
    </div>
  );
}
