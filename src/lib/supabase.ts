import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** null until EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // the sign-in is optional; when used it stays on the device
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          // native: the sign-in link is handled by handleAuthUrl (deep link)
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'implicit',
        },
      })
    : null;
