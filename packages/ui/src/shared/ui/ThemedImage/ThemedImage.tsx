import { type CSSProperties } from 'react';
import { useImageHueShift } from '../../hooks/useImageHueShift';

interface ThemedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  originalHue?: number; // 원본 이미지의 주조색 Hue (기본값: 보라색 270)
  targetHue?: number; // 목표 Hue. 주어지지 않으면 CSS 변수 등에서 가져오거나 해야 함.
  className?: string;
  style?: CSSProperties;
}

export function ThemedImage({
  src,
  originalHue = 270, // 기본 보라색
  targetHue,
  className,
  style,
  alt,
  ...props
}: ThemedImageProps) {
  const displaySrc = useImageHueShift(src, targetHue, originalHue);

  return <img src={displaySrc} alt={alt} className={className} style={style} {...props} />;
}
