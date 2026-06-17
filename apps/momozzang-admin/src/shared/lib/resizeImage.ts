export interface ResizeImageOptions {
  maxWidth?: number; // 기본 1920
  maxHeight?: number; // 기본 1080
  quality?: number; // 기본 0.8 (초기 품질; 목표 용량 초과 시 단계적으로 낮춤)
  targetBytes?: number; // 목표 용량(bytes). 기본 1_000_000(1MB). 초과 시 품질 단계적 하강.
}

/** canvas.toBlob을 Promise로 감싸 특정 품질로 인코딩한 Blob을 반환한다. */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob failed'));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * 이미지 파일을 canvas로 리사이즈한다.
 * 기존 GalleryManager의 인라인 handleImageResize 로직을 그대로 추출한 공용 util.
 * - 분기: width > height 면 maxWidth 기준, 아니면 maxHeight 기준으로 비율 스케일.
 * - toBlob(blob, file.type, quality) 인자 보존.
 * - 결과는 new File([blob], file.name, { type: file.type })로 원본 파일명·타입 보존.
 * - 실패 시 reject(throw). 원본 폴백은 호출부 책임.
 * - 목표 용량(targetBytes, 기본 1MB) 초과 시 품질을 0.8→0.7→0.6→0.5 순으로 재인코딩.
 *   최저 품질(0.5)에서도 초과하면 그 결과로 진행(무한루프 방지, 최대 4~5회 시도).
 */
export function resizeImage(file: File, options?: ResizeImageOptions): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1080;
  const initialQuality = options?.quality ?? 0.8;
  const targetBytes = options?.targetBytes ?? 1_000_000;

  // 품질 단계: 초기값 → 0.7 → 0.6 → 0.5 (중복 제거 후 오름차순으로 정렬)
  const qualitySteps = [initialQuality, 0.7, 0.6, 0.5].filter(
    (q, i, arr) => arr.indexOf(q) === i && q <= initialQuality,
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
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

        try {
          let resultBlob: Blob | null = null;
          // 목표 용량 초과 시 품질 단계 순서대로 재인코딩 시도 (최대 qualitySteps 횟수)
          for (const q of qualitySteps) {
            const blob = await canvasToBlob(canvas, file.type, q);
            resultBlob = blob;
            if (blob.size <= targetBytes) break; // 목표 달성 → 루프 중단
            // 마지막 단계(0.5)까지 초과하면 그 결과를 그대로 사용(루프 자연 종료)
          }
          if (!resultBlob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const resizedFile = new File([resultBlob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
