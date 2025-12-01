type Direction = 'up' | 'down' | 'left' | 'right';

interface Props {
  className?: string;
  width?: number;
  height?: number;
}

function PixelChevronIconBase({
  className,
  direction = 'down',
  width = 12,
  height = 8,
}: Props & { direction?: Direction }) {
  const rotation = {
    down: 0,
    up: 180,
    left: -90,
    right: 90,
  }[direction];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 12 8"
      fill="none"
      className={className}
    >
      <g transform={rotation ? `rotate(${rotation} 6 4)` : undefined}>
        <rect
          x="11.9999"
          y="5.2453e-07"
          width="2.4"
          height="2.4"
          transform="rotate(90 11.9999 5.2453e-07)"
          fill="currentColor"
        />
        <rect
          x="9.59998"
          y="2.40015"
          width="2.4"
          height="2.4"
          transform="rotate(90 9.59998 2.40015)"
          fill="currentColor"
        />
        <rect
          x="7.19995"
          y="4.80005"
          width="2.4"
          height="2.4"
          transform="rotate(90 7.19995 4.80005)"
          fill="currentColor"
        />
        <rect
          x="4.79993"
          y="2.40015"
          width="2.4"
          height="2.4"
          transform="rotate(90 4.79993 2.40015)"
          fill="currentColor"
        />
        <rect
          x="2.40002"
          y="5.2453e-07"
          width="2.4"
          height="2.4"
          transform="rotate(90 2.40002 5.2453e-07)"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export function PixelChevronDownIcon(props: Props) {
  return <PixelChevronIconBase {...props} direction="down" />;
}

export function PixelChevronUpIcon(props: Props) {
  return <PixelChevronIconBase {...props} direction="up" />;
}

export function PixelChevronLeftIcon(props: Props) {
  return <PixelChevronIconBase {...props} direction="left" />;
}

export function PixelChevronRightIcon(props: Props) {
  return <PixelChevronIconBase {...props} direction="right" />;
}
