import styles from './Gallery.module.css';
import { buildImageUrl } from '@shared/lib/imageUrl';
import { SafeImage } from '@shared/ui/SafeImage';
import { useIsPreviewMode } from '@entities/WeddingInvitation/Context';
import type { GalleryImage } from './types';

type GalleryItemProps = {
  image: GalleryImage;
  onClick?: () => void;
};

export function GalleryItem({ image, onClick }: GalleryItemProps) {
  const isPreview = useIsPreviewMode();

  return (
    <div className={styles.galleryItem} onClick={onClick} tabIndex={0} role="button">
      <SafeImage
        src={buildImageUrl(image.url)}
        alt={image.alt ?? ''}
        fallback={isPreview}
      />
    </div>
  );
}
