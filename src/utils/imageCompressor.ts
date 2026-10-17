export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savingsPercent: number;
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Intelligently downscales high-megapixel camera photos and converts to efficient WebP/JPEG,
 * reducing multi-megabyte uploads to crisp ~100-250KB images with zero visible quality loss.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxDimension = 1600,
    quality = 0.84,
    outputType = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into element'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale while strictly preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D canvas context'));
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill white background in case of transparent png converting to jpeg
        if (outputType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Test webp support or fallback to jpeg
        let actualMime = outputType;
        let dataUrl = canvas.toDataURL(actualMime, quality);
        if (!dataUrl.startsWith(`data:${actualMime}`)) {
          actualMime = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }

            const ext = actualMime === 'image/webp' ? 'webp' : 'jpg';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${baseName}-compressed.${ext}`, {
              type: actualMime,
              lastModified: Date.now(),
            });

            const originalSizeBytes = file.size;
            const compressedSizeBytes = blob.size;
            const savingsPercent = Math.max(
              0,
              Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
            );

            resolve({
              dataUrl,
              blob,
              file: compressedFile,
              originalSizeBytes,
              compressedSizeBytes,
              savingsPercent,
            });
          },
          actualMime,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
