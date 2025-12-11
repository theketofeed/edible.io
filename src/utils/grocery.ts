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

// Common vendor/store prefixes and brand tokens to strip
const PREFIX_TOKENS = ['365', 'og', 'cv', 'wf', 'wholefoods', 'wo', 'brand']

// Map short vendor codes or shorthand to likely ingredients
const CODE_MAPPINGS: Record<string, string> = {
	// Example heuristics used in receipts — these can be extended
	'3bc': 'chicken breast',
	'ckn': 'chicken',
	'rot': 'rotisserie chicken',
	'ckn': 'chicken',
	'pck': 'package',
}

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

	if (!cleaned) return ''

	// Remove common prefix tokens like store codes or brand prefixes
	const parts = cleaned.split(/\s+/).filter(Boolean)
	let tokens = parts.slice()
	if (tokens.length && PREFIX_TOKENS.includes(tokens[0])) {
		tokens = tokens.slice(1)
	}

	// Split into tokens and filter
	tokens = tokens.flatMap(t => t.split('-')).filter(Boolean)
	if (!tokens.length) return ''

	// Apply OCR corrections and filter stop words
	const correctedTokens = tokens.map((token) => {
		const low = token.toLowerCase()
		// Apply OCR corrections
		if (OCR_CORRECTIONS[low]) return OCR_CORRECTIONS[low]
		// Map short codes
		if (CODE_MAPPINGS[low]) return CODE_MAPPINGS[low]
		// Strip package size tokens
		for (const p of PACKAGE_PATTERNS) {
			if (p.test(low)) return ''
			p.lastIndex = 0
		}
		return token
	})

	// Remove stop words, pure numbers, and very short tokens
	const filteredTokens = correctedTokens.filter((token) => {
		if (STOP_WORDS.has(token)) return false
		if (/^\d+$/.test(token)) return false  // Pure numbers
		if (token.length <= 1) return false  // Single characters
		return true
	})

	if (!filteredTokens.length) return ''

	// Join and lowercase normalized result (we'll return simple lower-case names)
	const joined = filteredTokens.join(' ')
	if (!joined) return ''
	// Apply some canonical pluralization / simplifications
	let out = joined
	out = out.replace(/\bblack bean\b/gi, 'black beans')
	out = out.replace(/\bcilantro\b/gi, 'cilantro')
	out = out.replace(/\bavocado\b/gi, 'avocado')
	// common singularization for consistency
	out = out.replace(/\bpotatoes\b/gi, 'potato')
	out = out.replace(/\btomatoes\b/gi, 'tomato')
	return out.toLowerCase()
}

/**
 * Clean an extracted grocery list into simple ingredient names.
 * - strips non-food tokens and prefixes
 * - applies OCR corrections and code mappings
 * - removes duplicates and normalizes casing
 */
export function cleanGroceryList(inputItems: string[]): string[] {
	const cleaned: string[] = []
	const seen = new Set<string>()
	for (const raw of inputItems) {
		if (!raw || typeof raw !== 'string') continue
		// run through normalizeItem (works on free-form strings too)
		const n = normalizeItem(raw)
		if (!n) continue
		// final trim and lower-case
		const key = n.trim().toLowerCase()
		if (!key) continue
		if (!seen.has(key)) {
			seen.add(key)
			cleaned.push(key)
		}
	}
	return cleaned
}

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []
	
	// Split by common delimiters
	const candidates = input
		.split(/[\r\n,;]+/)
		.map((line) => normalizeItem(line))
		.filter(Boolean)
		.filter((item) => {
			// Additional validation: must have at least one letter
			return /[a-zA-Z]/.test(item)
		})

	// Deduplicate (case-insensitive)
	const seen = new Set<string>()
	const unique: string[] = []
	
	for (const item of candidates) {
		const lowerItem = item.toLowerCase()
		if (!seen.has(lowerItem)) {
			seen.add(lowerItem)
			unique.push(item)
		}
	}

	return unique
}
