'use client';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** آیکون تسبیح (دونه‌های ذکر) — SVG سفارشی */
export default function TasbeehIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="5.5" cy="12" r="2.4" />
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="18.5" cy="12" r="2.4" />
      <path d="M3 12h1.1M8.7 12h.6M14.7 12h.6M20.9 12H21" />
    </svg>
  );
}
