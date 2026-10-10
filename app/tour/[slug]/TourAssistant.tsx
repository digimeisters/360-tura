'use client';

import type { RefObject } from 'react';
import { THEME, FILL_ACCENT } from './theme';
import { IconChevronDown, IconMail, IconSend, IconSparkle } from './icons';
import type { AssistantMessage } from './useTourAssistant';

/**
 * Asistent u modulu "Pitanja" (vlasnik odobrio mockup 10. 10. 2026,
 * public/mockup/AiAssistantPitanja.html): traka za pitanje stoji ispod
 * mreže tema, a razgovor menja mrežu uz "Sve teme" za povratak. Logika
 * slanja je u useTourAssistant.ts, odgovara ruta /api/tour-assistant.
 */

const FRAME = '#9DBBE3';

type Labels = Record<string, string>;

export type AgentLink = { href: string; external: boolean } | null;

/** Traka sa poljem, uvek iznad podnožja sa pozivom i mejlom. */
export function AssistantAskBar({
  t,
  value,
  onChange,
  onSubmit,
  disabled,
  chatting
}: {
  t: Labels;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** U razgovoru nema natpisa iznad polja. */
  chatting: boolean;
}) {
  const empty = !value.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !disabled) onSubmit();
      }}
      style={{ padding: '10px 14px', borderTop: '1px solid ' + THEME.border, background: '#FFFFFF', flexShrink: 0 }}
    >
      {!chatting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 2px 7px', fontSize: '11.5px', fontWeight: 700, color: THEME.accent }}>
          <IconSparkle size={13} />
          {t.askLabel}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={300}
          placeholder={chatting ? t.askPlaceholderChat : t.askPlaceholder}
          aria-label={t.askLabel}
          style={{ flex: 1, minWidth: 0, height: '44px', borderRadius: '999px', border: `1.5px solid ${FRAME}`, padding: '0 16px', fontSize: '16px', fontFamily: 'inherit', background: '#F8FAFD', color: THEME.textPrimary }}
        />
        <button
          type="submit"
          disabled={empty || disabled}
          aria-label={t.askSend}
          title={t.askSend}
          style={{ width: '44px', height: '44px', borderRadius: '50%', border: 0, color: '#fff', display: 'grid', placeItems: 'center', cursor: empty || disabled ? 'default' : 'pointer', opacity: empty || disabled ? 0.55 : 1, flexShrink: 0, ...FILL_ACCENT }}
        >
          <IconSend size={17} />
        </button>
      </div>
    </form>
  );
}

function Avatar() {
  return (
    <span aria-hidden="true" style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0, marginTop: '2px', ...FILL_ACCENT }}>
      <IconSparkle size={14} />
    </span>
  );
}

/** Tok razgovora (zamenjuje mrežu tema dok traje). */
export function AssistantChat({
  t,
  messages,
  loading,
  onBack,
  agentLink,
  endRef
}: {
  t: Labels;
  messages: AssistantMessage[];
  loading: boolean;
  onBack: () => void;
  /** Gradi vezu ka agentu sa započetom porukom (uključuje pitanje). */
  agentLink: (question?: string) => AgentLink;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div>
      <style>{'@keyframes k360AskDot{0%,80%,100%{transform:scale(.6);opacity:.35}40%{transform:scale(1);opacity:1}}'}</style>
      <button
        type="button"
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 0, padding: '2px 0 12px', color: THEME.accent, fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
          <IconChevronDown size={15} />
        </span>
        {t.askAllTopics}
      </button>

      {messages.map((m, i) => {
        if (m.role === 'user') {
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <div style={{ maxWidth: '88%', padding: '10px 13px', borderRadius: '16px 16px 4px 16px', color: '#fff', fontSize: '14.5px', lineHeight: 1.5, overflowWrap: 'anywhere', ...FILL_ACCENT }}>
                {m.text}
              </div>
            </div>
          );
        }
        const link = m.known === false ? agentLink(m.question) : null;
        return (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', maxWidth: '92%' }}>
            <Avatar />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  padding: '10px 13px',
                  borderRadius: '16px 16px 16px 4px',
                  background: m.known === false ? '#FFFFFF' : THEME.accentSoft,
                  border: m.known === false ? `1.5px solid ${FRAME}` : '1.5px solid transparent',
                  color: THEME.textPrimary,
                  fontSize: '14.5px',
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere'
                }}
              >
                {m.text}
              </div>
              {link && (
                <a
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '999px', padding: '8px 14px', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none', ...FILL_ACCENT }}
                >
                  <IconMail size={14} />
                  {t.askAgent}
                </a>
              )}
            </div>
          </div>
        );
      })}

      {loading && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }} aria-live="polite">
          <Avatar />
          <div style={{ padding: '14px 14px', borderRadius: '16px 16px 16px 4px', background: THEME.accentSoft, display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map((d) => (
              <i key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: THEME.accent, animation: `k360AskDot 1.2s ${d * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: '11px', color: THEME.textMuted }}>{t.askDisclaimer}</p>
      <div ref={endRef} />
    </div>
  );
}
