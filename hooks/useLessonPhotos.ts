'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'lesson-photos';

/**
 * Lesson-photo upload/delete.
 *
 * Storage layout: `lesson-photos/{lessonId}/{timestamp}-{random}.{ext}`
 * The bucket should be **public read** so we can drop the returned
 * public URL straight into <img src>. Writes require an authenticated
 * session (handled by Supabase RLS on the bucket).
 *
 * This hook only handles Storage. Persisting the URL onto
 * `lessons.photo_urls` is the caller's job (use `updateLesson`).
 */
export function useLessonPhotos() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = useCallback(async (lessonId: string, file: File): Promise<string> => {
    setUploading(true);
    setError(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

      const sb = supabase();
      const { error: uploadError } = await sb.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const deletePhoto = useCallback(async (publicUrl: string): Promise<void> => {
    setError(null);
    // Derive the storage path from the public URL.
    // Public URLs look like:
    //   https://<project>.supabase.co/storage/v1/object/public/lesson-photos/<lessonId>/<file>
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) {
      // Not a path we recognise — bail silently rather than throwing,
      // so callers can still remove the URL from the array.
      return;
    }
    const path = publicUrl.slice(idx + marker.length);
    const { error: rmError } = await supabase().storage.from(BUCKET).remove([path]);
    if (rmError) {
      setError(rmError.message);
      throw rmError;
    }
  }, []);

  return { uploadPhoto, deletePhoto, uploading, error };
}
