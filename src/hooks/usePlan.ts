import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const FREE_GENERATION_LIMIT = 4       // Updated from 3 → 4
const FREE_SAVED_PLANS_LIMIT = 3
const FREE_SAVED_RECIPES_LIMIT = 10
const GUEST_LIMIT_KEY = 'edible_guest_generations'

// ─── usePlan Hook ─────────────────────────────────────────────────────────────
export function usePlan() {
  const { user, profile, refreshProfile } = useAuth()

  const isPro = profile?.plan === 'pro' || profile?.plan === 'founding'
  const isFounding = profile?.plan === 'founding'
  const isLoggedIn = !!user

  // ── Guest tracking (localStorage) ──────────────────────────────────────────
  const getGuestStats = () => {
    const stored = localStorage.getItem(GUEST_LIMIT_KEY)
    if (!stored) return { count: 0, resetAt: new Date().toISOString() }

    try {
      const parsed = JSON.parse(stored)
      const resetAt = new Date(parsed.resetAt)
      const now = new Date()
      if (now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
        return { count: 0, resetAt: now.toISOString() }
      }
      return parsed
    } catch {
      return { count: 0, resetAt: new Date().toISOString() }
    }
  }

  // ── Check generation limit ──────────────────────────────────────────────────
  // The generations_this_month column in Supabase is the source of truth for
  // logged-in users. It counts ALL generations including historical ones within
  // the current 30-day window. Users who already used 4+ this month are gated.
  const checkGenerationLimit = (): { allowed: boolean; remaining: number } => {
    if (isPro) return { allowed: true, remaining: Infinity }

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

  // ── Increment generation count ──────────────────────────────────────────────
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
          .eq('id', user!.id)
      } else {
        const current = profile?.generations_this_month || 0
        await supabase
          .from('profiles')
          .update({ generations_this_month: current + 1 })
          .eq('id', user!.id)
      }

      await refreshProfile()
    } catch (err) {
      console.error('[usePlan] Failed to increment generation count:', err)
    }
  }

  // ── Check recipe limit ──────────────────────────────────────────────────────
  const checkRecipeLimit = async (): Promise<{ allowed: boolean; count: number }> => {
    if (isPro) return { allowed: true, count: 0 }
    if (!isLoggedIn) return { allowed: false, count: 0 } // Must be logged in to sync

    try {
      const { count, error } = await supabase
        .from('saved_recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)

      if (error) throw error
      const used = count || 0
      return { allowed: used < FREE_SAVED_RECIPES_LIMIT, count: used }
    } catch (err) {
      console.error('[usePlan] Failed to check recipe limit:', err)
      return { allowed: false, count: 0 }
    }
  }

  const { remaining } = checkGenerationLimit()

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
    FREE_GENERATION_LIMIT,
    generationsUsed: isLoggedIn ? (profile?.generations_this_month || 0) : getGuestStats().count,
    generationsRemaining: remaining,
    checkRecipeLimit,
  }
}
