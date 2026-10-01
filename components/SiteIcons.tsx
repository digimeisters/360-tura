/**
 * Male ikonice za dugmad sajta, umesto znakova "▶" i "📞" u tekstu
 * (vlasnik, 1. 10. 2026: emodži i znakovi su se razlikovali od ostatka
 * dizajna i drugačije izgledaju na svakom telefonu). Boja i veličina prate
 * tekst dugmeta (currentColor, 1.05em).
 */

type IconProps = { className?: string };

const base = {
  width: '1.05em',
  height: '1.05em',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  style: { flex: 'none', verticalAlign: '-0.15em' }
} as const;

export function IconPlay({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="currentColor">
      <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.3 0-1.7l-10-6.4C8.9 4.3 8 4.8 8 5.6Z" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}
