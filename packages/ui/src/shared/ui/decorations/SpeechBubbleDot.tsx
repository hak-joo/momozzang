interface Props {
  className: string;
  style: React.CSSProperties;
}
export function SpeechBubbleDot({ className, style }: Props) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M2.00875 10.2338H4.00438V8.92459H6V7.61541H4.00438V6.29761H2.00875V7.61541H0V8.92459H2.00875V10.2338Z"
        fill="currentColor"
      />
      <path
        d="M9.25287 6.29787V4.72599H11V1.57188H9.25287V0H5.74713V1.57188H4V4.72599H5.74713V6.29787H9.25287Z"
        fill="currentColor"
      />
    </svg>
  );
}
