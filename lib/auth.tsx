import React from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { getSupabaseClient, getSupabaseConfigurationError } from './supabase'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    const configError = getSupabaseConfigurationError()
    if (configError) {
      setLoading(false)
      return () => {
        isMounted = false
      }
    }

    let unsubscribe: (() => void) | undefined

    try {
      const client = getSupabaseClient()

      client.auth
        .getSession()
        .then(({ data }) => {
          if (!isMounted) return
          setSession(data.session ?? null)
          setUser(data.session?.user ?? null)
          setLoading(false)
        })
        .catch(() => {
          if (!isMounted) return
          setLoading(false)
        })

      const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) return
        setSession(nextSession ?? null)
        setUser(nextSession?.user ?? null)
        setLoading(false)
      })

      unsubscribe = () => authListener?.subscription.unsubscribe()
    } catch (error) {
      console.warn(error)
      setLoading(false)
    }

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(() => ({ session, user, loading }), [session, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export async function signInWithEmail(email: string) {
  const client = getSupabaseClient()
  return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
}

export async function signOut() {
  const client = getSupabaseClient()
  return client.auth.signOut()
}
