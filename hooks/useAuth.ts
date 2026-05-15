'use client';

import { useEffect, useState, useCallback } from 'react';
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    roles: [],
    isAdmin: false,
    isTeacher: false,
    loading: true,
  });

  const loadSession = useCallback(async () => {
    const sb = supabase();
    const {
      data: { session },
    } = await sb.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      setState({
        user: null,
        profile: null,
        roles: [],
        isAdmin: false,
        isTeacher: false,
        loading: false,
      });
      return;
    }

    const [{ data: profile }, { data: rolesRows }] = await Promise.all([
      sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      sb.from('user_roles').select('role').eq('user_id', user.id),
    ]);

    const roles = ((rolesRows ?? []) as { role: AppRole }[]).map((r) => r.role);
    setState({
      user,
      profile: profile ?? null,
      roles,
      isAdmin: roles.includes('admin'),
      isTeacher: roles.includes('teacher'),
      loading: false,
    });
  }, []);

  useEffect(() => {
    loadSession();
    const sb = supabase();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => loadSession());
    return () => subscription.unsubscribe();
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadSession();
  }, [loadSession]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    // onAuthStateChange listener (above) will fire loadSession() — no need
    // to call it here. Calling both creates a race with router.replace()
    // on the page that triggered sign-out, leaving the root page stuck
    // on the "Loading…" screen.
  }, []);

  return { ...state, signIn, signOut, refresh: loadSession };
}
