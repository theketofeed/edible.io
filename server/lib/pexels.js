/**
 * Pexels API image fetch.
 *
 * Terms: Store the returned URL directly in the DB cache (permanent, no expiry).
 */

const FOOD_INDICATORS = /\b(food|dish|meal|plate|bowl|cook|recipe|eat|cuisine|salad|soup|steak|chicken|fish|pasta|rice|bread|cake|dessert|fruit|vegetable|meat|seafood|sandwich|burger|pizza|taco|sushi|curry|noodle|breakfast|lunch|dinner|appetizer|snack|sauce|grill|roast|bake|fry|serve|kitchen|restaurant|dining|delicious|tasty|yummy|homemade|ingredient)\b/i
const NON_FOOD = /\b(book|cover|page|author|library|shelf|reading|laptop|computer|phone|screen|office|desk|building|car|vehicle|fashion|model|portrait|selfie|abstract|pattern|texture|landscape|mountain|ocean|beach|city|skyline|person|people|crowd|sport|gym)\b/i

function isProbablyFoodPhoto(photo) {
  if (photo.alt && FOOD_INDICATORS.test(photo.alt)) return true
  if (photo.url && FOOD_INDICATORS.test(photo.url)) return true
  if (photo.src?.original && FOOD_INDICATORS.test(photo.src.original)) return true
  if (photo.alt && NON_FOOD.test(photo.alt)) return false
  return true
}

/**
 * Search Pexels for a food image.
 * @param {string} searchTerm - the normalized meal title + " food dish"
 * @returns {{ imageUrl: string } | null}
 */
export async function fetchPexelsImage(searchTerm) {
  const pexelsKey = process.env.PEXELS_API_KEY
  if (!pexelsKey) {
    console.log('[Pexels] No API key configured — skipping')
    return null
  }

  try {
    const query = encodeURIComponent(searchTerm)
    const searchUrl = `https://api.pexels.com/v1/search?query=${query}&per_page=5`

    const res = await fetch(searchUrl, {
      headers: { Authorization: pexelsKey },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`[Pexels] API error: ${res.status}`)
      return null
    }

    const data = await res.json()
    const photos = data?.photos || []
    const foodPhoto = photos.find(p => p?.src?.large && isProbablyFoodPhoto(p))

    if (!foodPhoto) {
      console.log(`[Pexels] No food-relevant results (${photos.length} total filtered out)`)
      return null
    }

    const imageUrl = foodPhoto.src.large
    console.log(`[Pexels] Found image (alt: "${foodPhoto.alt || 'n/a'}")`)
    return { imageUrl }
  } catch (err) {
    console.warn(`[Pexels] Error: ${err.message}`)
    return null
  }
}
