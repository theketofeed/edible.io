// Receipt metadata patterns that should be completely filtered out
const RECEIPT_METADATA_PATTERNS = [
	/^special$/i,
	/^subtotal$/i,
	/^total$/i,
	/^loyalty$/i,
	/^cash$/i,
	/^change$/i,
	/^balance$/i,
	/^paid$/i,
	/^payment$/i,
	/^tender$/i,
	/^due$/i,
	/^ref$/i,
	/^trans$/i,
	/^transaction$/i,
	/^invoice$/i,
	/^order$/i,
	/^receipt$/i,
	/^store$/i,
	/^market$/i,
	/^date$/i,
	/^time$/i,
	/^cashier$/i,
	/^clerk$/i,
	/^register$/i,
	/^customer$/i,
	/^member$/i,
	/^thank$/i,
	/^thanks$/i,
	/^savings$/i,
	/^save$/i,
	/^saved$/i,
	/^coupon$/i,
	/^discount$/i,
	/^rewards$/i,
	/^points$/i,
	/^promo$/i,
	/^deal$/i,
	/^result$/i,
	/^approved$/i,
	/^sequence$/i,
	/^term$/i,
	/^terminal$/i,
	/^id$/i,
	/^seq$/i,
	/^visa$/i,
	/^mastercard$/i,
	/^debit$/i,
	/^credit$/i,
	/^card$/i,
	/\.com$/i,
	/@/i,
	// STRICT: Reject any 2-3 letter garbage tokens (fi, er, at, le, ds, rri, na, be, or, cv, cy, etc.)
	/^[a-z]{2,3}$/i,
]

// Food keywords that indicate a valid food item
// Expanded with more produce, bakery, seafood and pantry items to improve recall
const FOOD_KEYWORDS = new Set([
	// Vegetables
	'zucchini', 'banana', 'potato', 'potatoes', 'broccoli', 'brussels', 'sprouts', 'peas', 'tomato', 'tomatoes', 'lettuce',
	'spinach', 'kale', 'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'cucumber', 'cucumbers', 'celery',
	'corn', 'bean', 'beans', 'black bean', 'black beans', 'peas', 'asparagus', 'cauliflower', 'cabbage', 'mushroom', 'mushrooms', 'avocado', 'avocados',
	'romaine', 'cilantro', 'heart',
	// Fruits
	'apple', 'apples', 'orange', 'oranges', 'grape', 'grapes', 'berry', 'berries', 'strawberry', 'strawberries',
	'blueberry', 'blueberries', 'raspberry', 'raspberries', 'peach', 'peaches', 'pear', 'pears', 'plum', 'plums',
	'cherry', 'cherries', 'mango', 'mangoes', 'pineapple', 'watermelon', 'melon', 'kiwi', 'kiwis', 'lemon', 'lemons',
	'raisins',
	// Proteins
	'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'crabmeat', 'lobster', 'egg', 'eggs',
	'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders',
	// Dairy
	'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt',
	// Grains / bakery
	'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
	'croissant', 'cookies',
	// Other / pantry
	'oil', 'olive oil', 'vinegar', 'salt', 'sugar', 'flour', 'honey', 'jam', 'jelly', 'peanut', 'peanuts', 'almond', 'almonds',
	'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts', 'butter', 'cottage cheese',
	// Herbs and spices
	'cilantro', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'garlic', 'ginger', 'cumin',
	'paprika', 'pepper', 'peppercorn', 'cinnamon', 'nutmeg', 'bay leaf', 'turmeric', 'dill', 'tarragon',
	// Common condiments
	'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa', 'pesto', 'soy sauce'
])

// Extended stop words for receipts and grocery lists
const STOP_WORDS = new Set([
	// Totals and financial terms
	'total',
	'subtotal',
	'tax',
	'sales',
	'sale',
	'amount',
	'change',
	'cash',
	'balance',
	'paid',
	'payment',
	'tender',
	'due',
	'hst',
	'gst',
	'pst',
	'vat',
	// Payment methods
	'visa',
	'mastercard',
	'debit',
	'credit',
	'card',
	'amex',
	'discover',
	'cash',
	// Store/receipt metadata
	'store',
	'market',
	'receipt',
	'cashier',
	'clerk',
	'register',
	'transaction',
	'trans',
	'ref',
	'invoice',
	'order',
	// Measurements and quantities
	'qty',
	'quantity',
	'price',
	'amt',
	'item',
	'lbs',
	'lb',
	'oz',
	'kg',
	'net',
	'weight',
	'wt',
	'ea',
	'each',
	// Promotions
	'savings',
	'save',
	'saved',
	'coupon',
	'discount',
	'rewards',
	'points',
	'off',
	'promo',
	'deal',
	// Misc
	'dollars',
	'thank',
	'thanks',
	'date',
	'time',
	'description',
	'desc',
	'line',
	'number',
	'no',
	'code',
	'barcode',
	'upc',
	'sku',
	'customer',
	'member',
	'id',
	'dept',
	'department',
	'aisle'
])

// Pattern matching for non-food content
const NON_WORD_PATTERN = /[^a-zA-Z0-9\s/-]/g
const PRICE_PATTERN = /\$?\d+[.,]\d{2}\b/g  // Match dollar amounts like $1.99, 2.50
const LOOSE_PRICE_PATTERN = /\d+[.,]\d{2,}/g  // Match any decimal numbers that look like prices
const LEADING_CODE_PATTERN = /^[A-Z]{2,}\d+/  // UPC/PLU codes at start
const TRAILING_DIGITS_PATTERN = /\b\d+$/  // Pure numbers at end of line
const F_CODE_PATTERN = /\bF[12]\b/gi  // F1, F2 tax codes
const TAX_CODE_PATTERN = /\b(F1|F2|FB|FY|FE|BE|HF|HE|BF|BY|GF|GY|GE)\b/gi  // Receipt tax codes at end
const QUANTITY_PATTERN = /\b\d+\s*x\s*\d*\.?\d+\b/gi  // 2x, 3x1.5, etc.
const WEIGHT_PATTERN = /\b\d+\.?\d*\s*(lb|lbs|oz|kg|g)\b/gi  // 2.5 lb, 3oz
const LINE_NUMBER_PATTERN = /^\d+[\s.-]/  // Line numbers at start
const DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g  // Dates
const TIME_PATTERN = /\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\b/g  // Times

// Common OCR spelling corrections for grocery items
const OCR_CORRECTIONS: Record<string, string> = {
	// Common abbreviations
	'bnls': 'boneless',
	'bnlss': 'boneless',
	'sklss': 'skinless',
	'sknls': 'skinless',
	'bnl': 'boneless',
	// Cheese varieties
	'co-jack': 'colby jack',
	'cojack': 'colby jack',
	'chdr': 'cheddar',
	'mozzarella': 'mozzarella',
	'mozz': 'mozzarella',
	// Meat terms
	'chkn': 'chicken',
	'chck': 'chicken',
	'chic': 'chicken',
	'grd': 'ground',
	'grnd': 'ground',
	'groun': 'ground',
	'turky': 'turkey',
	'hamm': 'ham',
	// Produce — common Tesseract misreads
	'org': 'organic',
	'organlc': 'organic',
	'banan': 'banana',
	'rauber': 'strawberries',
	'strawbery': 'strawberries',
	'zucchni': 'zucchini',
	'zucini': 'zucchini',
	'uchinnt': 'zucchini',
	'uchinni': 'zucchini',
	'avacado': 'avocados',
	'avocao': 'avocados',
	'tomatoe': 'tomato',
	'tomatos': 'tomatoes',
	'potatoe': 'potato',
	'grn': 'green',
	'pea': 'peas',
	'sprout': 'sprouts',
	'sprots': 'sprouts',
	// Dairy
	'mlk': 'milk',
	'mllk': 'milk',
	'chse': 'cheese',
	'yogrt': 'yogurt',
	'yougurt': 'yogurt',
	// Sour cream / cream artefacts
	'sao': 'sour',
	'sr': 'sour',
	'crm': 'cream',
	'frien': 'friends',
	// Other common items
	'brd': 'bread',
	'bred': 'bread',
	'ricel': 'rice',
	'psta': 'pasta',
	'veggies': 'vegetables',
	'veggie': 'vegetable',
	'restaur': 'restaurant',
	'fries': 'fries',
	// Fiesta/cheese brand items
	'fiesta shred': 'shredded cheese',
	'shred': 'shredded cheese',
	// Cilantro/herbs
	'cilantro bunch': 'cilantro',
	'bunch': '',  // Just remove 'bunch' suffix
	// Romaine/lettuce
	'romaine heart': 'romaine lettuce',
	'heart': '',  // Remove trailing 'heart'
	// Light roast (coffee misread)
	'light roast': 'coffee',
	'3bc': 'coffee',
	// Whole wheat/tortillas
	'ww tortilla': 'whole wheat tortilla',
	'roti ckn pln': 'roti chicken plain',
	'roti': 'tortilla',
	// Limes/citrus
	'hass': 'hass',  // Keep brand name for avocados
	// Apples
	'gala apples': 'gala apples',
	'gala': 'apples'
}

// Common abbreviations on receipts -> full words
const ABBREVIATIONS: Record<string, string> = {
	og: 'organic',
	cv: 'conventional',
	ww: 'whole wheat',
	ogn: 'organic',
	'co-jack': 'colby jack',
	coj: 'colby jack',
	cjack: 'colby jack'
}

// Common vendor/store prefixes and brand tokens to strip (case-insensitive)
const PREFIX_TOKENS = ['365', 'og', 'cv', 'wf', 'wholefoods', 'wo', 'brand', 'gt', 'pkg']

// Brand tokens to remove if present anywhere in line
const BRAND_TOKENS = ['aldi', 'walmart', 'wholefoods', 'trader', 'joes', 'costco', 'kroger', 'sprouts']

// Descriptors we intentionally drop when normalizing
// (quantity/packaging words we don't want in the final ingredient name)
const IGNORED_DESCRIPTORS = new Set([
    'conventional',
    'fresh',
    'raw',
    'large',
    'small',
    'medium',
    'pkg',
    'package',
    'each',
    'ea',
    'unit',
    'bunch',
    'bunches',
    'half'
])

// Adjectives to preserve when they carry meaning for the ingredient
const KEEP_ADJECTIVES = new Set(['sweet', 'red', 'yellow', 'baby', 'boneless', 'skinless', 'mini', 'pint', 'organic'])

// Map short vendor codes or shorthand to likely ingredients
const CODE_MAPPINGS: Record<string, string> = {
	// Example heuristics used in receipts — these can be extended
	'3bc': 'chicken breast',
	'ckn': 'chicken',
	'rot': 'rotisserie chicken',
	'pck': 'package',
}

// Canonicalization patterns to map common receipt phrases to standardized ingredient names
const CANONICAL_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
	{ pattern: /\bblack\s*bean(s?)\b/i, replacement: 'black beans' },
	{ pattern: /\bcilantro\b/i, replacement: 'cilantro' },
	{ pattern: /\bpork\s*loin\b/i, replacement: 'pork loin' },
	{ pattern: /\broti[.-]?s?er?ri?e?\s*chicken\b|\brot[iy]?\s*ckn\b/i, replacement: 'rotisserie chicken' },
	{ pattern: /\bco[-\s]?jack\b|\bcolby\s*jack\b/i, replacement: 'colby jack cheese' },
	{ pattern: /\bpink\s*lady\s*apple(s?)\b/i, replacement: 'apples' },
	{ pattern: /\bapple(s?)\b/i, replacement: 'apples' },
	{ pattern: /\bshr?ed?d?ed?\s+colby\s*jack\b/i, replacement: 'colby jack cheese' },
	{ pattern: /\bchicken\b/i, replacement: 'chicken' },
	{ pattern: /\bground\s+turkey\b/i, replacement: 'ground turkey' },
	// Sour cream canonicalization
	{ pattern: /\bsour\s+cream\b/i, replacement: 'sour cream' },
	{ pattern: /\b(frien|friend|french)\s+sour\s+cream\b/i, replacement: 'sour cream' },
	// Generic shredded cheese blends
	{ pattern: /\bfiesta\s+shred(?:ded)?\b/i, replacement: 'shredded cheese' }
]

// Patterns that indicate package sizes or counts to strip
const PACKAGE_PATTERNS = [/(\b\d+\s?oz\b)/gi, /(\b\d+\s?lbs?\b)/gi, /(\bpack\b)/gi, /(\bpk\b)/gi, /(\bct\b)/gi, /(\bpcs\b)/gi]

function normalizeItem(value: string): string {
	// Remove all price-related patterns, tax codes, and OCR artifacts
	let cleaned = value
		.replace(PRICE_PATTERN, ' ')
		.replace(LOOSE_PRICE_PATTERN, ' ')
		.replace(F_CODE_PATTERN, ' ')
		.replace(TAX_CODE_PATTERN, ' ')  // Remove tax codes like FB, FY, FE, BE, etc.
		.replace(QUANTITY_PATTERN, ' ')
		.replace(WEIGHT_PATTERN, ' ')
		.replace(LINE_NUMBER_PATTERN, ' ')
		.replace(DATE_PATTERN, ' ')
		.replace(TIME_PATTERN, ' ')
		.replace(LEADING_CODE_PATTERN, ' ')
		.replace(TRAILING_DIGITS_PATTERN, ' ')
		.replace(NON_WORD_PATTERN, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim()
		.toLowerCase()

	// Special-case common dairy product "half and half" so descriptor stripping
	// doesn't reduce it to a meaningless token like "and"
	if (cleaned === 'half and half') {
		return 'half and half'
	}

	if (!cleaned) return ''

 	// Remove common prefix tokens like store codes or brand prefixes
 	let parts = cleaned.split(/\s+/).filter(Boolean)
 	// remove any brand tokens found anywhere
 	parts = parts.filter(p => !BRAND_TOKENS.includes(p.toLowerCase()))
 	
 	// Remove common trailing single letters/suffixes that are incomplete (e.g., "avocados na", "heart")
 	if (parts.length > 1) {
 		const lastPart = parts[parts.length - 1]
 		// If last part is 2 chars or less AND doesn't match food keyword, remove it
 		if (lastPart.length <= 2 && !FOOD_KEYWORDS.has(lastPart.toLowerCase())) {
 			parts = parts.slice(0, -1)
 		}
 	}

 	// if first token is a known prefix (like 365 or OG) drop it
 	if (parts.length && PREFIX_TOKENS.includes(parts[0])) parts = parts.slice(1)

 	// expand abbreviations and apply OCR corrections/code mappings per token
 	let tokens = parts.flatMap(t => t.split('-')).map(t => t.toLowerCase()).filter(Boolean)
 	tokens = tokens.map(token => {
 		if (ABBREVIATIONS[token]) return ABBREVIATIONS[token]
 		if (OCR_CORRECTIONS[token]) return OCR_CORRECTIONS[token]
 		if (CODE_MAPPINGS[token]) return CODE_MAPPINGS[token]
 		return token
 	})

 	// strip package / size tokens
 	tokens = tokens.filter(t => {
 		for (const p of PACKAGE_PATTERNS) {
 			if (p.test(t)) return false
 			p.lastIndex = 0
 		}
 		return true
 	})

 	// remove stop words, ignored descriptors, pure numbers and very short tokens
 	tokens = tokens.filter(token => {
 		if (STOP_WORDS.has(token)) return false
 		if (IGNORED_DESCRIPTORS.has(token)) return false
 		if (/^\d+$/.test(token)) return false
 		if (token.length <= 1) return false
 		return true
 	})

 	if (!tokens.length) return ''

 	// Re-join for pattern matching and canonicalization
 	let candidate = tokens.join(' ')

 	// Apply canonical patterns first (most specific mappings)
 	for (const { pattern, replacement } of CANONICAL_PATTERNS) {
 		if (pattern.test(candidate)) {
 			return replacement.toLowerCase()
 		}
 	}

	// Prefer returning a multi-word candidate when it contains any known food keyword
	const partsLen = tokens.length
	if (partsLen >= 2) {
		// if any token is an explicit food keyword, prefer the full candidate (preserve multi-word items)
		for (const t of tokens) {
			if (FOOD_KEYWORDS.has(t)) return candidate.toLowerCase()
		}
		// if the joined candidate contains any food keyword substring, keep it (e.g., 'butter croissant')
		for (const kw of FOOD_KEYWORDS) {
			if (candidate.includes(kw)) return candidate.toLowerCase()
		}

		// Keep adjective + noun when adjective is meaningful (e.g., 'sweet potato', 'organic asparagus')
		const last = tokens[partsLen - 1]
		const prev = tokens[partsLen - 2]
		if (KEEP_ADJECTIVES.has(prev) || /sweet|red|yellow|baby|boneless|skinless|mini|pint|organic/.test(prev)) {
			return `${prev} ${last}`.toLowerCase()
		}
	}

	// fallback: use last token (noun)
	const noun = tokens[tokens.length - 1]
	return noun.toLowerCase()
}

/**
 * Merges adjacent items that form common multi-word food terms.
 * Example: ['brussel', 'sprouts'] → ['brussel sprouts']
 */
function mergeMultiWordItems(items: string[]): string[] {
	const MULTI_WORD_FOODS = new Set([
		'brussel sprouts', 'brussels sprouts',
		'sweet potato', 'sweet potatoes',
		'ground turkey', 'ground beef',
		'flat leaf spinach', 'cherry tomatoes', 'grape tomatoes',
	])

	const merged: string[] = []
	let i = 0
	while (i < items.length) {
		const current = items[i].toLowerCase()
		if (i + 1 < items.length) {
			const candidate = current + ' ' + items[i + 1].toLowerCase()
			if (MULTI_WORD_FOODS.has(candidate)) {
				console.log(`[Merge] Combined "${items[i]}" + "${items[i + 1]}" → "${candidate}"`)
				merged.push(candidate)
				i += 2
				continue
			}
		}
		merged.push(items[i])
		i++
	}
	return merged
}

/**
 * Clean an extracted grocery list into simple ingredient names.
 * - strips non-food tokens and prefixes
 * - applies OCR corrections and code mappings
 * - removes duplicates and normalizes casing
 */
export function cleanGroceryList(inputItems: string[]): string[] {
	// Merge multi-word items that were split across extraction
	const mergedItems = mergeMultiWordItems(inputItems)
	console.log('[Cleaning] Input items count:', mergedItems.length)
	console.log('[Cleaning] Input items:', mergedItems)
	const afterNormalization: Array<{ raw: string; normalized: string }> = []
	const filteredOut: Array<{ raw: string; reason: string }> = []
	const cleaned: string[] = []
	const seen = new Set<string>()
	for (const raw of inputItems) {
		if (!raw || typeof raw !== 'string') {
			console.log('[Cleaning] Skipping invalid item:', raw)
			filteredOut.push({ raw: String(raw), reason: 'invalid type or empty' })
			continue
		}
		// run through normalizeItem (works on free-form strings too)
		const n = normalizeItem(raw)
		afterNormalization.push({ raw, normalized: n })
		if (!n) {
			console.log(`[Cleaning] Item "${raw}" normalized to empty, skipping`)
			filteredOut.push({ raw, reason: 'normalized to empty' })
			continue
		}
		// final trim and lower-case
		const key = n.trim().toLowerCase()
		if (!key) {
			console.log(`[Cleaning] Item "${raw}" -> "${n}" -> empty after trim, skipping`)
			filteredOut.push({ raw, reason: 'empty after trim' })
			continue
		}
		// Discard things that don't look like food (avoid keeping OCR garbage)
		if (!looksLikeFood(key, raw)) {
			console.log(`[Cleaning] Rejected during cleaning: "${raw}" -> "${key}" (looksLikeFood=false)`)
			filteredOut.push({ raw, reason: 'looksLikeFood=false' })
			continue
		}
		if (!seen.has(key)) {
			seen.add(key)
			cleaned.push(key)
			console.log(`[Cleaning] Added: "${raw}" -> "${key}"`)
		} else {
			console.log(`[Cleaning] Skipping duplicate: "${raw}" -> "${key}"`)
		}
	}
	console.log('[Cleaning] Items after normalization:', afterNormalization)
	console.log('[Cleaning] Items filtered out during cleaning:', filteredOut)
	console.log('[Cleaning] Final cleaned items count:', cleaned.length)
	console.log('[Cleaning] Final cleaned items:', cleaned)
	return cleaned
}

function looksLikeFood(item: string, rawLine?: string): boolean {
	if (!item || item.length < 2) return false

	const lower = item.toLowerCase()

	// Reject strict receipt metadata immediately
	for (const pattern of RECEIPT_METADATA_PATTERNS) {
		if (pattern.test(item)) {
			console.log(`[Filter] Rejected "${item}" - matches receipt metadata pattern`)
			return false
		}
	}

    // Check if it's all caps and very short (likely a code)
    if (item === item.toUpperCase() && item.length <= 8 && !/[aeiou]/i.test(item)) {
        console.log(`[Filter] Rejected "${item}" - looks like a code (all caps, short, no vowels)`)
        return false
    }

    // Split into words and check for known food keywords or partial matches
    const words = lower.split(/\s+/).filter(Boolean)
    for (const word of words) {
        if (FOOD_KEYWORDS.has(word)) return true
        for (const keyword of FOOD_KEYWORDS) {
            if (word.includes(keyword) || keyword.includes(word)) return true
        }
    }

    // Single-word logic: allow shorter words (3+ chars) if they plausibly match food keywords
    if (words.length === 1) {
        const w = words[0]
        // Absolutely reject 2-character garbage tokens like 'er', 'db', 'fy', 'be'
        if (w.length < 3) {
            console.log(`[Filter] Rejected "${item}" - too short (${w.length} chars), garbage token`)
            return false
        }
        for (const keyword of FOOD_KEYWORDS) {
            if (keyword.includes(w) || w.includes(keyword)) return true
        }
        console.log(`[Filter] Rejected "${item}" - single short word, no food keyword match`)
        return false
    }

    // For multi-word phrases: accept if the raw line has a price AND the normalized item is reasonable
    // (not just 2-letter trash tokens). Don't accept junk like "be", "fy", "fb" even with a price.
    if (rawLine && (PRICE_PATTERN.test(rawLine) || LOOSE_PRICE_PATTERN.test(rawLine))) {
        // Only accept price lines if the result is at least 4 characters or has a food keyword
        if (item.length >= 4) {
            console.log(`[Filter] Accepted "${item}" (len=${item.length}) because raw line contains price`)
            return true
        }
        // Check if any token is a food keyword despite short length
        for (const w of words) {
            for (const keyword of FOOD_KEYWORDS) {
                if (keyword.includes(w) || w.includes(keyword)) {
                    console.log(`[Filter] Accepted "${item}" because contains food keyword "${w}"`)
                    return true
                }
            }
        }
        console.log(`[Filter] Rejected "${item}" (len=${item.length}) from price line — too short and no food keywords`)
        return false
    }

    // For multi-word phrases without price, accept if longer than short threshold
    if (item.length >= 4) return true

    console.log(`[Filter] Rejected "${item}" - doesn't look like food`)
    return false
}

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []

	console.log('[Extraction] Raw input length:', input.length)
	const lines = input.split(/[\r\n,;]+/).map(l => l.trim()).filter(Boolean)
	console.log('[Extraction] Split into', lines.length, 'lines')
	console.log('[Extraction] Raw lines:', lines)

	const candidates: string[] = []
	const rejected: Array<{ line: string; reason: string; idx: number }> = []

	for (let idx = 0; idx < lines.length; idx++) {
		const line = lines[idx]
		console.log(`[Extraction] BEFORE normalization Line ${idx + 1}: "${line}"`)
		const normalized = normalizeItem(line)
		console.log(`[Extraction] AFTER normalization Line ${idx + 1}: "${normalized}"`)
		if (!normalized) {
			console.log(`[Extraction] REJECTED Line ${idx + 1}: "${line}" -> normalized to empty`)
			rejected.push({ line, reason: 'normalized to empty', idx: idx + 1 })
			continue
		}
		// Additional validation: must have at least one letter
		if (!/[a-zA-Z]/.test(normalized)) {
			console.log(`[Extraction] REJECTED Line ${idx + 1}: "${line}" -> "${normalized}" (no letters)`)
			rejected.push({ line: normalized, reason: 'no letters', idx: idx + 1 })
			continue
		}
		// Check heuristics for looking like food — this function logs reasons when rejecting
		const looks = looksLikeFood(normalized, line)
		if (!looks) {
			console.log(`[Extraction] REJECTED Line ${idx + 1}: "${line}" -> "${normalized}" (looksLikeFood=false)`)
			rejected.push({ line: normalized, reason: 'looksLikeFood=false', idx: idx + 1 })
			continue
		}
		candidates.push(normalized)
	}

	console.log('[Extraction] After filtering,', candidates.length, 'candidates remain:', candidates)

	// Deduplicate (case-insensitive)
	const seen = new Set<string>()
	const unique: string[] = []
	for (const item of candidates) {
		const lowerItem = item.toLowerCase()
		if (!seen.has(lowerItem)) {
			seen.add(lowerItem)
			unique.push(item)
		} else {
			console.log(`[Extraction] Skipping duplicate: "${item}"`)
		}
	}

	console.log('[Extraction] Final unique items:', unique.length, unique)
	console.log('[Extraction] Rejected lines with reasons:', rejected)
	return unique
}
