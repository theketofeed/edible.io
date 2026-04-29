// Receipt metadata patterns - obvious non-food single words
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
	// Phone numbers
	/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
	/tel\s*\d/i,
	/phone/i,
	// Email addresses
	/@[a-z0-9.-]+\.[a-z]{2,}/i,
	// Transaction / card info
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
	// Hex/alphanumeric transaction codes (e.g. "fe010d03")
	/^[a-f0-9]{6,}$/i,
	/^[a-z0-9]{8,}$/i,
	// Date/time patterns
	/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\s+\d{4}/i,
	/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
	/\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?/i,
	/date\/time/i,
	// Store address / location info
	/\b\d+\s+[a-z]+\s+(avenue|ave|street|st|road|rd|blvd|drive|dr|lane|ln|way)\b/i,
	/\b(oshawa|toronto|vancouver|calgary|ottawa|montreal|winnipeg)\b/i, // Canadian cities
	/\b(new york|los angeles|chicago|houston|phoenix|philadelphia)\b/i, // US cities
	// Store-specific footer text
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
	// Price patterns
	/\$\d+[\.,]\d{2}/,
	/£\d+[\.,]\d{2}/,
	/€\d+[\.,]\d{2}/,
	// Lines that are only numbers
	/^-?\d+\.?\d*$/,
	// Lines that are only symbols
	/^[\*\-\._]{2,}$/,
	// Price indicators
	/^\$?\d+\.?\d*\s*[ft]?$/i,
	/^@/i,
	/lb\s*@/i,
	/tare\s*weight/i,
	/subtotal|sub\s*total|total|tax|fee|paid|visa|rate|taxed\s+amt/i,
	/^\d{3}-\d{4}/i,
	/^--/i,
	/metropolita|summary/i,
	/^name$/i,
	/^amt\.?$/i,
	/^sold items/i,
	/^\d+:\d+$/i,
	/^c\s+\d/i,
	/^\$\s*\d/i,
	// Sequence numbers (long digit strings)
	/^\d{8,}$/,
	/^#\s*\d{6,}/,
	// "result", "approved", generic transaction words
	/^(result|approved|declined|void|refund)$/i,
	// Postal codes
	/\b[a-z]\d[a-z]\s*\d[a-z]\d\b/i, // Canadian postal
	/\b\d{5}(-\d{4})?\b/, // US ZIP
	// Weight-only strings (e.g. ".370 kg", "500g")
	/^[\.,]?\d+[\.,]?\d*\s*(kg|g|lbs?|oz|lb)\s*$/i,
]

const isExcluded = (text: string) =>
	EXCLUDED_PATTERNS.some(pattern => pattern.test(text))

// Food keywords that indicate a valid food item
const FOOD_KEYWORDS = new Set([
	// Vegetables
	'zucchini', 'banana', 'potato', 'potatoes', 'broccoli', 'brussels', 'sprouts', 'peas', 'tomato', 'tomatoes', 'lettuce',
	'spinach', 'kale', 'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'cucumber', 'cucumbers', 'celery',
	'corn', 'bean', 'beans', 'black bean', 'black beans', 'asparagus', 'cauliflower', 'cabbage', 'mushroom', 'mushrooms',
	'avocado', 'avocados', 'romaine', 'cilantro', 'heart', 'arugula', 'leek', 'leeks', 'radish', 'beet', 'beets',
	'squash', 'pumpkin', 'artichoke', 'eggplant', 'sweet potato',
	// Fruits
	'apple', 'apples', 'orange', 'oranges', 'grape', 'grapes', 'berry', 'berries', 'strawberry', 'strawberries',
	'blueberry', 'blueberries', 'raspberry', 'raspberries', 'peach', 'peaches', 'pear', 'pears', 'plum', 'plums',
	'cherry', 'cherries', 'mango', 'mangoes', 'pineapple', 'watermelon', 'melon', 'kiwi', 'kiwis', 'lemon', 'lemons',
	'lime', 'limes', 'raisins', 'apricot', 'nectarine', 'fig', 'date', 'pomegranate',
	// Proteins
	'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'crabmeat', 'lobster', 'egg', 'eggs',
	'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders', 'ckn', 'roti', 'tilapia',
	'cod', 'halibut', 'trout', 'sardine', 'anchovy', 'duck', 'lamb', 'veal', 'venison',
	// Dairy
	'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt', 'shred',
	'mozzarella', 'cheddar', 'parmesan', 'feta', 'brie', 'gouda', 'ricotta',
	// Grains / bakery
	'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
	'croissant', 'cookies', 'bagel', 'muffin', 'roll', 'bun', 'pita', 'cracker', 'cereal', 'granola', 'flour',
	// Other / pantry
	'oil', 'olive', 'olive oil', 'vinegar', 'balsamic', 'balsamic vinegar', 'salt', 'sugar', 'honey', 'jam', 'jelly',
	'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts',
	'butter', 'margarine', 'shortening', 'lard',
	// Herbs and spices
	'cilantro', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'garlic', 'ginger', 'cumin',
	'paprika', 'cinnamon', 'nutmeg', 'bay leaf', 'turmeric', 'dill', 'tarragon', 'chili', 'cayenne', 'curry',
	// Common condiments
	'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa', 'pesto', 'soy sauce', 'hot sauce', 'sriracha',
	'hummus', 'tahini', 'ranch', 'dressing',
	// Beverages
	'coffee', 'roast', 'tea', 'juice', 'water', 'milk',
	// Frozen / misc
	'pizza', 'frozen', 'ice cream', 'sorbet',
])

function normalizeItem(value: string): string {
	let cleaned = value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')

	if (!cleaned || cleaned.length < 2) return ''

	// Strip LEADING weight measurements (handles ".370 kg" at start)
	cleaned = cleaned
		.replace(/^[\.,]?\d+[\.,]?\d*\s*kg\s+/i, '')
		.replace(/^[\.,]?\d+[\.,]?\d*\s*lbs?\s+/i, '')
		.replace(/^[\.,]?\d+[\.,]?\d*\s*oz\s+/i, '')
		.replace(/^[\.,]?\d+[\.,]?\d*\s*g\s+/i, '')
		.trim()

	// Strip TRAILING weight suffixes (handles ".370 kg" at end)
	cleaned = cleaned
		.replace(/\s*\d+\s*x\s*$/i, '')
		.replace(/\s*[\.,]?\d+[\.,]\d+\s*kg\s*$/i, '')
		.replace(/\s*[\.,]?\d+[\.,]\d+\s*lbs?\s*$/i, '')
		.replace(/\s*[\.,]?\d+[\.,]\d+\s*oz\s*$/i, '')
		.replace(/\s*[\.,]?\d+\s*kg\s*$/i, '')
		.replace(/\s*[\.,]?\d+\s*lbs?\s*$/i, '')
		.replace(/\s*[\.,]?\d+\s*oz\s*$/i, '')
		.trim()

	// Strip prices at the end
	cleaned = cleaned.replace(/\s*\$\d+[\.,]\d{2}\s*$/, '').trim()
	
	// Strip trailing price-per-weight like "@ $4.39/kg" or "1@ 3/$2.50"
	cleaned = cleaned.replace(/\s*\d*@.*$/i, '').trim()

	// Strip line numbers at start
	cleaned = cleaned.replace(/^\d+[\s.\-:]+/, '').trim()

	return cleaned
}

export function humanReadableWeight(quantity: string | number): string {
	const raw = String(quantity).trim()

	const lbMatch = raw.match(/^(\d+[\.,]?\d*)\s*lbs?$/i)
	if (lbMatch) {
		const lbs = parseFloat(lbMatch[1].replace(',', '.'))
		if (lbs < 0.25) return `${Math.round(lbs * 453.6)}g`
		if (lbs < 1) return `${Math.round(lbs * 16)} oz`
		const wholeLbs = Math.floor(lbs)
		const remOz = Math.round((lbs - wholeLbs) * 16)
		return remOz > 0 ? `${wholeLbs} lb ${remOz} oz` : `${wholeLbs} lb`
	}

	const kgMatch = raw.match(/^(\d+[\.,]?\d*)\s*kg$/i)
	if (kgMatch) {
		const kg = parseFloat(kgMatch[1].replace(',', '.'))
		if (kg < 1) return `~${Math.round(kg * 1000)}g`
		return `${kg.toFixed(2).replace(/\.?0+$/, '')} kg`
	}

	const gMatch = raw.match(/^(\d+[\.,]?\d*)\s*g$/i)
	if (gMatch) {
		const g = parseFloat(gMatch[1].replace(',', '.'))
		if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`
		return `~${Math.round(g)}g`
	}

	return raw
}

function looksLikeFood(item: string): boolean {
	if (!item || item.length < 2) return false

	const lower = item.toLowerCase()

	// Check exclusions first
	if (isExcluded(lower)) return false

	// Reject obvious metadata words
	for (const pattern of RECEIPT_METADATA_PATTERNS) {
		if (pattern.test(lower)) return false
	}

	// Reject items that contain digits mixed with letters in a transaction-ID way
	// e.g. "fe010d03", "595001001061", "fe010d03"
	if (/^[a-f0-9]{6,}$/i.test(lower)) return false
	if (/^\d{6,}$/.test(lower)) return false

	// Reject items with @ symbol (price indicators)
	if (lower.includes('@')) return false

	// Reject items that look like store names / addresses
	if (/\d+\s+(first|second|third|avenue|street|road)/i.test(lower)) return false

	// Accept anything that contains a food keyword
	for (const keyword of FOOD_KEYWORDS) {
		if (lower.includes(keyword)) return true
	}

	// Reject short all-caps items with no vowels (codes/abbreviations)
	if (item.length <= 4 && item === item.toUpperCase() && !/[aeiou]/i.test(item)) {
		return false
	}

	// Reject items that are suspiciously long with no food keywords (likely addresses/descriptions)
	if (lower.length > 40 && !Array.from(FOOD_KEYWORDS).some(kw => lower.includes(kw))) {
		return false
	}

	// For items 3+ chars that passed all checks, accept them
	return item.length >= 3
}

export function cleanGroceryList(inputItems: string[]): string[] {
	console.log('[Cleaning] Processing', inputItems.length, 'items from OCR')

	const cleaned: string[] = []
	const seen = new Set<string>()

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

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []

	console.log('[Extraction] Processing OCR input')
	const lines = input.split(/[\r\n,;]+/).map(l => l.trim()).filter(Boolean)
	console.log('[Extraction] Lines to process:', lines.length)

	const items: string[] = []
	const seen = new Set<string>()

	for (const line of lines) {
		const normalized = normalizeItem(line)
		if (!normalized) continue

		if (normalized.length < 3) {
			console.log(`[Extraction] Item too short (< 3 chars): "${normalized}"`)
			continue
		}

		if (isExcluded(normalized)) {
			console.log(`[Extraction] Excluded by pattern: "${line}"`)
			continue
		}

		if (!looksLikeFood(normalized)) {
			console.log(`[Extraction] Filtered out: "${line}" (not recognized as food)`)
			continue
		}

		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		items.push(normalized)
		console.log(`[Extraction] Added: "${normalized}"`)
	}

	console.log('[Extraction] Final items:', items.length, items)
	return items
}

export async function parseReceiptWithAI(rawOcrText: string): Promise<import('./types').ParsedReceiptResult> {
	console.log('[ReceiptAI] Starting AI-powered receipt parsing via backend proxy')
	const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001'

	try {
		const prompt = `Parse this grocery receipt and extract ONLY the food items with their quantities and prices.

Return a JSON array of objects with this structure:
[
  {
    "item": "chicken breast",
    "quantity": "2 lbs",
    "price": "$12.99",
    "category": "protein"
  }
]

Rules:
- Extract ONLY food items (no store info, totals, dates, transaction codes, phone numbers, emails, addresses, etc.)
- Clean up item names (remove brand names if obvious)
- Infer category: protein, vegetable, fruit, dairy, grain, pantry, frozen, or miscellaneous
- If quantity is unclear, use "1 unit"
- Ignore non-food items completely

Receipt text:
${rawOcrText}`

		const response = await fetch(`${backendUrl}/api/groq`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: 'You are a helpful assistant that parses grocery receipts. Return ONLY valid JSON arrays. No code fences, no commentary.' },
					{ role: 'user', content: prompt }
				],
				temperature: 0.3,
			}),
			signal: AbortSignal.timeout(20000)
		})

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			throw new Error(`Groq HTTP ${response.status}: ${text}`)
		}

		const json = await response.json()
		const content = json.choices?.[0]?.message?.content
		if (!content) throw new Error('Missing content in Groq response')

		let parsedItems: any[] = []
		try {
			const parsed = JSON.parse(content)
			parsedItems = Array.isArray(parsed) ? parsed : (parsed.items || parsed.food_items || [])
		} catch (e) {
			const basicItems = extractGroceryItems(rawOcrText)
			return {
				items: basicItems.map(item => ({
					item,
					quantity: '1 unit',
					price: 'Unknown',
					category: 'miscellaneous' as const
				})),
				rawText: rawOcrText
			}
		}

		const validCategories = ['protein', 'vegetable', 'fruit', 'dairy', 'grain', 'pantry', 'frozen', 'miscellaneous']
		const items = parsedItems
			.map(item => ({
				item: normalizeItem(String(item.item || 'Unknown item')),
				quantity: String(item.quantity || '1 unit').trim(),
				price: String(item.price || 'Unknown').trim(),
				category: (validCategories.includes(String(item.category || '').toLowerCase())
					? String(item.category).toLowerCase()
					: 'miscellaneous') as import('./types').FoodCategory
			}))
			.filter(item => item.item && item.item.length >= 3)

		return {
			items,
			rawText: rawOcrText
		}
	} catch (err) {
		console.error('[ReceiptAI] Error during AI parsing:', err)
		const basicItems = extractGroceryItems(rawOcrText)
		return {
			items: basicItems.map(item => ({
				item,
				quantity: '1 unit',
				price: 'Unknown',
				category: 'miscellaneous' as const
			})),
			rawText: rawOcrText
		}
	}
}