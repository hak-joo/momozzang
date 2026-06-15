export interface ResizeImageOptions {
  maxWidth?: number; // 기본 1920
  maxHeight?: number; // 기본 1080
  quality?: number; // 기본 0.8
}

/**
 * 이미지 파일을 canvas로 리사이즈한다.
 * 기존 GalleryManager의 인라인 handleImageResize 로직을 그대로 추출한 공용 util.
 * - 분기: width > height 면 maxWidth 기준, 아니면 maxHeight 기준으로 비율 스케일.
 * - toBlob(blob, file.type, quality) 인자 보존.
 * - 결과는 new File([blob], file.name, { type: file.type })로 원본 파일명·타입 보존.
 * - 실패 시 reject(throw). 원본 폴백은 호출부 책임.
 */
export function resizeImage(file: File, options?: ResizeImageOptions): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1080;
  const quality = options?.quality ?? 0.8;

  return new Promise((resolve, reject) => {
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
          quality,
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
