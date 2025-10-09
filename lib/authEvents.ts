// authEvents.ts
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseConfigurationError, tryGetSupabaseClient } from './supabase'

const DEVICE_KEY = 'stikr_device_id'

let inMemoryDeviceId: string | null = null

async function getDeviceId() {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const existing = window.localStorage.getItem(DEVICE_KEY)
        if (existing) {
          return existing
        }
        const generated = uuid()
        window.localStorage.setItem(DEVICE_KEY, generated)
        return generated
      }
    } catch (error) {
      console.warn('[authEvents] localStorage unavailable, using in-memory device id', error)
    }
  }

  const secureStoreAvailable = await SecureStore.isAvailableAsync().catch(() => false)

  if (secureStoreAvailable) {
    try {
      let id = await SecureStore.getItemAsync(DEVICE_KEY)
      if (!id) {
        id = uuid()
        await SecureStore.setItemAsync(DEVICE_KEY, id)
      }
      return id
    } catch (error) {
      console.warn('[authEvents] secure storage unavailable, falling back to in-memory id', error)
    }
  }

  if (!inMemoryDeviceId) {
    inMemoryDeviceId = uuid()
  }
  return inMemoryDeviceId
}

// We define a client-side "session_id" per login session.
// Generate at SIGNED_IN; clear at SIGNED_OUT.
let currentSessionId: string | null = null

async function postAuthEvent(client: SupabaseClient, payload: any) {
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) return
  const { error } = await client.functions.invoke('log-event', {
    body: payload,
  })
  if (error) {
    console.warn('[authEvents] failed to log auth event', { error })
  }
}

export async function wireAuthEvents() {
  const configError = getSupabaseConfigurationError()
  if (configError) {
    console.warn('[authEvents] skipping wiring – Supabase misconfigured:', configError.message)
    return
  }

  const client = tryGetSupabaseClient()
  if (!client) {
    console.warn('[authEvents] unable to create Supabase client')
    return
  }

  const device_id = await getDeviceId()
  const app_version = Constants?.expoConfig?.version ?? null
  const platform = Platform.OS as 'ios' | 'android' | 'web'

  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      currentSessionId = uuid()
      await postAuthEvent(client, {
        type: 'user.signed_in',
        session_id: currentSessionId,
        platform,
        app_version,
        device_id,
        auth_method: session?.user?.app_metadata?.provider ? `oauth:${session.user.app_metadata.provider}` : 'password',
        is_new_user: (session?.user?.created_at && new Date(session.user.created_at).getTime() === new Date(session.user.last_sign_in_at ?? '').getTime()) || null,
        is_fresh_session: true,
        project_env: 'prod',
        context: { source: 'app' },
      })
    }
    if (event === 'SIGNED_OUT') {
      await postAuthEvent(client, {
        type: 'user.signed_out',
        session_id: currentSessionId ?? uuid(),
        platform,
        app_version,
        device_id,
        reason: 'user_action',
        duration_ms: null,
        context: { source: 'app' },
      })
      currentSessionId = null
    }
  })
}

