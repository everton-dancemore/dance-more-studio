'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { useAuth, hasJustSignedOut } from '@/hooks/useAuth';

/**
 * Translate Supabase/internal auth errors into something a non-technical
 * user can actually read. Falls back to the original message if no match.
 */
function humanizeAuthError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)) || '';
  const m = raw.toLowerCase();

  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Login failed. Please check your email and password.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email address first.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts — please wait a moment and try again.';
  }
  if (m.includes('signin-timeout') || m.includes('timeout')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  return raw || 'Login failed. Please try again.';
}

export default function AuthPage() {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slowMessage, setSlowMessage] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot the "just signed out" flag at mount time. If the user just
  // hit Sign out, we deliberately stay on /auth even if useAuth briefly
  // reports a user (e.g. before its own short-circuit kicks in). The
  // flag is consumed by useAuth itself on its first loadSession call.
  const justSignedOutOnMount = useRef(false);
  useEffect(() => {
    justSignedOutOnMount.current = hasJustSignedOut();
    if (justSignedOutOnMount.current) {
      console.log('[auth-page] mount: just-signed-out flag detected, holding on /auth');
    }
  }, []);

  // If already signed in (e.g. user opens /auth while having a valid
  // session), bounce them straight to /teacher. Hard navigation, not
  // router.push — iOS Safari occasionally drops client-side route
  // changes when running as an installed PWA.
  useEffect(() => {
    if (justSignedOutOnMount.current) {
      // User just clicked Sign out on this navigation — do NOT bounce
      // them back into the dashboard. They explicitly want to be here.
      return;
    }
    if (!loading && user) {
      console.log('[auth-page] already signed in, redirecting to /teacher');
      window.location.replace('/teacher');
    }
  }, [user, loading]);

  // Clean up any pending timers on unmount.
  useEffect(() => {
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) {
      console.log('[auth-page] submit ignored — already busy');
      return;
    }
    setError(null);
    setSlowMessage(false);
    setBusy(true);

    // Slow-network UX hint: after 4s of waiting, show "Still checking..."
    slowTimer.current = setTimeout(() => setSlowMessage(true), 4000);

    // Belt-and-braces: even if signIn somehow never resolves AND never
    // throws (which shouldn't happen because useAuth.signIn has its own
    // 12s timeout), this hard safety timer guarantees the button never
    // stays "Signing in…" forever.
    safetyTimer.current = setTimeout(() => {
      console.warn('[auth-page] safety timer fired — releasing button');
      setBusy(false);
      setSlowMessage(false);
      setError('Login is taking too long. Please try again.');
    }, 15000);

    try {
      console.log('[auth-page] signIn called for', email.trim());
      await signIn(email.trim(), password);

      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);

      console.log('[auth-page] signIn resolved — navigating to /teacher');
      // Hard navigation so we cannot get stuck in client-side routing.
      // The component will unmount during navigation; that's fine — we
      // leave busy=true intentionally so the button doesn't briefly
      // un-spin before the page changes.
      window.location.replace('/teacher');
    } catch (err) {
      console.warn('[auth-page] signIn rejected', err);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setError(humanizeAuthError(err));
      setSlowMessage(false);
    } finally {
      // ALWAYS reset busy unless we successfully navigated away. We can't
      // detect navigation cleanly here (the success path explicitly leaves
      // busy=true and navigates), so we only reset when there was an error.
      // The success path leaves busy=true, but the page is gone in a moment.
      // The catch above already sets busy=false on error implicitly — wait
      // no it doesn't, let me be explicit:
      // (handled below)
    }
  }

  // Separate effect: if `error` is set, ensure busy is false. Belt-and-braces.
  useEffect(() => {
    if (error) setBusy(false);
  }, [error]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-serif text-3xl text-balance text-center">Welcome back</h1>
          <p className="mt-2 text-center text-sm text-[var(--color-text-mute)]">
            Sign in to your Dance More studio.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@dancemore.co"
              className="mt-1 h-12 text-base"
              disabled={busy}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-10 text-base"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#4a2826] bg-[#2a1a18] px-4 py-3 text-sm text-[var(--color-danger)]"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !email || !password}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          {busy && slowMessage && (
            <p className="text-center text-xs text-[var(--color-text-dim)]">
              Still checking your login…
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
