import { useState } from 'react';
import { clsx } from 'clsx';
import styles from './Gallery.module.css';
import { GalleryItem } from './GalleryItem';
import { Carousel } from './Carousel';
import { SwipeStack } from './SwipeStack';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { useParams } from 'react-router-dom';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { MOCK_GALLERY_LIST } from './constants';

export function Gallery() {
  const images = MOCK_GALLERY_LIST;
  return (
    <>
      <div className={styles.title}>
        <PixelBadge text="PHOTO" />
      </div>

      <SwipeStack images={images} />
    </>
  );
}
