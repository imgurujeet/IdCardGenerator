import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';

export interface UploadImageResult {
  url: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}

export const storageService = {
  /**
   * Automatically compresses the image on the client side, then uploads to Supabase Storage bucket.
   * Falls back to high-efficiency compressed Data URL if Supabase is offline.
   */
  async uploadPortrait(
    file: File,
    orgId: string = 'org-0001'
  ): Promise<UploadImageResult> {
    // 1. Compress image client-side first
    const compressed = await compressImage(file, {
      maxDimension: 1400,
      quality: 0.84,
      outputType: 'image/webp',
    });

    // 2. If Supabase is live, upload to 'portraits' bucket
    if (isLiveSupabaseConfigured) {
      try {
        const fileExt = compressed.file.name.split('.').pop() || 'webp';
        const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('portraits')
          .upload(fileName, compressed.file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: compressed.file.type,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('portraits')
            .getPublicUrl(fileName);

          return {
            url: publicUrlData.publicUrl,
            originalSize: compressed.originalSizeBytes,
            compressedSize: compressed.compressedSizeBytes,
            savingsPercent: compressed.savingsPercent,
          };
        } else {
          console.warn('Supabase storage upload returned error, falling back to data URL:', uploadError.message);
        }
      } catch (err) {
        console.warn('Supabase storage upload failed, falling back to data URL:', err);
      }
    }

    // Fallback: return compressed high-quality data URL
    return {
      url: compressed.dataUrl,
      originalSize: compressed.originalSizeBytes,
      compressedSize: compressed.compressedSizeBytes,
      savingsPercent: compressed.savingsPercent,
    };
  },

  /**
   * Upload custom background images or logo graphics
   */
  async uploadBackground(file: File, orgId: string = 'org-0001'): Promise<UploadImageResult> {
    const compressed = await compressImage(file, {
      maxDimension: 2200,
      quality: 0.88,
      outputType: 'image/webp',
    });

    if (isLiveSupabaseConfigured) {
      try {
        const fileExt = compressed.file.name.split('.').pop() || 'webp';
        const fileName = `${orgId}/bg-${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
          .from('id-card-assets')
          .upload(fileName, compressed.file, {
            cacheControl: '31536000',
            contentType: compressed.file.type,
          });

        if (!error) {
          const { data } = supabase.storage.from('id-card-assets').getPublicUrl(fileName);
          return {
            url: data.publicUrl,
            originalSize: compressed.originalSizeBytes,
            compressedSize: compressed.compressedSizeBytes,
            savingsPercent: compressed.savingsPercent,
          };
        }
      } catch (e) {
        console.warn('Background upload fallback:', e);
      }
    }

    return {
      url: compressed.dataUrl,
      originalSize: compressed.originalSizeBytes,
      compressedSize: compressed.compressedSizeBytes,
      savingsPercent: compressed.savingsPercent,
    };
  },
};
