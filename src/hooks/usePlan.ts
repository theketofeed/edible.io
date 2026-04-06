import { useAuth } from '../context/AuthContext'

const FREE_GENERATION_LIMIT = 3
const FREE_SAVED_PLANS_LIMIT = 3
const FREE_SAVED_RECIPES_LIMIT = 10

export function usePlan() {
  const { user, profile } = useAuth()

  const isPro = profile?.plan === 'pro' || profile?.plan === 'founding'
  const isFounding = profile?.plan === 'founding'
  const isLoggedIn = !!user

  // Check if monthly generation limit is reached
  const checkGenerationLimit = (): { allowed: boolean; remaining: number } => {
    if (!isLoggedIn) return { allowed: true, remaining: FREE_GENERATION_LIMIT }
    if (isPro) return { allowed: true, remaining: Infinity }

    const now = new Date()
    const resetAt = new Date(profile?.generations_reset_at || now)
    const monthPassed = now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000

    const used = monthPassed ? 0 : (profile?.generations_this_month || 0)
    const remaining = Math.max(0, FREE_GENERATION_LIMIT - used)

    return { allowed: remaining > 0, remaining }
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
    FREE_GENERATION_LIMIT
  }
}
