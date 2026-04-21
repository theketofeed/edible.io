import { supabase } from './supabase'

// ─── In-memory cache (session level) ─────────────────────────────────────────
// Prevents redundant Supabase lookups within the same session
const sessionCache = new Map<string, string>()

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

    // Verify the file actually exists with a lightweight HEAD request
    const check = await fetch(data.publicUrl, { method: 'HEAD' })
    if (!check.ok) return null

    return data.publicUrl
  } catch (err) {
    return null
  }
}

async function saveToSupabase(key: string, imageUrl: string): Promise<void> {
  try {
    // Fetch the image blob from Pollinations
    const res = await fetch(imageUrl)
    if (!res.ok) return

    const blob = await res.blob()
    const path = `${key}.jpg`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false, // Don't overwrite existing — saves bandwidth
      })

    if (error && error.message !== 'The resource already exists') {
      console.warn('[MealImages] Supabase upload error:', error.message)
    }
  } catch (err) {
    // Non-critical — if caching fails the image still displays fine
    console.warn('[MealImages] Failed to cache image in Supabase:', err)
  }
}

// ─── Pollinations ─────────────────────────────────────────────────────────────
async function generateWithPollinations(mealTitle: string): Promise<string | null> {
  try {
    const prompt = buildPollinationsPrompt(mealTitle)
    const encoded = encodeURIComponent(prompt)

    // Width/height kept at 512 for speed — looks great as a card thumbnail
    // nologo=true removes the Pollinations watermark
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=500&nologo=true&model=flux`

    console.log(`[MealImages] Generating image for: "${mealTitle}"`)

    // Pollinations returns the image directly at the URL — we just need to
    // verify it resolves before returning it
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) throw new Error(`Pollinations returned ${res.status}`)

    return url
  } catch (err) {
    console.error('[MealImages] Pollinations generation failed:', err)
    return null
  }
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

  // 3. Generate with Pollinations
  const generated = await generateWithPollinations(mealTitle)
  if (!generated) return null

  sessionCache.set(key, generated)

  // Save to Supabase in the background — don't await so UI isn't blocked
  saveToSupabase(key, generated).catch(() => {})

  return generated
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
