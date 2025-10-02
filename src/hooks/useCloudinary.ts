import { useState } from 'react';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

interface UseCloudinaryOptions {
  maxWidth?: number;
  quality?: number;
}

export const useCloudinary = (options: UseCloudinaryOptions = {}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { maxWidth = 800, quality = 80 } = options;

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => resolve(blob!),
          'image/jpeg',
          quality / 100
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<CloudinaryResponse | null> => {
    if (!cloudName || !uploadPreset) {
      setError('Cloudinary configuration missing. Please check environment variables.');
      return null;
    }

    try {
      setUploading(true);
      setError(null);

      // Compress image before upload
      const compressedBlob = await compressImage(file, maxWidth, quality);
      
      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'dalmore-reserve');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const generateThumbnailUrl = (publicId: string, width = 150, height = 150): string => {
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_fill/${publicId}`;
  };

  return {
    uploadImage,
    generateThumbnailUrl,
    uploading,
    error,
  };
};