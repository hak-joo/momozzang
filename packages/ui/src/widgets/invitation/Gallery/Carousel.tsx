import { useState } from 'react';
import styles from './Gallery.module.css';

import * as Dialog from '@shared/ui/Dialog';
import { buildImageUrl } from '@shared/lib/imageUrl';
import { SafeImage } from '@shared/ui/SafeImage';
import { useIsPreviewMode } from '@entities/WeddingInvitation/Context';
import type { GalleryImage } from './types';

type CarouselProps = {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
};

export function Carousel({ images, startIndex, onClose }: CarouselProps) {
  const [index, setIndex] = useState(startIndex);
  const isPreview = useIsPreviewMode();

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < images.length - 1 ? i + 1 : i));

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Content asChild useOverlay>
        <div className={styles.carousel}>
          <button className={styles.carouselButton} onClick={prev} disabled={index === 0}>
            &lt;
          </button>
          <SafeImage
            className={styles.carouselImage}
            src={buildImageUrl(images[index].url)}
            alt={images[index].alt ?? ''}
            fallback={isPreview}
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
