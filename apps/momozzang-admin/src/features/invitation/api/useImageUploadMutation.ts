import { useMutation } from '@tanstack/react-query';
import { resizeImage } from '../../../shared/lib/resizeImage';
import { uploadToR2 } from '../../../shared/lib/uploadToR2';

/**
 * 단일 이미지 업로드 mutation (대표/공유/신랑/신부).
 *
 * Supabase Storage 대신 **Cloudflare Worker(R2 바인딩)** 로 업로드한다.
 * - 전송 전 클라이언트 리사이즈(전송량 절감) 유지.
 * - Worker 가 응답한 **객체 키**(절대 URL 아님)를 반환 → 호출부가 데이터 필드에 저장.
 * - 렌더 시점에 buildImageUrl(key) 로 img.momozzang.com URL 을 조립한다.
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

      // prefix 'admin' → 키: admin-<ts>-<rand>.<검증된ext> (Worker 가 생성)
      const { key } = await uploadToR2(fileToUpload, 'admin');
      return key;
    },
  });
}
