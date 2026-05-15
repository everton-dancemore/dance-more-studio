'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const router = useRouter();
  const { user, isTeacher, isAdmin, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (isTeacher && profile?.teacher_id) {
      router.replace('/teacher');
      return;
    }
    if (isAdmin) {
      // Admin without teacher_id — for now, send to teacher view if they have one,
      // otherwise show a placeholder. (Full admin dashboard lives on Lovable for now.)
      router.replace('/teacher');
      return;
    }
    router.replace('/teacher');
  }, [user, isTeacher, isAdmin, profile, loading, router]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center">
      <Logo size="lg" />
      <p className="mt-4 text-sm text-[var(--color-text-mute)]">Loading…</p>
    </main>
  );
}
