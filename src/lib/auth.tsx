import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './supabase'
import type { Member, Role } from './types'

type AuthValue = {
  session: Session | null
  /** The member row linked to the logged-in email, or null (logged out, or email not on the list). */
  member: Member | null
  role: Role | null
  isAdmin: boolean
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  const loadMember = useCallback(async (s: Session | null) => {
    if (!s) {
      setMember(null)
      setRole(null)
      return
    }
    // my_account() matches the confirmed login email to an account (see supabase/migrations).
    const { data } = await supabase.rpc('my_account')
    const row = data as { role: Role; member: Member | null } | null
    setMember(row?.member ?? null)
    setRole(row?.role ?? null)
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadMember(data.session)
      setLoading(false)
      // Remove ?code=... left by the magic link so a refresh doesn't retry it.
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Defer the query: supabase-js warns against awaiting inside this callback.
      setTimeout(() => loadMember(s), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadMember])

  const refresh = useCallback(() => loadMember(session), [loadMember, session])
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setMember(null)
    setRole(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, member, role, isAdmin: role === 'admin', loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
