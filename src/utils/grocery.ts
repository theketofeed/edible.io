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
	/^deal$/i
]

// Food keywords that indicate a valid food item
const FOOD_KEYWORDS = new Set([
	// Vegetables
	'zucchini', 'banana', 'potato', 'potatoes', 'broccoli', 'brussels', 'sprouts', 'peas', 'tomato', 'tomatoes', 'lettuce',
	'spinach', 'kale', 'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'cucumber', 'cucumbers', 'celery',
	'corn', 'bean', 'beans', 'peas', 'asparagus', 'cauliflower', 'cabbage', 'mushroom', 'mushrooms', 'avocado', 'avocados',
	// Fruits
	'apple', 'apples', 'orange', 'oranges', 'grape', 'grapes', 'berry', 'berries', 'strawberry', 'strawberries',
	'blueberry', 'blueberries', 'raspberry', 'raspberries', 'peach', 'peaches', 'pear', 'pears', 'plum', 'plums',
	'cherry', 'cherries', 'mango', 'mangoes', 'pineapple', 'watermelon', 'melon', 'kiwi', 'kiwis',
	// Proteins
	'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'egg', 'eggs',
	'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground',
	// Dairy
	'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt',
	// Grains
	'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
	// Other
	'oil', 'olive oil', 'salt', 'sugar', 'flour', 'honey', 'jam', 'jelly', 'peanut', 'peanuts', 'almond', 'almonds',
	'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts'
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
	// Produce
	'org': 'organic',
	'organlc': 'organic',
	'banan': 'banana',
	'tomatoe': 'tomato',
	'potatoe': 'potato',
	// Dairy
	'mlk': 'milk',
	'mllk': 'milk',
	'chse': 'cheese',
	'yogrt': 'yogurt',
	'yougurt': 'yogurt',
	// Other common items
	'brd': 'bread',
	'bred': 'bread',
	'ricel': 'rice',
	'psta': 'pasta',
	'veggies': 'vegetables',
	'veggie': 'vegetable'
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
	'organic',
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
const KEEP_ADJECTIVES = new Set(['sweet', 'red', 'yellow', 'baby', 'boneless', 'skinless'])

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
	{ pattern: /\bground\s+turkey\b/i, replacement: 'ground turkey' }
]

// Patterns that indicate package sizes or counts to strip
const PACKAGE_PATTERNS = [/(\b\d+\s?oz\b)/gi, /(\b\d+\s?lbs?\b)/gi, /(\bpack\b)/gi, /(\bpk\b)/gi, /(\bct\b)/gi, /(\bpcs\b)/gi]

function normalizeItem(value: string): string {
	// Remove all price-related patterns
	let cleaned = value
		.replace(PRICE_PATTERN, ' ')
		.replace(LOOSE_PRICE_PATTERN, ' ')
		.replace(F_CODE_PATTERN, ' ')
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

 	// If surviving tokens end with a noun-like token, try to keep preceding adjective if meaningful
 	const partsLen = tokens.length
 	if (partsLen >= 2) {
 		const last = tokens[partsLen - 1]
 		const prev = tokens[partsLen - 2]
 		// Keep adjective if in whitelist or if it provides meaning (e.g., 'sweet onion')
 		if (KEEP_ADJECTIVES.has(prev) || /sweet|red|yellow|baby|boneless|skinless/.test(prev)) {
 			return `${prev} ${last}`.toLowerCase()
 		}
 	}

 	// fallback: use last token (noun), but preserve preceding token if it looks descriptive (not a brand/size)
 	const noun = tokens[tokens.length - 1]
 	return noun.toLowerCase()
}

/**
 * Clean an extracted grocery list into simple ingredient names.
 * - strips non-food tokens and prefixes
 * - applies OCR corrections and code mappings
 * - removes duplicates and normalizes casing
 */
export function cleanGroceryList(inputItems: string[]): string[] {
	console.log('[Cleaning] Input items count:', inputItems.length)
	console.log('[Cleaning] Input items:', inputItems)
	const cleaned: string[] = []
	const seen = new Set<string>()
	for (const raw of inputItems) {
		if (!raw || typeof raw !== 'string') {
			console.log('[Cleaning] Skipping invalid item:', raw)
			continue
		}
		// run through normalizeItem (works on free-form strings too)
		const n = normalizeItem(raw)
		if (!n) {
			console.log(`[Cleaning] Item "${raw}" normalized to empty, skipping`)
			continue
		}
		// final trim and lower-case
		const key = n.trim().toLowerCase()
		if (!key) {
			console.log(`[Cleaning] Item "${raw}" -> "${n}" -> empty after trim, skipping`)
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
	console.log('[Cleaning] Final cleaned items count:', cleaned.length)
	console.log('[Cleaning] Final cleaned items:', cleaned)
	return cleaned
}

function looksLikeFood(item: string): boolean {
	if (!item || item.length < 2) return false
	
	const lower = item.toLowerCase()
	
	// Check if it matches receipt metadata patterns
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
	
	// Check if it contains food keywords
	const words = lower.split(/\s+/)
	for (const word of words) {
		if (FOOD_KEYWORDS.has(word)) {
			return true
		}
		// Check partial matches (e.g., "brussels sprouts" contains "sprouts")
		for (const keyword of FOOD_KEYWORDS) {
			if (word.includes(keyword) || keyword.includes(word)) {
				return true
			}
		}
	}
	
	// If it's a single word and doesn't match any food keyword, reject it
	if (words.length === 1 && words[0].length < 6) {
		console.log(`[Filter] Rejected "${item}" - single short word, no food keyword match`)
		return false
	}
	
	// Allow longer descriptive phrases even if no exact keyword match
	if (item.length >= 8) {
		return true
	}
	
	console.log(`[Filter] Rejected "${item}" - doesn't look like food`)
	return false
}

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []
	
	console.log('[Extraction] Raw input length:', input.length)
	const lines = input.split(/[\r\n,;]+/).map(l => l.trim()).filter(Boolean)
	console.log('[Extraction] Split into', lines.length, 'lines')
	console.log('[Extraction] Raw lines:', lines)
	
	// Split by common delimiters and normalize
	const candidates = lines
		.map((line, idx) => {
			const normalized = normalizeItem(line)
			if (normalized) {
				console.log(`[Extraction] Line ${idx + 1}: "${line}" -> "${normalized}"`)
			} else {
				console.log(`[Extraction] Line ${idx + 1}: "${line}" -> (filtered out)`)
			}
			return normalized
		})
		.filter(Boolean)
		.filter((item) => {
			// Additional validation: must have at least one letter
			if (!/[a-zA-Z]/.test(item)) {
				console.log(`[Filter] Rejected "${item}" - no letters`)
				return false
			}
			return true
		})
		.filter(looksLikeFood)

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
	return unique
}
