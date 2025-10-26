import { useState } from 'react';
import styles from './Gallery.module.css';

import * as Dialog from '@shared/ui/Dialog';
import type { GalleryImage } from './Gallery';

type CarouselProps = {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
};

function Carousel({ images, startIndex, onClose }: CarouselProps) {
  const [index, setIndex] = useState(startIndex);

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < images.length - 1 ? i + 1 : i));

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Content asChild useOverlay>
        <div className={styles.carousel}>
          <button className={styles.carouselButton} onClick={prev} disabled={index === 0}>
            &lt;
          </button>
          <img
            className={styles.carouselImage}
            src={images[index].src}
            alt={images[index].alt ?? ''}
          />
          <button
            className={styles.carouselButton}
            onClick={next}
            disabled={index === images.length - 1}
          >
            &gt;
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default Carousel;
