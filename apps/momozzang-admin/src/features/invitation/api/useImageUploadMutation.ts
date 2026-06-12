import { useMutation } from '@tanstack/react-query';
import { supabase } from '@momozzang/ui/src/shared/lib/supabase';
import { resizeImage } from '../../../shared/lib/resizeImage';

export function useImageUploadMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      let fileToUpload = file;
      try {
        fileToUpload = await resizeImage(file);
      } catch (e) {
        console.error('Resize failed for image upload', e);
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('wedding-images')
        .upload(filePath, fileToUpload, { cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      // 절대 URL이 아닌 객체 키(버킷 제외)만 저장한다. 렌더 시점에 buildImageUrl 로 조립.
      return filePath;
    },
  });
}
