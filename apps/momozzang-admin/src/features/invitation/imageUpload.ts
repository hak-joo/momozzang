/**
 * 이미지 업로드 공용 헬퍼.
 *
 * - `resizeImage`: `../../shared/lib/resizeImage` 에서 re-export (중복 구현 제거).
 * - `uploadImage`: 비-supabase 환경(G3 로컬)에서는 blob URL 반환, 그 외엔 R2(Cloudflare Worker) 업로드 후 객체 키 반환.
 * - `resizeAndUploadImage`: 리사이즈 + 업로드를 한 번에. 리사이즈 실패 시 원본으로 업로드.
 */

export { resizeImage } from '../../shared/lib/resizeImage';
import { resizeImage } from '../../shared/lib/resizeImage';
import { uploadToR2 } from '../../shared/lib/uploadToR2';

/** 비-supabase 환경 여부. 이때 업로드는 실 스토리지 대신 로컬 미리보기 URL을 반환한다([G3-i]). */
export function isLocalDataSource(): boolean {
  return import.meta.env.VITE_DATA_SOURCE !== 'supabase';
}

/**
 * 이미지 업로드. 결과로 R2 객체 키(또는 로컬 미리보기 blob URL)를 반환한다.
 *
 * - `VITE_DATA_SOURCE === 'supabase'` 또는 ENDPOINT 설정 환경: Cloudflare Worker(R2 바인딩)에
 *   업로드하고 **객체 키**를 반환한다. 렌더 시 `buildImageUrl(key)` 로 URL 조립.
 * - 그 외(local 등): 실 스토리지에 쓰지 않고 `URL.createObjectURL`로 blob URL을 반환한다([G3-i]).
 *   → QA/로컬 환경에서 업로드가 운영 스토리지에 고아 파일을 남기지 않는다.
 *   `buildImageUrl`이 blob: 접두를 그대로 통과시켜 호출부 호환이 유지된다.
 *
 * @param prefix 파일명 접두(단일=`admin`, 갤러리=`gallery`) — 기존 명명 컨벤션 유지.
 */
export async function uploadImage(file: File, prefix: 'admin' | 'gallery' = 'admin'): Promise<string> {
  if (isLocalDataSource()) {
    return window.URL.createObjectURL(file);
  }

  const { key } = await uploadToR2(file, prefix);
  return key;
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
