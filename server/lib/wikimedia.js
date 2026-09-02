/**
 * Wikimedia Commons API image fetch.
 *
 * Terms: Store the URL directly + include attribution/license in the DB record.
 */

/**
 * Search Wikimedia Commons for a food image.
 * @param {string} searchTerm - the normalized meal title
 * @returns {{ imageUrl: string, attribution: string, license: string } | null}
 */
export async function fetchWikimediaImage(searchTerm) {
  try {
    const query = encodeURIComponent(searchTerm)
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm + ' food')}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&format=json`

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Edible.io/1.0 (meal-image-pipeline)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`[Wikimedia] API error: ${res.status}`)
      return null
    }

    const data = await res.json()
    const pages = data?.query?.pages || {}

    // Find the first image-type result (skip SVG, PDF, etc.)
    const imageExtensions = /\.(jpg|jpeg|png|webp|gif)$/i
    for (const page of Object.values(pages)) {
      const imageinfo = page?.imageinfo?.[0]
      if (!imageinfo?.url) continue

      // Skip non-photo file types
      if (!imageExtensions.test(imageinfo.url)) continue

      // Extract attribution and license from extmetadata
      const meta = imageinfo.extmetadata || {}
      const author = meta.Artist?.value || meta.Credit?.value || 'Unknown'
      const license = meta.LicenseShortName?.value || meta.License?.value || 'Unknown'

      // Strip HTML tags from author field (Wikimedia wraps it in <a> tags)
      const cleanAuthor = author.replace(/<[^>]*>/g, '').trim()

      console.log(`[Wikimedia] Found image: "${page.title}" by ${cleanAuthor} / ${license}`)

      return {
        imageUrl: imageinfo.url,
        attribution: cleanAuthor,
        license: license,
      }
    }

    console.log(`[Wikimedia] No suitable images found for: "${searchTerm}"`)
    return null
  } catch (err) {
    console.warn(`[Wikimedia] Error: ${err.message}`)
    return null
  }
}
