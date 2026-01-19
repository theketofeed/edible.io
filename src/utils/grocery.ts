// Receipt metadata patterns - ONLY obvious non-food items (Mindee already filters most)
const RECEIPT_METADATA_PATTERNS = [
	/^subtotal$/i,
	/^total$/i,
	/^balance$/i,
	/^change$/i,
	/^tax$/i,
	/^payment$/i,
	/^cash$/i,
	/^thank you$/i,
]

const EXCLUDED_PATTERNS = [
  /^\$?\d+\.?\d*\s*[ft]?$/i, // Prices like "$6.99 f"
  /^@/i, // Price indicators like "@ 5 for"
  /lb\s*@/i, // Weight prices
  /tare\s*weight/i,
  /subtotal|total|tax|fee|paid|visa|rate|amt/i,
  /^\d{3}-\d{4}/i, // Phone numbers
  /^(whole|foods|market|tribeca|greenwich|street|new york|city|ny)/i, // Store info
  /^--/i, // Separators
  /metropolita|summary/i
];

const isExcluded = (text: string) => 
  EXCLUDED_PATTERNS.some(pattern => pattern.test(text));

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
	'lime', 'limes', 'raisins',
	// Proteins
	'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'crabmeat', 'lobster', 'egg', 'eggs',
	'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders',
	// Dairy
	'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt',
	// Grains / bakery
	'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
	'croissant', 'cookies',
	// Other / pantry
	'oil', 'olive', 'olive oil', 'vinegar', 'balsamic', 'balsamic vinegar', 'salt', 'sugar', 'flour', 'honey', 'jam', 'jelly', 'peanut', 'peanuts', 'almond', 'almonds',
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
	// Balsamic vinegar (OCR often misreads this)
	'balsamic': 'balsamic vinegar',
	'bas apacer': 'balsamic vinegar',  // Common OCR error
	'basalmic': 'balsamic vinegar',
	// Beans
	'black bean': 'black beans',
	'og black bean': 'black beans',
	'365 og black': 'black beans',
	'cv limes': 'limes',
	'cv': 'conventional',  // Remove CV prefix if alone
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
	// Minimal cleanup - Mindee already provides clean descriptions
	let cleaned = value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')  // Normalize whitespace
	
	if (!cleaned || cleaned.length < 2) return ''
	
	// Only remove obvious prices at the end ($X.XX)
	cleaned = cleaned.replace(/\s*\$\d+[\.,]\d{2}\s*$/, '').trim()
	
	// Remove line numbers at start (e.g., "1. item" or "1 item")
	cleaned = cleaned.replace(/^\d+[\s.\-:]+/, '').trim()
	
	return cleaned
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
 * For Mindee data, this is minimal - mostly just deduplication.
 */
export function cleanGroceryList(inputItems: string[]): string[] {
	console.log('[Cleaning] Processing', inputItems.length, 'items from Mindee')
	
	const cleaned: string[] = []
	const seen = new Set<string>()

	for (const raw of inputItems) {
		if (!raw || typeof raw !== 'string') continue

		const normalized = normalizeItem(raw).trim()
		if (!normalized) continue

		// Filter obvious non-food items
		if (!looksLikeFood(normalized)) {
			console.log(`[Cleaning] Filtered out: "${raw}"`)
			continue
		}

		// Deduplicate
		const key = normalized.toLowerCase()
		if (!seen.has(key)) {
			seen.add(key)
			cleaned.push(key)
			console.log(`[Cleaning] Added: "${normalized}"`)
		}
	}

	console.log('[Cleaning] Result:', cleaned.length, 'items')
	return cleaned
}

function looksLikeFood(item: string): boolean {
	if (!item || item.length < 2) return false

	const lower = item.toLowerCase()

	// Reject obvious metadata
	for (const pattern of RECEIPT_METADATA_PATTERNS) {
		if (pattern.test(item)) return false
	}

	// Accept anything that contains a food keyword
	// This is much more lenient since Mindee already filtered most junk
	for (const keyword of FOOD_KEYWORDS) {
		if (lower.includes(keyword)) return true
	}

	// Accept any reasonable-length item (3+ chars) that passed metadata check
	// Trust Mindee has already done the heavy lifting
	if (item.length >= 3) {
		// Only reject if it's clearly not food (all caps, no vowels, too short)
		if (item === item.toUpperCase() && !/[aeiou]/i.test(item) && item.length <= 4) {
			return false
		}
		return true
	}

	return false
}

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []

	console.log('[Extraction] Processing input from Mindee receipt data')
	const lines = input.split(/[\r\n,;]+/).map(l => l.trim()).filter(Boolean)
	console.log('[Extraction] Lines to process:', lines.length)

	const items: string[] = []
	const seen = new Set<string>()

	for (const line of lines) {
		const normalized = normalizeItem(line)
		if (!normalized) continue

		// Check if it looks like food
		if (!looksLikeFood(normalized)) {
			console.log(`[Extraction] Filtered out: "${normalized}" (not recognized as food)`)
			continue
		}

		// Deduplicate
		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			console.log(`[Extraction] Skipping duplicate: "${normalized}"`)
			continue
		}

		seen.add(key)
		items.push(normalized)
		console.log(`[Extraction] Added: "${normalized}"`)
	}

	console.log('[Extraction] Final items:', items.length, items)
	return items
}
