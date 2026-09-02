-- Meal image cache table
-- Keyed on normalized meal title (fillers stripped, truncated at "with"/"and")
-- Only populated on real API hits — fallback misses are NOT cached so they
-- retry the full pipeline on next request.
--
-- Run this in your Supabase SQL editor or via `supabase db push`.

CREATE TABLE IF NOT EXISTS meal_images (
  normalized_title TEXT PRIMARY KEY,
  image_url        TEXT NOT NULL,
  source           TEXT NOT NULL CHECK (source IN ('pexels', 'pixabay', 'wikimedia', 'fallback')),
  attribution      TEXT,          -- Wikimedia Commons: author/credit
  license          TEXT,          -- Wikimedia Commons: license type
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for potential lookups by source (admin/debug)
CREATE INDEX IF NOT EXISTS idx_meal_images_source ON meal_images (source);

-- ── Supabase Storage bucket ────────────────────────────────────────────────
-- Create the 'meal-images' bucket for Pixabay re-hosted images.
-- This must be done via the Supabase Dashboard > Storage > New Bucket:
--   Bucket name:  meal-images
--   Public:       YES  (checked)
--   File size limit: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- Or via the Supabase CLI:
--   supabase storage create-bucket meal-images --public

-- ── RLS policies ───────────────────────────────────────────────────────────
-- meal_images table: server-only access (service role key)
ALTER TABLE meal_images ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses SUPABASE_SERVICE_KEY)
CREATE POLICY "Service role full access" ON meal_images
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Public read for anyone (so the frontend can theoretically read cache too)
CREATE POLICY "Public read access" ON meal_images
  FOR SELECT
  USING (true);

-- meal-images storage bucket: public read
-- (configured at bucket creation time when set to public)
