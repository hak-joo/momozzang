import { supabase } from '@momozzang/ui/src/shared/lib/supabase';

/**
 * 이미지 리사이즈 (max 1920×1080, 품질 0.8).
 * 기존 `AdminPage`/`GalleryManager`에 중복 인라인돼 있던 로직을 단일/갤러리 업로드가
 * 공용하도록 추출했다(동작 동일).
 */
export function resizeImage(file: File): Promise<File> {
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
}

/** 비-supabase 환경 여부. 이때 업로드는 실 스토리지 대신 로컬 미리보기 URL을 반환한다([G3-i]). */
export function isLocalDataSource(): boolean {
  return import.meta.env.VITE_DATA_SOURCE !== 'supabase';
}

/**
 * 이미지 업로드. 결과로 공개(또는 로컬 미리보기) URL 문자열을 반환한다.
 *
 * - `VITE_DATA_SOURCE === 'supabase'`: 기존 컨벤션대로 Supabase `wedding-images` 버킷에
 *   업로드하고 `getPublicUrl`로 공개 URL을 반환한다.
 * - 그 외(local 등): 실 스토리지에 쓰지 않고 `URL.createObjectURL`로 blob URL을 반환한다([G3-i]).
 *   → QA/로컬 환경에서 업로드가 운영 스토리지에 고아 파일을 남기지 않는다.
 *
 * @param prefix 파일명 접두(단일=`admin`, 갤러리=`gallery`) — 기존 명명 컨벤션 유지.
 */
export async function uploadImage(file: File, prefix: 'admin' | 'gallery' = 'admin'): Promise<string> {
  if (isLocalDataSource()) {
    return window.URL.createObjectURL(file);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('wedding-images').upload(fileName, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('wedding-images').getPublicUrl(fileName);
  return data.publicUrl;
}

/** 리사이즈 + 업로드를 한 번에. 리사이즈 실패 시 원본으로 업로드(기존 GalleryManager 동작 보존). */
export async function resizeAndUploadImage(
  file: File,
  prefix: 'admin' | 'gallery' = 'admin',
): Promise<string> {
  let fileToUpload = file;
  try {
    fileToUpload = await resizeImage(file);
  } catch (e) {
    console.error('Resize failed, uploading original', e);
  }
  return uploadImage(fileToUpload, prefix);
}
