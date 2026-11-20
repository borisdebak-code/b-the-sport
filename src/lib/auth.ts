import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

/** Where the e-mailed sign-in link returns to (bthesport://auth in the installed app). */
export function authRedirectUrl(): string {
  return Linking.createURL('auth');
}

/** E-mails a one-time sign-in link. A new address gets an account on first use. */
export async function sendSignInLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Baza nije povezana');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
  });
  if (error) {
    if (error.status === 429) throw new Error('Previše zahtjeva za e-mail. Pokušaj ponovno za sat vremena.');
    throw new Error(error.message);
  }
}

/** Reads the tokens a sign-in link brings back (in the #fragment or ?query) and starts the session. */
export async function handleAuthUrl(url: string | null): Promise<boolean> {
  if (!supabase || !url || !url.includes('access_token')) return false;
  const part = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(part);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return !error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
