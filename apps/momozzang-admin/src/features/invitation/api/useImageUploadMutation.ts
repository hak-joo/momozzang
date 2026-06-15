import { useMutation } from '@tanstack/react-query';
import { resizeImage } from '../../../shared/lib/resizeImage';
import { uploadImage } from '../imageUpload';

/**
 * 단일 이미지 업로드 mutation (대표/공유/신랑/신부).
 *
 * - 전송 전 클라이언트 리사이즈(전송량 절감).
 * - 업로드 경로/분기는 `uploadImage`에 위임한다:
 *   - VITE_DATA_SOURCE=supabase 이상 환경: Cloudflare Worker(R2) 업로드 → 객체 키 반환.
 *   - 로컬/QA 환경: blob URL 반환([G3-i]).
 * - 호출부(AdminPage)는 결과값을 데이터 필드에 저장하고, 렌더 시 buildImageUrl(key) 로 URL 조립.
 */
export function useImageUploadMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      let fileToUpload = file;
      try {
        fileToUpload = await resizeImage(file);
      } catch (e) {
        console.error('Resize failed for image upload', e);
      }
      return uploadImage(fileToUpload, 'admin');
    },
  });
}
