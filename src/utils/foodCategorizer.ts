export type FoodCategory =
  | 'protein'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'grain'
  | 'pantry'
  | 'frozen'
  | 'miscellaneous'

export interface CategorizedFoodItem {
  name: string
  category: FoodCategory
}

export interface FoodItemsResult {
  food_items: CategorizedFoodItem[]
}

const CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
  protein: ['chicken', 'turkey', 'salmon', 'beef', 'pork', 'tofu', 'egg', 'eggs', 'tuna', 'fillet', 'ground'],
  vegetable: ['spinach', 'broccoli', 'tomato', 'tomatoes', 'sweet potato', 'sweet potatoes', 'lettuce', 'kale', 'peas', 'onion', 'cilantro'],
  fruit: ['banana', 'bananas', 'apple', 'apples', 'avocado', 'avocados', 'orange', 'oranges', 'grape', 'grapes'],
  dairy: ['cheese', 'yogurt', 'milk', 'cheddar', 'greek yogurt', 'almond milk', 'butter'],
  grain: ['bread', 'rice', 'pasta', 'noodles', 'brown rice', 'whole wheat', 'tortilla', 'wrap'],
  pantry: ['olive oil', 'oil', 'beans', 'black beans', 'salt', 'sugar', 'flour', 'jam'],
  frozen: ['frozen', 'frozen peas', 'ice', 'frozen fruit'],
  miscellaneous: []
}

const SPELLING_CORRECTIONS: Record<string, string> = {
  tomatoe: 'tomato',
  banan: 'banana',
  chiken: 'chicken',
  turky: 'turkey',
  salmin: 'salmon',
  chese: 'cheese',
  yoghurt: 'yogurt',
  bred: 'bread',
  psta: 'pasta',
  spagetti: 'spaghetti'
}

const NORMALIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /gluten[\s-]?free/gi, replacement: 'gluten free' },
  { pattern: /\(gf\)/gi, replacement: 'gluten free' },
  { pattern: /\bwhole[\s-]?wheat\b/gi, replacement: 'whole wheat' }
]

function correctSpelling(text: string): string {
  let out = text.toLowerCase()
  for (const [wrong, right] of Object.entries(SPELLING_CORRECTIONS)) {
    out = out.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right)
  }
  return out
}

function normalizeDescription(text: string): string {
  let out = text
  for (const { pattern, replacement } of NORMALIZATION_PATTERNS) {
    out = out.replace(pattern, replacement)
  }
  out = out.replace(/[()\.,]/g, ' ').replace(/\s+/g, ' ').trim()
  return out
}

function formatItemName(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function categorizeItem(itemName: string): FoodCategory {
  const normalized = itemName.toLowerCase()
  const scores: Record<FoodCategory, number> = {
    protein: 0,
    vegetable: 0,
    fruit: 0,
    dairy: 0,
    grain: 0,
    pantry: 0,
    frozen: 0,
    miscellaneous: 0
  }

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [FoodCategory, string[]][]) {
    for (const kw of kws) {
      if (normalized.includes(kw)) scores[cat]++
    }
  }

  let best: FoodCategory = 'miscellaneous'
  let bestScore = 0
  for (const [cat, score] of Object.entries(scores) as [FoodCategory, number][]) {
    if (score > bestScore) {
      best = cat
      bestScore = score
    }
  }

  if (normalized.includes('frozen') && bestScore < 2) return 'frozen'
  return best
}

export function extractAndCategorizeFoodItems(cleanedItems: string[]): FoodItemsResult {
  const seen = new Set<string>()
  const items: CategorizedFoodItem[] = []
  const orderMap: Record<string, number> = {}

  cleanedItems.forEach((raw, i) => {
    if (!raw || typeof raw !== 'string') return
    let corrected = correctSpelling(raw)
    corrected = normalizeDescription(corrected)

    if (/pasta/.test(corrected) && /gluten|gf|gluten-free|glutenfree/.test(corrected)) {
      corrected = 'gluten free pasta'
    }

    const display = formatItemName(corrected)
    const key = display.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    orderMap[key] = orderMap[key] ?? i

    const category = categorizeItem(display)
    items.push({ name: display, category })
  })

  items.sort((a, b) => (orderMap[a.name.toLowerCase()] ?? 9999) - (orderMap[b.name.toLowerCase()] ?? 9999))
  return { food_items: items }
}

export default extractAndCategorizeFoodItems
