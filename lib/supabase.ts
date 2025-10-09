// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseGlobal = typeof globalThis & {
  __supabaseClient?: SupabaseClient | null;
};

const globalForSupabase = globalThis as SupabaseGlobal;

const SUPABASE_URL_ENV_KEY = 'EXPO_PUBLIC_SUPABASE_URL' as const;
const SUPABASE_ANON_KEY_ENV_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY' as const;

function readEnv(key: string) {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

const rawUrl = readEnv(SUPABASE_URL_ENV_KEY);
const rawKey = readEnv(SUPABASE_ANON_KEY_ENV_KEY);

function isValidSupabaseUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (/^https:\/\/.+\.supabase\.co\/?$/.test(normalized)) {
    return true;
  }

  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(normalized)) {
    return true;
  }

  return false;
}

const configIssues: string[] = [];

if (!rawUrl) {
  configIssues.push(
    `Supabase URL is missing. Define ${SUPABASE_URL_ENV_KEY} in your environment (for example, in .env).`,
  );
} else if (!isValidSupabaseUrl(rawUrl)) {
  configIssues.push(
    `Supabase URL from ${SUPABASE_URL_ENV_KEY} looks malformed (received "${rawUrl}"). It should match https://xxxx.supabase.co or http://127.0.0.1:54321 when using supabase start.`,
  );
}

if (!rawKey) {
  configIssues.push(
    `Supabase anon key is missing. Define ${SUPABASE_ANON_KEY_ENV_KEY} in your environment (for example, in .env).`
  );
} else if (!rawKey.startsWith('eyJ')) {
  configIssues.push(
    `Supabase anon key from ${SUPABASE_ANON_KEY_ENV_KEY} looks malformed (prefix "${rawKey.slice(0, 8)}").`
  );
}

const configurationError =
  configIssues.length > 0 ? new Error(`[Supabase] ${configIssues.join(' ')}`) : null;

if (configurationError && process.env.NODE_ENV !== 'production') {
  if (!rawUrl || !rawKey) {
    console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL/ANON_KEY');
  } else {
    console.warn(configurationError.message);
  }
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

export function tryGetSupabaseClient(): SupabaseClient | null {
  if (configurationError) {
    return null;
  }

  return getSupabaseClient();
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

if (process.env.NODE_ENV !== 'production' && !isServer) {
  const client = tryGetSupabaseClient();
  if (client) {
    void client
      .from('_fake')
      .select('*')
      .then(({ data, error }) => {
        console.info('[Supabase] Runtime connectivity check', {
          ok: !error,
          error: error?.message ?? null,
          data,
        });
      })
      .catch((error) => {
        console.error('[Supabase] Runtime connectivity check failed', error);
      });
  }
}
