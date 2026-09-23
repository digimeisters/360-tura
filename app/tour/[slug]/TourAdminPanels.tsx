import { THEME, btnStyle } from './theme';
import { getLocalizedText } from './utils';
import { translations } from './translations';
import type { Language, Room } from './types';
import PasswordInput from '../../../components/PasswordInput';

/**
 * Dva admin prikaza koji su stajali usred strane ture: prijava i forma za
 * tačku (navigacija / info / uvodna naracija). Posetilac ih nikad ne vidi -
 * odvojeni su da bi javni deo ture ostao čitljiv.
 */

type Labels = (typeof translations)[Language];

export type HotspotType = 'navigation' | 'info' | 'establish';

export function AdminLoginModal({
  email,
  password,
  onEmail,
  onPassword,
  onSubmit,
  onCancel,
  error,
  loading,
  cancelLabel
}: {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  error: string;
  loading: boolean;
  cancelLabel: string;
}) {
  const field = {
    padding: '10px',
    borderRadius: '8px',
    background: THEME.surfaceAlt,
    color: THEME.textPrimary,
    border: '1px solid ' + THEME.borderStrong,
    fontSize: '14px',
    boxSizing: 'border-box' as const
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: THEME.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <form
        onSubmit={onSubmit}
        style={{ backgroundColor: THEME.surface, border: '1px solid ' + THEME.border, borderRadius: '20px', width: '100%', maxWidth: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: THEME.shadowLg }}
      >
        <h2 style={{ color: THEME.textPrimary, fontSize: '18px', margin: 0, fontWeight: 700 }}>🔒 Admin prijava</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          autoComplete="username"
          required
          style={field}
        />

        <PasswordInput
          placeholder="Lozinka"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={field}
        />

        {error && <p style={{ color: THEME.danger, fontSize: '13px', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent, padding: '10px' }}
          >
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border }}
          >
            {cancelLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function HotspotForm({
  coords,
  editing,
  t,
  lang,
  rooms,
  type,
  onType,
  targetRoomId,
  onTargetRoom,
  title,
  onTitle,
  text,
  onText,
  audioUrl,
  onAudioUrl,
  onSave,
  onDelete,
  onCancel
}: {
  coords: { yaw: number; pitch: number };
  /** Postavljena tačka se menja; prazno znači da se dodaje nova. */
  editing: boolean;
  t: Labels;
  lang: Language;
  rooms: Room[];
  type: HotspotType;
  onType: (type: HotspotType) => void;
  targetRoomId: string | number;
  onTargetRoom: (id: string) => void;
  title: string;
  onTitle: (v: string) => void;
  text: string;
  onText: (v: string) => void;
  audioUrl: string;
  onAudioUrl: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const field = {
    padding: '8px',
    borderRadius: '6px',
    background: THEME.surfaceAlt,
    color: THEME.textPrimary,
    border: '1px solid ' + THEME.borderStrong,
    fontSize: '13px'
  };

  const typeButton = (value: HotspotType, label: string) => (
    <button
      onClick={() => onType(value)}
      style={{
        flex: 1,
        padding: '6px',
        borderRadius: '8px',
        border: 'none',
        background: type === value ? THEME.accent : THEME.surfaceAlt,
        color: type === value ? '#fff' : THEME.textPrimary,
        fontSize: '12px',
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      width: '92%',
      maxWidth: '480px',
      backgroundColor: THEME.surface,
      border: '1px solid ' + THEME.border,
      borderRadius: '16px',
      padding: '16px',
      color: THEME.textPrimary,
      boxShadow: THEME.shadowLg,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <h4 style={{ margin: 0, color: THEME.accent, fontSize: '15px' }}>
        {editing ? t.editPoint : t.addPoint} (Yaw: {coords.yaw.toFixed(1)}, Pitch: {coords.pitch.toFixed(1)})
      </h4>

      <div style={{ display: 'flex', gap: '8px' }}>
        {typeButton('navigation', t.navArrow)}
        {typeButton('info', t.infoPoint)}
        {typeButton('establish', t.introNarration)}
      </div>

      {type === 'navigation' && (
        <select value={targetRoomId} onChange={(e) => onTargetRoom(e.target.value)} style={field}>
          <option value="">{t.targetRoom}</option>
          {/* `lang` (stanje), ne ref: ref se ne sme čitati tokom iscrtavanja -
              spisak ne bi pratio promenu jezika. */}
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{getLocalizedText(r.title_i18n, lang) || `Soba ${r.id}`}</option>
          ))}
        </select>
      )}

      <input
        type="text"
        placeholder={t.titlePlaceholder}
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        style={field}
      />

      <textarea
        placeholder={t.descPlaceholder}
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={2}
        style={{ ...field, resize: 'none' }}
      />

      <input
        type="text"
        placeholder={t.audioUrlPlaceholder}
        value={audioUrl}
        onChange={(e) => onAudioUrl(e.target.value)}
        style={field}
      />
      <span style={{ fontSize: '11px', color: THEME.textSecondary, marginTop: '-6px' }}>
        🌐 Ovaj link važi samo za jezik: <b style={{ color: THEME.textPrimary }}>{lang.toUpperCase()}</b> (ostali jezici ostaju netaknuti ako ostaviš prazno)
      </span>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button onClick={onSave} style={{ ...btnStyle, flex: 1, backgroundColor: THEME.accent, color: '#fff', borderColor: THEME.accent }}>
          {t.save}
        </button>
        {editing && (
          <button onClick={onDelete} style={{ ...btnStyle, backgroundColor: THEME.danger, color: '#fff', borderColor: THEME.danger }}>
            {t.delete}
          </button>
        )}
        <button onClick={onCancel} style={{ ...btnStyle, backgroundColor: THEME.surfaceAlt, color: THEME.textPrimary, borderColor: THEME.border }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
