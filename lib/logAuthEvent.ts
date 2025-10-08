// src/lib/logAuthEvent.ts
import { supabase } from './supabase'  // your existing client

export async function logAuthEvent(input: {
  type: 'user.signed_in' | 'user.signed_out'
  session_id: string
  platform?: 'web' | 'ios' | 'android'
  app_version?: string
  context?: Record<string, any>
  auth_method?: string
  is_new_user?: boolean
  is_fresh_session?: boolean
  reason?: 'user_action' | 'token_expired' | 'admin_revoke' | 'app_quit' | 'unknown'
  duration_ms?: number
  project_env?: 'dev' | 'staging' | 'prod'
}) {
  const { error } = await supabase.functions.invoke('log-event', { body: input })
  if (error) console.warn('logAuthEvent failed:', error)
}
