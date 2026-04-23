// ─── In-memory cache (session level) ─────────────────────────────────────────
export const sessionCache = new Map<string, string>()
export { titleToKey, buildPollinationsPrompt }

function titleToKey(mealTitle: string): string {
  return mealTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

// Kept for backward compat
function buildPollinationsPrompt(mealTitle: string): string {
  return mealTitle
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────
function buildFoodPrompt(mealTitle: string): string {
  return [
    mealTitle,
    'professional food photography',
    'restaurant quality plating',
    'natural lighting',
    'shallow depth of field',
    'white ceramic plate',
    'appetizing',
    'vibrant colors',
    '4k ultra HD',
  ].join(', ')
}

// ─── Instant static fallback (shown immediately, replaced when AI loads) ──────
function getCategoryFallback(mealTitle: string): string {
  const t = mealTitle.toLowerCase()
  if (t.match(/\b(chicken|turkey|poultry|wing|drumstick|tender)\b/))
    return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&h=500&fit=crop'
  if (t.match(/\b(beef|steak|burger|mince|meatball|ground beef|brisket)\b/))
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=500&fit=crop'
  if (t.match(/\b(salmon|fish|tuna|cod|trout|tilapia|shrimp|prawn|seafood)\b/))
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=500&fit=crop'
  if (t.match(/\b(pork|ham|bacon|sausage|chorizo)\b/))
    return 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800&h=500&fit=crop'
  if (t.match(/\b(pasta|spaghetti|noodle|fettuccine|penne|linguine|carbonara)\b/))
    return 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&h=500&fit=crop'
  if (t.match(/\b(pizza)\b/))
    return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=500&fit=crop'
  if (t.match(/\b(salad|slaw|greens|arugula)\b/))
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=500&fit=crop'
  if (t.match(/\b(soup|stew|chili|broth|bisque|chowder|ramen|pho)\b/))
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=500&fit=crop'
  if (t.match(/\b(taco|burrito|enchilada|quesadilla|fajita|mexican)\b/))
    return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=500&fit=crop'
  if (t.match(/\b(curry|tikka|masala|korma|indian)\b/))
    return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=500&fit=crop'
  if (t.match(/\b(rice|risotto|pilaf|paella|fried rice|biryani)\b/))
    return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&h=500&fit=crop'
  if (t.match(/\b(egg|omelette|omelet|scrambled|frittata|quiche|shakshuka)\b/))
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=500&fit=crop'
  if (t.match(/\b(pancake|waffle|french toast|crepe)\b/))
    return 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800&h=500&fit=crop'
  if (t.match(/\b(oat|oatmeal|porridge|granola|cereal)\b/))
    return 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&h=500&fit=crop'
  if (t.match(/\b(smoothie|shake|bowl|acai)\b/))
    return 'https://images.unsplash.com/photo-1638439430466-b9d67a6af09a?w=800&h=500&fit=crop'
  if (t.match(/\b(toast|avocado|bruschetta)\b/))
    return 'https://images.unsplash.com/photo-1603046891744-1f8d08e0e8c2?w=800&h=500&fit=crop'
  if (t.match(/\b(stir.?fry|asian|chinese|thai|japanese|korean|wok)\b/))
    return 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&h=500&fit=crop'
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop'
}

// ─── HuggingFace FLUX.1-schnell (AI generation) ───────────────────────────────
// Free tier: 1,000 req/day. 2–5s generation time. State-of-the-art quality.
// Get your free key at: https://huggingface.co/settings/tokens
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell'

async function generateWithHuggingFace(mealTitle: string): Promise<string | null> {
  const apiKey = (import.meta as any).env?.VITE_HF_API_KEY as string | undefined
  if (!apiKey?.trim() || apiKey === 'your_key_here') return null

  const prompt = buildFoodPrompt(mealTitle)

  try {
    const response = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
      signal: AbortSignal.timeout(30000),
    })

    // Model cold-starting — wait and retry once
    if (response.status === 503) {
      const errorData = await response.json().catch(() => ({}))
      const waitMs = Math.min((errorData.estimated_time || 20) * 1000, 20000)
      console.log(`[MealImages] HF model loading, waiting ${waitMs / 1000}s...`)
      await new Promise(r => setTimeout(r, waitMs))

      const retry = await fetch(HF_MODEL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(30000),
      })
      if (!retry.ok) {
        console.warn(`[MealImages] HF retry failed: ${retry.status}`)
        return null
      }
      const blob = await retry.blob()
      return URL.createObjectURL(blob)
    }

    if (!response.ok) {
      console.warn(`[MealImages] HF API error: ${response.status}`)
      return null
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    console.log(`[MealImages] ✅ HF generated image for: "${mealTitle}"`)
    return objectUrl
  } catch (err) {
    console.warn('[MealImages] HF generation failed:', err)
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Returns a food image URL for a meal title.
 *
 * Strategy:
 * 1. Session memory cache → instant
 * 2. Category fallback    → instant (used immediately while AI generates)
 * 3. HuggingFace FLUX     → 2–5s AI generation, replaces fallback in cache
 *
 * The AI generation runs in the background — components that call this will
 * get the fallback instantly, and if called again for the same meal after
 * generation completes, they'll get the AI image.
 */
export async function fetchMealImage(mealTitle: string): Promise<string | null> {
  if (!mealTitle?.trim()) return null

  const key = titleToKey(mealTitle)

  // 1. Session cache — zero latency
  if (sessionCache.has(key)) return sessionCache.get(key)!

  // 2. Set category fallback immediately so the image slot is never empty
  const fallback = getCategoryFallback(mealTitle)
  sessionCache.set(key, fallback)

  // 3. Fire AI generation in background — updates cache when done
  //    (next render cycle or page navigation will use the upgraded URL)
  generateWithHuggingFace(mealTitle).then(aiUrl => {
    if (aiUrl) {
      sessionCache.set(key, aiUrl)
    }
  })

  return fallback
}

/**
 * Batch fetch with concurrency cap of 3.
 * Uses instant fallbacks, with AI upgrades happening in background.
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
