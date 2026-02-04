// Receipt metadata patterns - ONLY obvious non-food items
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
	// Weight/measure garbage - lines with just weights
	/kg\s*net/i,
	/lb\s*net/i,
	/lbs?(?:\s|$)/i,
	/\boz(?:\s|$)/i,
	// Price patterns (including price/weight combos)
	/\$\d+[\.,]\d{2}/i, // $X.XX
	/£\d+[\.,]\d{2}/i, // £X.XX
	/€\d+[\.,]\d{2}/i, // €X.XX
	/\$\d+[\.,]\d{2}\/kg/i, // $X.XX/kg
	/\$\d+[\.,]\d{2}\/lb/i, // $X.XX/lb
	// Single generic words
	/^special$/i,
	/^loyalty$/i,
	/^subtotal$/i,
	/^total$/i,
	/^cash$/i,
	/^change$/i,
	/^date$/i,
	/^receipt$/i,
	/^thank\s+you$/i,
	// Date patterns: MM/DD/YYYY, DD/MM/YYYY
	/^\d{1,2}\/\d{1,2}\/\d{4}$/,
	// Days of week (case insensitive)
	/^(mon|tue|wed|thu|fri|sat|sun)$/i,
	// Lines that are only numbers (including negative, decimals)
	/^-?\d+\.?\d*$/,
	// Lines that are only symbols
	/^[\*\-\._]{2,}$/,
	// Existing patterns
	/^\$?\d+\.?\d*\s*[ft]?$/i, // Prices like "$6.99 f"
	/^@/i, // Price indicators like "@ 5 for"
	/lb\s*@/i, // Weight prices
	/tare\s*weight/i,
	/subtotal|total|tax|fee|paid|visa|rate|amt/i,
	/^\d{3}-\d{4}/i, // Phone numbers
	/^(whole|foods\.?|market|tribeca|trb|greenwich|street|new york|city|ny|10007)/i, // Store info
	/^--/i, // Separators
	/metropolita|summary/i,
	/^name$/i,
	/^amt\.?$/i,
	/^taxed/i,
	/^sold items/i,
	/^\d+:\d+$/i, // Times like "21:53"
	/^c\s+\d/i, // Tax codes like "c 4.50"
	/^\$\s*\d/i, // Dollar amounts like "$ 4.00"
];

const isExcluded = (text: string) => 
	EXCLUDED_PATTERNS.some(pattern => pattern.test(text));

// Food keywords that indicate a valid food item
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
	'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders', 'ckn', 'roti',
	// Dairy
	'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt', 'shred',
	// Grains / bakery
	'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
	'croissant', 'cookies',
	// Other / pantry
	'oil', 'olive', 'olive oil', 'vinegar', 'balsamic', 'balsamic vinegar', 'salt', 'sugar', 'flour', 'honey', 'jam', 'jelly', 
	'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts',
	// Herbs and spices
	'cilantro', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'garlic', 'ginger', 'cumin',
	'paprika', 'pepper', 'peppercorn', 'cinnamon', 'nutmeg', 'bay leaf', 'turmeric', 'dill', 'tarragon',
	// Common condiments
	'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa', 'pesto', 'soy sauce',
	// Coffee
	'coffee', 'roast',
])

function normalizeItem(value: string): string {
	let cleaned = value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
	
	if (!cleaned || cleaned.length < 2) return ''
	
	// Remove quantity/weight suffixes like "2x", "0.778kg", "2.5 lbs", etc.
	cleaned = cleaned
		.replace(/\s*\d+\s*x\s*$/i, '') // "2x" at end
		.replace(/\s*\d+[\.,]\d+\s*kg\s*$/i, '') // "0.778 kg" at end
		.replace(/\s*\d+[\.,]\d+\s*lbs?\s*$/i, '') // "2.5 lbs" at end
		.replace(/\s*\d+[\.,]\d+\s*oz\s*$/i, '') // "5.5 oz" at end
		.replace(/\s*\d+\s*kg\s*$/i, '') // "2 kg" at end
		.replace(/\s*\d+\s*lbs?\s*$/i, '') // "5 lbs" at end
		.replace(/\s*\d+\s*oz\s*$/i, '') // "3 oz" at end
		.trim()
	
	// Remove prices at the end
	cleaned = cleaned.replace(/\s*\$\d+[\.,]\d{2}\s*$/, '').trim()
	
	// Remove line numbers at start
	cleaned = cleaned.replace(/^\d+[\s.\-:]+/, '').trim()
	
	return cleaned
}

function looksLikeFood(item: string): boolean {
	if (!item || item.length < 2) return false

	const lower = item.toLowerCase()

	// CRITICAL: Check exclusions FIRST
	if (isExcluded(lower)) {
		return false
	}

	// Reject obvious metadata
	for (const pattern of RECEIPT_METADATA_PATTERNS) {
		if (pattern.test(lower)) return false
	}

	// Accept anything that contains a food keyword
	for (const keyword of FOOD_KEYWORDS) {
		if (lower.includes(keyword)) return true
	}

	// Reject short all-caps items with no vowels
	if (item.length <= 4 && item === item.toUpperCase() && !/[aeiou]/i.test(item)) {
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

		// Skip items shorter than 3 characters
		if (normalized.length < 3) {
			console.log(`[Cleaning] Item too short (< 3 chars): "${normalized}"`)
			continue
		}

		// CRITICAL: Apply exclusion check
		if (isExcluded(normalized)) {
			console.log(`[Cleaning] Excluded by pattern: "${raw}"`)
			continue
		}

		// Filter obvious non-food items
		if (!looksLikeFood(normalized)) {
			console.log(`[Cleaning] Filtered out: "${raw}"`)
			continue
		}

		// Deduplicate
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

		// Skip items shorter than 3 characters
		if (normalized.length < 3) {
			console.log(`[Extraction] Item too short (< 3 chars): "${normalized}"`)
			continue
		}

		// CRITICAL: Apply exclusion check
		if (isExcluded(normalized)) {
			console.log(`[Extraction] Excluded by pattern: "${line}"`)
			continue
		}

		// Check if it looks like food
		if (!looksLikeFood(normalized)) {
			console.log(`[Extraction] Filtered out: "${line}" (not recognized as food)`)
			continue
		}

		// Deduplicate
		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			console.log(`[Extraction] Skipping duplicate: "${line}"`)
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
	console.log('[ReceiptAI] Starting AI-powered receipt parsing')

	const apiKey = (import.meta as any).env?.VITE_GROQ_API_KEY as string | undefined

	if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
		console.warn('[ReceiptAI] No valid Groq API key found. Using basic extraction instead.')
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
- Extract ONLY food items (no store info, totals, dates, etc.)
- Clean up item names (remove brand names if obvious)
- Infer category: protein, vegetable, fruit, dairy, grain, pantry, frozen, or miscellaneous
- If quantity is unclear, use "1 unit"
- Ignore non-food items completely

Receipt text:
${rawOcrText}`

		console.log('[ReceiptAI] Sending receipt text to Groq for parsing')
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant that parses grocery receipts. Return ONLY valid JSON arrays. No code fences, no commentary.' },
					{ role: 'user', content: prompt }
				],
				temperature: 0.3,
				response_format: { type: 'json_object' }
			})
		})

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			throw new Error(`Groq HTTP ${response.status}: ${text}`)
		}

		const json = await response.json()
		const content = json.choices?.[0]?.message?.content
		if (!content) throw new Error('Missing content in Groq response')

		console.log('[ReceiptAI] Raw AI response:', content)

		// Parse the response - could be an array directly or wrapped in an object
		let parsedItems: any[] = []
		try {
			const parsed = JSON.parse(content)
			parsedItems = Array.isArray(parsed) ? parsed : (parsed.items || parsed.food_items || [])
		} catch (e) {
			console.error('[ReceiptAI] Failed to parse AI response as JSON:', e)
			// Fallback to basic extraction
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

		console.log('[ReceiptAI] Parsed items from AI:', parsedItems)

		// Validate and clean up the parsed items
		const validCategories = ['protein', 'vegetable', 'fruit', 'dairy', 'grain', 'pantry', 'frozen', 'miscellaneous']
		const items = parsedItems
			.filter(item => item?.item && typeof item.item === 'string' && item.item.trim().length >= 2)
			.map(item => ({
				item: String(item.item || 'Unknown item').trim(),
				quantity: String(item.quantity || '1 unit').trim(),
				price: String(item.price || 'Unknown').trim(),
				category: (validCategories.includes(String(item.category || '').toLowerCase()) 
					? String(item.category).toLowerCase() 
					: 'miscellaneous') as import('./types').FoodCategory
			}))

		console.log('[ReceiptAI] Final parsed items:', items.length)
		return {
			items,
			rawText: rawOcrText
		}
	} catch (err) {
		console.error('[ReceiptAI] Error during AI parsing:', err)
		// Fallback to basic extraction on error
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