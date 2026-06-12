import { useRef, forwardRef, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import { CSS } from '@dnd-kit/utilities';
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import styles from './GalleryManager.module.css';

interface SortableImageProps {
  photo: AlbumPhoto;
  onRemove: () => void;
}

interface PhotoItemProps {
  photo: AlbumPhoto;
  onRemove?: () => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isOverlay?: boolean;
  thumbnailUrl?: string;
  dragOverlayParams?: Record<string, unknown>;
}

export const PhotoItem = memo(
  forwardRef<HTMLDivElement, PhotoItemProps>(
    (
      { photo, onRemove, style, isDragging, isOverlay, thumbnailUrl, dragOverlayParams, ...props },
      ref,
    ) => {
      return (
        <div
          ref={ref}
          style={style}
          className={clsx(styles.sortableItem, { [styles.dragging]: isDragging })}
          {...props}
          {...dragOverlayParams}
        >
          <img
            src={thumbnailUrl || photo.url}
            alt="Gallery"
            className={styles.image}
            loading={isOverlay ? 'eager' : 'lazy'}
            draggable={false}
          />
          {!isOverlay && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={styles.deleteButton}
            >
              ✕
            </button>
          )}
        </div>
      );
    },
  ),
);

export function SortableImage({
  photo,
  onRemove,
  thumbnailUrl,
}: SortableImageProps & { thumbnailUrl?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <PhotoItem
      ref={setNodeRef}
      style={style}
      photo={photo}
      onRemove={onRemove}
      isDragging={isDragging}
      thumbnailUrl={thumbnailUrl}
      dragOverlayParams={{ ...attributes, ...listeners }}
    />
  );
}
