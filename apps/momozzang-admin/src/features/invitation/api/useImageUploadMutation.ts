import { useMutation } from '@tanstack/react-query';
import { supabase } from '@momozzang/ui/src/shared/lib/supabase';

export function useImageUploadMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('wedding-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('wedding-images').getPublicUrl(filePath);

      return data.publicUrl;
    },
  });
}
