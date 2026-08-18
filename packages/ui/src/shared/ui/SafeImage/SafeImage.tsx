import { useCallback, useState } from 'react';
import clsx from 'clsx';
import styles from './SafeImage.module.css';

/** 폴백이 켜졌을 때의 3상태. `ImageThumb`(어드민)와 동일한 전이 규칙을 공유한다. */
export type SafeImageState = 'empty' | 'loaded' | 'error';

export const SAFE_IMAGE_FALLBACK_LABEL = '이미지를 불러올 수 없어요';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  /**
   * false(기본) → 기존과 동일하게 `<img>` 하나만 렌더한다(속성 `data-safe-image` 1개만 추가).
   *               뷰어(하객 화면)는 이 기본값을 그대로 쓰므로 DOM 이 변하지 않는다.
   * true        → empty/error 에서 `<img>` 를 DOM 에서 제거하고 중립 플레이스홀더를 렌더한다.
   *               폰 미리보기(어드민)는 `useIsPreviewMode()` 를 넘겨 켠다.
   */
  fallback?: boolean;
  fallbackLabel?: string;
  fallbackClassName?: string;
}

/**
 * 이미지 실패·빈 상태 폴백 원시 컴포넌트(F2).
 *
 * 핵심은 `error` 에서 `<img>` 를 **DOM 에서 제거**하는 것이다. `<img>` 를 남긴 채 CSS 로만 덮으면
 * 브라우저 액박/alt 텍스트가 순간 노출된다. 재시도 루프를 막기 위해 실패한 `src` 값 자체를 기억하고,
 * `src` 가 실제로 바뀔 때만 `<img>` 를 다시 마운트한다.
 */
export function SafeImage({
  src,
  alt,
  fallback = false,
  fallbackLabel = SAFE_IMAGE_FALLBACK_LABEL,
  fallbackClassName,
  className,
  onError,
  ...rest
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setFailedSrc(src);
      onError?.(event);
    },
    [src, onError],
  );

  if (!fallback) {
    // 뷰어 경로: 반환 DOM 은 `<img>` 하나뿐이다(무회귀 보장).
    return (
      <img
        {...rest}
        src={src}
        alt={alt}
        className={className}
        data-safe-image=""
        onError={onError}
      />
    );
  }

  const state: SafeImageState = !src ? 'empty' : failedSrc === src ? 'error' : 'loaded';

  if (state === 'loaded') {
    return (
      <img
        {...rest}
        src={src}
        alt={alt}
        className={className}
        data-safe-image=""
        onError={handleError}
      />
    );
  }

  return (
    <div
      className={clsx(styles.fallback, fallbackClassName ?? className)}
      data-safe-image-fallback=""
      data-state={state}
      role="img"
      aria-label={alt}
    >
      <span className={styles.label}>{fallbackLabel}</span>
    </div>
  );
}
