const STOP_WORDS = new Set([
	'total',
	'subtotal',
	'tax',
	'sales',
	'sale',
	'amount',
	'change',
	'cash',
	'visa',
	'mastercard',
	'debit',
	'credit',
	'card',
	'store',
	'market',
	'receipt',
	'#',
	'qty',
	'price',
	'amt',
	'item',
	'savings',
	'save',
	'coupon',
	'discount',
	'rewards',
	'lbs',
	'lb',
	'net',
	'weight',
	'dollars',
	'thank',
	'thanks',
	'transaction',
	'balance',
	'cashier',
	'date',
	'time'
])

const NON_WORD_PATTERN = /[^a-zA-Z0-9\s/-]/g
const PRICE_PATTERN = /\$?\d+([.,]\d{2})?/g
const LEADING_CODE_PATTERN = /^[A-Z]{2,}\d+/
const TRAILING_DIGITS_PATTERN = /\d+$/g

function normalizeItem(value: string): string {
	const cleaned = value
		.replace(PRICE_PATTERN, ' ')
		.replace(LEADING_CODE_PATTERN, ' ')
		.replace(TRAILING_DIGITS_PATTERN, ' ')
		.replace(NON_WORD_PATTERN, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim()
		.toLowerCase()

	if (!cleaned) return ''

	const tokens = cleaned.split(' ').filter(Boolean)
	if (!tokens.length) return ''

	// remove tokens that are stop words or purely numeric
	const filteredTokens = tokens.filter((token) => {
		if (STOP_WORDS.has(token)) return false
		if (/^\d+$/.test(token)) return false
		return token.length > 1
	})

	if (!filteredTokens.length) return ''

	const joined = filteredTokens.join(' ')
	return joined.replace(/\b\w/g, (char) => char.toUpperCase())
}

export function extractGroceryItems(input: string): string[] {
	if (!input.trim()) return []
	const candidates = input
		.split(/[\r\n,;]+/)
		.map((line) => normalizeItem(line))
		.filter(Boolean)

	const unique = Array.from(new Set(candidates))
	return unique
}

