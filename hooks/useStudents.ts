'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { StudentRow } from '@/lib/db-types';

interface Params {
  teacherId?: string | null;
}

export function useStudents({ teacherId }: Params = {}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!teacherId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase()
      .from('students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('name', { ascending: true });
    if (error) {
      setError(error.message);
      setStudents([]);
    } else {
      setError(null);
      setStudents(data ?? []);
    }
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refresh: fetchStudents };
}

export function useStudent(studentId: string | undefined) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudent = useCallback(async () => {
    if (!studentId) {
      setStudent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase()
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setStudent(null);
    } else {
      setError(null);
      setStudent(data);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  return { student, loading, error, refresh: fetchStudent };
}
