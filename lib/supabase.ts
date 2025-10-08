// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!rawUrl || !/^https:\/\/.+\.supabase\.co/.test(rawUrl)) {
  throw new Error(
    `[Supabase] EXPO_PUBLIC_SUPABASE_URL is missing/invalid. Got: "${rawUrl || 'undefined'}".
     Copy "Project URL" from Supabase → Settings → API (it looks like https://xxxxx.supabase.co).`
  );
}
if (!rawKey || !rawKey.startsWith('eyJ')) {
  throw new Error(
    `[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing/invalid. Got prefix: "${rawKey.slice(0,8)}".
     Copy the "anon public" key from Supabase → Settings → API.`
  );
}

const isServer = typeof window === 'undefined';

let storage: any = undefined;
if (!isServer && Platform.OS === 'web') {
  storage = {
    getItem: (k: string) => Promise.resolve(window.localStorage.getItem(k)),
    setItem: (k: string, v: string) => Promise.resolve(window.localStorage.setItem(k, v)),
    removeItem: (k: string) => Promise.resolve(window.localStorage.removeItem(k)),
  };
}
if (!isServer && Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = {
    getItem: (k: string) => AsyncStorage.getItem(k),
    setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
    removeItem: (k: string) => AsyncStorage.removeItem(k),
  };
}

export const supabase = createClient(rawUrl, rawKey, {
  auth: {
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: !isServer && Platform.OS === 'web',
    storage,
  },
});
