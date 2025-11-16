// Clean ESM fallback for running categorizer logic with Node (safe, standalone copy)
export function extractAndCategorizeFoodItems(cleanedItems) {
  if (!Array.isArray(cleanedItems)) return { food_items: [] }

  const CATEGORY_KEYWORDS = {
    protein: ['turkey', 'chicken', 'salmon', 'beef', 'pork', 'tofu', 'egg', 'eggs', 'tuna', 'fillet', 'ground'],
    vegetable: ['spinach', 'broccoli', 'tomato', 'tomatoes', 'sweet potato', 'sweet potatoes', 'lettuce', 'kale', 'peas'],
    fruit: ['banana', 'bananas', 'apple', 'apples', 'avocado', 'avocados', 'orange', 'oranges'],
    dairy: ['cheese', 'yogurt', 'milk', 'cheddar', 'greek yogurt', 'almond milk'],
    grain: ['bread', 'rice', 'pasta', 'noodles', 'brown rice', 'whole wheat'],
    pantry: ['olive oil', 'oil', 'beans', 'black beans', 'salt', 'sugar', 'flour'],
    frozen: ['frozen', 'frozen peas'],
    miscellaneous: []
  }

  const SPELLING_CORRECTIONS = {
    tomatoe: 'tomato',
    banan: 'banana',
    chiken: 'chicken',
    turky: 'turkey',
    salmin: 'salmon',
    chese: 'cheese',
    yoghurt: 'yogurt'
  }

  const NORMALIZATION_PATTERNS = [
    { pattern: /gluten[\s-]?free/gi, replacement: 'gluten free' },
    { pattern: /\(gf\)/gi, replacement: 'gluten free' },
    { pattern: /\bwhole[\s-]?wheat\b/gi, replacement: 'whole wheat' }
  ]

  function correctSpelling(text) {
    let out = String(text).toLowerCase()
    for (const [wrong, right] of Object.entries(SPELLING_CORRECTIONS)) {
      out = out.replace(new RegExp('\\b' + wrong + '\\b', 'gi'), right)
    }
    return out
  }

  function normalizeDescription(text) {
    let out = String(text)
    for (const p of NORMALIZATION_PATTERNS) out = out.replace(p.pattern, p.replacement)
    out = out.replace(/[()\.,]/g, ' ').replace(/\s+/g, ' ').trim()
    return out
  }

  function titleCase(text) {
    return String(text)
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ')
  }

  function categorizeItem(name) {
    const n = name.toLowerCase()
    const scores = {}
    for (const cat of Object.keys(CATEGORY_KEYWORDS)) scores[cat] = 0
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of kws) if (n.includes(kw)) scores[cat]++
    }
    let best = 'miscellaneous'
    let bestScore = 0
    for (const [cat, s] of Object.entries(scores)) {
      if (s > bestScore) { best = cat; bestScore = s }
    }
    if (n.includes('frozen') && bestScore < 2) return 'frozen'
    return best
  }

  const seen = new Set()
  const orderMap = {}
  const items = []

  cleanedItems.forEach((raw, i) => {
    if (!raw && raw !== 0) return
    let s = correctSpelling(raw)
    s = normalizeDescription(s)
    if (/pasta/.test(s) && /gluten|gf|gluten-free|glutenfree/.test(s)) s = 'gluten free pasta'
    const display = titleCase(s)
    const key = display.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    orderMap[key] = orderMap[key] ?? i
    const category = categorizeItem(display)
    items.push({ name: display, category })
  })

  items.sort((a,b)=> (orderMap[a.name.toLowerCase()]??9999)-(orderMap[b.name.toLowerCase()]??9999))
  return { food_items: items }
}

export default extractAndCategorizeFoodItems
