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

	// Split into tokens and filter
	const tokens = cleaned.split(' ').filter(Boolean)
	if (!tokens.length) return ''

	// Apply OCR corrections and filter stop words
	const correctedTokens = tokens.map((token) => {
		// Apply OCR corrections
		if (OCR_CORRECTIONS[token]) {
			return OCR_CORRECTIONS[token]
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

	// Join and capitalize first letter of each word
	const joined = filteredTokens.join(' ')
	return joined.replace(/\b\w/g, (char) => char.toUpperCase())
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
