import styles from './Gallery.module.css';
import type { GalleryImage } from './Gallery';

type GalleryItemProps = {
  image: GalleryImage;
  onClick?: () => void;
};

export function GalleryItem({ image, onClick }: GalleryItemProps) {
  return (
    <div className={styles.galleryItem} onClick={onClick} tabIndex={0} role="button">
      <img src={image.src} alt={image.alt ?? ''} />
    </div>
  );
}
