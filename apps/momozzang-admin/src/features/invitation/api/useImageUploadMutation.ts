import { useMutation } from '@tanstack/react-query';
import { uploadImage } from '../imageUpload';

/**
 * 단일 이미지 업로드 mutation.
 * 업로드 경로/분기는 `uploadImage`에 위임한다([G3]: 비-supabase 환경에서는 blob URL 반환).
 * 호출 측은 리사이즈된 파일을 전달한다(기존 컨벤션 유지).
 */
export function useImageUploadMutation() {
  return useMutation({
    mutationFn: (file: File) => uploadImage(file, 'admin'),
  });
}
