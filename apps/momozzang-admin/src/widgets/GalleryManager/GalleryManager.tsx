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
import { AlbumPhoto } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { ImageThumb } from '../../shared/ui/ImageThumb';
import { FileDropField } from '../../shared/ui/FileDropField';
import { useAdminToast } from '../../shared/ui/Toast';
import { useAdminConfirm } from '../../shared/ui/ConfirmDialog';
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
  /**
   * 카드 제목 바로 아래 보조 설명. **호스트가 별도 제목을 달지 않게** 하기 위한 통로다 —
   * `/apply` 는 종전에 `갤러리` 라는 섹션 제목을 따로 달아 `사진첩 (n/20)` 과 제목이
   * 이중화돼 있었고 `/admin` 과 규칙이 어긋났다(QA_FINDINGS_3 N4).
   */
  description?: string;
}

export function GalleryManager({
  album,
  onChange,
  onAddFiles,
  onRemoveItem,
  getThumbnailUrl,
  disabled = false,
  description,
}: GalleryManagerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const toast = useAdminToast();
  // 지역 변수명을 `confirm` 으로 두면 네이티브 대화상자 소스 가드(계약 4 기준 6)가
  // 정상 구현을 위양성으로 잡는다. 반드시 `askConfirm` 이다.
  const askConfirm = useAdminConfirm();

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
    async (id: string) => {
      const accepted = await askConfirm({
        title: '이 사진을 삭제할까요?',
        description: '삭제한 사진은 되돌릴 수 없어요.',
        confirmText: '삭제',
        cancelText: '취소',
        destructive: true,
      });
      if (!accepted) return;
      // ①: 삭제 책임을 부모로 위임. revoke(pending) / album 필터(기존) 모두 부모 한 곳에서.
      onRemoveItem(id);
    },
    [askConfirm, onRemoveItem],
  );

  // F1: 파일 선택/드롭 → 업로드 없이 부모에게 File 들만 위임(부모가 pending + placeholder 추가).
  const handleSelectFiles = useCallback(
    (files: File[]) => {
      // 20장 합산 제한(완료정의6). album.length = 기존+pending 합산 수.
      if (album.length + files.length > MAX_PHOTOS) {
        toast.error({
          title: `사진은 최대 ${MAX_PHOTOS}장까지예요.`,
          description: `현재 ${album.length}장인데 ${files.length}장을 더 고르셨어요. ${
            MAX_PHOTOS - album.length
          }장까지 추가할 수 있어요.`,
        });
        return;
      }
      onAddFiles(files);
    },
    [album.length, onAddFiles, toast],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFull = album.length >= MAX_PHOTOS;
  const activePhoto = activeId ? album.find((p) => p.id === activeId) : null;

  return (
    <div className={styles.manager}>
      <h3 className={styles.header}>{`사진첩 (${album.length}/${MAX_PHOTOS})`}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {/* F6: 네이티브 위젯 대신 드롭존. `사진 추가 +` 버튼은 종전과 같이 인풋을 click() 으로
          트리거한다(§6 R11). 인풋은 display:none 이 아니라 clip 이라 키보드 포커스가 살아 있다. */}
      <FileDropField
        slot="gallery"
        id="gallery-file-input"
        label="사진 추가"
        buttonLabel="사진 추가 +"
        hint="여러 장을 한 번에 고르거나 이곳에 끌어다 놓을 수 있어요(최대 20장)."
        multiple
        disabled={disabled || isFull}
        onFiles={handleSelectFiles}
        inputRef={fileInputRef}
      />

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
        {album.length === 0 && (
          <div className={styles.grid}>
            {/* 빈 상태(F2): 빈 그리드 대신 점선 슬롯으로 "여기에 등록"임을 알린다. */}
            <ImageThumb
              alt="사진첩 빈 상태"
              size="sm"
              ratio="square"
              className={styles.emptySlot}
              emptyLabel="여기에 사진을 등록하세요"
            />
          </div>
        )}

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
    </div>
  );
}
