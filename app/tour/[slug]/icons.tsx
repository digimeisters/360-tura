import type { ActiveModal } from './types';

// Linijske ikonice za donji meni i naslove prozora. Emoji (❓ 📍 📞) imaju
// svoje fiksne boje i ne mogu da se oboje u plavu boju sajta - ove prate
// `color` roditelja (stroke="currentColor").
type IconProps = { size?: number; color?: string };

function Svg({ size = 20, color, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color, flex: 'none', display: 'block' }}
    >
      {children}
    </svg>
  );
}

export const IconQuestion = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.3 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4" />
    <path d="M12 17.4h.01" strokeWidth={2.6} />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.5s-7-6.2-7-11.5a7 7 0 0 1 14 0c0 5.3-7 11.5-7 11.5z" />
    <circle cx="12" cy="10" r="2.6" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5.5" />
    <path d="M12 7.6h.01" strokeWidth={2.6} />
  </Svg>
);

export const IconPlan = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
    <path d="M3.5 12h6.5M13.5 12h7M13.5 12v8.5M10.5 3.5v5" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 16.4v2.9a1.9 1.9 0 0 1-2.1 1.9 18.8 18.8 0 0 1-8.2-2.9 18.5 18.5 0 0 1-5.7-5.7 18.8 18.8 0 0 1-2.9-8.2A1.9 1.9 0 0 1 4 2.3h2.9a1.9 1.9 0 0 1 1.9 1.6c.1.9.4 1.8.7 2.7a1.9 1.9 0 0 1-.4 2L7.8 9.9a15.2 15.2 0 0 0 5.7 5.7l1.3-1.3a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.7.7a1.9 1.9 0 0 1 1.5 1.8z" />
  </Svg>
);

export const MODAL_ICONS: Record<Exclude<ActiveModal, null>, (p: IconProps) => React.ReactElement> = {
  faq: IconQuestion,
  location: IconPin,
  about: IconInfo,
  plan: IconPlan,
  contact: IconPhone
};

/** Prevodi imaju emoji ispred naziva ("📍 Lokacija") - ovde treba samo naziv. */
export const withoutEmoji = (label: string) => label.replace(/^[^\s]+\s*/, '');
