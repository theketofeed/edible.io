const FILLER_WORDS = new Set([
  // Dietary / marketing descriptors
  'organic', 'healthy', 'high', 'protein', 'keto', 'low', 'carb', 'carbs',
  'vegan', 'vegetarian', 'gluten', 'free', 'dairy', 'paleo', 'whole30',
  'sugar', 'clean', 'eating', 'diet', 'light', 'lean', 'detox',
  // Cooking techniques
  'baked', 'grilled', 'roasted', 'pan-seared', 'seared', 'sauteed', 'sautéed',
  'fried', 'deep-fried', 'braised', 'steamed', 'poached', 'smoked', 'charred',
  'broiled', 'blanched', 'caramelized', 'glazed', 'marinated', 'stuffed',
  'slow-cooked', 'pressure-cooked', 'air-fried', 'stir-fried', 'stir',
  // Descriptive adjectives
  'homemade', 'classic', 'traditional', 'rustic', 'simple', 'easy', 'quick',
  'hearty', 'creamy', 'crispy', 'crunchy', 'tender', 'juicy', 'savory',
  'zesty', 'tangy', 'spicy', 'mild', 'bold', 'rich', 'decadent',
  'delicious', 'flavorful', 'aromatic', 'fragrant', 'golden', 'perfect',
  'ultimate', 'best', 'amazing', 'favorite', 'great', 'good', 'new',
  'authentic', 'fresh', 'gourmet', 'garden', 'farm', 'style', 'inspired',
  // Time / effort descriptors
  'minute', 'minutes', 'hour', 'hours', 'fast', 'instant', 'lazy',
  'one', 'pot', 'sheet', 'pan', 'bowl', 'skillet',
  // Measurement / serving filler
  'serves', 'serving', 'servings', 'portion', 'portions',
  'cup', 'cups', 'tablespoon', 'teaspoon', 'lb', 'lbs', 'oz',
])

const TRUNCATION_RE = /\b(?:\s+with\b|\s+and\b)/i

/**
 * Normalize a meal title for image cache lookups.
 * Returns both raw and normalized for debug logging.
 *
 * @param {string} rawTitle
 * {{ raw: string, normalized: string }}
 */
export function normalizeMealTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return { raw: rawTitle || '', normalized: '' }
  }

  let cleaned = rawTitle.trim()

  // 1. Remove parenthetical notes like "(Keto-Friendly)" or "(serves 4)"
  cleaned = cleaned.replace(/\([^)]*\)/g, '').trim()

  // 2. Truncate at first " with " or " and " — keep the primary dish name
  const truncMatch = cleaned.match(TRUNCATION_RE)
  if (truncMatch) {
    cleaned = cleaned.slice(0, truncMatch.index).trim()
  }

  // 3. Split into words, filter out filler words and very short tokens
  const words = cleaned.split(/[\s,]+/).filter(w => {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '')
    if (lower.length < 2) return false
    if (FILLER_WORDS.has(lower)) return false
    // Also skip pure numbers
    if (/^\d+$/.test(lower)) return false
    return true
  })

  // 4. If we stripped too much, fall back to original (minus parentheticals)
  const normalized = words.length >= 1
    ? words.join(' ').trim()
    : cleaned

  console.log(`[NormalizeTitle] raw="${rawTitle}" → normalized="${normalized}"`)

  return { raw: rawTitle, normalized }
}
