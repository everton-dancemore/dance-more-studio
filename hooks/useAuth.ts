'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, AppRole } from '@/lib/db-types';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  isAdmin: boolean;
  isTeacher: boolean;
  loading: boolean;
}

const EMPTY_AUTH: AuthState = {
  user: null,
  profile: null,
  roles: [],
  isAdmin: false,
  isTeacher: false,
  loading: false,
};

// ---- Timeout helper -------------------------------------------------------
// Wraps any Promise with a timeout. If the promise doesn't resolve in `ms`
// milliseconds, the wrapped promise rejects with an Error tagged 'timeout'.
// Used everywhere we call Supabase, because in production we've seen
// auth.getSession / signInWithPassword / signOut hang indefinitely on flaky
// iOS Safari sessions, leaving the UI stuck.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Auth hook — see MASTER_BRIEF.md §7 + §10 for full design notes.
 *
 * Safety guarantees:
 *  - `signIn` rejects within 12s (never silently hangs).
 *  - `signOut` resolves within 6s (state is cleared synchronously first).
 *  - `loading` is ALWAYS false within 8s of mount, no matter what.
 *  - Every setState is guarded by a `mounted` ref.
 *  - Console logs prefixed [auth] are intentional production diagnostics
 *    so we can read them from Safari Web Inspector / Vercel logs.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...EMPTY_AUTH, loading: true });
  const mounted = useRef(true);

  const loadSession = useCallback(async () => {
    const sb = supabase();
    console.log('[auth] loadSession: start');

    try {
      // getSession reads from localStorage — should be near-instant, but
      // wrap defensively in case Supabase's internal refresh logic stalls.
      const sessionResult = await withTimeout(sb.auth.getSession(), 4000, 'getSession');
      const user = sessionResult.data.session?.user ?? null;

      if (!user) {
        console.log('[auth] loadSession: no session found');
        if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
        return;
      }

      console.log('[auth] loadSession: session found for', user.email);

      // Set the user immediately so callers waiting on `user` (route
      // guards on /teacher etc.) can proceed before the profile load
      // completes.
      if (mounted.current) {
        setState((prev) => ({ ...prev, user, loading: true }));
      }

      try {
        const [{ data: profile }, { data: rolesRows }] = await withTimeout(
          Promise.all([
            sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
            sb.from('user_roles').select('role').eq('user_id', user.id),
          ]),
          6000,
          'profile'
        );

        const roles = ((rolesRows ?? []) as { role: AppRole }[]).map((r) => r.role);
        console.log('[auth] loadSession: profile loaded, roles =', roles);
        if (!mounted.current) return;
        setState({
          user,
          profile: profile ?? null,
          roles,
          isAdmin: roles.includes('admin'),
          isTeacher: roles.includes('teacher'),
          loading: false,
        });
      } catch (err) {
        // Profile load failed or timed out. Let the user through with
        // empty roles rather than freeze on a forever spinner.
        console.warn('[auth] loadSession: profile fetch failed', err);
        if (!mounted.current) return;
        setState({
          user,
          profile: null,
          roles: [],
          isAdmin: false,
          isTeacher: false,
          loading: false,
        });
      }
    } catch (err) {
      console.warn('[auth] loadSession: getSession failed', err);
      if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadSession();

    const sb = supabase();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event) => {
      console.log('[auth] onAuthStateChange:', event);
      loadSession();
    });

    // Hard failsafe — `loading` cannot stay true for more than 8 seconds
    // under any circumstances. This catches hangs deep in Supabase that
    // even per-call timeouts couldn't reach (e.g. token refresh deadlocks).
    const failsafe = setTimeout(() => {
      if (!mounted.current) return;
      setState((prev) => {
        if (!prev.loading) return prev;
        console.warn('[auth] failsafe fired — forcing loading=false');
        return { ...prev, loading: false };
      });
    }, 8000);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearTimeout(failsafe);
    };
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[auth] signIn: started');
    try {
      const { data, error } = await withTimeout(
        supabase().auth.signInWithPassword({ email, password }),
        12000,
        'signIn'
      );

      if (error) {
        console.warn('[auth] signIn: error from Supabase', error.message);
        throw error;
      }
      if (!data.session) {
        console.warn('[auth] signIn: no session returned (no error either?!)');
        throw new Error('Sign-in succeeded but no session was returned.');
      }
      console.log('[auth] signIn: success — session for', data.user?.email);
      // onAuthStateChange will fire and update state in the background.
      // Caller can hard-navigate immediately.
    } catch (err) {
      // Re-throw so the page-level handler can show the error to the user.
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[auth] signOut: started');
    // Clear local state immediately — UI is responsive even if the
    // network call below is slow or fails.
    if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
    try {
      await withTimeout(supabase().auth.signOut(), 6000, 'signOut');
      console.log('[auth] signOut: success');
    } catch (err) {
      console.warn('[auth] signOut: error (ignored, local state already cleared)', err);
    }
  }, []);

  return { ...state, signIn, signOut, refresh: loadSession };
}
