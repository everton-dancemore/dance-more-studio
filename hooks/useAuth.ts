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

/**
 * Sentinel keys we set in sessionStorage to communicate "the user just
 * clicked Sign out" across the hard navigation to /auth. Without this,
 * if Supabase fails to clear localStorage promptly (which we've seen),
 * /auth's useAuth would re-read the stale session and bounce the user
 * straight back into the dashboard.
 */
const JUST_SIGNED_OUT_KEY = 'dm-just-signed-out';

// ---- Helpers --------------------------------------------------------------

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
 * Synchronously remove every Supabase-related key from localStorage AND
 * sessionStorage. We've observed that `supabase.auth.signOut()` alone
 * sometimes leaves residual entries (e.g. when the network call to
 * invalidate the global refresh token fails). Clearing manually before
 * navigating to /auth guarantees the next page-load finds no session.
 */
function nukeSupabaseStorage() {
  if (typeof window === 'undefined') return;
  let cleared = 0;
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('sb-') || k.toLowerCase().includes('supabase')) {
        localStorage.removeItem(k);
        cleared++;
      }
    });
  } catch {
    /* private mode etc. — ignore */
  }
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith('sb-') || k.toLowerCase().includes('supabase')) {
        sessionStorage.removeItem(k);
        cleared++;
      }
    });
  } catch {
    /* ignore */
  }
  console.log(`[auth] nukeSupabaseStorage: cleared ${cleared} storage keys`);
}

function hasJustSignedOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(JUST_SIGNED_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function consumeJustSignedOut() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(JUST_SIGNED_OUT_KEY);
  } catch {
    /* ignore */
  }
}

function setJustSignedOut() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(JUST_SIGNED_OUT_KEY, '1');
  } catch {
    /* ignore */
  }
}

// Exported so the /auth page can check it without instantiating useAuth.
export { hasJustSignedOut, consumeJustSignedOut };

/**
 * useAuth hook — see MASTER_BRIEF.md §7 + §10.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...EMPTY_AUTH, loading: true });
  const mounted = useRef(true);

  const loadSession = useCallback(async () => {
    console.log('[auth] loadSession: start');

    // Belt-and-braces: if the user just hit Sign out, do NOT consult
    // Supabase at all this load. Treat as fully signed out, then the
    // flag is consumed and normal behaviour resumes next time.
    if (hasJustSignedOut()) {
      console.log('[auth] loadSession: just-signed-out flag set — short-circuiting');
      consumeJustSignedOut();
      // Also nuke storage one more time in case anything snuck back.
      nukeSupabaseStorage();
      if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
      return;
    }

    const sb = supabase();
    try {
      const sessionResult = await withTimeout(sb.auth.getSession(), 4000, 'getSession');
      const user = sessionResult.data.session?.user ?? null;

      if (!user) {
        console.log('[auth] loadSession: no session found');
        if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
        return;
      }

      console.log('[auth] loadSession: session found for', user.email);
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
      // If the listener fires SIGNED_IN while we're in just-signed-out mode,
      // ignore it — the user is mid-logout. Otherwise re-load session.
      if (event === 'SIGNED_IN' && hasJustSignedOut()) {
        console.log('[auth] onAuthStateChange: ignoring SIGNED_IN during logout');
        return;
      }
      loadSession();
    });

    // Hard failsafe — loading cannot stay true beyond 8 seconds.
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
      throw new Error('Sign-in succeeded but no session was returned.');
    }
    console.log('[auth] signIn: success — session for', data.user?.email);
  }, []);

  /**
   * signOut sequence (in order):
   *  1. Set sessionStorage flag so the next page-load short-circuits.
   *  2. Clear local React state immediately (UI updates instantly).
   *  3. Synchronously nuke ALL sb-* / supabase-* storage keys so the
   *     next getSession() finds nothing.
   *  4. Call supabase.auth.signOut({ scope: 'local' }) as fire-and-
   *     forget. Local scope avoids the network round-trip that would
   *     otherwise be required to revoke the global refresh token —
   *     faster and reliable on flaky networks.
   *  5. Resolve. The caller is expected to hard-navigate to /auth
   *     immediately after.
   */
  const signOut = useCallback(async () => {
    console.log('[auth] signOut: clicked');
    setJustSignedOut();
    if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
    nukeSupabaseStorage();
    console.log('[auth] signOut: local state + storage cleared');
    try {
      await withTimeout(
        supabase().auth.signOut({ scope: 'local' }),
        4000,
        'signOut'
      );
      console.log('[auth] signOut: supabase.auth.signOut completed');
    } catch (err) {
      console.warn('[auth] signOut: supabase.auth.signOut failed (storage already cleared)', err);
    }
    // One more pass after Supabase's own logic ran, in case it re-wrote anything.
    nukeSupabaseStorage();
  }, []);

  return { ...state, signIn, signOut, refresh: loadSession };
}
