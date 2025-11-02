interface Props {
  className?: string;
}
export function Blur({ className }: Props) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'rgba(255, 255, 255, 1)', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0 }} />
        </linearGradient>
        <filter id="blur" x="0" y="0">
          <feGaussianBlur in="SourceGraphic" stdDeviation={2} />
        </filter>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" filter="url(#blur)" />
    </svg>
  );
}
