import { useCallback } from 'react';
import { clsx } from 'clsx';
import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Select } from '@momozzang/ui/src/shared/ui/Select';
import { Checkbox } from '@momozzang/ui/src/shared/ui/Checkbox';
import {
  type WeddingInvitation,
  type ThemeColorOptions,
} from '@momozzang/ui/src/entities/WeddingInvitation/model';
import { GalleryManager } from '../GalleryManager/GalleryManager';
import {
  MOOD_OPTIONS,
  type Mood,
  type SingleImageSlot,
  type useApplyForm,
} from '../../features/apply/useApplyForm';
import styles from './ImageStep.module.css';

type Form = ReturnType<typeof useApplyForm>;

interface Props {
  invitation: WeddingInvitation;
  /** 단일 슬롯 지연 선택(F1·F2·F5): 업로드 없이 pending 보관만. */
  onSingleImagePending: Form['setSingleImagePending'];
  /** 단일 슬롯 썸네일 src(F2): pending blob 우선. */
  getSinglePreviewUrl: Form['getSinglePreviewUrl'];
  /** 갤러리 신 인터페이스(F1·F2·F4) — S2 GalleryManager 배선. */
  onGalleryAddFiles: Form['onGalleryAddFiles'];
  onGalleryRemoveItem: Form['onGalleryRemoveItem'];
  getGalleryThumbnailUrl: Form['getGalleryThumbnailUrl'];
  onAlbumChange: Form['setAlbum'];
  onBgmChange: Form['setBgm'];
  onSelectTrack: Form['selectTrack'];
  onUpdateTrack: Form['updateTrack'];
  onCustomizationChange: Form['setCustomization'];
  onMiniRoomChange: Form['setMiniRoom'];
}

const SINGLE_IMAGE_SLOTS: Array<{ slot: SingleImageSlot; label: string; preview: boolean }> = [
  { slot: 'representative', label: '대표 이미지 (저장만)', preview: false },
  { slot: 'share', label: '공유 썸네일 (저장만)', preview: false },
  { slot: 'main', label: '메인 이미지 (미리보기 반영)', preview: true },
  { slot: 'aboutGroom', label: '신랑 소개 이미지 (미리보기 반영)', preview: true },
  { slot: 'aboutBride', label: '신부 소개 이미지 (미리보기 반영)', preview: true },
];

/**
 * 단일 이미지 슬롯 필드(F1·F2·F5).
 * 파일 선택 시 R2 업로드를 하지 않고 부모(useApplyForm)의 setSingleImagePending 만 호출한다.
 * 썸네일 src 는 getSinglePreviewUrl(slot)(=pending blob 우선, 없으면 저장 키).
 */
function ImageUploadField({
  slot,
  label,
  previewUrl,
  onSelect,
}: {
  slot: SingleImageSlot;
  label: string;
  previewUrl: string;
  onSelect: (slot: SingleImageSlot, file: File) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onSelect(slot, file); // 업로드 없음 — pending 보관 + blob previewUrl 만.
      e.target.value = ''; // 같은 파일 재선택 허용.
    },
    [slot, onSelect],
  );

  return (
    <div className={styles.imageField}>
      <span className={styles.imageLabel}>{label}</span>
      {previewUrl && (
        <img src={previewUrl} alt={label} className={styles.thumb} loading="lazy" />
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        data-testid={`image-upload-${slot}`}
      />
    </div>
  );
}

export function ImageStep({
  invitation,
  onSingleImagePending,
  getSinglePreviewUrl,
  onGalleryAddFiles,
  onGalleryRemoveItem,
  getGalleryThumbnailUrl,
  onAlbumChange,
  onBgmChange,
  onSelectTrack,
  onUpdateTrack,
  onCustomizationChange,
  onMiniRoomChange,
}: Props) {
  const { bgm, customization } = invitation;
  const selectedTrackId = bgm?.selectedTrackId;
  const selectedTrack = bgm?.library.find((t) => t.id === selectedTrackId);

  return (
    <div className={styles.step}>
      {/* F10: 단일 이미지 업로드 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>이미지 등록</h3>
        <p className={styles.hint}>
          메인/신랑·신부 소개 이미지는 좌측 미리보기에 즉시 반영됩니다. 대표/공유 썸네일은 저장됩니다.
        </p>
        <div className={styles.imageGrid}>
          {SINGLE_IMAGE_SLOTS.map(({ slot, label }) => (
            <ImageUploadField
              key={slot}
              slot={slot}
              label={label}
              previewUrl={getSinglePreviewUrl(slot)}
              onSelect={onSingleImagePending}
            />
          ))}
        </div>
      </section>

      {/* F10: 갤러리 (드래그 정렬·최대 20장·삭제) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>갤러리</h3>
        <p className={styles.hint}>사진을 추가/드래그 정렬/삭제할 수 있습니다(최대 20장). 미리보기 갤러리에 즉시 반영됩니다.</p>
        <GalleryManager
          album={invitation.album ?? []}
          onChange={onAlbumChange}
          onAddFiles={onGalleryAddFiles}
          onRemoveItem={onGalleryRemoveItem}
          getThumbnailUrl={getGalleryThumbnailUrl}
        />
      </section>

      {/* F11: BGM */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>배경음악(BGM)</h3>
        <Checkbox
          checked={bgm?.enabled ?? false}
          onChange={(e) => onBgmChange({ enabled: e.target.checked })}
          label="BGM 사용"
        />

        {(bgm?.library?.length ?? 0) === 0 ? (
          <p className={styles.hint}>등록된 트랙이 없습니다.</p>
        ) : (
          <ul className={styles.trackList}>
            {bgm!.library.map((track) => (
              <li
                key={track.id}
                className={clsx(
                  styles.trackItem,
                  selectedTrackId === track.id && styles.trackItemSelected,
                )}
                onClick={() => onSelectTrack(track.id)}
                data-testid={`bgm-track-${track.id}`}
              >
                <input
                  type="radio"
                  name="bgm-track"
                  checked={selectedTrackId === track.id}
                  onChange={() => onSelectTrack(track.id)}
                />
                <span className={styles.trackMeta}>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackArtist}>{track.artist ?? '아티스트 미상'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {selectedTrack && (
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bgm-edit-title">
                선택 트랙 제목
              </label>
              <Input
                id="bgm-edit-title"
                value={selectedTrack.title}
                onChange={(e) => onUpdateTrack(selectedTrack.id, { title: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bgm-edit-artist">
                아티스트
              </label>
              <Input
                id="bgm-edit-artist"
                value={selectedTrack.artist ?? ''}
                onChange={(e) => onUpdateTrack(selectedTrack.id, { artist: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bgm-edit-preview">
                미리듣기 URL
              </label>
              <Input
                id="bgm-edit-preview"
                value={selectedTrack.previewUrl}
                onChange={(e) => onUpdateTrack(selectedTrack.id, { previewUrl: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bgm-edit-license">
                라이선스
              </label>
              <Select
                id="bgm-edit-license"
                value={selectedTrack.license}
                onChange={(e) =>
                  onUpdateTrack(selectedTrack.id, {
                    license: e.target.value as 'free' | 'paid' | 'custom',
                  })
                }
              >
                <option value="free">free</option>
                <option value="paid">paid</option>
                <option value="custom">custom</option>
              </Select>
            </div>
          </div>
        )}
      </section>

      {/* F12: 커스터마이즈 잔여 + 미니룸 (저장만) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>커스터마이즈 (저장만)</h3>
        <Checkbox
          checked={customization?.enabled ?? true}
          onChange={(e) => onCustomizationChange({ enabled: e.target.checked })}
          label="커스터마이즈 사용"
        />
        <Checkbox
          checked={customization?.showDDay ?? true}
          onChange={(e) => onCustomizationChange({ showDDay: e.target.checked })}
          label="D-Day 표시"
        />

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-mood">
              무드
            </label>
            <Select
              id="apply-mood"
              value={customization?.mood ?? ''}
              onChange={(e) =>
                onCustomizationChange({ mood: (e.target.value || undefined) as Mood | undefined })
              }
            >
              <option value="">선택 안 함</option>
              {MOOD_OPTIONS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-themecolor-step2">
              테마색
            </label>
            <Select
              id="apply-themecolor-step2"
              value={customization?.themeColor === 'PINK' ? 'PINK' : 'PURPLE'}
              onChange={(e) =>
                onCustomizationChange({ themeColor: e.target.value as ThemeColorOptions })
              }
            >
              <option value="PURPLE">PURPLE</option>
              <option value="PINK">PINK</option>
            </Select>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-miniroom-avatar">
              커플 아바타 템플릿 ID
            </label>
            <Input
              id="apply-miniroom-avatar"
              value={customization?.miniRoom?.coupleAvatarTemplateId ?? ''}
              onChange={(e) => onMiniRoomChange({ coupleAvatarTemplateId: e.target.value })}
              placeholder="예: mini-couple-01"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="apply-miniroom-room">
              방 템플릿 ID
            </label>
            <Input
              id="apply-miniroom-room"
              value={customization?.miniRoom?.roomTemplateId ?? ''}
              onChange={(e) => onMiniRoomChange({ roomTemplateId: e.target.value })}
              placeholder="예: classic-garden"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
