import { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Box } from '@momozzang/ui/src/shared/ui/Box/Box';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import { buildImageUrl } from '@momozzang/ui/src/shared/lib/imageUrl';
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { SortableImage, PhotoItem } from './SortableImage';
import { resizeImage } from '../../shared/lib/resizeImage';
import { uploadToR2 } from '../../shared/lib/uploadToR2';
import styles from './GalleryManager.module.css';

interface GalleryManagerProps {
  album: AlbumPhoto[];
  onChange: (newAlbum: AlbumPhoto[]) => void;
}

export function GalleryManager({ album, onChange }: GalleryManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = album.findIndex((item) => item.id === active.id);
        const newIndex = album.findIndex((item) => item.id === over.id);

        onChange(arrayMove(album, oldIndex, newIndex));
      }

      setActiveId(null);
    },
    [album, onChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm('Are you sure you want to remove this photo?')) {
        onChange(album.filter((item) => item.id !== id));
      }
    },
    [album, onChange],
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (album.length + files.length > 20) {
      alert(
        `You can only upload up to 20 photos. Current: ${album.length}, trying to add: ${files.length}`,
      );
      return;
    }

    setUploading(true);
    const newPhotos: AlbumPhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToUpload = file;
        try {
          fileToUpload = await resizeImage(file);
        } catch (e) {
          console.error('Resize failed for gallery image', e);
        }

        // Cloudflare Worker(R2 바인딩)로 업로드. 확장자는 Worker 가 검증된 content-type 으로 결정.
        const { key } = await uploadToR2(fileToUpload, 'gallery');

        // 절대 URL이 아닌 객체 키만 저장한다. id 와 url 은 동일 키를 유지.
        newPhotos.push({
          id: key, // Using R2 key as ID for simplicity
          url: key,
        });
      }

      onChange([...album, ...newPhotos]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload some images.');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box variant="primary">
      <h3 className={styles.header}>{`Gallery (${album.length}/20)`}</h3>
      <div className={styles.controls}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading || album.length >= 20}
          className={styles.hiddenInput}
          ref={fileInputRef}
        />
        <Button onClick={handleButtonClick} disabled={uploading || album.length >= 20}>
          {uploading ? 'Uploading...' : 'Add Photos +'}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <SortableContext items={album.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {album.map((photo) => (
              <SortableImage
                key={photo.id}
                photo={photo}
                onRemove={() => handleDelete(photo.id)}
                thumbnailUrl={buildImageUrl(photo.url)}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <PhotoItem
              photo={album.find((p) => p.id === activeId)!}
              isDragging
              isOverlay
              style={{ cursor: 'grabbing' }}
              thumbnailUrl={buildImageUrl(album.find((p) => p.id === activeId)!.url)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}
