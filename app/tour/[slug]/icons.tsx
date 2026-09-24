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

export const IconExpand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.5H5.5a2 2 0 0 0-2 2V8M20.5 8V5.5a2 2 0 0 0-2-2H16M3.5 16v2.5a2 2 0 0 0 2 2H8M16 20.5h2.5a2 2 0 0 0 2-2V16" />
  </Svg>
);

export const IconCollapse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.5V6a2 2 0 0 1-2 2H3.5M20.5 8H18a2 2 0 0 1-2-2V3.5M3.5 16H6a2 2 0 0 1 2 2v2.5M16 20.5V18a2 2 0 0 1 2-2h2.5" />
  </Svg>
);

export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </Svg>
);

export const IconSound = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 5 6.5 8.5H3v7h3.5L11 19z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.5 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);

export const IconMute = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 5 6.5 8.5H3v7h3.5L11 19z" />
    <path d="M21 9.5l-5 5M16 9.5l5 5" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5v15l13-7.5z" strokeLinejoin="round" />
  </Svg>
);

export const IconHeadphones = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 14.5h2.5a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-.5a2 2 0 0 1-2-2v-6.5a8.5 8.5 0 0 1 17 0V19a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2v-2.5a2 2 0 0 1 2-2h2.5" />
  </Svg>
);

export const IconHand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17.5 11.5V6.5a1.75 1.75 0 0 0-3.5 0M14 10.5V4.75a1.75 1.75 0 0 0-3.5 0v1M10.5 10.5V6.25a1.75 1.75 0 0 0-3.5 0V14" />
    <path d="M17.5 8.75a1.75 1.75 0 0 1 3.5 0V14a7.5 7.5 0 0 1-7.5 7.5h-1.6c-2.6 0-4.2-.8-5.6-2.2l-3.3-3.3a1.8 1.8 0 0 1 2.6-2.6L7 15" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 9.5 12 16l6.5-6.5" />
  </Svg>
);

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13.5a4.5 4.5 0 0 0 6.8.5l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
    <path d="M14 10.5a4.5 4.5 0 0 0-6.8-.5l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
  </Svg>
);

// Ikonice za kartice u prozorima (Info, Lokacija, Kontakt).
export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v10h12V10" />
  </Svg>
);

export const IconArea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20 20 4" />
    <path d="M4 14v6h6" />
    <path d="M14 4h6v6" />
  </Svg>
);

export const IconRooms = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M12 4v16" />
  </Svg>
);

export const IconStairs = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20h5v-5h5v-5h5V5h3" />
  </Svg>
);

export const IconElevator = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="m9 9 3-3 3 3" />
    <path d="m9 15 3 3 3-3" />
  </Svg>
);

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8 12 3l9 5v8l-9 5-9-5z" />
    <path d="m3 8 9 5 9-5" />
    <path d="M12 13v8" />
  </Svg>
);

export const IconFlame = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z" />
  </Svg>
);

export const IconBuilding = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V10l5-3v14" />
    <path d="M10 21V4l9 4v13" />
  </Svg>
);

export const IconBrush = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="6" rx="1.5" />
    <path d="M12 9v3" />
    <path d="M10 12h4v9h-4z" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
  </Svg>
);

export const IconText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6h14" />
    <path d="M5 11h14" />
    <path d="M5 16h9" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 5 4.5 9-10" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);

export const MODAL_ICONS:Record<Exclude<ActiveModal, null>, (p: IconProps) => React.ReactElement> = {
  faq: IconQuestion,
  location: IconPin,
  about: IconInfo,
  plan: IconPlan,
  contact: IconPhone
};

/** Prevodi imaju emoji ispred naziva ("📍 Lokacija") - ovde treba samo naziv. */
export const withoutEmoji = (label: string) => label.replace(/^[^\s]+\s*/, '');

export const IconTerrace = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V9h16v11" />
    <path d="M4 14h16M8 14v6M12 14v6M16 14v6" />
    <path d="M7 9V4h10v5" />
  </Svg>
);

export const IconParking = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M9.5 17V7.5h3.5a3 3 0 0 1 0 6H9.5" />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M3 10h18M16 15h2" />
    <path d="M6 6l9-3 1 3" />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13l2 2 4-4" />
  </Svg>
);
