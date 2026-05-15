'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LessonRow } from '@/lib/db-types';

export function useLessons(studentId: string | undefined) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    if (!studentId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase()
      .from('lessons')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_number', { ascending: true });
    if (error) {
      setError(error.message);
      setLessons([]);
    } else {
      setError(null);
      setLessons(data ?? []);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const updateLesson = useCallback(
    async (id: string, patch: Partial<LessonRow>) => {
      const optimistic = lessons.map((l) => (l.id === id ? { ...l, ...patch } : l));
      setLessons(optimistic);
      // Supabase's generic update() type inference doesn't resolve from our
      // hand-written Database type — runtime is correct, so we silence the
      // mis-inferred 'never' parameter here.
      // @ts-expect-error -- Supabase update() type inference vs. hand-written Database
      const { error } = await supabase().from('lessons').update(patch).eq('id', id);
      if (error) {
        setError(error.message);
        await fetchLessons();
      }
    },
    [lessons, fetchLessons]
  );

  const markComplete = useCallback(
    (id: string) =>
      updateLesson(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }),
    [updateLesson]
  );

  const toggleFavourite = useCallback(
    (id: string, currentValue: boolean | null) =>
      updateLesson(id, { is_favourite: !currentValue }),
    [updateLesson]
  );

  return {
    lessons,
    loading,
    error,
    refresh: fetchLessons,
    updateLesson,
    markComplete,
    toggleFavourite,
  };
}
