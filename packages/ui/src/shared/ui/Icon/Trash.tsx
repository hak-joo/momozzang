interface Props {
  className?: string;
  width?: number;
  height?: number;
}
export function Trash({ className, width, height }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      viewBox="0 0 17 17"
      fill="none"
    >
      <path
        d="M11.666 3.33301H16.666V5H15V16.667H1.66602V5H0V3.33301H5V0H11.666V3.33301ZM3.33301 15H13.333V5H3.33301V15ZM7.5 13.333H5.83301V6.66699H7.5V13.333ZM10.833 13.333H9.16602V6.66699H10.833V13.333ZM6.66602 3.33301H10V1.66699H6.66602V3.33301Z"
        fill="currentColor"
      />
    </svg>
  );
}
