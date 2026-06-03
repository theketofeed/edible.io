// ─── In-memory cache (session level) ─────────────────────────────────────────
export const sessionCache = new Map<string, string>()

// ─── In-flight requests (deduplication) ────────────────────────────────────────
const inFlightRequests = new Map<string, Promise<string | null>>()

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

// ─── Backend Image Proxy (Spoonacular → Pexels fallback) ─────────────────────
// Backend tries Spoonacular first (real food photos), falls back to Pexels API.
async function fetchImageFromBackend(mealTitle: string): Promise<string | null> {
  const key = titleToKey(mealTitle)
  
  // Deduplicate in-flight requests
  if (inFlightRequests.has(key)) {
    console.log(`[MealImages] Request already in-flight for: "${mealTitle}"`)
    return inFlightRequests.get(key)!
  }
  
  const request = (async () => {
    const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001'
    
    try {
      console.log(`[MealImages] Requesting AI generation for: "${mealTitle}"`)
      const response = await fetch(`${backendUrl}/api/generate-meal-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealTitle }),
        signal: AbortSignal.timeout(45000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.warn(`[MealImages] Backend error: ${response.status} -`, error)
        return null
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        console.warn('[MealImages] Backend returned empty blob')
        return null
      }

      const objectUrl = URL.createObjectURL(blob)
      console.log(`[MealImages] ✅ Generated image (${blob.size} bytes) for: "${mealTitle}"`)
      return objectUrl
    } catch (err) {
      console.warn('[MealImages] Generation failed:', err instanceof Error ? err.message : err)
      return null
    } finally {
      inFlightRequests.delete(key)
    }
  })()
  
  inFlightRequests.set(key, request)
  return request
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Returns a food image URL for a meal title.
 *
 * Strategy:
 * 1. Session memory cache → instant (if previously fetched)
 * 2. Backend fetch        → Spoonacular real food photo → Pexels fallback
 *                           Returns null while loading so the SVG meal-type
 *                           placeholder stays visible until a real photo arrives.
 *
 * Setup: Add SPOONACULAR_API_KEY to .env.local (free at spoonacular.com/food-api)
 */
export async function fetchMealImage(mealTitle: string): Promise<string | null> {
  if (!mealTitle?.trim()) return null

  const key = titleToKey(mealTitle)

  // 1. Session cache — zero latency
  if (sessionCache.has(key)) {
    const cached = sessionCache.get(key)!
    console.log(`[MealImages] Cache hit for: "${mealTitle}"`)
    return cached
  }

  // 2. Fetch real food image from backend (Spoonacular → Pexels)
  //    Returns null immediately — the calling component shows an SVG placeholder
  //    until this resolves. Once resolved, the URL is cached for future use.
  console.log(`[MealImages] Fetching real image for: "${mealTitle}" (SVG placeholder shown until ready)`)

  try {
    const aiUrl = await fetchImageFromBackend(mealTitle)
    if (aiUrl) {
      sessionCache.set(key, aiUrl)
      console.log(`[MealImages] ✅ Got real food image for: "${mealTitle}"`)
      return aiUrl
    }
  } catch (err) {
    console.error(`[MealImages] Unexpected error generating image for "${mealTitle}":`, err)
  }

  // No image available — component will keep showing the SVG placeholder
  console.log(`[MealImages] No image available for: "${mealTitle}" — SVG placeholder will persist`)
  return null
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
  const CONCURRENCY = 2 // reduced to avoid overwhelming the backend

  for (let i = 0; i < mealTitles.length; i += CONCURRENCY) {
    const batch = mealTitles.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(t => fetchMealImage(t)))
    batch.forEach((title, idx) => {
      if (batchResults[idx]) results[title] = batchResults[idx]!
    })
    onProgress?.(Math.min(i + CONCURRENCY, mealTitles.length), mealTitles.length)
    // Small delay between batches to avoid hammering the backend
    if (i + CONCURRENCY < mealTitles.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return results
}
