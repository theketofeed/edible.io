import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const FREE_GENERATION_LIMIT = 4
const FREE_SAVED_PLANS_LIMIT = 3
const FREE_SAVED_RECIPES_LIMIT = 10

const GUEST_LIMIT_KEY = 'edible_guest_generations'

export function usePlan() {
  const { user, profile, refreshProfile } = useAuth()

  const isPro = profile?.plan === 'pro' || profile?.plan === 'founding'
  const isFounding = profile?.plan === 'founding'
  const isLoggedIn = !!user

  // Helper to manage guest limits in localStorage
  const getGuestStats = () => {
    const stored = localStorage.getItem(GUEST_LIMIT_KEY)
    if (!stored) return { count: 0, resetAt: new Date().toISOString() }
    
    try {
      const parsed = JSON.parse(stored)
      const resetAt = new Date(parsed.resetAt)
      const now = new Date()
      
      // Reset if a month has passed
      if (now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
        return { count: 0, resetAt: now.toISOString() }
      }
      return parsed
    } catch {
      return { count: 0, resetAt: new Date().toISOString() }
    }
  }

  // Check if monthly generation limit is reached
  const checkGenerationLimit = (): { allowed: boolean; remaining: number } => {
    if (isPro) return { allowed: true, remaining: Infinity }

    // Safety: If logged in but profile hasn't loaded, block to avoid 0-used race condition
    if (isLoggedIn && !profile) {
      console.warn('[usePlan] Profile not loaded yet, blocking generation for safety.')
      return { allowed: false, remaining: 0 }
    }

    if (!isLoggedIn) {
      const stats = getGuestStats()
      const remaining = Math.max(0, FREE_GENERATION_LIMIT - stats.count)
      return { allowed: remaining > 0, remaining }
    }

    const now = new Date()
    const resetAt = new Date(profile?.generations_reset_at || now)
    const monthPassed = now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000

    const used = monthPassed ? 0 : (profile?.generations_this_month || 0)
    const remaining = Math.max(0, FREE_GENERATION_LIMIT - used)

    return { allowed: remaining > 0, remaining }
  }

  // Increment generation count for all free users
  const incrementGenerationCount = async (): Promise<void> => {
    if (isPro) return

    if (!isLoggedIn) {
      const stats = getGuestStats()
      localStorage.setItem(GUEST_LIMIT_KEY, JSON.stringify({
        count: stats.count + 1,
        resetAt: stats.resetAt
      }))
      return
    }

    try {
      const now = new Date()
      const resetAt = new Date(profile?.generations_reset_at || now)
      const monthPassed = now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000

      if (monthPassed) {
        await supabase
          .from('profiles')
          .update({
            generations_this_month: 1,
            generations_reset_at: now.toISOString()
          })
          .eq('id', user.id)
      } else {
        const current = profile?.generations_this_month || 0
        await supabase
          .from('profiles')
          .update({ generations_this_month: current + 1 })
          .eq('id', user.id)
      }

      await refreshProfile()
    } catch (err) {
      console.error('[usePlan] Failed to increment generation count:', err)
    }
  }

  return {
    plan: profile?.plan || 'free',
    isPro,
    isFounding,
    isLoggedIn,
    canExportPDF: isPro,
    canSeeChefTips: isPro,
    maxSavedPlans: isPro ? Infinity : FREE_SAVED_PLANS_LIMIT,
    maxSavedRecipes: isPro ? Infinity : FREE_SAVED_RECIPES_LIMIT,
    checkGenerationLimit,
    incrementGenerationCount,
    FREE_GENERATION_LIMIT
  }
}
