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
 * Auth hook.
 *
 * Safety design:
 * 1. `loadSession` never hangs forever — profile/roles fetch has a 6s timeout.
 * 2. If the timeout hits, we still let the user through with empty roles
 *    rather than freezing the UI. Better UX, the user can retry.
 * 3. `signOut` clears state synchronously THEN fires the server call,
 *    so the UI updates instantly even on a flaky network.
 * 4. `signIn` doesn't double-call `loadSession`; the auth-state listener
 *    handles state updates, avoiding the race that left pages stuck on
 *    "Loading…".
 * 5. We guard every setState with a `mounted` ref to avoid leaks /
 *    React warnings when components unmount mid-fetch.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...EMPTY_AUTH, loading: true });
  const mounted = useRef(true);

  const loadSession = useCallback(async () => {
    const sb = supabase();

    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
        return;
      }

      // Set user immediately so callers waiting on `user` can proceed
      // while we fetch the profile/roles in the background.
      if (mounted.current) {
        setState((prev) => ({ ...prev, user, loading: true }));
      }

      // Race profile+roles against a 6-second timeout — never hang the UI.
      const PROFILE_TIMEOUT_MS = 6000;
      const profilePromise = Promise.all([
        sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        sb.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('profile-timeout')), PROFILE_TIMEOUT_MS)
      );

      try {
        const [{ data: profile }, { data: rolesRows }] = (await Promise.race([
          profilePromise,
          timeoutPromise,
        ])) as Awaited<typeof profilePromise>;

        const roles = ((rolesRows ?? []) as { role: AppRole }[]).map((r) => r.role);
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
        // Profile load failed or timed out. Let the user through anyway —
        // they're authenticated, just without role info. The /teacher
        // page can still render (with empty student list) instead of
        // freezing on a forever spinner.
        console.warn('[useAuth] profile load failed:', err);
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
      // getSession itself failed — treat as signed out.
      console.warn('[useAuth] getSession failed:', err);
      if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadSession();
    const sb = supabase();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => loadSession());

    // FAILSAFE: under no circumstances stay in "loading" state for more than
    // 8 seconds. If something inside getSession/profile fetch hangs (which
    // we've seen on flaky iOS Safari sessions), force the spinner off so the
    // root page can route the user somewhere — even if to /auth.
    const failsafe = setTimeout(() => {
      if (!mounted.current) return;
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
    }, 8000);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearTimeout(failsafe);
    };
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange fires and runs loadSession — no manual await needed.
  }, []);

  const signOut = useCallback(async () => {
    // Clear state immediately so the UI is responsive even if the network
    // call below is slow or fails. The user is "signed out" from the app's
    // perspective the instant they click the button.
    if (mounted.current) setState({ ...EMPTY_AUTH, loading: false });
    try {
      await supabase().auth.signOut();
    } catch (err) {
      // Network failed — the local session is still cleared above, so the
      // user can keep using the app as signed out. We just log it.
      console.warn('[useAuth] signOut network error:', err);
    }
  }, []);

  return { ...state, signIn, signOut, refresh: loadSession };
}
