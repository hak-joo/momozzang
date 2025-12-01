import styles from './Gallery.module.css';
import { SwipeStack } from './SwipeStack';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { MOCK_GALLERY_LIST } from './constants';

export function Gallery() {
  const images = MOCK_GALLERY_LIST;
  return (
    <>
      <div className={styles.title}>
        <PixelBadge text="Photo" />
      </div>

      <SwipeStack images={images} />
    </>
  );
}
