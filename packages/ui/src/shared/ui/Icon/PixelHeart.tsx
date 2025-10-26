import IconContainer, { type IconContainerProps } from '../IconContainer';

interface Props {
  className?: string;
}
export function PixelHeart({ className }: Props) {
  return (
    <IconContainer>
      <svg
        width="11"
        height="10"
        viewBox="0 0 11 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M9.97133 0.903759H9.1372V0H6.64574V0.903759H5.81706V1.80161H4.98294V0.903759H4.15427V0H1.6628V0.903759H0.834124V1.80161H0V4.50107H0.834124V5.40483H1.6628V6.30269H2.49147V7.20054H3.32559V8.1043H4.15427V9.00215H4.98294V9.9H5.81706V9.00215H6.64574V8.1043H7.47986V7.20054H8.30853V6.30269H9.1372V5.40483H9.97133V4.50107H10.8V1.80161H9.97133V0.903759ZM9.1372 4.50107H8.30853V2.69946H6.64574V1.80161H8.30853V2.69946H9.1372V4.50107Z"
          fill="currentColor"
        />
      </svg>
    </IconContainer>
  );
}
export default PixelHeart;
