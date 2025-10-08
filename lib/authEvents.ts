// authEvents.ts
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!)

const DEVICE_KEY = 'stikr_device_id'
async function getDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_KEY)
  if (!id) {
    id = uuid()
    await SecureStore.setItemAsync(DEVICE_KEY, id)
  }
  return id
}

// We define a client-side "session_id" per login session.
// Generate at SIGNED_IN; clear at SIGNED_OUT.
let currentSessionId: string | null = null

async function postAuthEvent(payload: any) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/log-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function wireAuthEvents() {
  const device_id = await getDeviceId()
  const app_version = Constants?.expoConfig?.version ?? null
  const platform = Platform.OS as 'ios' | 'android' | 'web'

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      currentSessionId = uuid()
      await postAuthEvent({
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
      await postAuthEvent({
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

