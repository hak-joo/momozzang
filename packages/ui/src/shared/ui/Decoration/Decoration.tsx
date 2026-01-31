import sparkle from '../../assets/images/decorations/sparkle.png';
import purpleSparkle from '../../assets/images/decorations/purple-sparkle.png';

import sparkleCross from '../../assets/images/decorations/sparkle-cross.png';

import sparkleCrossDashed from '../../assets/images/decorations/sparkle-cross-dashed.png';
import purpleSparkleCrossDashed from '../../assets/images/decorations/purple-sparkle-cross-dashed.png';

import purplePixelHeart from '../../assets/images/decorations/purple-pixel-heart.png';

import { useInvitation } from '@entities/WeddingInvitation/Context';
import { getThemeHue, PURPLE_HUE } from '@shared/styles/utils';
import { ThemedImage } from '@shared/ui/ThemedImage/ThemedImage';

type CssSize = number | string;

type SparkleVariant = 'sparkle' | 'sparkleCross' | 'sparkleCrossDashed' | 'pixelHeart';

type SparkleColor = 'white' | 'purple';

export interface PixelSparkleProps {
  variant: SparkleVariant;
  color?: SparkleColor; // 없으면 white
  width?: CssSize;
  left?: CssSize;
  right?: CssSize;
  top?: CssSize;
  bottom?: CssSize;
}

const toCssUnit = (value?: CssSize) => {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

/** variant + color 매핑 테이블 */
const ASSET_MAP: Record<SparkleVariant, Partial<Record<SparkleColor, string>>> = {
  sparkle: {
    white: sparkle,
    purple: purpleSparkle,
  },
  sparkleCross: {
    white: sparkleCross,
  },
  sparkleCrossDashed: {
    white: sparkleCrossDashed,
    purple: purpleSparkleCrossDashed,
  },
  pixelHeart: {
    purple: purplePixelHeart,
  },
};

const getSparkleSrc = (variant: SparkleVariant, color: SparkleColor): string => {
  const byVariant = ASSET_MAP[variant];

  if (byVariant[color]) {
    return byVariant[color] as string;
  }

  if (byVariant.white) return byVariant.white;
  if (byVariant.purple) return byVariant.purple;

  return sparkle;
};

export function Decoration({
  variant,
  color = 'white',
  width,
  left,
  right,
  top,
  bottom,
}: PixelSparkleProps) {
  const src = getSparkleSrc(variant, color);
  const { customization } = useInvitation();
  const themeHue = getThemeHue(customization?.themeColor);

  const style: React.CSSProperties = {
    position: 'absolute',
    width: toCssUnit(width),
    left: toCssUnit(left),
    right: toCssUnit(right),
    top: toCssUnit(top),
    bottom: toCssUnit(bottom),
    zIndex: 10,
    pointerEvents: 'none',
  };

  if (color === 'purple') {
    return (
      <ThemedImage
        aria-hidden="true"
        src={src}
        alt=""
        style={style}
        targetHue={themeHue}
        originalHue={PURPLE_HUE}
      />
    );
  }

  return <img aria-hidden="true" src={src} alt="" style={style} />;
}
