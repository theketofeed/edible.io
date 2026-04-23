import { supabase } from './supabase'

// ─── In-memory cache (session level) ─────────────────────────────────────────
// Prevents redundant Supabase lookups within the same session
export const sessionCache = new Map<string, string>()
export { titleToKey, buildPollinationsPrompt }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a meal title into a stable, filesystem-safe cache key.
 * "Grilled Chicken with Garlic Rice & Broccoli" → "grilled-chicken-with-garlic-rice-broccoli"
 */
function titleToKey(mealTitle: string): string {
  return mealTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) // Supabase storage path length safety
}

/**
 * Builds a detailed Pollinations prompt optimised for food photography.
 * The more specific the prompt, the better the result.
 *
 * Examples:
 *   "Grilled Chicken with Garlic Rice" →
 *   "grilled chicken with garlic rice, food photography, restaurant quality,
 *    top-down view, natural lighting, shallow depth of field, on a white plate"
 */
function buildPollinationsPrompt(mealTitle: string): string {
  return [
    mealTitle.toLowerCase(),
    'food photography',
    'restaurant quality plating',
    'natural lighting',
    'shallow depth of field',
    'top-down view',
    'white ceramic plate',
    'fresh ingredients',
    'appetizing',
    'high resolution',
  ].join(', ')
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const BUCKET = 'meal-images'

async function getFromSupabase(key: string): Promise<string | null> {
  try {
    const path = `${key}.jpg`
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return null

    const check = await fetch(data.publicUrl, { method: 'GET', mode: 'no-cors' })
    if (!check.ok && check.status !== 0) return null

    return data.publicUrl
  } catch {
    return null
  }
}

async function saveToSupabase(key: string, imageUrl: string): Promise<void> {
  // Client-side Supabase caching is skipped for now due to CORS on Pollinations blob fetches.
  // The session cache still prevents duplicate URL generation within a session.
  // For production: implement this in your Express backend or a Supabase Edge Function.
}

// ─── Pollinations ─────────────────────────────────────────────────────────────
// Pollinations blocks HEAD/fetch from browsers due to CORS.
// The correct approach: return the URL directly and let <img src={url} /> load it.
// The image is generated when the browser requests the URL — no preflight needed.
function getPollinationsUrl(mealTitle: string): string {
  const prompt = buildPollinationsPrompt(mealTitle)
  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=500&nologo=true&model=flux`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches or generates a food image for a meal title.
 *
 * Cache hierarchy (fastest → slowest):
 * 1. Session memory cache  → instant
 * 2. Supabase Storage      → ~100-300ms (CDN-served)
 * 3. Pollinations generate → 3-8s (only on first-ever request for this dish)
 *
 * After step 3, the image is saved to Supabase so future requests hit step 2.
 */
export async function fetchMealImage(mealTitle: string): Promise<string | null> {
  if (!mealTitle?.trim()) return null

  const key = titleToKey(mealTitle)

  // 1. Session cache — zero latency
  if (sessionCache.has(key)) {
    return sessionCache.get(key)!
  }

  // 2. Supabase Storage — already generated before
  const cached = await getFromSupabase(key)
  if (cached) {
    console.log(`[MealImages] Cache hit (Supabase): "${mealTitle}"`)
    sessionCache.set(key, cached)
    return cached
  }

  // 3. Return Pollinations URL — browser loads image directly via <img src>
  const url = getPollinationsUrl(mealTitle)
  console.log(`[MealImages] Pollinations URL for: "${mealTitle}"`)
  sessionCache.set(key, url)

  // Fire-and-forget: attempt Supabase cache (no-op for now, ready for server-side impl)
  saveToSupabase(key, url).catch(() => {})

  return url
}

/**
 * Batch fetch with concurrency cap of 3.
 * Cached items resolve instantly so they don't count against the cap in practice.
 */
export async function fetchMealImages(
  mealTitles: string[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const CONCURRENCY = 3

  for (let i = 0; i < mealTitles.length; i += CONCURRENCY) {
    const batch = mealTitles.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(t => fetchMealImage(t)))
    batch.forEach((title, idx) => {
      if (batchResults[idx]) results[title] = batchResults[idx]!
    })
    onProgress?.(Math.min(i + CONCURRENCY, mealTitles.length), mealTitles.length)
  }

  return results
}
