import { useState } from 'react';
import { clsx } from 'clsx';
import styles from './styles.module.css';
import GalleryItem from './GalleryItem';
import Carousel from './Carousel';
import SwipeStackGallery from './SwipeStack';

export type GalleryImage = {
  src: string;
  alt?: string;
};

type GalleryProps = {
  images: GalleryImage[];
  cols?: 2 | 3;
};

function Gallery({ images, cols = 3 }: GalleryProps) {
  const [expanded, setExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  const maxRows = 4;
  const visibleCount = expanded ? images.length : cols * maxRows;

  return (
    <div>
      <SwipeStackGallery images={images} />

      {/* <div
        className={clsx(styles.galleryGrid, expanded && styles.expanded)}
        style={{ '--gallery-cols': cols } as React.CSSProperties}
      >
        {images.slice(0, visibleCount).map((img, i) => (
          <GalleryItem key={img.alt} image={img} onClick={() => setCarouselIndex(i)} />
        ))}
      </div>
      {!expanded && images.length > visibleCount && (
        <button className={styles.moreButton} onClick={() => setExpanded(true)}>
          더보기
        </button>
      )}
      {carouselIndex !== null && (
        <Carousel
          images={images}
          startIndex={carouselIndex}
          onClose={() => setCarouselIndex(null)}
        />
      )} */}
    </div>
  );
}

export default Gallery;
