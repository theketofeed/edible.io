import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserProfile {
  plan: 'free' | 'pro' | 'founding'
  generations_this_month: number
  generations_reset_at: string
  plan_expires_at: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  profile: UserProfile | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  isInitialized: boolean
}

const defaultProfile: UserProfile = {
  plan: 'free',
  generations_this_month: 0,
  generations_reset_at: new Date().toISOString(),
  plan_expires_at: null
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  isLoading: true,
  profile: null,
  refreshProfile: async () => {},
  signOut: async () => {},
  isInitialized: false
})

// Module-level profile cache to avoid refetching across re-renders
const profileCache: Record<string, UserProfile> = {}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const fetchingRef = useRef(false)

  const fetchProfile = async (userId: string): Promise<UserProfile> => {
    // Return cached immediately
    if (profileCache[userId]) {
      setProfile(profileCache[userId])
      return profileCache[userId]
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('plan, generations_this_month, generations_reset_at, plan_expires_at')
      .eq('id', userId)
      .maybeSingle()

    const result = (!error && data) ? data as UserProfile : defaultProfile
    profileCache[userId] = result
    setProfile(result)
    return result
  }

  const refreshProfile = async () => {
    if (!user) return
    // Invalidate cache then refetch
    delete profileCache[user.id]
    await fetchProfile(user.id)
  }

  const signOut = async () => {
    if (user) delete profileCache[user.id]
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (fetchingRef.current) return
      fetchingRef.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        // Set user/session immediately so UI can start rendering
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch profile in parallel — don't block initialization
        if (session?.user) {
          fetchProfile(session.user.id) // non-blocking
        }
      } finally {
        if (mounted) {
          setIsInitialized(true)
          setIsLoading(false)
          fetchingRef.current = false
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id) // non-blocking

        // Send welcome email only on brand-new signups
        if (event === 'SIGNED_IN') {
          const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime()
          const isNewUser = accountAgeMs < 60000 // created within last 60 seconds
          if (isNewUser) {
            setTimeout(() => {
              fetch(`${import.meta.env.VITE_BACKEND_URL}/api/send-welcome`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: session.user.email,
                  name: session.user.user_metadata?.full_name
                })
              }).catch((err) => console.warn('[AuthContext] Welcome email failed:', err))
            }, 3000) // 3 second delay after signup
          }
        }
      } else {
        setProfile(null)
      }

      setIsInitialized(true)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, profile, refreshProfile, signOut, isInitialized }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)