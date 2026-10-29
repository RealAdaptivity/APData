import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Sign-in for AP Data. Accounts are the AdaptivityPerformance ones; only
 * admins and techs get in. A customer account that signs in here is signed
 * straight back out, because every AP Data table refuses it anyway and an
 * empty app would look broken.
 */

export type StaffRole = 'admin' | 'tech';

export type Staff = { id: string; email: string; name: string; role: StaffRole };

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out'; notice: string | null }
  | { status: 'signed_in'; staff: Staff };

type AuthApi = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

const NOT_STAFF = 'AP Data is for Adaptivity technicians and admins. This account is not one.';

/**
 * The last staff profile that signed in on this device. With no signal in the
 * bay the profile lookup fails; the saved one (same user) keeps the tech signed
 * in to the library, diagrams and anything already loaded.
 */
const STAFF_KEY = 'apdata.staff';

function savedStaff(uid: string): Staff | null {
  try {
    const s = JSON.parse(window.localStorage.getItem(STAFF_KEY) ?? 'null') as Staff | null;
    return s && s.id === uid && (s.role === 'admin' || s.role === 'tech') ? s : null;
  } catch {
    return null;
  }
}

function saveStaff(s: Staff | null) {
  try {
    if (s) window.localStorage.setItem(STAFF_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STAFF_KEY);
  } catch {
    /* storage blocked: signs in online only */
  }
}

async function staffFor(session: Session): Promise<Staff | 'not_staff' | 'error'> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) return 'error';
  const role = data?.role;
  if (role !== 'admin' && role !== 'tech') return 'not_staff';
  const email = session.user.email ?? (data?.email as string | undefined) ?? '';
  const name = ((data?.full_name as string | null) ?? '').trim() || email.split('@')[0] || 'Technician';
  return { id: session.user.id, email, name, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  /** The user being signed in (or signed in), so a stale lookup cannot overwrite a newer one. */
  const current = useRef<string | null>(null);

  const adopt = useCallback(async (session: Session | null) => {
    if (!session) {
      current.current = null;
      setState((s) => (s.status === 'signed_out' ? s : { status: 'signed_out', notice: null }));
      return;
    }
    const uid = session.user.id;
    current.current = uid;
    const staff = await staffFor(session);
    if (current.current !== uid) return;
    if (staff === 'not_staff') {
      current.current = null;
      saveStaff(null);
      await supabase.auth.signOut();
      setState({ status: 'signed_out', notice: NOT_STAFF });
    } else if (staff === 'error') {
      const offline = savedStaff(uid);
      if (offline) setState({ status: 'signed_in', staff: offline });
      else setState({ status: 'signed_out', notice: 'Could not load your account. Check your connection and sign in again.' });
    } else {
      saveStaff(staff);
      setState({ status: 'signed_in', staff });
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase asks that other Supabase calls not run inside this callback
      // (they can deadlock on its auth lock), so the profile lookup is deferred.
      if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && session?.user.id !== current.current)) {
        window.setTimeout(() => void adopt(session), 0);
      } else if (event === 'SIGNED_OUT') {
        current.current = null;
        setState((s) => (s.status === 'signed_out' ? s : { status: 'signed_out', notice: null }));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [adopt]);

  /** Resolves once Supabase accepts the password; the auth event then loads the profile. */
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      throw new Error(/invalid login/i.test(error.message) ? 'Wrong email or password.' : error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    saveStaff(null);
    await supabase.auth.signOut();
    setState({ status: 'signed_out', notice: null });
  }, []);

  const sendReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw new Error(error.message);
  }, []);

  const api = useMemo(() => ({ state, signIn, signOut, sendReset }), [state, signIn, signOut, sendReset]);
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** The signed-in staff member. Only call inside the signed-in part of the app. */
export function useStaff(): Staff {
  const { state } = useAuth();
  if (state.status !== 'signed_in') throw new Error('useStaff while signed out');
  return state.staff;
}
