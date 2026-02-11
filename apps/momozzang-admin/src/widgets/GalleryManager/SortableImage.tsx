import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import styles from './GalleryManager.module.css';

interface SortableImageProps {
  photo: AlbumPhoto;
  onRemove: () => void;
}

export function SortableImage({ photo, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.sortableItem}
      {...attributes}
      {...listeners}
    >
      <img src={photo.url} alt="Gallery" className={styles.image} />
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
    </div>
  );
}
