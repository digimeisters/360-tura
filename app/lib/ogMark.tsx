/**
 * Znak iz logotipa (romb sa zaobljenim uglovima, samo obris) za OG slike -
 * iste mere kao public/brand/kvadrat360-icon.svg. Satori (ImageResponse)
 * crta ugrađen <svg>, pa nije potrebno učitavati fajl sa diska.
 */
export function OgMark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112.9 112.9">
      <rect
        x="26.43"
        y="26.43"
        width="60"
        height="60"
        rx="16"
        fill="none"
        stroke={color}
        strokeWidth="9"
        transform="rotate(45 56.45 56.45)"
      />
    </svg>
  );
}
