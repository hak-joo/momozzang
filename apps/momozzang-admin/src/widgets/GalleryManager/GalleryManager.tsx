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
import { supabase } from '@momozzang/ui/src/shared/lib/supabase';
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { SortableImage, PhotoItem } from './SortableImage';
import styles from './GalleryManager.module.css';

interface GalleryManagerProps {
  album: AlbumPhoto[];
  onChange: (newAlbum: AlbumPhoto[]) => void;
}

const getThumbnailUrl = (url: string) => {
  if (url.includes('supabase')) {
    return `${url}?width=200`;
  }
  return url;
}; // Helper to get thumbnail URL

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

  const handleImageResize = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const maxWidth = 1920;
      const maxHeight = 1080;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(resizedFile);
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            file.type,
            0.8,
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

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
          fileToUpload = await handleImageResize(file);
        } catch (e) {
          console.error('Resize failed for gallery image', e);
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('wedding-images')
          .upload(fileName, fileToUpload);

        if (error) throw error;

        const { data } = supabase.storage.from('wedding-images').getPublicUrl(fileName);

        newPhotos.push({
          id: fileName, // Using filename as ID for simplicity
          url: data.publicUrl,
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
                thumbnailUrl={getThumbnailUrl(photo.url)}
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
              thumbnailUrl={getThumbnailUrl(album.find((p) => p.id === activeId)!.url)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}
