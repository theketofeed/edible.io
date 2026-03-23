const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string

// Cache to avoid re-fetching for the same meal title
const imageCache = new Map<string, string>()

// Words to strip from meal titles before building the search query
const STOP_WORDS = new Set([
	'and', 'with', 'the', 'a', 'an', 'in', 'on', 'of', 'for',
	'over', 'under', 'topped', 'served', 'fresh', 'homemade',
	'simple', 'easy', 'quick', 'classic', 'hearty', 'light',
	'plain', 'grilled', 'baked', 'roasted', 'steamed', 'fried',
	'sautéed', 'sauteed', 'scrambled', 'stuffed', 'mixed',
])

// Food-specific synonym simplification
const FOOD_SIMPLIFICATIONS: Record<string, string> = {
	'rotisserie chicken': 'roast chicken',
	'hass avocado': 'avocado',
	'cherry tomato': 'tomato',
	'romaine heart': 'salad',
	'whole wheat tortilla': 'wrap',
	'black bean': 'beans',
	'large non-gmo brown egg': 'eggs',
	'og ': '',
	'365 ': '',
	'cv ': '',
}

/**
 * Extracts a clean 1-3 word Unsplash search query from a meal title.
 * e.g. "Grilled Chicken and Cherry Tomato Salad" → "chicken salad"
 */
function extractSearchQuery(mealTitle: string): string {
	let query = mealTitle.toLowerCase()

	// Apply food simplifications first
	for (const [from, to] of Object.entries(FOOD_SIMPLIFICATIONS)) {
		query = query.replace(new RegExp(from, 'gi'), to)
	}

	// Split into words and filter out stop words and numbers
	const words = query
		.replace(/[^a-z\s]/g, ' ')
		.split(/\s+/)
		.filter(w => w.length > 2 && !STOP_WORDS.has(w))

	// Take the first 2 meaningful food words
	const searchWords = words.slice(0, 2)

	if (searchWords.length === 0) return 'food meal'
	return searchWords.join(' ')
}

/**
 * Fetches a single image URL from Unsplash for the given query.
 * Returns null if no results found.
 */
async function searchUnsplash(query: string): Promise<string | null> {
	console.log('[Unsplash] Fetching image for query:', `"${query}"`)

	if (!UNSPLASH_ACCESS_KEY) {
		console.warn('[Unsplash] No Unsplash access key found in VITE_UNSPLASH_ACCESS_KEY')
		return null
	}

	try {
		const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`
		const response = await fetch(url, {
			headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
		})

		if (!response.ok) {
			console.warn(`[Unsplash] API error: ${response.status}`)
			return null
		}

		const data = await response.json()
		const results = data?.results

		if (!results || results.length === 0) {
			console.warn(`[Unsplash] No results found for query: "${query}"`)
			return null
		}

		// Pick the best image — prefer ones with food-related alt text
		const best = results[0]
		const imageUrl = best?.urls?.regular || best?.urls?.small || null

		if (imageUrl) {
			console.log(`[Unsplash] Found image for query: "${query}"`)
		}
		return imageUrl
	} catch (err) {
		console.error('[Unsplash] Fetch error:', err)
		return null
	}
}

/**
 * Multi-attempt search: tries progressively simpler queries until an
 * image is found. Falls back to a generic food photo as last resort.
 */
export async function fetchMealImage(mealTitle: string): Promise<string | null> {
	// Return cached result if available
	if (imageCache.has(mealTitle)) {
		console.log(`[Unsplash] Using cached image for meal: "${mealTitle}"`)
		return imageCache.get(mealTitle) || null
	}

	console.log(`[Unsplash] Starting image search for: "${mealTitle}"`)

	// Strategy 1: Smart 2-word extraction
	const smartQuery = extractSearchQuery(mealTitle)

	// Strategy 2: Just the first main food word
	const firstWordQuery = smartQuery.split(' ')[0]

	// Strategy 3: Detect meal type keyword
	const lower = mealTitle.toLowerCase()
	const mealTypeQuery =
		lower.includes('salad') ? 'fresh salad' :
		lower.includes('wrap') || lower.includes('burrito') ? 'wrap sandwich' :
		lower.includes('soup') || lower.includes('chili') ? 'soup bowl' :
		lower.includes('toast') ? 'avocado toast' :
		lower.includes('egg') || lower.includes('scramble') ? 'scrambled eggs' :
		lower.includes('chicken') ? 'grilled chicken' :
		lower.includes('bowl') ? 'grain bowl' :
		'healthy meal'

	const strategies = [smartQuery, mealTypeQuery, firstWordQuery, 'food plate']
	console.log(`[Unsplash] Strategies:`, strategies)

	for (const query of strategies) {
		if (!query || query.trim().length < 2) continue
		const result = await searchUnsplash(query.trim())
		if (result) {
			imageCache.set(mealTitle, result)
			return result
		}
	}

	console.warn(`[Unsplash] All strategies failed for: "${mealTitle}"`)
	return null
}

/**
 * Fetch images for multiple meal titles in parallel (with concurrency cap).
 */
export async function fetchMealImages(
	mealTitles: string[],
	onProgress?: (completed: number, total: number) => void
): Promise<Record<string, string>> {
	const results: Record<string, string> = {}
	const CONCURRENCY = 3

	for (let i = 0; i < mealTitles.length; i += CONCURRENCY) {
		const batch = mealTitles.slice(i, i + CONCURRENCY)
		const batchResults = await Promise.all(
			batch.map(title => fetchMealImage(title))
		)
		batch.forEach((title, idx) => {
			if (batchResults[idx]) {
				results[title] = batchResults[idx]!
			}
		})
		onProgress?.(Math.min(i + CONCURRENCY, mealTitles.length), mealTitles.length)
	}

	return results
}
