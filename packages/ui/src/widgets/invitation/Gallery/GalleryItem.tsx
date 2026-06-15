import styles from './Gallery.module.css';
import { buildImageUrl } from '@shared/lib/imageUrl';
import type { GalleryImage } from './types';

type GalleryItemProps = {
  image: GalleryImage;
  onClick?: () => void;
};

export function GalleryItem({ image, onClick }: GalleryItemProps) {
  return (
    <div className={styles.galleryItem} onClick={onClick} tabIndex={0} role="button">
      <img src={buildImageUrl(image.url)} alt={image.alt ?? ''} />
    </div>
  );
}
