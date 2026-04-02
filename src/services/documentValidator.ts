/**
 * Validates if OCR extracted text is from a receipt or shopping list
 */

interface ValidationResult {
	isValid: boolean
	type: 'receipt' | 'shopping-list' | 'unknown'
	confidence: number
	reason?: string
}

// Receipt indicators (typical receipt patterns)
const RECEIPT_INDICATORS = [
	/total/i,
	/subtotal/i,
	/amount/i,
	/balance/i,
	/change/i,
	/payment/i,
	/date/i,
	/time/i,
	/thank\s+you/i,
	/receipt/i,
	/store/i,
	/price/i,
	/qty/i,
	/\d+\.\d{2}/, // Price format like 12.99
	/\$[\d\.]+/, // Dollar amounts
	/€[\d\.]+/, // Euro amounts
	/£[\d\.]+/, // Pound amounts
]

// Shopping list indicators
const SHOPPING_LIST_INDICATORS = [
	/\bgroceries\b/i,
	/\bshopping\s+list\b/i,
	/\bto\s+buy\b/i,
	/\bneeded\b/i,
	/\bingredients\b/i,
	/\bshop/i,
	/\bchecklist\b/i,
	/✓|☐|□|☑/,  // Checkboxes
]

// Common receipt/receipt headers
const RECEIPT_HEADERS = [
	/walmart/i,
	/costco/i,
	/target/i,
	/kroger/i,
	/safeway/i,
	/whole[\s-]?foods/i,
	/trader[\s-]?joe/i,
	/sprouts/i,
	/publix/i,
	/albertsons/i,
	/grocery/i,
	/supermarket/i,
	/market/i,
	/store/i,
]

// Invalid document patterns (non-food/receipt documents)
const INVALID_PATTERNS = [
	/invoice[^g]|paypal|amazon|ebay/i, // Financial/shipping docs
	/bill\s+(?!to)/i, // Utility bills
	/medical|hospital|doctor|prescription/i, // Medical docs
	/insurance|policy|claim/i, // Insurance docs
	/bank|account|balance[^d]|statement/i, // Bank statements
	/mortgage|lease|rent|property/i, // Real estate
	/education|school|tuition|transcript/i, // Education docs
	/travel|flight|booking|hotel/i, // Travel docs
	/contract|agreement|terms|condition|legal/i, // Legal docs
	/resume|cv|employment|hire/i, // Employment docs
]

export function validateReceiptOrList(text: string): ValidationResult {
	if (!text || text.trim().length < 10) {
		return {
			isValid: false,
			type: 'unknown',
			confidence: 0,
			reason: 'Document appears to be empty or too short. Please upload a valid receipt or shopping list.',
		}
	}

	const lowerText = text.toLowerCase()

	// Check for invalid document types first
	for (const pattern of INVALID_PATTERNS) {
		if (pattern.test(lowerText)) {
			return {
				isValid: false,
				type: 'unknown',
				confidence: 0,
				reason: 'This appears to be a financial or personal document, not a receipt or shopping list. Please upload a grocery receipt or shopping list instead.',
			}
		}
	}

	// Count receipt indicators
	let receiptScore = 0
	for (const pattern of RECEIPT_INDICATORS) {
		const matches = text.match(pattern)
		if (matches) receiptScore += matches.length
	}

	// Count receipt headers
	let hasReceiptHeader = false
	for (const pattern of RECEIPT_HEADERS) {
		if (pattern.test(lowerText)) {
			hasReceiptHeader = true
			receiptScore += 2
			break
		}
	}

	// Count shopping list indicators
	let shoppingListScore = 0
	for (const pattern of SHOPPING_LIST_INDICATORS) {
		const matches = text.match(pattern)
		if (matches) shoppingListScore += matches.length
	}

	// Count lines that look like grocery items (simple heuristic)
	const lines = text.split('\n').filter(line => line.trim().length > 0)
	const itemLikeLines = lines.filter(line => {
		// Items typically are 2-50 characters, don't contain excessive symbols
		const cleaned = line.trim()
		return cleaned.length > 2 && cleaned.length < 100 && !cleaned.match(/^[\d\s\$\.\,\-]+$/)
	})

	// Shopping lists usually have 3+ items listed
	if (itemLikeLines.length >= 3) {
		shoppingListScore += Math.min(itemLikeLines.length - 3, 3) // Bonus points for multiple items
	}

	// Determine document type
	const totalScore = receiptScore + shoppingListScore
	if (totalScore < 2) {
		return {
			isValid: false,
			type: 'unknown',
			confidence: 0,
			reason: 'This doesn\'t look like a grocery receipt or shopping list. Please ensure the document is clear and try again.',
		}
	}

	if (receiptScore > shoppingListScore) {
		const confidence = Math.min(receiptScore / 10, 1)
		if (confidence < 0.3) {
			return {
				isValid: false,
				type: 'receipt',
				confidence,
				reason: 'This might not be a receipt. Please ensure you\'re uploading a valid grocery receipt with prices and totals.',
			}
		}
		return {
			isValid: true,
			type: 'receipt',
			confidence,
		}
	} else if (shoppingListScore > 0) {
		const confidence = Math.min(shoppingListScore / 5, 1)
		if (confidence < 0.3) {
			return {
				isValid: false,
				type: 'shopping-list',
				confidence,
				reason: 'This might not be a valid shopping list. Please ensure items are clearly listed.',
			}
		}
		return {
			isValid: true,
			type: 'shopping-list',
			confidence,
		}
	}

	// If we have items but neither type scored high
	if (itemLikeLines.length >= 3) {
		return {
			isValid: true,
			type: 'shopping-list',
			confidence: 0.5,
		}
	}

	return {
		isValid: false,
		type: 'unknown',
		confidence: 0,
		reason: 'Unable to identify document type. Please upload a grocery receipt or shopping list.',
	}
}
