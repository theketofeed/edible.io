/**
 * Pixabay API image fetch + re-upload.
 *
 * Pixabay terms prohibit permanent hotlinking. We must:
 *   1. Get the image URL from their API
 *   2. Download the actual image bytes
 *   3. Upload to our Supabase Storage bucket
 *   4. Return our own hosted URL for caching
 */

import { uploadToStorage } from './imageCache.js'

/**
 * Search Pixabay for a food image, download it, re-host on our storage.
 * @param {string} searchTerm - the normalized meal title + " food dish"
 * @param {string} normalizedTitle - for storage path + DB key
 * @returns {{ imageUrl: string } | null}
 */
export async function fetchPixabayImage(searchTerm, normalizedTitle) {
  const pixabayKey = process.env.PIXABAY_API_KEY
  if (!pixabayKey) {
    console.log('[Pixabay] No API key configured — skipping')
    return null
  }

  try {
    const query = encodeURIComponent(searchTerm)
    const searchUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${query}&image_type=photo&per_page=5&category=food`

    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })

    if (!res.ok) {
      console.warn(`[Pixabay] API error: ${res.status}`)
      return null
    }

    const data = await res.json()
    const hits = data?.hits || []

    if (hits.length === 0) {
      console.log(`[Pixabay] No results for: "${searchTerm}"`)
      return null
    }

    // Pick the first hit
    const hit = hits[0]
    const pixabayUrl = hit.webformatURL
    console.log(`[Pixabay] Found image (id: ${hit.id}, tags: "${hit.tags}")`)

    // Download the actual image bytes
    const imgRes = await fetch(pixabayUrl, { signal: AbortSignal.timeout(15000) })
    if (!imgRes.ok) {
      console.warn(`[Pixabay] Image download failed: ${imgRes.status}`)
      return null
    }

    const arrayBuffer = await imgRes.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    if (imageBuffer.length === 0) {
      console.warn('[Pixabay] Downloaded empty image')
      return null
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'

    // Upload to our Supabase Storage (terms compliance)
    const hostedUrl = await uploadToStorage(normalizedTitle, imageBuffer, contentType)
    if (!hostedUrl) {
      console.warn('[Pixabay] Storage upload failed — cannot cache (hotlinking prohibited)')
      return null
    }

    console.log(`[Pixabay] Re-hosted at: ${hostedUrl}`)
    return { imageUrl: hostedUrl }
  } catch (err) {
    console.warn(`[Pixabay] Error: ${err.message}`)
    return null
  }
}
