import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { SortableImage } from './SortableImage';
import styles from './GalleryManager.module.css';

interface GalleryManagerProps {
  album: AlbumPhoto[];
  onChange: (newAlbum: AlbumPhoto[]) => void;
}

export function GalleryManager({ album, onChange }: GalleryManagerProps) {
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = album.findIndex((item) => item.id === active.id);
      const newIndex = album.findIndex((item) => item.id === over.id);

      onChange(arrayMove(album, oldIndex, newIndex));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this photo?')) {
      onChange(album.filter((item) => item.id !== id));
    }
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
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage.from('wedding-images').upload(fileName, file);

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={album.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {album.map((photo) => (
              <SortableImage key={photo.id} photo={photo} onRemove={() => handleDelete(photo.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
