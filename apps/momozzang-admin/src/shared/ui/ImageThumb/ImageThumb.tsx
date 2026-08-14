import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import styles from './ImageThumb.module.css';

/** 3상태. `SafeImage`(공유 원시 컴포넌트)와 동일한 전이 규칙을 공유한다. */
export type ImageThumbState = 'empty' | 'loaded' | 'error';

export const IMAGE_THUMB_EMPTY_LABEL = '여기에 이미지를 등록하세요';
export const IMAGE_THUMB_ERROR_LABEL = '이미지를 불러올 수 없어요';

export interface ImageThumbProps {
  /** 표시할 URL. 빈 문자열/undefined/null → empty */
  src?: string | null;
  /** 필수. loaded 일 때 img 의 alt, empty/error 일 때 aria-label */
  alt: string;
  /** 표시 비율. 기본 'square' */
  ratio?: 'square' | 'portrait' | 'landscape';
  /** 크기 프리셋. 'sm'=갤러리 그리드(그리드 셀 채움), 'md'=폼 슬롯(max-width 160). 기본 'md' */
  size?: 'sm' | 'md';
  /** empty 안내 문구. 기본 '여기에 이미지를 등록하세요' */
  emptyLabel?: string;
  /** error 안내 문구. 기본 '이미지를 불러올 수 없어요' */
  errorLabel?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  draggable?: boolean;
  /** 갤러리 삭제 버튼 등 오버레이 */
  children?: React.ReactNode;
}

/**
 * 어드민 3상태 이미지 썸네일/슬롯(F2).
 *
 * `error` 에서 `<img>` 를 **DOM 에서 제거**하는 것이 핵심이다 — 남긴 채 CSS 로만 덮으면
 * 브라우저 액박/alt 가 노출된다(P0-2). 재시도 루프를 막기 위해 실패한 `src` 값을 기억하고,
 * `src` 가 실제로 바뀔 때만 `<img>` 를 다시 마운트한다.
 *
 * 루트에 `data-image-thumb` / `data-state` 를 노출해 상태를 외부에서 직접 측정할 수 있게 한다.
 */
export function ImageThumb({
  src,
  alt,
  ratio = 'square',
  size = 'md',
  emptyLabel = IMAGE_THUMB_EMPTY_LABEL,
  errorLabel = IMAGE_THUMB_ERROR_LABEL,
  className,
  loading = 'lazy',
  draggable,
  children,
}: ImageThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null | undefined>(undefined);

  const handleError = useCallback(() => {
    setFailedSrc(src);
  }, [src]);

  const state: ImageThumbState = !src ? 'empty' : failedSrc === src ? 'error' : 'loaded';

  return (
    <div
      className={clsx(styles.root, styles[ratio], styles[size], styles[state], className)}
      data-image-thumb=""
      data-state={state}
      {...(state === 'loaded' ? {} : { role: 'img', 'aria-label': alt })}
    >
      {state === 'loaded' && (
        <img
          src={src ?? ''}
          alt={alt}
          className={styles.image}
          loading={loading}
          draggable={draggable}
          onError={handleError}
        />
      )}
      {state !== 'loaded' && (
        <span className={styles.label}>{state === 'empty' ? emptyLabel : errorLabel}</span>
      )}
      {children}
    </div>
  );
}
