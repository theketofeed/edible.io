import { supabase } from './supabase'

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

  // Try to get profile from profiles table
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code === 'PGRST116') {
    // Profile row doesn't exist yet — return auth metadata
    return fallback
  }

  if (error) throw error
  if (!data) return fallback

  // Map display_name (DB column) → name (app uses)
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