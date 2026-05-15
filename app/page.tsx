'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const { user, loading } = useAuth();
  const [slowLoad, setSlowLoad] = useState(false);

  // Hard navigations — more reliable than client-side router on iOS Safari/PWA.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace('/auth');
      return;
    }
    window.location.replace('/teacher');
  }, [user, loading]);

  // Surface a "still loading" message + manual retry after 3s so users are
  // never silently stuck on the spinner.
  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return;
    }
    const t = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  function clearSessionAndReload() {
    try {
      // Nuke any Supabase auth tokens cached in localStorage so the page
      // reloads as a fresh, signed-out session.
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') || k.includes('supabase')) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      /* localStorage might be unavailable in some private modes; ignore */
    }
    window.location.replace('/auth');
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6">
      <Logo size="lg" />
      <p className="mt-4 text-sm text-[var(--color-text-mute)]">Loading…</p>
      {slowLoad && (
        <div className="mt-8 max-w-sm space-y-3 text-center">
          <p className="text-xs text-[var(--color-text-dim)]">
            Taking longer than expected. Try one of these:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center rounded-full bg-[var(--color-gold)] px-4 text-xs font-semibold text-black"
            >
              Reload page
            </button>
            <button
              onClick={clearSessionAndReload}
              className="inline-flex h-9 items-center rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text-mute)] hover:text-[var(--color-text)]"
            >
              Reset &amp; sign in again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
