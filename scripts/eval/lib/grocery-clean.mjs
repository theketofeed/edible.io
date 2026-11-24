// Port of src/utils/grocery.ts cleanGroceryList. Keep this file in sync with that function.
const RECEIPT_METADATA_PATTERNS = [
  /^subtotal$/i,
  /^total$/i,
  /^balance$/i,
  /^change$/i,
  /^tax$/i,
  /^payment$/i,
  /^cash$/i,
  /^thank you$/i,
  /^special$/i,
  /^loyalty$/i,
  /^date$/i,
  /^receipt$/i,
]

const EXCLUDED_PATTERNS = [
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  /tel\s*\d/i,
  /phone/i,
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\bdebit\b/i,
  /\bcredit\b/i,
  /\bvisa\b/i,
  /\bmastercard\b/i,
  /\bapproved\b/i,
  /\bdeclined\b/i,
  /\bterm\s*id\b/i,
  /\bsequence\s*#/i,
  /\btransaction\b/i,
  /\bauth\b/i,
  /\bref\s*#/i,
  /\bcard\b/i,
  /\bpin\b/i,
  /^[a-f0-9]{6,}$/i,
  /^(?=.*\d)[a-z0-9]{8,}$/i,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\s+\d{4}/i,
  /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
  /\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?/i,
  /date\/time/i,
  /\b\d+\s+[a-z]+\s+(avenue|ave|street|st|road|rd|blvd|drive|dr|lane|ln|way)\b/i,
  /\b(oshawa|toronto|vancouver|calgary|ottawa|montreal|winnipeg)\b/i,
  /\b(new york|los angeles|chicago|houston|phoenix|philadelphia)\b/i,
  /feedback/i,
  /comments to/i,
  /please email/i,
  /we value/i,
  /visit us/i,
  /follow us/i,
  /survey/i,
  /farmboy/i,
  /walmart/i,
  /costco/i,
  /target/i,
  /^result$/i,
  /\$\d+[\.,]\d{2}/,
  /£\d+[\.,]\d{2}/,
  /€\d+[\.,]\d{2}/,
  /^-?\d+\.?\d*$/,
  /^[\*\-\._]{2,}$/,
  /^\$?\d+\.?\d*\s*[ft]?$/i,
  /^@/i,
  /lb\s*@/i,
  /tare\s*weight/i,
  /\b(subtotal|sub\s*total|totals?(?!\s+greek\s+yogurt)|tax(es|ed)?|fees?|paid|visa|rates?)\b/i,
  /^\d{3}-\d{4}/i,
  /^--/i,
  /metropolita|summary/i,
  /^name$/i,
  /^amt\.?$/i,
  /^sold items/i,
  /^\d+:\d+$/,
  /^c\s+\d/i,
  /^\$\s*\d/i,
  /^\d{8,}$/,
  /^#\s*\d{6,}/,
  /^(result|approved|declined|void|refund)$/i,
  /\b[a-z]\d[a-z]\s*\d[a-z]\d\b/i,
  /\b\d{5}(-\d{4})?\b/,
  /^[\.,]?\d+[\.,]?\d*\s*(kg|g|lbs?|oz|lb)\s*$/i,
]

const FOOD_KEYWORDS = new Set([
  'zucchini', 'banana', 'potato', 'potatoes', 'broccoli', 'brussels', 'sprouts', 'peas', 'tomato', 'tomatoes', 'lettuce',
  'spinach', 'kale', 'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'cucumber', 'cucumbers', 'celery',
  'corn', 'bean', 'beans', 'black bean', 'black beans', 'asparagus', 'cauliflower', 'cabbage', 'mushroom', 'mushrooms',
  'avocado', 'avocados', 'romaine', 'cilantro', 'heart', 'arugula', 'leek', 'leeks', 'radish', 'beet', 'beets',
  'squash', 'pumpkin', 'artichoke', 'eggplant', 'sweet potato',
  'apple', 'apples', 'orange', 'oranges', 'grape', 'grapes', 'berry', 'berries', 'strawberry', 'strawberries',
  'blueberry', 'blueberries', 'raspberry', 'raspberries', 'peach', 'peaches', 'pear', 'pears', 'plum', 'plums',
  'cherry', 'cherries', 'mango', 'mangoes', 'pineapple', 'watermelon', 'melon', 'kiwi', 'kiwis', 'lemon', 'lemons',
  'lime', 'limes', 'raisins', 'apricot', 'nectarine', 'fig', 'date', 'pomegranate',
  'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'crabmeat', 'lobster', 'egg', 'eggs',
  'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders', 'ckn', 'roti', 'tilapia',
  'cod', 'halibut', 'trout', 'sardine', 'anchovy', 'duck', 'lamb', 'veal', 'venison',
  'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt', 'shred',
  'mozzarella', 'cheddar', 'parmesan', 'feta', 'brie', 'gouda', 'ricotta',
  'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
  'croissant', 'cookies', 'bagel', 'muffin', 'roll', 'bun', 'pita', 'cracker', 'cereal', 'granola', 'flour',
  'oil', 'olive', 'olive oil', 'vinegar', 'balsamic', 'balsamic vinegar', 'salt', 'sugar', 'honey', 'jam', 'jelly',
  'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts',
  'butter', 'margarine', 'shortening', 'lard',
  'cilantro', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'garlic', 'ginger', 'cumin',
  'paprika', 'cinnamon', 'nutmeg', 'bay leaf', 'turmeric', 'dill', 'tarragon', 'chili', 'cayenne', 'curry',
  'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa', 'pesto', 'soy sauce', 'hot sauce', 'sriracha',
  'hummus', 'tahini', 'ranch', 'dressing',
  'coffee', 'roast', 'tea', 'juice', 'water', 'milk',
  'pizza', 'frozen', 'ice cream', 'sorbet',
])

function isExcluded(text) {
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(text))
}

function normalizeItem(value) {
  let cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  if (!cleaned || cleaned.length < 2) return ''

  cleaned = cleaned
    .replace(/^[\.,]?\d+[\.,]?\d*\s*kg\s+/i, '')
    .replace(/^[\.,]?\d+[\.,]?\d*\s*lbs?\s+/i, '')
    .replace(/^[\.,]?\d+[\.,]?\d*\s*oz\s+/i, '')
    .replace(/^[\.,]?\d+[\.,]?\d*\s*g\s+/i, '')
    .trim()

  cleaned = cleaned
    .replace(/\s*\d+\s*x\s*$/i, '')
    .replace(/\s*[\.,]?\d+[\.,]\d+\s*kg\s*$/i, '')
    .replace(/\s*[\.,]?\d+[\.,]\d+\s*lbs?\s*$/i, '')
    .replace(/\s*[\.,]?\d+[\.,]\d+\s*oz\s*$/i, '')
    .replace(/\s*[\.,]?\d+\s*kg\s*$/i, '')
    .replace(/\s*[\.,]?\d+\s*lbs?\s*$/i, '')
    .replace(/\s*[\.,]?\d+\s*oz\s*$/i, '')
    .trim()

  cleaned = cleaned.replace(/\s*\$\d+[\.,]\d{2}\s*$/, '').trim()
  cleaned = cleaned.replace(/\s*\d*@.*$/i, '').trim()
  cleaned = cleaned.replace(/^\d+[\s.\-:]+/, '').trim()

  return cleaned
}

function looksLikeFood(item) {
  if (!item || item.length < 2) return false

  const lower = item.toLowerCase()
  if (isExcluded(lower)) return false

  for (const pattern of RECEIPT_METADATA_PATTERNS) {
    if (pattern.test(lower)) return false
  }

  if (/^[a-f0-9]{6,}$/i.test(lower)) return false
  if (/^\d{6,}$/.test(lower)) return false
  if (lower.includes('@')) return false
  if (/\d+\s+(first|second|third|avenue|street|road)/i.test(lower)) return false

  for (const keyword of FOOD_KEYWORDS) {
    if (lower.includes(keyword)) return true
  }

  if (item.length <= 4 && item === item.toUpperCase() && !/[aeiou]/i.test(item)) {
    return false
  }

  if (lower.length > 40 && !Array.from(FOOD_KEYWORDS).some((keyword) => lower.includes(keyword))) {
    return false
  }

  return item.length >= 3
}

export function cleanGroceryList(inputItems) {
  console.log('[Cleaning] Processing', inputItems.length, 'items from OCR')

  const cleaned = []
  const seen = new Set()

  for (const raw of inputItems) {
    if (!raw || typeof raw !== 'string') continue

    const normalized = normalizeItem(raw).trim()
    if (!normalized) continue

    if (normalized.length < 3) {
      console.log(`[Cleaning] Item too short (< 3 chars): "${normalized}"`)
      continue
    }

    if (isExcluded(normalized)) {
      console.log(`[Cleaning] Excluded by pattern: "${raw}"`)
      continue
    }

    if (!looksLikeFood(normalized)) {
      console.log(`[Cleaning] Filtered out: "${raw}"`)
      continue
    }

    const key = normalized.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      cleaned.push(normalized)
      console.log(`[Cleaning] Added: "${normalized}"`)
    }
  }

  console.log('[Cleaning] Result:', cleaned.length, 'items')
  return cleaned
}
