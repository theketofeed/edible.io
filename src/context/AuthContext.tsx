import React, { createContext, useContext, useEffect, useState } from 'react'
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
  refreshProfile: async () => {}
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, generations_this_month, generations_reset_at, plan_expires_at')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data as UserProfile)
    } else {
      setProfile(defaultProfile)
    }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)