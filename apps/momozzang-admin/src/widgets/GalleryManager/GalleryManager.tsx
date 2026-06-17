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
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { SortableImage, PhotoItem } from './SortableImage';
import styles from './GalleryManager.module.css';

const MAX_PHOTOS = 20;

interface GalleryManagerProps {
  /** 기존(키인) 항목 + pending(빈 url) 항목이 순서를 보존한 채 혼재. */
  album: AlbumPhoto[];
  /** 정렬(arrayMove) 후 새 album 배열 반영. */
  onChange: (newAlbum: AlbumPhoto[]) => void;
  /**
   * 파일 선택 시 호출(F1). 업로드는 하지 않는다 — 부모(AdminPage)가 각 File 을 pending 으로
   * 보관(setPending)하고 album 에 placeholder 항목을 추가한다. 여기서 R2 업로드는 절대 일어나지 않는다.
   */
  onAddFiles: (files: File[]) => void;
  /**
   * 삭제를 부모로 위임(①, 삭제=revoke 단일 책임). 부모는 pending 이면 clearPending(id)=revoke+제거,
   * 기존 항목이면 album 필터로 제거한다.
   */
  onRemoveItem: (id: string) => void;
  /**
   * 썸네일 src 단일 규칙 주입(F2). pending 이면 blob previewUrl, 기존이면 키를 buildImageUrl 로 조립.
   * 부모의 usePendingImages.getPreviewUrl(item.id, item.url) 를 그대로 넘긴다.
   */
  getThumbnailUrl: (item: AlbumPhoto) => string;
  /** 업로드/저장 진행 중 추가/삭제/정렬 잠금. */
  disabled?: boolean;
}

export function GalleryManager({
  album,
  onChange,
  onAddFiles,
  onRemoveItem,
  getThumbnailUrl,
  disabled = false,
}: GalleryManagerProps) {
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
        // ①: 삭제 책임을 부모로 위임. revoke(pending) / album 필터(기존) 모두 부모 한 곳에서.
        onRemoveItem(id);
      }
    },
    [onRemoveItem],
  );

  // F1: 파일 선택 → 업로드 없이 부모에게 File 들만 위임(부모가 pending + placeholder 추가).
  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // 20장 합산 제한(완료정의6). album.length = 기존+pending 합산 수.
    if (album.length + files.length > MAX_PHOTOS) {
      alert(
        `You can only upload up to ${MAX_PHOTOS} photos. Current: ${album.length}, trying to add: ${files.length}`,
      );
      event.target.value = '';
      return;
    }

    onAddFiles(files);
    // 같은 파일 재선택을 허용하기 위해 input 리셋.
    event.target.value = '';
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isFull = album.length >= MAX_PHOTOS;
  const activePhoto = activeId ? album.find((p) => p.id === activeId) : null;

  return (
    <Box variant="primary">
      <h3 className={styles.header}>{`Gallery (${album.length}/${MAX_PHOTOS})`}</h3>
      <div className={styles.controls}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleSelectFiles}
          disabled={disabled || isFull}
          className={styles.hiddenInput}
          ref={fileInputRef}
        />
        <Button onClick={handleButtonClick} disabled={disabled || isFull}>
          Add Photos +
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
                thumbnailUrl={getThumbnailUrl(photo)}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activePhoto ? (
            <PhotoItem
              photo={activePhoto}
              isDragging
              isOverlay
              style={{ cursor: 'grabbing' }}
              thumbnailUrl={getThumbnailUrl(activePhoto)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}
