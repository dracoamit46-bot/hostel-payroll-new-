import { supabase } from '../supabaseClient';

export interface UploadOptions {
  bucket: 'task-proofs' | 'attendance-selfies' | 'attachments';
  userId: string;
  maxSizeBytes?: number; // default 5MB
  allowedMimeTypes?: string[];
}

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const storageService = {
  /**
   * Upload an image/file directly to Supabase Storage.
   * Validates file and uploads to bucket under `${userId}/${uuid}.${ext}`.
   */
  async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    const {
      bucket,
      userId,
      maxSizeBytes = DEFAULT_MAX_SIZE,
      allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    } = options;

    // 1. Validation
    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      return { success: false, error: `File exceeds maximum allowed size of ${maxMb}MB.` };
    }

    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type (${file.type}). Allowed types: ${allowedMimeTypes.join(', ')}`,
      };
    }

    // 2. Supabase Storage Upload
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileUuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const cleanPath = `${userId}/${fileUuid}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(cleanPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return { success: false, error: error.message };
      }

      // Try creating signed URL (valid for 24 hours) for private bucket
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 60 * 60 * 24);

      let finalUrl = signedData?.signedUrl;

      // Fallback to public URL if signed URL fails or bucket is public
      if (signedError || !finalUrl) {
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);
        finalUrl = publicData.publicUrl;
      }

      return {
        success: true,
        path: data.path,
        url: finalUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage upload failed';
      return { success: false, error: msg };
    }
  },

  /**
   * Get accessible URL for a stored object path.
   */
  async getFileUrl(bucket: string, path: string): Promise<string> {
    if (!path) return '';
    // If it's already an HTTP URL, return directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicData.publicUrl;
    } catch {
      return path;
    }
  },
};
