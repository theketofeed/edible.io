import { supabase } from './supabase'
import { invalidateRecipeCache } from '../hooks/usePlan'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Receipt {
  id: string
  user_id: string
  raw_ocr_text: string
  parsed_items: string[]
  created_at: string
}

export interface MealPlan {
  id: string
  user_id: string
  receipt_id?: string
  title: string
  plan_data: any
  created_at: string
}

export interface SavedRecipe {
  id: string
  user_id: string
  recipe_title: string
  meal_type: string
  recipe_data: any
  created_at: string
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

export async function saveReceipt(rawOcrText: string, parsedItems: string[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: user.id,
      raw_ocr_text: rawOcrText,
      parsed_items: parsedItems,
    })
    .select()
    .single()

  if (error) throw error
  return data as Receipt
}

export async function getUserReceipts() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Receipt[]
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export async function saveMealPlan(
  planData: any,
  title: string,
  receiptId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      receipt_id: receiptId ?? null,
      title,
      plan_data: planData,
    })
    .select()
    .single()

  if (error) throw error
  return data as MealPlan
}

export async function getUserMealPlans() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as MealPlan[]
}

export async function deleteMealPlan(id: string) {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const fallback = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url as string | undefined,
    joined: new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  }

  // FIX: Use maybeSingle() instead of single() — single() throws 406 when no row found
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()  // ← was .single(), which throws 406 on missing row

  if (error) {
    console.warn('[getProfile] Error fetching profile, using fallback:', error.message)
    return fallback
  }
  if (!data) return fallback

  return {
    id: data.id,
    name: data.display_name || fallback.name,
    email: user.email,
    avatar_url: data.avatar_url || fallback.avatar_url,
    joined: data.created_at
      ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : fallback.joined,
  }
}

// ─── Saved Recipes ────────────────────────────────────────────────────────────

export async function saveSavedRecipe(recipeTitle: string, mealType: string, recipeData: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // We explicitly handle the duplicate key error (409 / 23505) in case
  // the user clicks multiple times rapidly or the RLS policies cause conflict
  const { data, error } = await supabase
    .from('saved_recipes')
    .insert({
      user_id: user.id,
      recipe_title: recipeTitle,
      meal_type: mealType,
      recipe_data: recipeData,
    })
    .select()
    .maybeSingle()

  if (error) {
    // If it's a conflict, just return the existing record rather than crashing
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('409') || error.code === '409') {
      const { data: existing, error: fetchError } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('recipe_title', recipeTitle)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (existing) {
        invalidateRecipeCache(user.id)
        return existing as SavedRecipe
      }
    }
    throw error
  }

  // Invalidate cache to ensure UI reflects the new count
  invalidateRecipeCache(user.id)

  return data as SavedRecipe
}

export async function getUserSavedRecipes() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as SavedRecipe[]
}

export async function deleteSavedRecipe(recipeTitle: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', user.id)
    .eq('recipe_title', recipeTitle)

  if (error) throw error

  // Invalidate cache to ensure UI reflects the new count
  invalidateRecipeCache(user.id)
}