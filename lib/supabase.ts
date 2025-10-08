// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseGlobal = typeof globalThis & {
  __supabaseClient?: SupabaseClient | null;
};

const globalForSupabase = globalThis as SupabaseGlobal;

const rawUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const configIssues: string[] = [];

if (!rawUrl) {
  configIssues.push(
    'EXPO_PUBLIC_SUPABASE_URL is missing. Copy the "Project URL" from Supabase → Settings → API.'
  );
} else if (!/^https:\/\/.+\.supabase\.co/.test(rawUrl)) {
  configIssues.push(
    `EXPO_PUBLIC_SUPABASE_URL looks malformed (received "${rawUrl}"). It should match https://xxxx.supabase.co.`
  );
}

if (!rawKey) {
  configIssues.push(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Copy the "anon public" key from Supabase → Settings → API.'
  );
} else if (!rawKey.startsWith('eyJ')) {
  configIssues.push(
    `EXPO_PUBLIC_SUPABASE_ANON_KEY looks malformed (prefix "${rawKey.slice(0, 8)}").`
  );
}

const configurationError =
  configIssues.length > 0 ? new Error(`[Supabase] ${configIssues.join(' ')}`) : null;

if (configurationError && process.env.NODE_ENV !== 'production') {
  console.warn(configurationError.message);
}

const isServer = typeof window === 'undefined';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null;

function createStorageAdapter(): StorageAdapter {
  if (isServer) return null;

  if (Platform.OS === 'web') {
    const storage = window.localStorage;
    return {
      getItem: (key: string) => Promise.resolve(storage.getItem(key)),
      setItem: (key: string, value: string) => {
        storage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        storage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

const storage = createStorageAdapter() ?? undefined;
let cachedClient: SupabaseClient | null =
  typeof globalForSupabase.__supabaseClient === 'undefined'
    ? null
    : globalForSupabase.__supabaseClient ?? null;

export const isSupabaseConfigured = configurationError == null;

export function getSupabaseConfigurationError() {
  return configurationError;
}

export function getSupabaseClient(): SupabaseClient {
  if (configurationError) {
    throw configurationError;
  }

  if (!cachedClient) {
    cachedClient = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: !isServer,
        autoRefreshToken: !isServer,
        detectSessionInUrl: !isServer && Platform.OS === 'web',
        storage,
      },
    });

    globalForSupabase.__supabaseClient = cachedClient;
  }

  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as unknown as Record<PropertyKey, unknown>, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, prop, value, receiver) {
    const client = getSupabaseClient();
    return Reflect.set(client as unknown as Record<PropertyKey, unknown>, prop, value, receiver);
  },
  has(_target, prop) {
    const client = getSupabaseClient();
    return Reflect.has(client as unknown as Record<PropertyKey, unknown>, prop);
  },
  ownKeys() {
    const client = getSupabaseClient();
    return Reflect.ownKeys(client as unknown as Record<PropertyKey, unknown>);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = getSupabaseClient();
    const descriptor = Reflect.getOwnPropertyDescriptor(
      client as unknown as Record<PropertyKey, unknown>,
      prop
    );

    if (!descriptor) {
      return undefined;
    }

    return { ...descriptor, configurable: true };
  },
});

export default supabase;
