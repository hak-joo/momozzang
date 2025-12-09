import styles from './Gallery.module.css';
import { SwipeStack } from './SwipeStack';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { MOCK_GALLERY_LIST } from './constants';
import { Decoration } from '@shared/ui/Decoration/Decoration';

export function Gallery() {
  const images = MOCK_GALLERY_LIST;
  return (
    <>
      <div className={styles.title}>
        <PixelBadge text="Photo" />
      </div>

      <SwipeStack images={images} />

      <Decoration variant="sparkleCross" width={35} top={20} right={50} />
      <Decoration variant="sparkleCrossDashed" color="purple" width={25} top={150} left={0} />
      <Decoration variant="pixelHeart" color="purple" width={32} top={250} left={16} />
      <Decoration variant="sparkleCross" width={50} top={270} left={-5} />
      <Decoration variant="pixelHeart" color="purple" width={32} top={480} right={30} />
    </>
  );
}
