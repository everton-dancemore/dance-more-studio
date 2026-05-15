'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const router = useRouter();
  const { user, isTeacher, isAdmin, profile, loading } = useAuth();
  const [slowLoad, setSlowLoad] = useState(false);

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
      router.replace('/teacher');
      return;
    }
    router.replace('/teacher');
  }, [user, isTeacher, isAdmin, profile, loading, router]);

  // Surface a "still loading" message + manual retry after 5s so users are
  // never silently stuck on the spinner.
  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6">
      <Logo size="lg" />
      <p className="mt-4 text-sm text-[var(--color-text-mute)]">Loading…</p>
      {slowLoad && (
        <div className="mt-6 max-w-sm text-center">
          <p className="text-xs text-[var(--color-text-dim)]">
            Taking longer than usual. Tap below to retry.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-[var(--color-gold)] px-4 text-xs font-semibold text-black"
          >
            Reload
          </button>
          <button
            onClick={() => router.replace('/auth')}
            className="ml-2 inline-flex h-9 items-center rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text-mute)]"
          >
            Go to sign in
          </button>
        </div>
      )}
    </main>
  );
}
