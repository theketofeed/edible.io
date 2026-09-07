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

const DESTRUCTIVE_CONNECTORS = /\b(?:with|and|plus|in)\b/i

function uniqueStrings(values) {
  const seen = new Set()
  return values.filter(value => {
    const key = value.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sanitizeTitle(rawTitle) {
  return rawTitle
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateMealImageSearchCandidates(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return []
  }

  const base = sanitizeTitle(rawTitle)
  if (!base) return []

  const candidates = [base]

  const noConnectors = base.replace(DESTRUCTIVE_CONNECTORS, ' ')
  if (noConnectors && noConnectors !== base) candidates.push(noConnectors)

  const beforeConnector = base.replace(/\s+\b(?:with|and|plus|in)\b\s+.+$/i, '').trim()
  if (beforeConnector && beforeConnector !== base) candidates.push(beforeConnector)

  const words = base.split(/\s+/).filter(word => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '')
    if (!lower || lower.length < 2) return false
    if (FILLER_WORDS.has(lower)) return false
    if (/^\d+$/.test(lower)) return false
    return true
  })

  const mainProteinStyle = words.slice(0, 4).join(' ').trim()
  if (mainProteinStyle && !candidates.includes(mainProteinStyle)) candidates.push(mainProteinStyle)

  const mainIngredient = words.slice(-2).join(' ').trim()
  if (mainIngredient && !candidates.includes(mainIngredient)) candidates.push(mainIngredient)

  const singleWord = words.find(word => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '')
    return lower && !['with', 'and', 'plus', 'in'].includes(lower)
  }) || words[0]
  if (singleWord && !candidates.includes(singleWord)) candidates.push(singleWord)

  return uniqueStrings(candidates)
}

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

  let cleaned = sanitizeTitle(rawTitle)

  const words = cleaned.split(/\s+/).filter(w => {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '')
    if (lower.length < 2) return false
    if (FILLER_WORDS.has(lower)) return false
    if (/^\d+$/.test(lower)) return false
    return true
  })

  const normalized = words.length >= 1 ? words.join(' ').trim() : cleaned

  console.log(`[NormalizeTitle] raw="${rawTitle}" → normalized="${normalized}"`)

  return { raw: rawTitle, normalized }
}
