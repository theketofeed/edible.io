/**
 * Supabase meal_images cache layer.
 *
 * Table schema:
 *   normalized_title TEXT PRIMARY KEY
 *   image_url        TEXT NOT NULL
 *   source           TEXT NOT NULL  ('pexels' | 'pixabay' | 'wikimedia' | 'fallback')
 *   attribution      TEXT           (Wikimedia author)
 *   license          TEXT           (Wikimedia license type)
 *   created_at       TIMESTAMPTZ   DEFAULT now()
 */

let _supabase = null

// ESM import (backend runs with "type": "module"; require() is not available)
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.warn('[ImageCache] ⚠️  Supabase credentials missing — DB cache disabled')
    return null
  }
  _supabase = createClient(url, key)
  return _supabase
}

/**
 * Look up a cached image by normalized title.
 * @returns {{ image_url: string, source: string, attribution?: string, license?: string } | null}
 */
export async function getCachedImage(normalizedTitle) {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('meal_images')
    .select('image_url, source, attribution, license')
    .eq('normalized_title', normalizedTitle)
    .maybeSingle()

  if (error) {
    console.warn('[ImageCache] Read error:', error.message)
    return null
  }
  return data || null
}

/**
 * Store a successful image result in the cache.
 * Only call this for real hits (pexels, pixabay, wikimedia) — NOT for fallback misses.
 *
 * @param {string} normalizedTitle
 * @param {{ imageUrl: string, source: string, attribution?: string, license?: string }} result
 */
export async function cacheImage(normalizedTitle, { imageUrl, source, attribution, license }) {
  const supabase = getSupabase()
  if (!supabase) return

  const row = {
    normalized_title: normalizedTitle,
    image_url: imageUrl,
    source,
  }
  if (attribution) row.attribution = attribution
  if (license) row.license = license

  const { error } = await supabase
    .from('meal_images')
    .upsert(row, { onConflict: 'normalized_title' })

  if (error) {
    console.warn('[ImageCache] Write error:', error.message)
  }
}

/**
 * Upload an image buffer to Supabase Storage and return the public URL.
 * Used for Pixabay images (terms prohibit hotlinking).
 *
 * @param {string} normalizedTitle - used as the storage file path
 * @param {Buffer} imageBuffer
 * @param {string} contentType - e.g. 'image/jpeg'
 * @returns {string | null} public URL
 */
export async function uploadToStorage(normalizedTitle, imageBuffer, contentType) {
  const supabase = getSupabase()
  if (!supabase) return null

  // Slugify for a clean file path
  const slug = normalizedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  const ext = contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
    : contentType.includes('gif') ? 'gif'
    : 'jpg'

  const path = `meal-images/${slug}.${ext}`

  const { error } = await supabase.storage
    .from('meal-images')
    .upload(path, imageBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.warn('[ImageStorage] Upload error:', error.message)
    return null
  }

  // Build the public URL manually (storage bucket is public)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/meal-images/${path}`
  return publicUrl
}
